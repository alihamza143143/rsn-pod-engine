import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Plus, Copy, Check, Users, Calendar, Globe } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useToastStore } from '@/stores/toastStore';
import CreateInviteModal from './CreateInviteModal';
import api from '@/lib/api';

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Users; variant: 'info' | 'warning' | 'default' }> = {
  pod: { label: 'Pod Invite', icon: Users, variant: 'info' },
  session: { label: 'Session Invite', icon: Calendar, variant: 'warning' },
  platform: { label: 'Platform Invite', icon: Globe, variant: 'default' },
};

export default function InvitesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { addToast } = useToastStore();
  const { data, isLoading } = useQuery({
    queryKey: ['my-invites'],
    queryFn: () => api.get('/invites').then(r => r.data.data ?? []),
  });

  const getInviteUrl = (code: string) => `${window.location.origin}/invite/${code}`;

  const copyLink = async (inv: any) => {
    try {
      await navigator.clipboard.writeText(getInviteUrl(inv.code));
      setCopiedId(inv.id);
      addToast('Invite link copied!', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Invites</h1>
        <Button onClick={() => setShowCreate(true)} className="btn-glow"><Plus className="h-4 w-4 mr-2" /> Create Invite</Button>
      </div>

      {(!data || data.length === 0) ? (
        <EmptyState
          icon={<Mail className="h-8 w-8" />}
          title="No invites"
          description="Create invite links to grow your pods."
          action={<Button onClick={() => setShowCreate(true)}>Create Invite</Button>}
        />
      ) : (
        <div className="grid gap-4 animate-fade-in-up">
          {data.map((inv: any) => {
            const typeConf = TYPE_CONFIG[inv.type] || TYPE_CONFIG.platform;
            const TypeIcon = typeConf.icon;
            return (
            <Card key={inv.id}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={typeConf.variant} className="text-xs flex items-center gap-1">
                      <TypeIcon className="h-3 w-3" /> {typeConf.label}
                    </Badge>
                  </div>
                  <p className="font-medium text-gray-800 font-mono text-sm">{inv.code}</p>
                  <p className="text-sm text-gray-500 mt-0.5">Uses: {inv.useCount || 0}{inv.maxUses ? ` / ${inv.maxUses}` : ''}{inv.inviteeEmail ? ` · To: ${inv.inviteeEmail}` : ''}</p>
                  <p className="text-xs text-gray-400 mt-1 truncate max-w-md">{getInviteUrl(inv.code)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={inv.status === 'active' || inv.status === 'pending' ? 'success' : 'default'}>{inv.status}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyLink(inv)}
                    title="Copy invite link"
                  >
                    {copiedId === inv.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </Card>
          );})}
        </div>
      )}

      <CreateInviteModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Plus, Copy, Check } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useToastStore } from '@/stores/toastStore';
import CreateInviteModal from './CreateInviteModal';
import api from '@/lib/api';

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
        <h1 className="text-2xl font-bold text-surface-100">Invites</h1>
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
          {data.map((inv: any) => (
            <Card key={inv.id}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-surface-200 font-mono text-sm">{inv.code}</p>
                  <p className="text-sm text-surface-400 mt-0.5">Uses: {inv.useCount || 0}{inv.maxUses ? ` / ${inv.maxUses}` : ''}</p>
                  <p className="text-xs text-surface-500 mt-1 truncate max-w-md">{getInviteUrl(inv.code)}</p>
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
              <div className="mt-3 pt-3 border-t border-surface-800">
                <p className="text-xs text-surface-500">Share this link with someone to invite them to your pod. They'll need to sign in and accept the invite.</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateInviteModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

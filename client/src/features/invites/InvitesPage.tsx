import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Mail, Plus, Copy, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Spinner';
import CreateInviteModal from './CreateInviteModal';
import { useToastStore } from '@/stores/toastStore';
import { formatDateTime } from '@/lib/utils';
import api from '@/lib/api';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  pending: 'info',
  accepted: 'success',
  expired: 'warning',
  revoked: 'danger',
};

export default function InvitesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  const { data: invites, isLoading, refetch } = useQuery({
    queryKey: ['invites'],
    queryFn: async () => {
      const { data } = await api.get('/invites');
      return data.data || [];
    },
  });

  const copyLink = async (code: string, id: string) => {
    const url = `${window.location.origin}/invite/${code}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    addToast({ type: 'success', title: 'Link copied to clipboard' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-100">Invites</h1>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Create Invite
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : !invites || invites.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-12 w-12" />}
          title="No invites yet"
          description="Create invites to bring people into your pods and sessions"
          action={<Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-2" /> Create Invite</Button>}
        />
      ) : (
        <div className="space-y-3">
          {invites.map((invite: any, i: number) => (
            <motion.div
              key={invite.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="!p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusVariant[invite.status] || 'default'}>{invite.status}</Badge>
                      <Badge>{invite.type}</Badge>
                      <span className="text-xs text-surface-500">
                        Uses: {invite.use_count}/{invite.max_uses}
                      </span>
                    </div>
                    <p className="text-sm text-surface-300 font-mono truncate">
                      {invite.code}
                    </p>
                    {invite.invitee_email && (
                      <p className="text-xs text-surface-500 mt-1">To: {invite.invitee_email}</p>
                    )}
                    <p className="text-xs text-surface-500 mt-0.5">Created {formatDateTime(invite.created_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyLink(invite.code, invite.id)}
                    >
                      {copiedId === invite.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <CreateInviteModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); refetch(); }} />
    </motion.div>
  );
}

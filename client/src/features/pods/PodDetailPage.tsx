import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Calendar, Plus, Settings, UserMinus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';

export default function PodDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const { data: pod, isLoading } = useQuery({
    queryKey: ['pod', id],
    queryFn: async () => {
      const { data } = await api.get(`/pods/${id}`);
      return data.data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ['pod-members', id],
    queryFn: async () => {
      const { data } = await api.get(`/pods/${id}/members`);
      return data.data || [];
    },
    enabled: !!id,
  });

  const { data: sessions } = useQuery({
    queryKey: ['pod-sessions', id],
    queryFn: async () => {
      const { data } = await api.get(`/sessions?podId=${id}`);
      return data.data || [];
    },
    enabled: !!id,
  });

  if (isLoading) return <PageLoader />;
  if (!pod) return <EmptyState title="Pod not found" />;

  const isHost = pod.created_by === user?.id;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Link to="/pods" className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-surface-200 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Pods
      </Link>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-brand-600/20 flex items-center justify-center">
              <Users className="h-7 w-7 text-brand-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-100">{pod.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={pod.status === 'active' ? 'success' : 'default'}>{pod.status}</Badge>
                <Badge>{pod.visibility}</Badge>
                <span className="text-xs text-surface-500">{pod.pod_type?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
          {isHost && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm"><Settings className="h-4 w-4 mr-1" /> Settings</Button>
            </div>
          )}
        </div>
        {pod.description && <p className="mt-4 text-sm text-surface-400">{pod.description}</p>}
      </Card>

      {/* Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-100">Sessions</h2>
          {isHost && (
            <Link to={`/pods/${id}/sessions/new`}>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Session</Button>
            </Link>
          )}
        </div>
        {sessions && sessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sessions.map((session: any) => (
              <Link key={session.id} to={`/sessions/${session.id}`}>
                <Card hover>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-surface-100 text-sm">{session.title}</h3>
                    <Badge variant={session.status === 'scheduled' ? 'info' : session.status === 'completed' ? 'success' : 'warning'}>
                      {session.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-surface-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {formatDate(session.scheduled_at)}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No sessions yet" description="Create a session to start networking" />
        )}
      </div>

      {/* Members */}
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-4">Members ({members?.length || 0})</h2>
        {members && members.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map((m: any) => (
              <Card key={m.id} className="!p-4 flex items-center gap-3">
                <Avatar name={m.display_name || m.email || 'User'} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-100 truncate">{m.display_name || 'User'}</p>
                  <p className="text-xs text-surface-500">{m.role}</p>
                </div>
                {isHost && m.user_id !== user?.id && (
                  <button
                    className="p-1.5 text-surface-500 hover:text-red-400 rounded-lg hover:bg-surface-800 transition-colors"
                    title="Remove member"
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No members yet" />
        )}
      </div>
    </motion.div>
  );
}

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, Users, UserPlus, UserMinus, Play } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { formatDateTime } from '@/lib/utils';
import api from '@/lib/api';

const statusVariant: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'brand' | 'default'> = {
  scheduled: 'info',
  lobby_open: 'brand',
  round_active: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data } = await api.get(`/sessions/${id}`);
      return data.data;
    },
  });

  const { data: participants } = useQuery({
    queryKey: ['session-participants', id],
    queryFn: async () => {
      const { data } = await api.get(`/sessions/${id}/participants`);
      return data.data || [];
    },
    enabled: !!id,
  });

  const registerMutation = useMutation({
    mutationFn: () => api.post(`/sessions/${id}/register`),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Registered for session' });
      queryClient.invalidateQueries({ queryKey: ['session-participants', id] });
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: 'Registration failed', message: err.response?.data?.error?.message });
    },
  });

  const unregisterMutation = useMutation({
    mutationFn: () => api.delete(`/sessions/${id}/register`),
    onSuccess: () => {
      addToast({ type: 'info', title: 'Unregistered from session' });
      queryClient.invalidateQueries({ queryKey: ['session-participants', id] });
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: 'Failed to unregister', message: err.response?.data?.error?.message });
    },
  });

  if (isLoading) return <PageLoader />;
  if (!session) return <EmptyState title="Session not found" />;

  const isHost = session.host_user_id === user?.id;
  const isRegistered = participants?.some((p: any) => p.user_id === user?.id);
  const isLive = ['lobby_open', 'round_active', 'round_rating', 'round_transition', 'closing_lobby'].includes(session.status);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Link to="/sessions" className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-surface-200 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Sessions
      </Link>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-surface-100">{session.title}</h1>
              <Badge variant={statusVariant[session.status] || 'default'} size="md">
                {session.status?.replace('_', ' ')}
              </Badge>
            </div>
            {session.description && <p className="text-sm text-surface-400 mb-3">{session.description}</p>}
            <div className="flex flex-wrap items-center gap-4 text-sm text-surface-400">
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {formatDateTime(session.scheduled_at)}</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {session.config?.numberOfRounds || 5} rounds &middot; {Math.round((session.config?.roundDurationSeconds || 480) / 60)}min each</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {participants?.length || 0} / {session.config?.maxParticipants || 500} participants</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {isLive && (isRegistered || isHost) && (
              <Button onClick={() => navigate(`/session/${id}/live`)} size="sm">
                <Play className="h-4 w-4 mr-1" /> Join Live
              </Button>
            )}
            {isHost && session.status === 'scheduled' && (
              <Button onClick={() => navigate(`/session/${id}/live`)} size="sm">
                <Play className="h-4 w-4 mr-1" /> Start Session
              </Button>
            )}
            {!isHost && session.status === 'scheduled' && (
              isRegistered ? (
                <Button onClick={() => unregisterMutation.mutate()} variant="outline" size="sm" isLoading={unregisterMutation.isPending}>
                  <UserMinus className="h-4 w-4 mr-1" /> Unregister
                </Button>
              ) : (
                <Button onClick={() => registerMutation.mutate()} size="sm" isLoading={registerMutation.isPending}>
                  <UserPlus className="h-4 w-4 mr-1" /> Register
                </Button>
              )
            )}
          </div>
        </div>
      </Card>

      {/* Session Config */}
      <Card>
        <h3 className="font-semibold text-surface-100 mb-3">Session Configuration</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Rounds', value: session.config?.numberOfRounds || 5 },
            { label: 'Round Duration', value: `${Math.round((session.config?.roundDurationSeconds || 480) / 60)} min` },
            { label: 'Lobby Wait', value: `${Math.round((session.config?.lobbyDurationSeconds || 480) / 60)} min` },
            { label: 'Rating Window', value: `${session.config?.ratingWindowSeconds || 30}s` },
          ].map((c) => (
            <div key={c.label} className="text-center p-3 rounded-xl bg-surface-800/50">
              <p className="text-2xl font-bold text-surface-100">{c.value}</p>
              <p className="text-xs text-surface-500 mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Participants */}
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-4">Participants ({participants?.length || 0})</h2>
        {participants && participants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {participants.map((p: any) => (
              <Card key={p.id} className="!p-4 flex items-center gap-3">
                <Avatar name={p.display_name || 'Participant'} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-100 truncate">{p.display_name || 'Participant'}</p>
                  <Badge size="sm" variant={p.status === 'registered' ? 'info' : p.status === 'in_lobby' ? 'brand' : 'default'}>
                    {p.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No participants yet" description="Share the session invite to get people registered" />
        )}
      </div>
    </motion.div>
  );
}

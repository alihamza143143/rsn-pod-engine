import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play, Pause, Square, Users, Clock, Settings, ArrowLeft,
  Calendar, BarChart3, Radio, Eye,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { PageLoader } from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { useToastStore } from '@/stores/toastStore';
import { formatDateTime } from '@/lib/utils';
import api from '@/lib/api';

export default function HostDashboardPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}`).then((r) => r.data?.data),
  });

  const { data: participants } = useQuery({
    queryKey: ['session-participants', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}/participants`).then((r) => r.data?.data || []),
    refetchInterval: 10000,
  });

  const { data: ratings } = useQuery({
    queryKey: ['session-ratings', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}/ratings`).then((r) => r.data?.data).catch(() => null),
  });

  const statusMutation = useMutation({
    mutationFn: ({ action }: { action: string }) => api.post(`/sessions/${sessionId}/${action}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      addToast({ type: 'success', title: 'Session updated' });
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: 'Action failed', message: err.response?.data?.error?.message });
    },
  });

  if (isLoading) return <PageLoader />;
  if (!session) return <EmptyState icon={<Calendar className="h-8 w-8" />} title="Session not found" />;

  const statusColor: Record<string, string> = {
    draft: 'text-surface-400',
    scheduled: 'text-blue-400',
    active: 'text-green-400',
    paused: 'text-amber-400',
    completed: 'text-surface-500',
    cancelled: 'text-red-400',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/sessions/${sessionId}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-surface-100">{session.title || 'Session'}</h1>
          <p className="text-sm text-surface-400">Host Dashboard</p>
        </div>
        <Badge variant={session.status === 'active' ? 'success' : session.status === 'paused' ? 'warning' : 'default'}>
          {session.status}
        </Badge>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <Users className="h-5 w-5 text-brand-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-surface-100">{participants?.length || 0}</div>
          <div className="text-xs text-surface-400">Registered</div>
        </Card>
        <Card className="p-4 text-center">
          <Clock className="h-5 w-5 text-green-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-surface-100">{session.config?.roundDurationMinutes || 0}m</div>
          <div className="text-xs text-surface-400">Per Round</div>
        </Card>
        <Card className="p-4 text-center">
          <Radio className="h-5 w-5 text-amber-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-surface-100">{session.config?.maxRounds || 0}</div>
          <div className="text-xs text-surface-400">Total Rounds</div>
        </Card>
        <Card className="p-4 text-center">
          <BarChart3 className="h-5 w-5 text-purple-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-surface-100">{ratings?.avgRating ? Number(ratings.avgRating).toFixed(1) : '—'}</div>
          <div className="text-xs text-surface-400">Avg Rating</div>
        </Card>
      </div>

      {/* Session controls */}
      <Card className="p-5">
        <h3 className="text-sm font-medium text-surface-300 mb-3 flex items-center gap-2">
          <Settings className="h-4 w-4" /> Session Controls
        </h3>
        <div className="flex flex-wrap gap-3">
          {session.status === 'scheduled' && (
            <>
              <Button onClick={() => statusMutation.mutate({ action: 'start' })} isLoading={statusMutation.isPending}>
                <Play className="h-4 w-4 mr-1.5" /> Start Session
              </Button>
              <Link to={`/session/${sessionId}/live`}>
                <Button variant="secondary"><Eye className="h-4 w-4 mr-1.5" /> Join as Host</Button>
              </Link>
            </>
          )}
          {session.status === 'active' && (
            <>
              <Button variant="secondary" onClick={() => statusMutation.mutate({ action: 'pause' })} isLoading={statusMutation.isPending}>
                <Pause className="h-4 w-4 mr-1.5" /> Pause
              </Button>
              <Button variant="danger" onClick={() => { if (confirm('End session?')) statusMutation.mutate({ action: 'end' }); }}>
                <Square className="h-4 w-4 mr-1.5" /> End Session
              </Button>
              <Link to={`/session/${sessionId}/live`}>
                <Button variant="ghost"><Eye className="h-4 w-4 mr-1.5" /> View Live</Button>
              </Link>
            </>
          )}
          {session.status === 'paused' && (
            <>
              <Button onClick={() => statusMutation.mutate({ action: 'resume' })} isLoading={statusMutation.isPending}>
                <Play className="h-4 w-4 mr-1.5" /> Resume
              </Button>
              <Button variant="danger" onClick={() => { if (confirm('End session?')) statusMutation.mutate({ action: 'end' }); }}>
                <Square className="h-4 w-4 mr-1.5" /> End Session
              </Button>
            </>
          )}
          {session.status === 'completed' && (
            <p className="text-surface-400 text-sm">This session has ended.</p>
          )}
        </div>
      </Card>

      {/* Session info */}
      <Card className="p-5">
        <h3 className="text-sm font-medium text-surface-300 mb-3">Session Details</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><dt className="text-surface-500">Scheduled</dt><dd className="text-surface-200 mt-0.5">{session.scheduledAt ? formatDateTime(session.scheduledAt) : 'Not set'}</dd></div>
          <div><dt className="text-surface-500">Max Participants</dt><dd className="text-surface-200 mt-0.5">{session.config?.maxParticipants || 'Unlimited'}</dd></div>
          <div><dt className="text-surface-500">Matching</dt><dd className="text-surface-200 mt-0.5">{session.config?.matchingAlgorithm || 'round_robin'}</dd></div>
          <div><dt className="text-surface-500">Rating Window</dt><dd className="text-surface-200 mt-0.5">{session.config?.ratingWindowSeconds || 30}s</dd></div>
        </dl>
      </Card>

      {/* Participants */}
      <Card className="p-5">
        <h3 className="text-sm font-medium text-surface-300 mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" /> Participants ({participants?.length || 0})
        </h3>
        {participants?.length ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {participants.map((p: any) => (
              <div key={p.userId || p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-800/50 transition-colors">
                <Avatar name={p.displayName || p.email || 'User'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate">{p.displayName || p.email}</p>
                  <p className="text-xs text-surface-500">{p.status || 'registered'}</p>
                </div>
                <span className={`text-xs ${statusColor[p.status] || 'text-surface-400'}`}>
                  {p.status || 'registered'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-surface-400 text-sm">No participants registered yet.</p>
        )}
      </Card>
    </motion.div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Mic } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

type EventFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';

export default function SessionsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<EventFilter>('all');
  const { data, isLoading } = useQuery({
    queryKey: ['my-sessions'],
    queryFn: () => api.get('/sessions').then(r => r.data.data ?? []),
  });

  const { data: myPods } = useQuery({
    queryKey: ['my-pods'],
    queryFn: () => api.get('/pods?status=active').then(r => r.data.data ?? []),
  });
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const canCreateEvent = isAdmin || (myPods || []).some((p: any) => p.memberRole === 'director' || p.memberRole === 'host');

  if (isLoading) return <PageLoader />;

  const statusVariant = (s: string) => {
    if (s === 'scheduled') return 'info';
    if (s === 'active' || s === 'in_progress' || s === 'lobby_open' || s === 'round_active') return 'success';
    if (s === 'completed') return 'default';
    if (s === 'cancelled') return 'warning';
    return 'default';
  };

  // Filter events
  const filtered = (data || []).filter((s: any) => {
    if (filter === 'all') return s.status !== 'deleted';
    if (filter === 'upcoming') return s.status === 'scheduled' || s.status === 'lobby_open' || s.status === 'round_active' || s.status === 'round_rating' || s.status === 'round_transition';
    if (filter === 'completed') return s.status === 'completed';
    if (filter === 'cancelled') return s.status === 'cancelled';
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Events</h1>
        {canCreateEvent && (
          <Button onClick={() => navigate('/sessions/new')} className="btn-glow"><Plus className="h-4 w-4 mr-2" /> New Event</Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 animate-fade-in-up">
        {(['all', 'upcoming', 'completed', 'cancelled'] as EventFilter[]).map(f => (
          <Button key={f} variant={filter === f ? 'primary' : 'ghost'} size="sm" onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-8 w-8" />}
          title={filter === 'all' ? 'No events yet' : `No ${filter} events`}
          description={canCreateEvent && filter === 'all' ? 'Schedule an event to start connecting.' : 'No events match this filter.'}
          action={canCreateEvent && filter === 'all' ? <Button onClick={() => navigate('/sessions/new')}>Schedule Event</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 animate-fade-in-up">
          {filtered.map((s: any) => {
            const isHost = s.hostUserId === user?.id;
            return (
              <Card key={s.id} hover onClick={() => navigate(`/sessions/${s.id}`)} className="card-hover">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-800">
                        {s.title || 'Open event'}
                      </p>
                      {isHost && (
                        <Badge variant="brand" className="text-xs">
                          <Mic className="h-3 w-3 mr-1" /> Hosting
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : 'No date'}
                      {s.podName && <span className="ml-2 text-gray-400">· {s.podName}</span>}
                      {s.hostDisplayName && !isHost && (
                        <span className="ml-2 text-gray-400">· Host: {s.hostDisplayName}</span>
                      )}
                    </p>
                  </div>
                  <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

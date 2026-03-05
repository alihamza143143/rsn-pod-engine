import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Spinner';
import { formatDateTime } from '@/lib/utils';
import api from '@/lib/api';

const statusVariant: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'brand' | 'default'> = {
  scheduled: 'info',
  lobby_open: 'brand',
  round_active: 'warning',
  round_rating: 'warning',
  round_transition: 'warning',
  closing_lobby: 'brand',
  completed: 'success',
  cancelled: 'danger',
};

export default function SessionsPage() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await api.get('/sessions');
      return data.data || [];
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="text-2xl font-bold text-surface-100">Sessions</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="No sessions yet"
          description="Sessions will appear here once they're created within a pod"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sessions.map((session: any, i: number) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/sessions/${session.id}`}>
                <Card hover>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-surface-100">{session.title}</h3>
                    <Badge variant={statusVariant[session.status] || 'default'}>
                      {session.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  {session.description && (
                    <p className="text-sm text-surface-400 line-clamp-2 mb-3">{session.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-surface-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDateTime(session.scheduled_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {session.config?.numberOfRounds || 5} rounds
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {session.participant_count || 0}
                    </span>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

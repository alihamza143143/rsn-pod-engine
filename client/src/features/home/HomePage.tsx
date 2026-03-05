import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Calendar, ArrowRight, Zap, Globe, Clock, TrendingUp, Plus } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  const { data: pods, isLoading: podsLoading } = useQuery({
    queryKey: ['my-pods'],
    queryFn: () => api.get('/pods?membership=mine&limit=6').then((r) => r.data?.data || []),
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['upcoming-sessions'],
    queryFn: () => api.get('/sessions?status=scheduled&limit=5').then((r) => r.data?.data || []),
  });

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => api.get('/users/me/stats').then((r) => r.data?.data).catch(() => null),
  });

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8">
      {/* Hero / Welcome */}
      <motion.div variants={fadeUp}>
        <div className="rounded-2xl bg-gradient-to-br from-brand-600/20 via-brand-500/10 to-surface-900 border border-brand-500/20 p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-surface-100">
            Welcome back, <span className="text-brand-400">{user?.displayName || 'there'}</span>
          </h1>
          <p className="text-surface-400 mt-2 max-w-lg">
            Ready for your next meaningful conversation? Join a session or explore new pods.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link to="/pods">
              <Button size="lg"><Globe className="h-4 w-4 mr-2" /> Browse Pods</Button>
            </Link>
            <Link to="/sessions">
              <Button variant="secondary" size="lg"><Calendar className="h-4 w-4 mr-2" /> View Sessions</Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      {stats && (
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Sessions Joined', value: stats.sessionsJoined ?? 0, icon: Calendar, color: 'text-brand-400' },
            { label: 'People Met', value: stats.peopleMet ?? 0, icon: Users, color: 'text-green-400' },
            { label: 'Mutual Matches', value: stats.mutualMatches ?? 0, icon: Zap, color: 'text-amber-400' },
            { label: 'Avg Rating', value: stats.avgRating ? Number(stats.avgRating).toFixed(1) : '—', icon: TrendingUp, color: 'text-purple-400' },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 text-center" hover>
              <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
              <div className="text-2xl font-bold text-surface-100">{stat.value}</div>
              <div className="text-xs text-surface-400 mt-1">{stat.label}</div>
            </Card>
          ))}
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upcoming Sessions */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-400" /> Upcoming Sessions
            </h2>
            <Link to="/sessions" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {sessionsLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : sessions?.length ? (
            <div className="space-y-3">
              {sessions.map((s: any) => (
                <Link to={`/sessions/${s.id}`} key={s.id}>
                  <Card hover className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-surface-100">{s.title || 'Session'}</div>
                      <div className="text-xs text-surface-400 mt-1">{s.scheduledAt ? formatDateTime(s.scheduledAt) : 'TBD'}</div>
                    </div>
                    <Badge variant={s.status === 'scheduled' ? 'brand' : 'default'}>{s.status}</Badge>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center text-surface-400">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No upcoming sessions</p>
              <Link to="/sessions/new" className="text-brand-400 text-sm hover:underline mt-2 inline-block">Create one</Link>
            </Card>
          )}
        </motion.div>

        {/* My Pods */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-400" /> My Pods
            </h2>
            <Link to="/pods" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {podsLoading ? (
            <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : pods?.length ? (
            <div className="grid grid-cols-2 gap-3">
              {pods.map((p: any) => (
                <Link to={`/pods/${p.id}`} key={p.id}>
                  <Card hover className="p-4">
                    <div className="font-medium text-surface-100 text-sm truncate">{p.name}</div>
                    <div className="text-xs text-surface-400 mt-1">{p.memberCount ?? '—'} members</div>
                    <Badge variant={p.visibility === 'public' ? 'success' : 'warning'} className="mt-2 text-xs">
                      {p.visibility}
                    </Badge>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center text-surface-400">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No pods yet</p>
              <Link to="/pods" className="text-brand-400 text-sm hover:underline mt-2 inline-block">Explore pods</Link>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Quick Action Bar */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
        <Link to="/pods"><Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" /> Create Pod</Button></Link>
        <Link to="/sessions/new"><Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" /> Create Session</Button></Link>
        <Link to="/invites"><Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" /> Send Invite</Button></Link>
      </motion.div>
    </motion.div>
  );
}

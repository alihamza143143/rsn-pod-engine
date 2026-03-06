import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Users, Calendar, Settings } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import api from '@/lib/api';

export default function HostDashboardPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}`).then(r => r.data.data),
  });

  const startSession = async () => {
    try {
      await api.post(`/sessions/${sessionId}/host/start`);
      navigate(`/session/${sessionId}/live`);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to start session');
    }
  };

  if (isLoading) return <PageLoader />;
  if (!session) return <p className="text-surface-400 text-center py-20">Session not found</p>;

  const statusVariant = session.status === 'scheduled' ? 'info'
    : session.status === 'lobby_open' || session.status === 'round_active' ? 'success'
    : session.status === 'completed' ? 'default' : 'warning';

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-8">
      <button onClick={() => navigate('/sessions')} className="flex items-center gap-2 text-surface-400 hover:text-surface-200 transition-colors text-sm">
        <ArrowLeft className="h-4 w-4" /> Back to Sessions
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-100">Host Dashboard</h1>
        <Badge variant={statusVariant}>{session.status}</Badge>
      </div>

      <Card>
        <h2 className="font-semibold text-surface-200 mb-3">Session Info</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2"><Settings className="h-4 w-4 text-surface-500" /><span className="text-surface-500">Title:</span> <span className="text-surface-200">{session.title || 'Open'}</span></div>
          <div className="flex items-center gap-2"><Badge variant={statusVariant}>{session.status}</Badge></div>
          <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-surface-500" /><span className="text-surface-500">Scheduled:</span> <span className="text-surface-200">{new Date(session.scheduledAt).toLocaleString()}</span></div>
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-surface-500" /><span className="text-surface-500">Participants:</span> <span className="text-surface-200">{session.participantCount || 0}</span></div>
          <div><span className="text-surface-500">Rounds:</span> <span className="text-surface-200">{session.config?.numberOfRounds || 5}</span></div>
          <div><span className="text-surface-500">Round Duration:</span> <span className="text-surface-200">{Math.floor((session.config?.roundDurationSeconds || 480) / 60)}m</span></div>
        </div>
      </Card>

      <div className="flex gap-3">
        {session.status === 'scheduled' && (
          <Button onClick={startSession}>
            <Play className="h-4 w-4 mr-2" /> Start Session
          </Button>
        )}
        <Button variant="secondary" onClick={() => navigate(`/session/${sessionId}/live`)}>
          <Users className="h-4 w-4 mr-2" /> Go to Live View
        </Button>
      </div>
    </div>
  );
}

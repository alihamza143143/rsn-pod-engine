import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Users, Play } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import api from '@/lib/api';

export default function SessionDetailPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}`).then(r => r.data.data),
  });

  if (isLoading) return <PageLoader />;
  if (!session) return <p className="text-surface-400 text-center py-20">Session not found</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/sessions')} className="flex items-center gap-2 text-surface-400 hover:text-surface-200 transition-colors text-sm">
        <ArrowLeft className="h-4 w-4" /> Back to Sessions
      </button>

      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-100">{session.topic || 'Session'}</h1>
            <p className="text-surface-400 mt-1">
              {session.scheduled_at ? new Date(session.scheduled_at).toLocaleString() : 'No date set'}
            </p>
          </div>
          <Badge variant={session.status === 'active' ? 'success' : 'info'}>{session.status}</Badge>
        </div>

        <div className="flex gap-6 text-sm text-surface-400">
          <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {session.participant_count || 0} participants</span>
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {session.round_duration_seconds || 300}s rounds</span>
        </div>
      </Card>

      <div className="flex gap-3">
        {(session.status === 'scheduled' || session.status === 'active') && (
          <Button onClick={() => navigate(`/session/${sessionId}/live`)}>
            <Play className="h-4 w-4 mr-2" /> Join Session
          </Button>
        )}
        {session.is_host && (
          <Button variant="secondary" onClick={() => navigate(`/session/${sessionId}/host`)}>
            Host Controls
          </Button>
        )}
      </div>
    </div>
  );
}

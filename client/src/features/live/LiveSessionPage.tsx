import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSessionSocket } from '@/hooks/useSessionSocket';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuthStore } from '@/stores/authStore';
import Lobby from './Lobby';
import VideoRoom from './VideoRoom';
import RatingPrompt from './RatingPrompt';
import SessionComplete from './SessionComplete';
import HostControls from './HostControls';
import { PageLoader } from '@/components/ui/Spinner';
import api from '@/lib/api';

export default function LiveSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // Connect to session socket
  useSessionSocket(sessionId);

  const sessionStatus = useSessionStore((s) => s.sessionStatus);
  const currentMatchId = useSessionStore((s) => s.currentMatchId);
  const ratingWindowOpen = useSessionStore((s) => s.ratingWindowOpen);
  const isConnected = useSessionStore((s) => s.isConnected);

  // Fetch session details
  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}`).then((r) => r.data?.data),
    enabled: !!sessionId,
  });

  if (isLoading) return <PageLoader />;
  if (!session) {
    navigate('/sessions');
    return null;
  }

  const isHost = session.hostId === user?.id;

  // Determine what to render based on session state
  const renderContent = () => {
    if (sessionStatus === 'completed') {
      return <SessionComplete sessionId={sessionId!} />;
    }

    if (ratingWindowOpen) {
      return <RatingPrompt />;
    }

    if (currentMatchId) {
      return <VideoRoom session={session} />;
    }

    // Waiting / lobby state (scheduled, waiting for round, bye round)
    return <Lobby session={session} isHost={isHost} />;
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-900/80 border-b border-surface-800">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
          <span className="text-sm text-surface-300">{session.title || 'Live Session'}</span>
        </div>
        <SessionStatusBadge status={sessionStatus} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {renderContent()}
      </div>

      {/* Host controls overlay */}
      {isHost && sessionStatus !== 'completed' && (
        <HostControls sessionId={sessionId!} sessionStatus={sessionStatus} />
      )}
    </div>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    scheduled: 'bg-blue-500/20 text-blue-400',
    active: 'bg-green-500/20 text-green-400',
    paused: 'bg-amber-500/20 text-amber-400',
    completed: 'bg-surface-700 text-surface-400',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[status] || colorMap.scheduled}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

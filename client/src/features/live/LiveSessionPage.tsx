import { useParams } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import useSessionSocket from '@/hooks/useSessionSocket';
import Lobby from './Lobby';
import VideoRoom from './VideoRoom';
import RatingPrompt from './RatingPrompt';
import SessionComplete from './SessionComplete';
import HostControls from './HostControls';
import { PageLoader } from '@/components/ui/Spinner';

export default function LiveSessionPage() {
  const { sessionId } = useParams();
  const { phase } = useSessionStore();

  useSessionSocket(sessionId!);

  if (!sessionId) return <PageLoader />;

  return (
    <div className="h-screen bg-surface-950 flex flex-col">
      {phase === 'lobby' && <Lobby />}
      {phase === 'matched' && <VideoRoom />}
      {phase === 'rating' && <RatingPrompt sessionId={sessionId} />}
      {phase === 'complete' && <SessionComplete />}
      {phase === 'lobby' && <HostControls sessionId={sessionId} />}
    </div>
  );
}

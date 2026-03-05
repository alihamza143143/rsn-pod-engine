import { useSessionStore } from '@/stores/sessionStore';
import { Button } from '@/components/ui/Button';
import { Play, SkipForward, Square } from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface Props { sessionId: string; }

export default function HostControls({ sessionId }: Props) {
  const { participants } = useSessionStore();
  const socket = getSocket();

  // Only show for host - simple check, real check is on server
  const startSession = () => socket?.emit('host:start_session', { sessionId });
  const nextRound = () => socket?.emit('host:resume_session', { sessionId });
  const endSession = () => socket?.emit('host:end_session', { sessionId });

  return (
    <div className="border-t border-surface-800 bg-surface-900/60 backdrop-blur-sm p-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <p className="text-sm text-surface-400">{participants.length} in lobby</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={startSession}><Play className="h-4 w-4 mr-1" /> Start</Button>
          <Button size="sm" variant="secondary" onClick={nextRound}><SkipForward className="h-4 w-4 mr-1" /> Next Round</Button>
          <Button size="sm" variant="danger" onClick={endSession}><Square className="h-4 w-4 mr-1" /> End</Button>
        </div>
      </div>
    </div>
  );
}

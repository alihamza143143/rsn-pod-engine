import { useSessionStore } from '@/stores/sessionStore';
import { Button } from '@/components/ui/Button';
import { Play, SkipForward, Square, Zap } from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface Props { sessionId: string; }

export default function HostControls({ sessionId }: Props) {
  const { participants, phase } = useSessionStore();
  const socket = getSocket();

  const startSession = () => socket?.emit('host:start_session', { sessionId });
  const startRound = () => socket?.emit('host:start_round', { sessionId });
  const endSession = () => socket?.emit('host:end_session', { sessionId });

  return (
    <div className="border-t border-surface-800 bg-surface-900/60 backdrop-blur-sm p-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <p className="text-sm text-surface-400">{participants.length} in lobby</p>
        <div className="flex gap-2">
          {/* Start Session — only shown before lobby is open */}
          <Button size="sm" onClick={startSession}>
            <Play className="h-4 w-4 mr-1" /> Start Session
          </Button>

          {/* Start Round — lets host manually trigger matching when participants are ready */}
          {(phase === 'lobby') && (
            <Button size="sm" variant="secondary" onClick={startRound}>
              <Zap className="h-4 w-4 mr-1" /> Start Round
            </Button>
          )}

          <Button size="sm" variant="danger" onClick={endSession}>
            <Square className="h-4 w-4 mr-1" /> End
          </Button>
        </div>
      </div>
    </div>
  );
}

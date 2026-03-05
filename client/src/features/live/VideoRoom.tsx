import { useSessionStore } from '@/stores/sessionStore';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import { formatTime } from '@/lib/utils';
import { Video, Clock } from 'lucide-react';

export default function VideoRoom() {
  const { currentMatch, timerSeconds, currentRound } = useSessionStore();

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      {/* Timer bar */}
      <div className="flex items-center justify-between bg-surface-900/60 rounded-xl px-4 py-3 border border-surface-800">
        <span className="text-sm text-surface-400">Round {currentRound}</span>
        <div className="flex items-center gap-2 text-surface-200">
          <Clock className="h-4 w-4" />
          <span className="font-mono text-lg">{formatTime(timerSeconds)}</span>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Your video */}
        <Card className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="h-32 w-32 rounded-full bg-surface-800 flex items-center justify-center mb-4">
            <Video className="h-12 w-12 text-surface-600" />
          </div>
          <p className="text-surface-300 font-medium">You</p>
          <p className="text-xs text-surface-500 mt-1">Camera preview</p>
        </Card>

        {/* Partner video */}
        <Card className="flex flex-col items-center justify-center min-h-[300px]">
          {currentMatch ? (
            <>
              <Avatar name={currentMatch.displayName || 'Partner'} size="xl" className="mb-4" />
              <p className="text-surface-300 font-medium">{currentMatch.displayName || 'Your Match'}</p>
              <p className="text-xs text-surface-500 mt-1">Connected</p>
            </>
          ) : (
            <>
              <div className="h-32 w-32 rounded-full bg-surface-800 flex items-center justify-center mb-4 animate-pulse">
                <Video className="h-12 w-12 text-surface-600" />
              </div>
              <p className="text-surface-500">Waiting for match...</p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

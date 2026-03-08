import { Users, Clock, Loader2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useSessionStore } from '@/stores/sessionStore';

export default function Lobby() {
  const { participants, isByeRound, currentRound, totalRounds, transitionStatus } = useSessionStore();

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-brand-500/20 text-brand-400 mb-4">
          <Users className="h-8 w-8" />
        </div>

        {isByeRound ? (
          <>
            <h2 className="text-xl font-bold text-surface-100 mb-2">Bye Round</h2>
            <p className="text-surface-400 mb-6">You have a bye this round — sit tight, you'll be matched next round!</p>
          </>
        ) : transitionStatus === 'between_rounds' ? (
          <>
            <h2 className="text-xl font-bold text-surface-100 mb-2">Getting Ready</h2>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Loader2 className="h-4 w-4 text-brand-400 animate-spin" />
              <p className="text-surface-400">Preparing round {currentRound} of {totalRounds}...</p>
            </div>
          </>
        ) : transitionStatus === 'starting_session' ? (
          <>
            <h2 className="text-xl font-bold text-surface-100 mb-2">Session Starting</h2>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Loader2 className="h-4 w-4 text-brand-400 animate-spin" />
              <p className="text-surface-400">The host has started the session — preparing your first match...</p>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-surface-100 mb-2">Waiting in Lobby</h2>
            <p className="text-surface-400 mb-6">The host will start the session soon</p>
          </>
        )}

        <div className="flex items-center justify-center gap-2 text-surface-300 text-sm">
          <Clock className="h-4 w-4" />
          <span>{participants.length} participant{participants.length !== 1 ? 's' : ''} connected</span>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {participants.map(p => (
            <span key={p.userId} className="inline-flex items-center gap-1 rounded-full bg-surface-800 px-3 py-1 text-xs text-surface-300">
              {p.displayName || 'User'}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}

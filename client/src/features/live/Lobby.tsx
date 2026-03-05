import { motion } from 'framer-motion';
import { Users, Clock, Wifi, Radio } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import Button from '@/components/ui/Button';
import { getSocket } from '@/lib/socket';
import { formatTime } from '@/lib/utils';

interface LobbyProps {
  session: any;
  isHost: boolean;
}

export default function Lobby({ session, isHost: _isHost }: LobbyProps) {
  const participantCount = useSessionStore((s) => s.participantCount);
  const sessionStatus = useSessionStore((s) => s.sessionStatus);
  const currentRound = useSessionStore((s) => s.currentRound);
  const timerSecondsRemaining = useSessionStore((s) => s.timerSecondsRemaining);
  const timerSegmentType = useSessionStore((s) => s.timerSegmentType);
  const lastBroadcast = useSessionStore((s) => s.lastBroadcast);
  const isConnected = useSessionStore((s) => s.isConnected);

  const handleReady = () => {
    getSocket().emit('presence:ready', { sessionId: session.id });
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg text-center"
      >
        {/* Animated pulse ring */}
        <div className="relative mx-auto mb-8 w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-brand-500/30 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-surface-800 border-2 border-brand-500/50 flex items-center justify-center">
            <Radio className="h-10 w-10 text-brand-400" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-surface-100 mb-2">
          {sessionStatus === 'scheduled' ? 'Waiting to Start' : `Round ${currentRound}`}
        </h2>

        <p className="text-surface-400 mb-6">
          {sessionStatus === 'scheduled'
            ? 'The session will begin shortly. Make sure you\'re ready!'
            : sessionStatus === 'active' && !useSessionStore.getState().currentMatchId
              ? 'Waiting for your next match...'
              : 'Hang tight while we pair everyone up.'}
        </p>

        {/* Timer */}
        {timerSecondsRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-800 border border-surface-700">
              <Clock className="h-4 w-4 text-brand-400" />
              <span className="text-lg font-mono text-surface-100">{formatTime(timerSecondsRemaining)}</span>
              <span className="text-xs text-surface-400">{timerSegmentType}</span>
            </div>
          </motion.div>
        )}

        {/* Participants */}
        <div className="flex items-center justify-center gap-2 mb-6 text-surface-400">
          <Users className="h-4 w-4" />
          <span className="text-sm">{participantCount} participants connected</span>
        </div>

        {/* Connection status */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Wifi className={`h-4 w-4 ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
          <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>

        {/* Ready button (only before session starts) */}
        {sessionStatus === 'scheduled' && (
          <Button onClick={handleReady} size="lg" className="px-8">
            I'm Ready
          </Button>
        )}

        {/* Host broadcast */}
        {lastBroadcast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20"
          >
            <p className="text-sm text-brand-300 font-medium">Host Message</p>
            <p className="text-surface-200 mt-1">{lastBroadcast.message}</p>
          </motion.div>
        )}

        {/* Participant mosaic */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {Array.from({ length: Math.min(participantCount, 20) }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500/40 to-surface-700 border border-surface-600"
            />
          ))}
          {participantCount > 20 && (
            <div className="w-8 h-8 rounded-full bg-surface-700 border border-surface-600 flex items-center justify-center text-xs text-surface-400">
              +{participantCount - 20}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

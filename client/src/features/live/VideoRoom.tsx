import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, Mic, MicOff, Video, VideoOff, MessageCircle, User } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { formatTime } from '@/lib/utils';
import api from '@/lib/api';

interface VideoRoomProps {
  session: any;
}

export default function VideoRoom({ session }: VideoRoomProps) {
  const currentRound = useSessionStore((s) => s.currentRound);
  const currentPartnerId = useSessionStore((s) => s.currentPartnerId);
  const timerSecondsRemaining = useSessionStore((s) => s.timerSecondsRemaining);
  const timerTotalSeconds = useSessionStore((s) => s.timerTotalSeconds);
  const timerSegmentType = useSessionStore((s) => s.timerSegmentType);
  const lastBroadcast = useSessionStore((s) => s.lastBroadcast);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showIcebreaker, setShowIcebreaker] = useState(true);

  // Fetch partner info
  const { data: partner } = useQuery({
    queryKey: ['user', currentPartnerId],
    queryFn: () => api.get(`/users/${currentPartnerId}`).then((r) => r.data?.data),
    enabled: !!currentPartnerId,
  });

  // Timer progress percentage
  const progress = timerTotalSeconds > 0 ? ((timerTotalSeconds - timerSecondsRemaining) / timerTotalSeconds) * 100 : 0;
  const isEnding = timerSegmentType === 'ending' || timerSecondsRemaining <= 30;

  // Auto-hide icebreaker after 20s
  useEffect(() => {
    setShowIcebreaker(true);
    const t = setTimeout(() => setShowIcebreaker(false), 20000);
    return () => clearTimeout(t);
  }, [currentRound]);

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Timer bar */}
      <div className="relative h-1 bg-surface-800">
        <motion.div
          className={`absolute left-0 top-0 h-full ${isEnding ? 'bg-red-500' : 'bg-brand-500'}`}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Timer display */}
      <div className="flex items-center justify-center py-2 bg-surface-900/50">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${isEnding ? 'bg-red-500/20 text-red-400' : 'bg-surface-800 text-surface-300'}`}>
          <Clock className="h-3.5 w-3.5" />
          <span className="font-mono text-sm font-medium">{formatTime(timerSecondsRemaining)}</span>
          <span className="text-xs opacity-70">Round {currentRound}</span>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 gap-2 p-2">
        {/* Partner video */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-2xl bg-surface-800 border border-surface-700 overflow-hidden flex items-center justify-center"
        >
          {/* Placeholder for LiveKit video track */}
          <div className="text-center">
            <Avatar name={partner?.displayName || 'Partner'} size="lg" />
            <p className="text-surface-100 font-medium mt-3">{partner?.displayName || 'Your Partner'}</p>
            {partner?.interests?.length > 0 && (
              <p className="text-xs text-surface-400 mt-1">
                Interests: {partner.interests.slice(0, 3).join(', ')}
              </p>
            )}
          </div>

          {/* Partner info overlay */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-900/80 backdrop-blur-sm">
            <User className="h-3.5 w-3.5 text-surface-400" />
            <span className="text-sm text-surface-200">{partner?.displayName || 'Partner'}</span>
          </div>
        </motion.div>

        {/* Self video */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative rounded-2xl bg-surface-800/50 border border-surface-700 overflow-hidden flex items-center justify-center"
        >
          {/* Placeholder for self video */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-surface-700 flex items-center justify-center mx-auto">
              {isVideoOff ? (
                <VideoOff className="h-8 w-8 text-surface-500" />
              ) : (
                <Video className="h-8 w-8 text-brand-400" />
              )}
            </div>
            <p className="text-surface-400 text-sm mt-2">You</p>
          </div>

          {/* Self label */}
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-surface-900/80 backdrop-blur-sm">
            <span className="text-xs text-surface-400">You {isMuted && '(muted)'}</span>
          </div>
        </motion.div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-3 p-4 bg-surface-900/80 border-t border-surface-800">
        <Button
          variant={isMuted ? 'danger' : 'secondary'}
          size="sm"
          onClick={() => setIsMuted(!isMuted)}
          className="rounded-full w-12 h-12 !p-0"
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Button
          variant={isVideoOff ? 'danger' : 'secondary'}
          size="sm"
          onClick={() => setIsVideoOff(!isVideoOff)}
          className="rounded-full w-12 h-12 !p-0"
        >
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>
      </div>

      {/* Icebreaker prompt */}
      {showIcebreaker && session.config?.icebreakers?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-20 left-1/2 -translate-x-1/2 max-w-sm w-full mx-4"
        >
          <div className="rounded-xl bg-brand-500/15 border border-brand-500/30 backdrop-blur-md p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <MessageCircle className="h-4 w-4 text-brand-400" />
              <span className="text-xs font-medium text-brand-300">Icebreaker</span>
            </div>
            <p className="text-surface-100 text-sm">
              {session.config.icebreakers[(currentRound - 1) % session.config.icebreakers.length]}
            </p>
            <button
              onClick={() => setShowIcebreaker(false)}
              className="text-xs text-surface-500 hover:text-surface-300 mt-2"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}

      {/* Host broadcast overlay */}
      {lastBroadcast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-14 left-1/2 -translate-x-1/2 max-w-sm w-full mx-4 z-10"
        >
          <div className="rounded-xl bg-amber-500/15 border border-amber-500/30 backdrop-blur-md p-3 text-center">
            <p className="text-xs text-amber-300 font-medium">Host Message</p>
            <p className="text-surface-200 text-sm mt-1">{lastBroadcast.message}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

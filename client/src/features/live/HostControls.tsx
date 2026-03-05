import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Send, UserMinus, ChevronUp, ChevronDown, Radio } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useSessionStore } from '@/stores/sessionStore';
import { getSocket } from '@/lib/socket';
import { useToastStore } from '@/stores/toastStore';

interface HostControlsProps {
  sessionId: string;
  sessionStatus: string;
}

export default function HostControls({ sessionId, sessionStatus }: HostControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [removeUserId, setRemoveUserId] = useState('');
  const [removeReason, setRemoveReason] = useState('');
  const participantCount = useSessionStore((s) => s.participantCount);
  const addToast = useToastStore((s) => s.addToast);

  const emit = (event: string, data: any) => {
    const socket = getSocket();
    (socket as any).emit(event, data);
  };

  const handleStart = () => {
    emit('host:start_session', { sessionId });
    addToast({ type: 'success', title: 'Session started' });
  };

  const handlePause = () => {
    emit('host:pause_session', { sessionId });
    addToast({ type: 'info', title: 'Session paused' });
  };

  const handleResume = () => {
    emit('host:resume_session', { sessionId });
    addToast({ type: 'info', title: 'Session resumed' });
  };

  const handleEnd = () => {
    if (confirm('Are you sure you want to end this session?')) {
      emit('host:end_session', { sessionId });
      addToast({ type: 'warning', title: 'Session ended' });
    }
  };

  const handleBroadcast = () => {
    if (!broadcastText.trim()) return;
    emit('host:broadcast_message', { sessionId, message: broadcastText.trim() });
    setBroadcastText('');
    addToast({ type: 'success', title: 'Message sent' });
  };

  const handleRemoveParticipant = () => {
    if (!removeUserId.trim()) return;
    emit('host:remove_participant', { sessionId, userId: removeUserId.trim(), reason: removeReason || 'Removed by host' });
    setRemoveUserId('');
    setRemoveReason('');
    addToast({ type: 'info', title: 'Participant removed' });
  };

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50"
      initial={false}
    >
      {/* Toggle bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-amber-500/20 border-t border-amber-500/30 text-amber-300"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Radio className="h-4 w-4" />
          Host Controls · {participantCount} participants
        </span>
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-surface-900 border-t border-surface-800 overflow-hidden"
          >
            <div className="p-4 space-y-4 max-w-2xl mx-auto">
              {/* Session controls */}
              <div className="flex flex-wrap gap-2">
                {sessionStatus === 'scheduled' && (
                  <Button onClick={handleStart} size="sm">
                    <Play className="h-4 w-4 mr-1.5" /> Start Session
                  </Button>
                )}
                {sessionStatus === 'active' && (
                  <Button onClick={handlePause} variant="secondary" size="sm">
                    <Pause className="h-4 w-4 mr-1.5" /> Pause
                  </Button>
                )}
                {sessionStatus === 'paused' && (
                  <Button onClick={handleResume} size="sm">
                    <Play className="h-4 w-4 mr-1.5" /> Resume
                  </Button>
                )}
                {(sessionStatus === 'active' || sessionStatus === 'paused') && (
                  <Button onClick={handleEnd} variant="danger" size="sm">
                    <Square className="h-4 w-4 mr-1.5" /> End Session
                  </Button>
                )}
              </div>

              {/* Broadcast */}
              <div className="flex gap-2">
                <input
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
                  placeholder="Broadcast message to all participants..."
                  className="flex-1 rounded-xl border border-surface-700 bg-surface-800/50 px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <Button onClick={handleBroadcast} size="sm" variant="secondary">
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Remove participant */}
              <div className="flex gap-2">
                <input
                  value={removeUserId}
                  onChange={(e) => setRemoveUserId(e.target.value)}
                  placeholder="User ID to remove"
                  className="flex-1 rounded-xl border border-surface-700 bg-surface-800/50 px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  placeholder="Reason"
                  className="flex-1 rounded-xl border border-surface-700 bg-surface-800/50 px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <Button onClick={handleRemoveParticipant} size="sm" variant="danger">
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

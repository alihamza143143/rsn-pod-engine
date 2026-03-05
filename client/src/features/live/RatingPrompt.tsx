import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ThumbsUp, MessageSquare, Clock } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { useQuery } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { getSocket } from '@/lib/socket';
import { formatTime } from '@/lib/utils';
import api from '@/lib/api';

export default function RatingPrompt() {
  const ratingMatchId = useSessionStore((s) => s.ratingMatchId);
  const ratingPartnerId = useSessionStore((s) => s.ratingPartnerId);
  const ratingRoundNumber = useSessionStore((s) => s.ratingRoundNumber);
  const timerSecondsRemaining = useSessionStore((s) => s.timerSecondsRemaining);

  const [qualityScore, setQualityScore] = useState(0);
  const [meetAgain, setMeetAgain] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  const { data: partner } = useQuery({
    queryKey: ['user', ratingPartnerId],
    queryFn: () => api.get(`/users/${ratingPartnerId}`).then((r) => r.data?.data),
    enabled: !!ratingPartnerId,
  });

  const handleSubmit = () => {
    if (!ratingMatchId || qualityScore === 0) return;

    getSocket().emit('rating:submit', {
      matchId: ratingMatchId,
      qualityScore,
      meetAgain,
      feedback: feedback.trim() || undefined,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
          >
            <ThumbsUp className="h-16 w-16 text-green-400 mx-auto mb-4" />
          </motion.div>
          <h3 className="text-xl font-semibold text-surface-100">Thanks for your feedback!</h3>
          <p className="text-surface-400 mt-2">Preparing your next conversation...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-surface-800 bg-surface-900/80 backdrop-blur-xl p-6">
          {/* Timer */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Clock className="h-4 w-4 text-surface-400" />
            <span className="font-mono text-sm text-surface-300">{formatTime(timerSecondsRemaining)}</span>
          </div>

          {/* Partner info */}
          <div className="text-center mb-6">
            <Avatar name={partner?.displayName || 'Partner'} size="lg" className="mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-surface-100">
              How was your conversation with {partner?.displayName || 'your partner'}?
            </h3>
            <p className="text-xs text-surface-400 mt-1">Round {ratingRoundNumber}</p>
          </div>

          {/* Star rating */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setQualityScore(star)}
                className="focus:outline-none"
              >
                <Star
                  className={`h-9 w-9 transition-colors ${
                    star <= (hoveredStar || qualityScore)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-surface-600'
                  }`}
                />
              </motion.button>
            ))}
          </div>

          {qualityScore > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              {/* Quality label */}
              <p className="text-center text-sm text-surface-300">
                {qualityScore === 1 && 'Not great'}
                {qualityScore === 2 && 'Could be better'}
                {qualityScore === 3 && 'It was okay'}
                {qualityScore === 4 && 'Great conversation!'}
                {qualityScore === 5 && 'Amazing connection!'}
              </p>

              {/* Meet again toggle */}
              <button
                onClick={() => setMeetAgain(!meetAgain)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${
                  meetAgain
                    ? 'bg-brand-500/10 border-brand-500/30 text-brand-300'
                    : 'bg-surface-800/50 border-surface-700 text-surface-400'
                }`}
              >
                <span className="text-sm font-medium">Want to meet again?</span>
                <motion.div
                  animate={{ scale: meetAgain ? 1.1 : 1 }}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    meetAgain ? 'border-brand-400 bg-brand-500' : 'border-surface-600'
                  }`}
                >
                  {meetAgain && <div className="w-2 h-2 rounded-full bg-white" />}
                </motion.div>
              </button>

              {/* Optional feedback */}
              <div>
                <label className="flex items-center gap-1.5 text-xs text-surface-400 mb-1.5">
                  <MessageSquare className="h-3 w-3" /> Quick note (optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={2}
                  maxLength={200}
                  placeholder="What made this conversation special?"
                  className="w-full rounded-xl border border-surface-700 bg-surface-800/50 px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              {/* Submit */}
              <Button onClick={handleSubmit} className="w-full" size="lg">
                Submit Rating
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Star, Heart, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';

interface SessionCompleteProps {
  sessionId: string;
}

export default function SessionComplete({ sessionId }: SessionCompleteProps) {
  const navigate = useNavigate();

  const { data: summary } = useQuery({
    queryKey: ['session-summary', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}/summary`).then((r) => r.data?.data).catch(() => null),
  });

  const peopleMet = summary?.peopleMet || [];
  const mutualMatches = summary?.mutualMatches || [];
  const totalRounds = summary?.totalRounds || 0;
  const avgRating = summary?.avgRating || 0;

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-lg"
      >
        {/* Celebration header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.3 }}
          >
            <Trophy className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          </motion.div>
          <h2 className="text-2xl font-bold text-surface-100">Session Complete!</h2>
          <p className="text-surface-400 mt-2">Here's a summary of your connections.</p>
        </motion.div>

        {/* Stats cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <Card className="p-4 text-center">
            <Users className="h-5 w-5 text-brand-400 mx-auto mb-1" />
            <div className="text-xl font-bold text-surface-100">{peopleMet.length}</div>
            <div className="text-xs text-surface-400">People Met</div>
          </Card>
          <Card className="p-4 text-center">
            <Heart className="h-5 w-5 text-pink-400 mx-auto mb-1" />
            <div className="text-xl font-bold text-surface-100">{mutualMatches.length}</div>
            <div className="text-xs text-surface-400">Mutual Matches</div>
          </Card>
          <Card className="p-4 text-center">
            <Star className="h-5 w-5 text-amber-400 mx-auto mb-1" />
            <div className="text-xl font-bold text-surface-100">{avgRating ? Number(avgRating).toFixed(1) : '—'}</div>
            <div className="text-xs text-surface-400">Avg Rating</div>
          </Card>
        </motion.div>

        {/* Mutual matches */}
        {mutualMatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <h3 className="text-sm font-medium text-surface-300 mb-3 flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-400" /> Mutual Matches — You both want to meet again!
            </h3>
            <div className="space-y-2">
              {mutualMatches.map((match: any, i: number) => (
                <motion.div
                  key={match.userId || i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                >
                  <Card className="p-3 flex items-center gap-3" hover>
                    <Avatar name={match.displayName || 'User'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-100 truncate">{match.displayName}</p>
                      {match.interests?.length > 0 && (
                        <p className="text-xs text-surface-400 truncate">{match.interests.join(', ')}</p>
                      )}
                    </div>
                    <Heart className="h-4 w-4 text-pink-400 fill-pink-400" />
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* People met list */}
        {peopleMet.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-6"
          >
            <h3 className="text-sm font-medium text-surface-300 mb-3">Everyone you met ({totalRounds} rounds)</h3>
            <div className="flex flex-wrap gap-2">
              {peopleMet.map((person: any, i: number) => (
                <div
                  key={person.userId || i}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-800 border border-surface-700"
                >
                  <Avatar name={person.displayName || 'User'} size="sm" />
                  <span className="text-sm text-surface-200">{person.displayName}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex gap-3"
        >
          <Button onClick={() => navigate('/')} className="flex-1">
            <ArrowRight className="h-4 w-4 mr-2" /> Back to Home
          </Button>
          <Button variant="ghost" onClick={() => navigate('/sessions')}>
            More Sessions
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

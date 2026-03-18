import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { CheckCircle, Users, Star, Heart, ArrowRight, UserCheck, CircleDot } from 'lucide-react';
import api from '@/lib/api';

interface Connection {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  company?: string;
  jobTitle?: string;
  qualityScore: number;
  meetAgain: boolean;
  theirMeetAgain: boolean;
  mutualMeetAgain: boolean;
  roundNumber: number;
}

interface Stats {
  totalRatings: number;
  avgQualityScore: number;
  meetAgainRate: number;
  mutualMeetAgainCount: number;
}

interface Props { sessionId: string; }

function InterestBadge({ connection }: { connection: Connection }) {
  if (connection.mutualMeetAgain) {
    return (
      <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 font-medium">
        <Heart className="h-3 w-3 fill-pink-400" />
        <span>Mutual Match!</span>
      </div>
    );
  }
  if (connection.meetAgain && !connection.theirMeetAgain) {
    return (
      <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
        <UserCheck className="h-3 w-3" />
        <span>You expressed interest</span>
      </div>
    );
  }
  if (!connection.meetAgain && connection.theirMeetAgain) {
    return (
      <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
        <UserCheck className="h-3 w-3" />
        <span>They expressed interest</span>
      </div>
    );
  }
  return null;
}

export default function SessionComplete({ sessionId }: Props) {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [mutualConnections, setMutualConnections] = useState<Connection[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [totalRounds, setTotalRounds] = useState(0);
  const [roundsAttended, setRoundsAttended] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchRecap = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const [peopleRes, statsRes] = await Promise.allSettled([
        api.get(`/ratings/sessions/${sessionId}/people-met`),
        api.get(`/ratings/sessions/${sessionId}/stats`),
      ]);
      if (peopleRes.status === 'fulfilled') {
        const d = peopleRes.value.data.data;
        setConnections(d?.connections || []);
        setMutualConnections(d?.mutualConnections || []);
        setTotalRounds(d?.totalRounds || 0);
        setRoundsAttended(d?.roundsAttended || 0);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data.data || null);
      }
      if (peopleRes.status === 'rejected' && statsRes.status === 'rejected') {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecap();
  }, [sessionId]);

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-[#202124]">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center bg-[#292a2d] rounded-2xl p-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Event Complete!</h2>
          <p className="text-gray-400">Great networking! Here's your recap.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : fetchError ? (
          <div className="text-center bg-[#292a2d] rounded-2xl p-8">
            <p className="text-gray-400 mb-3">Could not load your recap.</p>
            <Button size="sm" variant="secondary" onClick={fetchRecap}>Retry</Button>
          </div>
        ) : (
          <>
            {/* Participation summary */}
            {totalRounds > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5">
                <CircleDot className="h-4 w-4 text-blue-400 shrink-0" />
                <p className="text-sm text-gray-400">
                  You attended <span className="font-semibold text-white">{roundsAttended}</span> round{roundsAttended !== 1 ? 's' : ''} out of <span className="font-semibold text-white">{totalRounds}</span> total
                </p>
              </div>
            )}

            {/* Stats summary */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center py-3 bg-[#292a2d] rounded-xl p-4">
                  <Users className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-white">{connections.length}</p>
                  <p className="text-xs text-gray-500">People Met</p>
                </div>
                <div className="text-center py-3 bg-[#292a2d] rounded-xl p-4">
                  <Heart className="h-5 w-5 text-pink-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-white">{stats.mutualMeetAgainCount}</p>
                  <p className="text-xs text-gray-500">Mutual Matches</p>
                </div>
                <div className="text-center py-3 bg-[#292a2d] rounded-xl p-4">
                  <Star className="h-5 w-5 text-amber-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-white">{stats.avgQualityScore.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">Avg Rating</p>
                </div>
                <div className="text-center py-3 bg-[#292a2d] rounded-xl p-4">
                  <p className="text-2xl font-bold text-white">{Math.round(stats.meetAgainRate * 100)}%</p>
                  <p className="text-xs text-gray-500">Meet Again Rate</p>
                </div>
              </div>
            )}

            {/* Mutual connections */}
            {mutualConnections.length > 0 && (
              <div className="bg-[#292a2d] rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Heart className="h-4 w-4 fill-pink-400" />
                  Mutual Matches
                </h3>
                <div className="space-y-3">
                  {mutualConnections.map(c => (
                    <a key={c.userId} href={`/profile/${c.userId}`} className="flex items-center gap-3 p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/15 transition-colors">
                      <Avatar src={c.avatarUrl} name={c.displayName || 'User'} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-200 font-medium truncate">{c.displayName}</p>
                        {(c.jobTitle || c.company) && (
                          <p className="text-xs text-gray-500 truncate">
                            {[c.jobTitle, c.company].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <Heart className="h-4 w-4 text-pink-400 fill-pink-400 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* All people met — grouped by round */}
            {connections.length > 0 && (() => {
              const byRound = connections.reduce<Record<number, Connection[]>>((acc, c) => {
                (acc[c.roundNumber] ||= []).push(c);
                return acc;
              }, {});
              const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);
              return rounds.map(round => (
                <div key={round} className="bg-[#292a2d] rounded-2xl p-6">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold">{round}</span>
                    Round {round}
                  </h3>
                  <div className="space-y-2">
                    {byRound[round].map(c => (
                      <a key={`${c.userId}-${c.roundNumber}`} href={`/profile/${c.userId}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                        <Avatar src={c.avatarUrl} name={c.displayName || 'User'} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-gray-200 font-medium truncate">{c.displayName}</p>
                            <InterestBadge connection={c} />
                          </div>
                        </div>
                        {c.qualityScore > 0 && (
                          <div className="flex items-center gap-1 text-xs text-amber-400">
                            <Star className="h-3 w-3 fill-amber-400" />
                            {c.qualityScore}
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </>
        )}

        {/* Post-event feedback */}
        <FeedbackPrompt sessionId={sessionId} />

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={() => navigate(`/sessions/${sessionId}/recap`)} variant="secondary" className="flex-1">
            Full Recap <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          <Button onClick={() => navigate('/sessions')} className="flex-1">
            Back to Events
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Post-Event Feedback Prompt ─────────────────────────────────────────── */

function FeedbackPrompt({ sessionId }: { sessionId: string }) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/sessions/${sessionId}/feedback`, { feedback: text.trim() });
      setSubmitted(true);
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-4 bg-[#292a2d] rounded-2xl p-6">
        <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
        <p className="text-sm text-gray-400">Thanks for your feedback!</p>
      </div>
    );
  }

  return (
    <div className="bg-[#292a2d] rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-2">Is there anything you want to add?</h3>
      <p className="text-xs text-gray-500 mb-3">Share your thoughts about this event — what worked, what could be better.</p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Your feedback..."
        maxLength={2000}
        rows={3}
        style={{ color: '#000000' }}
        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none placeholder-gray-400"
      />
      <div className="flex justify-end mt-2">
        <Button size="sm" onClick={handleSubmit} disabled={!text.trim() || submitting}>
          {submitting ? 'Sending...' : 'Submit Feedback'}
        </Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useSessionStore } from '@/stores/sessionStore';
import { useToastStore } from '@/stores/toastStore';
import { Star } from 'lucide-react';
import api from '@/lib/api';

interface Props { sessionId: string; }

export default function RatingPrompt({ sessionId }: Props) {
  const { currentMatch, setPhase } = useSessionStore();
  const { addToast } = useToastStore();
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/sessions/${sessionId}/ratings`, {
        rated_user_id: currentMatch?.userId,
        score: rating,
      });
      addToast('Rating submitted', 'success');
      setPhase('lobby');
    } catch {
      addToast('Failed to submit rating', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <h2 className="text-xl font-bold text-surface-100 mb-2">Rate your conversation</h2>
        <p className="text-surface-400 mb-6">
          How was your chat with {currentMatch?.displayName || 'your partner'}?
        </p>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setRating(n)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-10 w-10 ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-surface-600'}`}
              />
            </button>
          ))}
        </div>

        <Button onClick={submit} isLoading={submitting} disabled={rating === 0} className="w-full">
          Submit Rating
        </Button>

        <button onClick={() => setPhase('lobby')} className="text-sm text-surface-500 hover:text-surface-300 mt-4 transition-colors">
          Skip
        </button>
      </Card>
    </div>
  );
}

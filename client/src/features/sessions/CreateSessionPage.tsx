import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { useToastStore } from '@/stores/toastStore';
import api from '@/lib/api';

interface SessionForm {
  title: string;
  description: string;
  scheduledAt: string;
  numberOfRounds: number;
  roundDurationMinutes: number;
  lobbyDurationMinutes: number;
  maxParticipants: number;
}

export default function CreateSessionPage() {
  const { id: podId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SessionForm>({
    defaultValues: {
      title: '',
      description: '',
      scheduledAt: '',
      numberOfRounds: 5,
      roundDurationMinutes: 8,
      lobbyDurationMinutes: 8,
      maxParticipants: 100,
    },
  });

  const onSubmit = async (data: SessionForm) => {
    setLoading(true);
    try {
      await api.post(`/pods/${podId}/sessions`, {
        title: data.title,
        description: data.description || undefined,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
        config: {
          numberOfRounds: Number(data.numberOfRounds),
          roundDurationSeconds: Number(data.roundDurationMinutes) * 60,
          lobbyDurationSeconds: Number(data.lobbyDurationMinutes) * 60,
          maxParticipants: Number(data.maxParticipants),
        },
      });
      addToast({ type: 'success', title: 'Session created' });
      navigate(`/pods/${podId}`);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to create session', message: err.response?.data?.error?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-surface-100">Create New Session</h1>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Session Title" {...register('title', { required: 'Title is required' })} error={errors.title?.message} autoFocus />
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full rounded-xl border border-surface-700 bg-surface-800/50 px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
              placeholder="Optional description..."
            />
          </div>
          <Input label="Scheduled Date & Time" type="datetime-local" {...register('scheduledAt', { required: 'Date is required' })} error={errors.scheduledAt?.message} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Number of Rounds" type="number" {...register('numberOfRounds', { min: 1, max: 20 })} />
            <Input label="Round Duration (min)" type="number" {...register('roundDurationMinutes', { min: 1, max: 60 })} />
            <Input label="Lobby Wait (min)" type="number" {...register('lobbyDurationMinutes', { min: 1, max: 30 })} />
            <Input label="Max Participants" type="number" {...register('maxParticipants', { min: 2, max: 1000 })} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" isLoading={loading} className="flex-1">Create Session</Button>
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}

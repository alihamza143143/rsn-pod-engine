import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToastStore } from '@/stores/toastStore';
import api from '@/lib/api';

interface CreatePodForm {
  name: string;
  description: string;
  podType: string;
  visibility: string;
  maxMembers: number;
}

interface CreatePodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreatePodModal({ isOpen, onClose, onCreated }: CreatePodModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreatePodForm>({
    defaultValues: {
      name: '',
      description: '',
      podType: 'speed_networking',
      visibility: 'private',
      maxMembers: 100,
    },
  });
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const onSubmit = async (data: CreatePodForm) => {
    setLoading(true);
    try {
      await api.post('/pods', {
        name: data.name,
        description: data.description || undefined,
        podType: data.podType,
        visibility: data.visibility,
        maxMembers: Number(data.maxMembers),
      });
      addToast({ type: 'success', title: 'Pod created successfully' });
      reset();
      onCreated();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to create pod', message: err.response?.data?.error?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Pod" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Pod Name" {...register('name', { required: 'Name is required' })} error={errors.name?.message} autoFocus />
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1.5">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full rounded-xl border border-surface-700 bg-surface-800/50 px-4 py-2.5 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            placeholder="What's this pod about?"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Pod Type</label>
            <select
              {...register('podType')}
              className="w-full rounded-xl border border-surface-700 bg-surface-800/50 px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="speed_networking">Speed Networking</option>
              <option value="duo">Duo</option>
              <option value="trio">Trio</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Visibility</label>
            <select
              {...register('visibility')}
              className="w-full rounded-xl border border-surface-700 bg-surface-800/50 px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="private">Private</option>
              <option value="invite_only">Invite Only</option>
              <option value="public">Public</option>
            </select>
          </div>
        </div>
        <Input label="Max Members" type="number" {...register('maxMembers', { min: 2 })} />
        <div className="flex gap-3 pt-2">
          <Button type="submit" isLoading={loading} className="flex-1">Create Pod</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

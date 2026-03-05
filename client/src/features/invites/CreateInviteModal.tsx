import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToastStore } from '@/stores/toastStore';
import api from '@/lib/api';

interface InviteForm {
  type: string;
  inviteeEmail: string;
  podId: string;
  sessionId: string;
  maxUses: number;
  expiresInHours: number;
}

interface CreateInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateInviteModal({ isOpen, onClose, onCreated }: CreateInviteModalProps) {
  const { register, handleSubmit, watch, reset } = useForm<InviteForm>({
    defaultValues: {
      type: 'platform',
      inviteeEmail: '',
      podId: '',
      sessionId: '',
      maxUses: 1,
      expiresInHours: 72,
    },
  });
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const type = watch('type');

  const onSubmit = async (data: InviteForm) => {
    setLoading(true);
    try {
      const payload: any = {
        type: data.type,
        maxUses: Number(data.maxUses),
        expiresInHours: Number(data.expiresInHours),
      };
      if (data.inviteeEmail) payload.inviteeEmail = data.inviteeEmail;
      if (data.type === 'pod' && data.podId) payload.podId = data.podId;
      if (data.type === 'session' && data.sessionId) payload.sessionId = data.sessionId;

      await api.post('/invites', payload);
      addToast({ type: 'success', title: 'Invite created' });
      reset();
      onCreated();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to create invite', message: err.response?.data?.error?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Invite" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1.5">Invite Type</label>
          <select
            {...register('type')}
            className="w-full rounded-xl border border-surface-700 bg-surface-800/50 px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="platform">Platform Invite</option>
            <option value="pod">Pod Invite</option>
            <option value="session">Session Invite</option>
          </select>
        </div>
        <Input label="Invitee Email (optional)" type="email" {...register('inviteeEmail')} placeholder="user@example.com" />
        {type === 'pod' && <Input label="Pod ID" {...register('podId')} placeholder="Pod UUID" />}
        {type === 'session' && <Input label="Session ID" {...register('sessionId')} placeholder="Session UUID" />}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Max Uses" type="number" {...register('maxUses', { min: 1 })} />
          <Input label="Expires In (hours)" type="number" {...register('expiresInHours', { min: 1 })} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" isLoading={loading} className="flex-1">Create Invite</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

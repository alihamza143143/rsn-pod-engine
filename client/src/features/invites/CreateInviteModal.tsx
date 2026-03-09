import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/stores/toastStore';
import api from '@/lib/api';

interface Props { open: boolean; onClose: () => void; }

export default function CreateInviteModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const { addToast } = useToastStore();
  const { data: pods } = useQuery({ queryKey: ['my-pods'], queryFn: () => api.get('/pods').then(r => r.data.data ?? []) });
  const { data: sessions } = useQuery({ queryKey: ['my-sessions'], queryFn: () => api.get('/sessions').then(r => r.data.data ?? []) });
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<{ type: string; podId: string; sessionId: string; inviteeEmail: string; maxUses: number }>({
    defaultValues: { type: 'pod' }
  });
  const inviteType = useWatch({ control, name: 'type' });

  const mutation = useMutation({
    mutationFn: (data: any) => {
      const payload: any = { type: data.type, maxUses: data.maxUses || 1 };
      if (data.inviteeEmail) payload.inviteeEmail = data.inviteeEmail;
      if (data.type === 'pod' && data.podId) payload.podId = data.podId;
      if (data.type === 'session' && data.sessionId) payload.sessionId = data.sessionId;
      return api.post('/invites', payload);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['my-invites'] });
      addToast(`Invite created: ${res.data.data?.code || 'done'}`, 'success');
      reset();
      onClose();
    },
    onError: () => addToast('Failed to create invite', 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Create Invite">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Invite Type</label>
          <select
            {...register('type', { required: 'Select a type' })}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
          >
            <option value="pod">Pod Invite</option>
            <option value="session">Session Invite</option>
            <option value="platform">Platform Invite</option>
          </select>
        </div>
        {inviteType === 'pod' && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Pod</label>
            <select
              {...register('podId', { required: inviteType === 'pod' ? 'Select a pod' : false })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
            >
              <option value="">Select pod</option>
              {(pods || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.podId && <p className="text-xs text-red-400 mt-1">{errors.podId.message}</p>}
          </div>
        )}
        {inviteType === 'session' && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Session</label>
            <select
              {...register('sessionId', { required: inviteType === 'session' ? 'Select a session' : false })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
            >
              <option value="">Select session</option>
              {(sessions || []).map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            {errors.sessionId && <p className="text-xs text-red-400 mt-1">{errors.sessionId.message}</p>}
          </div>
        )}
        <Input label="Recipient Email (optional)" type="email" {...register('inviteeEmail')} placeholder="someone@example.com" />
        <Input label="Max Uses" type="number" {...register('maxUses', { valueAsNumber: true })} placeholder="10" />
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>Create</Button>
        </div>
      </form>
    </Modal>
  );
}

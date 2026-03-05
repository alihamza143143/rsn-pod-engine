import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export default function InviteAcceptPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [inviteType, setInviteType] = useState<string>('platform');

  useEffect(() => {
    if (!code) return;

    if (!user) {
      // Store invite code and redirect to login
      sessionStorage.setItem('pendingInvite', code);
      navigate('/login');
      return;
    }

    const acceptInvite = async () => {
      try {
        const res = await api.post(`/invites/${encodeURIComponent(code)}/accept`);
        setStatus('success');
        setMessage(res.data?.message || 'Invite accepted successfully!');
        setInviteType(res.data?.type || 'platform');
        setTargetId(res.data?.podId || res.data?.sessionId || null);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.error?.message || 'Failed to accept invite. It may be expired or invalid.');
      }
    };
    acceptInvite();
  }, [code, user, navigate]);

  const handleContinue = () => {
    if (inviteType === 'pod' && targetId) navigate(`/pods/${targetId}`);
    else if (inviteType === 'session' && targetId) navigate(`/sessions/${targetId}`);
    else navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-surface-800 bg-surface-900/80 backdrop-blur-xl p-8 text-center"
      >
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 text-brand-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-surface-100">Accepting invite...</h2>
            <p className="text-surface-400 mt-2">Please wait while we process your invitation.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-surface-100">Welcome!</h2>
            <p className="text-surface-400 mt-2">{message}</p>
            <Button onClick={handleContinue} className="mt-6 w-full">Continue</Button>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-surface-100">Invite Error</h2>
            <p className="text-surface-400 mt-2">{message}</p>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => navigate('/')} className="flex-1">Go Home</Button>
              <Button variant="ghost" onClick={() => navigate('/login')}>Sign In</Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

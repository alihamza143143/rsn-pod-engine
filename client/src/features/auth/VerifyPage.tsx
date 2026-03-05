import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageLoader } from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import api from '@/lib/api';

export default function VerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token found');
      return;
    }

    (async () => {
      try {
        const { data } = await api.post('/auth/verify', { token });
        const { user, accessToken, refreshToken } = data.data;
        setAuth(user, accessToken, refreshToken);
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 1500);
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.response?.data?.error?.message || 'Verification failed');
      }
    })();
  }, [searchParams, navigate, setAuth]);

  if (status === 'loading') return <PageLoader />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        {status === 'success' ? (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-surface-100">You're in!</h2>
            <p className="text-surface-400">Redirecting to dashboard...</p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-surface-100">Verification Failed</h2>
            <p className="text-surface-400">{errorMsg}</p>
            <Button onClick={() => navigate('/login')} variant="secondary" className="mt-4">
              <Zap className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}

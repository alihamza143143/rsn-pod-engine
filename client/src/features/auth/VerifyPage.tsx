import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { PageLoader } from '@/components/ui/Spinner';

export default function VerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { verify } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const called = useRef(false);

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setError('Missing token'); return; }
    if (called.current) return;
    called.current = true;
    verify(token)
      .then(() => navigate('/', { replace: true }))
      .catch(() => setError('Invalid or expired link. Please try again.'));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950 p-4">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">{error}</p>
          <a href="/login" className="text-brand-400 underline">Back to login</a>
        </div>
      </div>
    );
  }

  return <PageLoader />;
}

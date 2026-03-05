import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 p-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-surface-700 mb-4">404</p>
        <h1 className="text-xl font-semibold text-surface-200 mb-2">Page not found</h1>
        <p className="text-surface-400 mb-6">The page you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    </div>
  );
}

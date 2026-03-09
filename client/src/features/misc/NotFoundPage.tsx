import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-surface-700 mb-4">404</p>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Page not found</h1>
        <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    </div>
  );
}

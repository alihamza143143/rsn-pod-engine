import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle } from 'lucide-react';

export default function SessionComplete() {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-surface-100 mb-2">Session Complete!</h2>
        <p className="text-surface-400 mb-6">Great networking! Check your session history for details.</p>
        <Button onClick={() => navigate('/sessions')} className="w-full">Back to Sessions</Button>
      </Card>
    </div>
  );
}

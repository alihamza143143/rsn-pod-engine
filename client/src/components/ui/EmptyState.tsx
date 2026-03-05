import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {icon && <div className="mb-4 text-surface-500">{icon}</div>}
      <h3 className="text-lg font-semibold text-surface-200 mb-1">{title}</h3>
      {description && <p className="text-sm text-surface-400 max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}

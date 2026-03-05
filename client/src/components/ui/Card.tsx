import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-surface-800 bg-surface-900/60 backdrop-blur-sm p-6',
        hover && 'hover:border-surface-700 hover:bg-surface-800/60 transition-colors cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}

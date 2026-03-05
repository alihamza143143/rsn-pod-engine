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
        'rounded-2xl border border-surface-700/50 bg-surface-900/80 backdrop-blur-xl p-6',
        hover && 'cursor-pointer transition-all duration-200 hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-600/5 hover:-translate-y-0.5',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}

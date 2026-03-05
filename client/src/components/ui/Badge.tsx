import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'info' | 'warning' | 'danger' | 'brand';
  className?: string;
}

const variants: Record<string, string> = {
  default: 'bg-surface-700 text-surface-300',
  success: 'bg-emerald-500/20 text-emerald-400',
  info: 'bg-blue-500/20 text-blue-400',
  warning: 'bg-amber-500/20 text-amber-400',
  danger: 'bg-red-500/20 text-red-400',
  brand: 'bg-brand-500/20 text-brand-400',
};

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}

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
        'rounded-2xl border border-gray-200 bg-white p-6 shadow-sm',
        hover && 'hover:border-gray-300 hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}

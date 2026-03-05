import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-surface-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-xl border bg-surface-800/50 px-4 py-2.5 text-sm text-surface-100 placeholder:text-surface-500 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            'hover:border-surface-500',
            error ? 'border-red-500 focus:ring-red-500' : 'border-surface-700',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
export default Input;

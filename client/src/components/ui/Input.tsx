import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className, ...props }, ref) => (
  <div>
    {label && <label className="block text-sm font-medium text-surface-300 mb-1.5">{label}</label>}
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-surface-700 bg-surface-800/50 px-4 py-2.5 text-sm text-surface-100 placeholder:text-surface-500',
        'focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors',
        error && 'border-red-500', className,
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
));

Input.displayName = 'Input';
export default Input;

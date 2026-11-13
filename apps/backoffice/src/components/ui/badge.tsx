import type { HTMLAttributes } from 'react';

const variants = {
  default: 'border-slate-200 bg-slate-900 text-white shadow-2xs',
  secondary: 'border-slate-200/80 bg-slate-100 text-slate-700',
  destructive: 'border-rose-200/70 bg-rose-50 text-rose-700',
  success: 'border-emerald-200/70 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200/70 bg-amber-50 text-amber-700',
  info: 'border-blue-200/70 bg-blue-50 text-blue-700',
  outline: 'border-slate-200 text-slate-700 bg-white shadow-2xs',
} as const;

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof variants;
  dot?: boolean;
};

export function Badge({ variant = 'default', dot = false, className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-tight transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
            variant === 'success'
              ? 'bg-emerald-500'
              : variant === 'destructive'
              ? 'bg-rose-500'
              : variant === 'warning'
              ? 'bg-amber-500'
              : variant === 'info'
              ? 'bg-blue-500'
              : 'bg-slate-400'
          }`}
        />
      )}
      {children}
    </span>
  );
}

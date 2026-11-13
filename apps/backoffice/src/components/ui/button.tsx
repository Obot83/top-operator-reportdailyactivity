import type { ButtonHTMLAttributes } from 'react';

const variants = {
  default:
    'bg-slate-900 text-white shadow-xs hover:bg-slate-800 active:bg-slate-950 focus-visible:ring-2 focus-visible:ring-slate-900/20',
  primary:
    'bg-blue-600 text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600/25',
  outline:
    'border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-200',
  destructive:
    'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 active:bg-rose-200',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200',
  secondary:
    'border border-slate-200/70 bg-slate-100 text-slate-700 hover:bg-slate-200/70 hover:text-slate-900',
} as const;

const sizes = {
  default: 'h-9 px-3.5 py-1.5 text-xs font-semibold rounded-lg',
  sm: 'h-8 px-2.5 py-1 text-xs font-medium rounded-md',
  lg: 'h-10 px-4 py-2 text-sm font-semibold rounded-lg',
  icon: 'h-8 w-8 rounded-lg p-0',
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({
  variant = 'default',
  size = 'default',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

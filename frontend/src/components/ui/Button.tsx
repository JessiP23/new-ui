import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../../lib/cn';

const baseClasses = 'inline-flex items-center justify-center rounded-md border border-transparent text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600',
    secondary: 'bg-slate-600 text-slate-100 hover:bg-slate-200 focus-visible:outline-slate-400',
    ghost: 'bg-transparent text-slate-200 hover:bg-slate-100 focus-visible:outline-slate-400',
    pill: 'flex-shrink-0 rounded-full border border-slate-200 bg-gradient-to-b from-slate-50 to-white text-slate-800 px-3 py-1 text-sm font-medium shadow-sm hover:from-slate-100 hover:to-white hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-300 transition-all',
} as const;

const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

export function Button({
    children,
    className,
    variant,
    size,
    ...props
}: PropsWithChildren<ButtonProps>) {
    const variantClass = variants[variant ?? 'primary'];
    const sizeClass = sizes[size ?? 'md'];

    return (
        <button className={cn(baseClasses, variantClass, sizeClass, className)} {...props}>
            {children}
        </button>
    );
}

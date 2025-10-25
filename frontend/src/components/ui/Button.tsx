import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

import { cn } from '../../lib/cn';

const baseClasses = 'inline-flex items-center justify-center rounded-md border border-transparent text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600',
    secondary: 'bg-slate-100 text-slate-100 hover:bg-slate-200 focus-visible:outline-slate-400',
    ghost: 'bg-transparent text-slate-200 hover:bg-slate-100 focus-visible:outline-slate-400',
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
    variant = 'primary',
    size = 'md',
    ...props
}: PropsWithChildren<ButtonProps>) {
    return (
        <button className={cn(baseClasses, variants[variant], sizes[size], className)} {...props}>
            {children}
        </button>
    );
}

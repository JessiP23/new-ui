import type { PropsWithChildren, ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface CardProps {
    title?: ReactNode;
    description?: ReactNode;
    className?: string;
    actions?: ReactNode;
}

export function Card({
    title,
    description,
    actions,
    className,
    children,
}: PropsWithChildren<CardProps>) {
    return (
        <div className={cn('rounded-xl border border-slate-200 bg-white p-6 shadow-sm', className)}>
            {(title || description || actions) && (
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                        {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
                        {description && <p className="text-sm text-slate-500">{description}</p>}
                    </div>
                    {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
                </div>
            )}
            {children}
        </div>
    );
}

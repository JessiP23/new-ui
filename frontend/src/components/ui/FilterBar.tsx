import type { PropsWithChildren, ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface FilterBarProps {
    title?: ReactNode;
    className?: string;
    actions?: ReactNode;
}

export function FilterBar({ title, actions, className, children }: PropsWithChildren<FilterBarProps>) {
    return (
        <div className={cn('flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between', className)}>
            <div className="space-y-1">
                {title ? <h4 className="text-sm font-semibold text-slate-900">{title}</h4> : null}
                {children ? <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">{children}</div> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
  );
}

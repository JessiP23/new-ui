import type { PropsWithChildren, ReactNode } from 'react';

interface EmptyStateProps {
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
}

export function EmptyState({ title, description, action }: PropsWithChildren<EmptyStateProps>) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
            {description ? <p className="text-sm text-slate-500">{description}</p> : null}
            {action ? <div className="mt-2">{action}</div> : null}
        </div>
    );
}

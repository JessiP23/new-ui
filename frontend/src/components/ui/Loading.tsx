interface LoadingProps {
    label?: string;
}

export function Loading({ label = 'Loading...' }: LoadingProps) {
    return (
        <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
            {label}
        </div>
    );
}

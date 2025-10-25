import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export interface TableColumn<T> {
    key: keyof T | string;
    header: ReactNode;
    width?: string;
    render?: (item: T) => ReactNode;
    className?: string;
}

interface TableProps<T> {
    columns: TableColumn<T>[];
    data: T[];
    getRowKey?: (item: T, index: number) => string | number;
    emptyState?: ReactNode;
    className?: string;
}

export function Table<T>({ columns, data, getRowKey, emptyState, className }: TableProps<T>) {
    if (!data.length && emptyState) {
        return <div className="py-8 text-center text-sm text-slate-500">{emptyState}</div>;
    }

    return (
        <div className={cn('overflow-hidden rounded-lg border border-slate-200 bg-white', className)}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                            {columns.map((column) => (
                                <th key={String(column.key)} className={cn('px-4 py-3 font-medium', column.className)} style={{ width: column.width }}>
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-600">
                        {data.map((item, index) => (
                            <tr key={String(getRowKey ? getRowKey(item, index) : index)} className="hover:bg-slate-50">
                                {columns.map((column) => (
                                    <td key={String(column.key)} className={cn('px-4 py-3 align-top', column.className)}>
                                        {column.render ? column.render(item) : ((item as Record<string, unknown>)[column.key as string] as ReactNode)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

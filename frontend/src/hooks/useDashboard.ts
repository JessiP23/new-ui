import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import { safeAsync } from '../utils/safeAsync';
import type { DashboardSummary } from '../types';

interface DashboardState {
    data: DashboardSummary | null;
    loading: boolean;
    error: string;
}

const initialState: DashboardState = {
    data: null,
    loading: false,
    error: '',
};

export function useDashboard() {
    const [state, setState] = useState<DashboardState>(initialState);

    const fetchSummary = useCallback(async () => {
        setState((prev) => {
            if (prev.loading && prev.error === '') {
                return prev;
            }
            return { ...prev, loading: true, error: '' };
        });

        const { data: response, error } = await safeAsync(() => apiClient.get<DashboardSummary>('/diagnostics/summary'), (err) => {
            console.error(err);
        });

        if (!response || error) {
            setState((prev) => {
                if (!prev.loading && prev.data === null && prev.error === 'Failed to load dashboard summary') {
                return prev;
                }
                return { data: null, loading: false, error: 'Failed to load dashboard summary' };
            });
            return;
        }

        const summary = response.data;
        setState((prev) => {
            if (prev.data && summary) {
                const prevJson = JSON.stringify(prev.data);
                const nextJson = JSON.stringify(summary);
                if (!prev.loading && prev.error === '' && prevJson === nextJson) {
                    return prev;
                }
            }
            if (!prev.data && !summary && !prev.loading && prev.error === '') {
                return prev;
            }
            return { data: summary, loading: false, error: '' };
        });
    }, []);

    useEffect(() => {
        void fetchSummary();
    }, [fetchSummary]);

    return { ...state, refresh: fetchSummary };
}

import { useCallback, useEffect, useState } from 'react';
import { apiClient, buildQuery } from '../lib/api';
import { safeAsync } from '../utils/safeAsync';
import type { AnalyticsResponse } from '../types';

type AnalyticsInterval = 'hour' | 'day' | 'week' | 'month';

interface AnalyticsRequest {
  queueId?: string;
  from?: number | null;
  to?: number | null;
  interval?: AnalyticsInterval;
  limit?: number;
  enabled?: boolean;
}

interface AnalyticsState {
  data: AnalyticsResponse | null;
  loading: boolean;
  error: string;
}

const initialState: AnalyticsState = {
  data: null,
  loading: false,
  error: '',
};

export function useAnalytics({
  queueId,
  from,
  to,
  interval = 'day',
  limit,
  enabled = true,
}: AnalyticsRequest) {
  const [state, setState] = useState<AnalyticsState>(initialState);

  const fetchAnalytics = useCallback(async () => {
    if (!enabled || !queueId) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: '' }));

    const query = buildQuery({
      queue_id: queueId,
      from,
      to,
      interval,
      limit,
    });

    const { data, error } = await safeAsync(
      () => apiClient.get<AnalyticsResponse>(`/analytics/pass_rate_by_judge${query}`),
      (err) => {
        console.error(err);
      },
    );

    if (error || !data) {
      setState({ data: null, loading: false, error: 'Failed to fetch analytics' });
      return;
    }

    setState({ data: data.data ?? null, loading: false, error: '' });
  }, [enabled, from, interval, limit, queueId, to]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  return { ...state, refresh: fetchAnalytics };
}

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import { safeAsync } from '../utils/safeAsync';
import type { QueueOption } from '../types';

interface UseQueuesState {
  queues: QueueOption[];
  loading: boolean;
  error: string;
}

const initialState: UseQueuesState = {
  queues: [],
  loading: false,
  error: '',
};

export function useQueues() {
  const [state, setState] = useState<UseQueuesState>(initialState);

  const fetchQueues = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: '' }));

    const { data, error } = await safeAsync(() => apiClient.get<{ queues: QueueOption[] }>('/diagnostics/queues'));

    if (error || !data) {
      setState({ queues: [], loading: false, error: 'Failed to load queues' });
      return;
    }

    const queues = (data.data?.queues ?? []).map((queue) => ({
      ...queue,
      evaluation_count: queue.evaluation_count ?? 0,
    }));

    setState({ queues, loading: false, error: '' });
  }, []);

  useEffect(() => {
    void fetchQueues();
  }, [fetchQueues]);

  return { ...state, refresh: fetchQueues };
}

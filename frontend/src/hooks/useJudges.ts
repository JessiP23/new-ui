import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import type { Judge } from '../types';
import { safeAsync } from '../utils/safeAsync';

export function useJudges() {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchJudges = useCallback(async () => {
    setLoading((prev) => (prev ? prev : true));

    const { data: response, error: requestError } = await safeAsync(
      () => apiClient.get<Judge[]>('/judges'),
      (err) => console.error(err),
    );

    if (!response || requestError) {
      setError((prev) => (prev === 'Failed to fetch judges' ? prev : 'Failed to fetch judges'));
      setLoading((prev) => (prev ? false : prev));
      return;
    }

    const nextJudges = response.data ?? [];
    setJudges((prev) => {
      const prevJson = JSON.stringify(prev);
      const nextJson = JSON.stringify(nextJudges);
      if (prevJson === nextJson) {
        return prev;
      }
      return nextJudges;
    });
    setError((prev) => (prev === '' ? prev : ''));
    setLoading((prev) => (prev ? false : prev));
  }, []);

  useEffect(() => {
    void fetchJudges();
  }, [fetchJudges]);

  const createJudge = useCallback(
    async (judge: Omit<Judge, 'id'>) => {
      const { error: requestError } = await safeAsync(
        () => apiClient.post('/judges', judge),
        (err) => console.error(err),
      );
      if (requestError) {
        setError((prev) => (prev === 'Failed to create judge' ? prev : 'Failed to create judge'));
        return;
      }
      setError((prev) => (prev === '' ? prev : ''));
      await fetchJudges();
    },
    [fetchJudges],
  );

  const updateJudge = useCallback(
    async (id: string, judge: Omit<Judge, 'id'>) => {
      const { error: requestError } = await safeAsync(
        () => apiClient.put(`/judges/${id}`, judge),
        (err) => console.error(err),
      );
      if (requestError) {
        setError((prev) => (prev === 'Failed to update judge' ? prev : 'Failed to update judge'));
        return;
      }
      setError((prev) => (prev === '' ? prev : ''));
      await fetchJudges();
    },
    [fetchJudges],
  );

  const deleteJudge = useCallback(
    async (id: string) => {
      const { error: requestError } = await safeAsync(
        () => apiClient.delete(`/judges/${id}`),
        (err) => console.error(err),
      );
      if (requestError) {
        setError((prev) => (prev === 'Failed to delete judge' ? prev : 'Failed to delete judge'));
        return;
      }
      setError((prev) => (prev === '' ? prev : ''));
      await fetchJudges();
    },
    [fetchJudges],
  );

  return {
    judges,
    loading,
    error,
    createJudge,
    updateJudge,
    deleteJudge,
    refresh: fetchJudges,
  };
}

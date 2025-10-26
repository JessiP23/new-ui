import { useCallback, useEffect, useState } from 'react';
import { apiClient, buildQuery } from '../lib/api';
import type { Evaluation, Judge, ResultsFilters } from '../types';
import { safeAsync } from '../utils/safeAsync';

interface EvaluationsResponse {
  evaluations: Evaluation[];
  total: number;
  pass_count?: number;
  pass_rate?: number;
}

const initialFilters: ResultsFilters = {
  judge_ids: [],
  question_ids: [],
  verdict: '',
  page: 1,
  limit: 50,
  queue_id: undefined,
};

export function useResults() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [filters, setFilters] = useState<ResultsFilters>(initialFilters);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [total, setTotal] = useState<number>(0);
  const [passCount, setPassCount] = useState<number>(0); // REFACTORED by GPT-5 — track aggregate pass results
  const [judges, setJudges] = useState<Judge[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);

  const fetchJudges = useCallback(async () => {
    const { data: response } = await safeAsync(
      () => apiClient.get<Judge[]>('/judges'),
      (err) => console.error('Failed to fetch judges', err),
    );
    if (!response) {
      return;
    }
    const nextJudges = response.data ?? [];
    setJudges((prev) => {
      const prevJson = JSON.stringify(prev);
      const nextJson = JSON.stringify(nextJudges);
      return prevJson === nextJson ? prev : nextJudges;
    });
  }, []);

  const fetchQuestions = useCallback(
    async (queueId?: string) => {
      if (!queueId) {
        setQuestions((prev) => (prev.length === 0 ? prev : []));
        return;
      }
      const { data: response } = await safeAsync(
        () => apiClient.get<string[]>(`/queue/questions?queue_id=${queueId}`),
        (err) => console.error('Failed to fetch questions', err),
      );
      if (!response) {
        return;
      }
      const nextQuestions = response.data ?? [];
      setQuestions((prev) => {
        const prevJson = JSON.stringify(prev);
        const nextJson = JSON.stringify(nextQuestions);
        return prevJson === nextJson ? prev : nextQuestions;
      });
    },
    [],
  );

  const fetchEvaluations = useCallback(async () => {
    setLoading(true);

    const query = buildQuery({
      queue_id: filters.queue_id,
      judge_id: filters.judge_ids,
      question_id: filters.question_ids,
      verdict: filters.verdict,
      page: filters.page,
      limit: filters.limit,
    });

    const { data: response, error: requestError } = await safeAsync(
      () => apiClient.get<EvaluationsResponse>(`/evaluations${query}`),
      (err) => console.error('Failed to fetch evaluations', err),
    );

    if (!response || requestError) {
      setError('Failed to fetch evaluations');
      setLoading(false);
      return;
    }

    const rows = response.data.evaluations ?? [];
    const totalRows = response.data.total ?? 0;
    const passes = response.data.pass_count ?? 0;

    setEvaluations((prev) => {
      const prevJson = JSON.stringify(prev);
      const nextJson = JSON.stringify(rows);
      return prevJson === nextJson ? prev : rows;
    });
    setTotal((prev) => (prev === totalRows ? prev : totalRows));
    setPassCount((prev) => (prev === passes ? prev : passes));
    setError('');
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    void fetchJudges();
  }, [fetchJudges]);

  useEffect(() => {
    void fetchQuestions(filters.queue_id);
  }, [fetchQuestions, filters.queue_id]);

  useEffect(() => {
    void fetchEvaluations();
  }, [fetchEvaluations]);

  return {
    evaluations,
    filters,
    setFilters,
    loading,
    error,
    total,
    judges,
    questions,
    passCount,
  };
}

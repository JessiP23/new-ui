import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/api';
import { safeAsync } from '../utils/safeAsync';
import type { Assignment, Judge, JobStatusCounts } from '../types';

type SelectedJudgesMap = Record<string, string[]>;

export function useQueue(queueId?: string) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [selectedJudges, setSelectedJudges] = useState<SelectedJudgesMap>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [assignmentsSaved, setAssignmentsSaved] = useState<boolean>(false);

  const hasQueue = useMemo(() => Boolean(queueId), [queueId]);

  const fetchJudges = useCallback(async () => {
    const { data, error: requestError } = await safeAsync(() => apiClient.get<Judge[]>("/judges"));
    if (requestError) {
      console.error(requestError);
      setError("Failed to fetch judges");
      return;
    }
    setError('');
    const nextJudges = data?.data ?? [];
    setJudges((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(nextJudges)) {
        return prev;
      }
      return nextJudges;
    });
  }, []);

  const fetchAssignments = useCallback(
    async (qid: string) => {
      const { data, error: requestError } = await safeAsync(() =>
        apiClient.get<Assignment[]>(`/queue/assignments${qid ? `?queue_id=${qid}` : ''}`),
      );
      if (requestError) {
        console.error(requestError);
        setError('Failed to fetch assignments');
        return;
      }

      setError('');
      const map: SelectedJudgesMap = {};
      (data?.data ?? []).forEach(({ question_id, judge_id }) => {
        map[question_id] = map[question_id] ? [...map[question_id], judge_id] : [judge_id];
      });
      setSelectedJudges(map);
    },
    [],
  );

  const fetchQuestions = useCallback(
    async (qid: string) => {
      if (!qid) return;
      setLoading(true);
      const { data, error: requestError } = await safeAsync(() =>
        apiClient.get<string[]>(`/queue/questions?queue_id=${qid}`),
      );
      if (requestError) {
        console.error(requestError);
        setError('Failed to fetch questions');
        setLoading(false);
        return;
      }

      const nextQuestions = data?.data ?? [];
      setQuestions(nextQuestions);
      await fetchAssignments(qid);
      setLoading(false);
    },
    [fetchAssignments],
  );

  useEffect(() => {
    void fetchJudges();
  }, [fetchJudges]);

  useEffect(() => {
    if (queueId) {
      setAssignmentsSaved(false);
      void fetchQuestions(queueId);
    }
  }, [queueId, fetchQuestions]);

  const saveAssignments = useCallback(async () => {
    if (!queueId) return;
    const payload: Assignment[] = [];
    const seen = new Set<string>();

    questions.forEach((questionId) => {
      (selectedJudges[questionId] ?? []).forEach((judgeId) => {
        const key = `${questionId}::${judgeId}`;
        if (seen.has(key)) return;
        seen.add(key);
        payload.push({ question_id: questionId, judge_id: judgeId, queue_id: queueId });
      });
    });

    const { error: requestError } = await safeAsync(() => apiClient.post('/queue/assignments', payload));
    if (requestError) {
      console.error(requestError);
      setError('Failed to save assignments');
      return;
    }

    await fetchAssignments(queueId);
    setError('');
    setAssignmentsSaved(true);
  }, [fetchAssignments, questions, queueId, selectedJudges]);

  const toggleJudge = useCallback((questionId: string, judgeId: string) => {
    setSelectedJudges((prev) => {
      const current = prev[questionId] || [];
      const exists = current.includes(judgeId);
      const next = exists ? current.filter((id) => id !== judgeId) : [...current, judgeId];
      return { ...prev, [questionId]: next };
    });
    setAssignmentsSaved(false);
  }, []);

  const fetchJobStatus = useCallback(async (): Promise<JobStatusCounts> => {
    if (!queueId) {
      return { pending: 0, running: 0, done: 0, failed: 0, total: 0 };
    }
    const { data, error: requestError } = await safeAsync(() =>
      apiClient.get<{ counts: Record<string, number>; total: number }>(
        `/diagnostics/job_status?queue_id=${queueId}`,
      ),
    );
    if (requestError) {
      console.error(requestError);
      return { pending: 0, running: 0, done: 0, failed: 0, total: 0 };
    }
    const counts = data?.data.counts ?? {};
    return {
      pending: counts.pending ?? 0,
      running: counts.running ?? 0,
      done: counts.done ?? 0,
      failed: counts.failed ?? 0,
      total: data?.data.total ?? 0,
    };
  }, [queueId]);

  return {
    queueReady: hasQueue,
    questions,
    judges,
    selectedJudges,
    loading,
    error,
    toggleJudge,
    saveAssignments,
    refreshQuestions: fetchQuestions,
    fetchJobStatus,
    assignmentsSaved,
  };
}

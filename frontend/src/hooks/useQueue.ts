import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/api';
import type { Assignment, Judge, JobStatusCounts } from '../types';

type SelectedJudgesMap = Record<string, string[]>;

export function useQueue(queueId?: string) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [selectedJudges, setSelectedJudges] = useState<SelectedJudgesMap>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const hasQueue = useMemo(() => Boolean(queueId), [queueId]);

  const fetchJudges = useCallback(async () => {
    try {
      const response = await apiClient.get<Judge[]>('/judges');
      setJudges(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch judges');
    }
  }, []);

  const fetchAssignments = useCallback(
    async (qid: string) => {
      try {
        const response = await apiClient.get<Assignment[]>(`/queue/assignments${qid ? `?queue_id=${qid}` : ''}`);
        const map: SelectedJudgesMap = {};
        (response.data || []).forEach((assignment) => {
          const { question_id, judge_id } = assignment;
          if (!map[question_id]) {
            map[question_id] = [];
          }
          map[question_id].push(judge_id);
        });
        setSelectedJudges(map);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch assignments');
      }
    },
    [],
  );

  const fetchQuestions = useCallback(
    async (qid: string) => {
      if (!qid) return;
      setLoading(true);
      try {
        const response = await apiClient.get<string[]>(`/queue/questions?queue_id=${qid}`);
        setQuestions(response.data || []);
        await fetchAssignments(qid);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch questions');
      } finally {
        setLoading(false);
      }
    },
    [fetchAssignments],
  );

  useEffect(() => {
    void fetchJudges();
  }, [fetchJudges]);

  useEffect(() => {
    if (queueId) {
      void fetchQuestions(queueId);
    }
  }, [queueId, fetchQuestions]);

  const saveAssignments = useCallback(async () => {
    if (!queueId) return;
    const payload: Assignment[] = [];
    questions.forEach((questionId) => {
      (selectedJudges[questionId] || []).forEach((judgeId) => {
        payload.push({ question_id: questionId, judge_id: judgeId, queue_id: queueId });
      });
    });
    try {
      await apiClient.post('/queue/assignments', payload);
      await fetchAssignments(queueId);
    } catch (err) {
      console.error(err);
      setError('Failed to save assignments');
    }
  }, [fetchAssignments, questions, queueId, selectedJudges]);

  const toggleJudge = useCallback((questionId: string, judgeId: string) => {
    setSelectedJudges((prev) => {
      const current = prev[questionId] || [];
      const exists = current.includes(judgeId);
      const next = exists ? current.filter((id) => id !== judgeId) : [...current, judgeId];
      return { ...prev, [questionId]: next };
    });
  }, []);

  const fetchJobStatus = useCallback(async (): Promise<JobStatusCounts> => {
    if (!queueId) {
      return { pending: 0, running: 0, done: 0, failed: 0, total: 0 };
    }
    try {
      const response = await apiClient.get<{ counts: Record<string, number>; total: number }>(
        `/diagnostics/job_status?queue_id=${queueId}`,
      );
      const counts = response.data.counts ?? {};
      return {
        pending: counts.pending ?? 0,
        running: counts.running ?? 0,
        done: counts.done ?? 0,
        failed: counts.failed ?? 0,
        total: response.data.total ?? 0,
      };
    } catch (err) {
      console.error(err);
      return { pending: 0, running: 0, done: 0, failed: 0, total: 0 };
    }
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
  };
}

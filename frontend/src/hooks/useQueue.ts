import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../lib/api';
import { safeAsync } from '../utils/safeAsync';
import type { Assignment, Judge, JobStatusCounts } from '../types';

type SelectedJudgesMap = Record<string, string[]>;

interface AssignmentSummary {
  queue_id: string;
  assignment_set_id: string;
  assignments_count: number;
  submissions_count: number;
  expected_evaluations: number;
}

export function useQueue(queueId?: string) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [selectedJudges, setSelectedJudges] = useState<SelectedJudgesMap>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [assignmentsSaved, setAssignmentsSaved] = useState<boolean>(false);
  const [assignmentSummary, setAssignmentSummary] = useState<AssignmentSummary | null>(null); // REFACTORED by GPT-5 — preserve backend summary details
  const lastLoadedQueueRef = useRef<string | null>(null);

  const fetchJudges = useCallback(async () => {
    const { data, error: requestError } = await safeAsync(() => apiClient.get<Judge[]>('/judges'));
    if (requestError) {
      console.error(requestError);
      setError('Failed to fetch judges');
      return;
    }
    setError('');
    setJudges(data?.data ?? []);
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

      const items = data?.data ?? [];
      if (lastLoadedQueueRef.current !== qid) {
        return;
      }
      const map = items.reduce<SelectedJudgesMap>((acc, { question_id, judge_id }) => {
        (acc[question_id] ||= []).push(judge_id);
        return acc;
      }, {});
      setError('');
      setSelectedJudges(map);
      setAssignmentsSaved(items.length > 0);
    },
    [lastLoadedQueueRef],
  );

  const fetchQuestions = useCallback(
    async (qid: string) => {
      if (!qid) return;
      setLoading(true);
      try {
        const { data, error: requestError } = await safeAsync(() =>
          apiClient.get<string[]>(`/queue/questions?queue_id=${qid}`),
        );
        if (requestError) {
          console.error(requestError);
          setError('Failed to fetch questions');
          return;
        }

        const nextQuestions = data?.data ?? [];
        if (lastLoadedQueueRef.current !== qid) {
          return;
        }
        setQuestions(nextQuestions);
        await fetchAssignments(qid);
      } finally {
        setLoading(false);
      }
    },
    [fetchAssignments, lastLoadedQueueRef],
  );

  useEffect(() => {
    void fetchJudges();
  }, [fetchJudges]);

  useEffect(() => {
    if (!queueId) {
      lastLoadedQueueRef.current = null;
      setQuestions([]);
      setSelectedJudges({});
      setAssignmentsSaved(false);
      setAssignmentSummary(null); // REFACTORED by GPT-5 — reset summary when queue changes
      return;
    }

    if (lastLoadedQueueRef.current === queueId) {
      return;
    }

    lastLoadedQueueRef.current = queueId;
    setAssignmentsSaved(false);
    setAssignmentSummary(null);
    void fetchQuestions(queueId);
  }, [queueId, fetchQuestions]);

  const saveAssignments = useCallback(async () => {
    if (!queueId) return;
    const seen = new Set<string>();
    const payload = questions.flatMap<Assignment>((questionId) => {
      const judgesForQuestion = selectedJudges[questionId] ?? [];
      return judgesForQuestion.reduce<Assignment[]>((acc, judgeId) => {
        const key = `${questionId}::${judgeId}`;
        if (seen.has(key)) {
          return acc;
        }
        seen.add(key);
        acc.push({ question_id: questionId, judge_id: judgeId, queue_id: queueId });
        return acc;
      }, []);
    });

    const { data: response, error: requestError } = await safeAsync(() => apiClient.post('/queue/assignments', payload));
    if (requestError) {
      console.error(requestError);
      setError('Failed to save assignments');
      setAssignmentSummary(null); // REFACTORED by GPT-5 — clear summary on failure
      return;
    }

    setError('');
    setAssignmentsSaved(payload.length > 0);
    if (!payload.length) {
      setSelectedJudges({});
      setAssignmentSummary(null);
    }
    const summary = (response?.data as { summary?: AssignmentSummary })?.summary;
    setAssignmentSummary(summary ?? null);
    await fetchAssignments(queueId);
  }, [fetchAssignments, questions, queueId, selectedJudges]);

  const toggleJudge = useCallback((questionId: string, judgeId: string) => {
    setSelectedJudges((prev) => {
      const current = prev[questionId] || [];
      const exists = current.includes(judgeId);
      const next = exists ? current.filter((id) => id !== judgeId) : [...current, judgeId];
      if (!next.length) {
        const { [questionId]: _removed, ...rest } = prev;
        return rest;
      }
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
    queueReady: Boolean(queueId),
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
    assignmentSummary,
  };
}

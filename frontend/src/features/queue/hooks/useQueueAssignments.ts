// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Orchestrates queue assignments, persistence, and evaluation run telemetry.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchJudges } from "../../../services/judgesService";
import {
  createJobStatusStream,
  fetchAssignments as fetchAssignmentsService,
  fetchJobStatus as fetchJobStatusService,
  fetchQueueQuestions,
  runQueue as runQueueService,
  saveAssignments as saveAssignmentsService,
} from "../../../services/queueService";
import type { AssignmentMap, JobStatus, QueueQuestion } from "../../../types/queue";
import type { Judge } from "../../../types/judge";
import type { StatusMessage } from "../../../types/status";

interface UseQueueAssignmentsOptions {
  queueId?: string;
}

interface UseQueueAssignmentsState {
  questions: QueueQuestion[];
  judges: Judge[];
  assignments: AssignmentMap;
  isLoading: boolean;
  isSaving: boolean;
  isRunning: boolean;
  status: StatusMessage | null;
  jobStatus: JobStatus | null;
  progressPercent: number;
  toggleAssignment: (questionId: string, judgeId: string) => void;
  saveAssignments: () => Promise<void>;
  runQueue: () => Promise<void>;
  resetStatus: () => void;
  refresh: () => Promise<void>;
}

const buildMapFromAssignments = (entries: { questionId: string; judgeId: string }[]): AssignmentMap => {
  return entries.reduce<AssignmentMap>((acc, entry) => {
    if (!acc[entry.questionId]) acc[entry.questionId] = [];
    if (!acc[entry.questionId].includes(entry.judgeId)) {
      acc[entry.questionId].push(entry.judgeId);
    }
    return acc;
  }, {});
};

export const useQueueAssignments = ({ queueId }: UseQueueAssignmentsOptions): UseQueueAssignmentsState => {
  const [questions, setQuestions] = useState<QueueQuestion[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [isLoading, setLoading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isRunning, setRunning] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);

  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<number | null>(null);
  const totalJobs = useRef<number>(0);

  const progressPercent = useMemo(() => {
    if (!jobStatus) return 0;
    const finished = (jobStatus.counts.done ?? 0) + (jobStatus.counts.failed ?? 0);
    const total = jobStatus.total || totalJobs.current || 1;
    return Math.min(100, Math.round((finished / total) * 100));
  }, [jobStatus]);

  const cleanupStreams = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => cleanupStreams, [cleanupStreams]);

  const refreshJudges = useCallback(async () => {
    const data = await fetchJudges();
    setJudges(data.filter((judge) => judge.active));
  }, []);

  const refreshQuestions = useCallback(async () => {
    if (!queueId) return;
    const entries = await fetchQueueQuestions(queueId);
    setQuestions(entries);
  }, [queueId]);

  const refreshAssignments = useCallback(async () => {
    if (!queueId) return;
    const records = await fetchAssignmentsService(queueId);
    const map = buildMapFromAssignments(records.map((item) => ({ questionId: item.questionId, judgeId: item.judgeId })));
    setAssignments(map);
  }, [queueId]);

  const refresh = useCallback(async () => {
    if (!queueId) return;
    setLoading(true);
    try {
      await Promise.all([refreshJudges(), refreshQuestions(), refreshAssignments()]);
      setStatus(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load queue.";
      setStatus({ tone: "error", description: message });
    } finally {
      setLoading(false);
    }
  }, [queueId, refreshAssignments, refreshJudges, refreshQuestions]);

  useEffect(() => {
    if (!queueId) {
      setQuestions([]);
      setAssignments({});
      setJobStatus(null);
      return;
    }
    void refresh();
  }, [queueId, refresh]);

  const toggleAssignment = useCallback((questionId: string, judgeId: string) => {
    setAssignments((prev) => {
      const current = prev[questionId] ?? [];
      const exists = current.includes(judgeId);
      const next = exists ? current.filter((id) => id !== judgeId) : [...current, judgeId];
      return { ...prev, [questionId]: next };
    });
  }, []);

  const saveAssignments = useCallback(async () => {
    if (!queueId) return;
    setSaving(true);
    setStatus({ tone: "info", description: "Saving assignments…" });
    try {
      await saveAssignmentsService(queueId, assignments);
      setStatus({ tone: "success", title: "Assignments saved", description: "Your judges have been mapped to questions." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save assignments.";
      setStatus({ tone: "error", description: message });
    } finally {
      setSaving(false);
    }
  }, [assignments, queueId]);

  const pollJobStatus = useCallback(async () => {
    if (!queueId) return;
    try {
      const statusResponse = await fetchJobStatusService(queueId);
      setJobStatus(statusResponse);
      if (statusResponse.total) {
        totalJobs.current = statusResponse.total;
      }
      const remaining = (statusResponse.counts.pending ?? 0) + (statusResponse.counts.running ?? 0);
      if (remaining === 0) {
        cleanupStreams();
        setRunning(false);
        setStatus({ tone: "success", title: "Evaluations complete", description: "View results to analyse verdicts." });
      }
    } catch (error) {
      setStatus({ tone: "error", description: error instanceof Error ? error.message : "Failed to fetch job status." });
    }
  }, [cleanupStreams, queueId]);

  const runQueue = useCallback(async () => {
    if (!queueId) return;
    setRunning(true);
    setStatus({ tone: "info", description: "Queue running. Tracking job status…" });
    cleanupStreams();
    totalJobs.current = 0;
    setJobStatus(null);

    try {
      const { enqueued } = await runQueueService(queueId);
      totalJobs.current = enqueued;

      try {
        const stream = createJobStatusStream(queueId);
        sseRef.current = stream;
        stream.onmessage = (event) => {
          const payload = JSON.parse(event.data) as JobStatus;
          setJobStatus(payload);
          if (payload.total) {
            totalJobs.current = payload.total;
          }
          const remaining = (payload.counts.pending ?? 0) + (payload.counts.running ?? 0);
          if (remaining === 0) {
            cleanupStreams();
            setRunning(false);
            setStatus({ tone: "success", title: "Evaluations complete", description: "View results to analyse verdicts." });
          }
        };
        stream.onerror = () => {
          cleanupStreams();
          pollRef.current = window.setInterval(() => {
            void pollJobStatus();
          }, 2000);
        };
      } catch {
        pollRef.current = window.setInterval(() => {
          void pollJobStatus();
        }, 2000);
      }
    } catch (error) {
      setRunning(false);
      const message = error instanceof Error ? error.message : "Unable to start queue.";
      setStatus({ tone: "error", description: message });
    }
  }, [cleanupStreams, pollJobStatus, queueId]);

  const resetStatus = useCallback(() => setStatus(null), []);

  return {
    questions,
    judges,
    assignments,
    isLoading,
    isSaving,
    isRunning,
    status,
    jobStatus,
    progressPercent,
    toggleAssignment,
    saveAssignments,
    runQueue,
    resetStatus,
    refresh,
  };
};

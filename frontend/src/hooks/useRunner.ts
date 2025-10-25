import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../lib/api';
import { safeAsync } from '../utils/safeAsync';
import type { JobStatusCounts } from '../types';

type StatusPayload = {
    counts?: Record<string, number>;
    total?: number;
};

interface RunnerState {
    running: boolean;
    progress: number;
    message: string;
    counts: JobStatusCounts | null;
}

interface RunResult {
    success: boolean;
    enqueued: number;
}

const initialState: RunnerState = {
    running: false,
    progress: 0,
    message: '',
    counts: null,
};

const hydrateCounts = (payload?: StatusPayload): JobStatusCounts => {
    const counts = payload?.counts ?? {};
    return {
        pending: counts.pending ?? 0,
        running: counts.running ?? 0,
        done: counts.done ?? 0,
        failed: counts.failed ?? 0,
        total: payload?.total ?? 0,
    };
};

const computeProgress = (counts: JobStatusCounts): number => {
    const total = counts.total ?? 0;
    if (!total) return 0;
    const finished = (counts.done ?? 0) + (counts.failed ?? 0);
    return Math.min(100, Math.max(0, Math.round((finished / total) * 100)));
};

export function useRunner(queueId?: string) {
    const [state, setState] = useState<RunnerState>(initialState);
    const pollIntervalRef = useRef<number | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    const stopMonitoring = useCallback(() => {
        if (pollIntervalRef.current) {
            window.clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    }, []);

    useEffect(() => stopMonitoring, [stopMonitoring]);

    const applyCounts = useCallback((counts: JobStatusCounts, message?: string) => {
            const progress = computeProgress(counts);
            const isComplete = counts.total > 0 && counts.pending + counts.running === 0;
            setState((prev) => ({
                ...prev,
                counts,
                progress,
                running: isComplete ? false : prev.running,
                message:
                    message ??
                    (isComplete
                        ? `Processing complete — ${counts.done + counts.failed}/${counts.total} finished.`
                        : prev.message),
            }));
            if (isComplete) {
                stopMonitoring();
            }
        },
        [stopMonitoring],
    );

    const fetchJobStatus = useCallback(async (): Promise<JobStatusCounts | null> => {
        if (!queueId) {
            return null;
        }
        const { data, error } = await safeAsync(() =>
            apiClient.get<StatusPayload>(`/diagnostics/job_status?queue_id=${queueId}`),
        );
        if (error) {
            console.error('Failed to fetch job status', error);
            return null;
        }
        return hydrateCounts(data?.data);
    }, [queueId]);

    const refreshStatus = useCallback(async () => {
        const counts = await fetchJobStatus();
        if (counts) {
            applyCounts(counts);
        }
        return counts;
    }, [applyCounts, fetchJobStatus]);

    const startPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            return;
        }
        pollIntervalRef.current = window.setInterval(() => {
            void refreshStatus();
        }, 1500);
    }, [refreshStatus]);

    const beginMonitoring = useCallback(
        (expectedTotal: number) => {
            if (!queueId) {
                return;
            }
            stopMonitoring();
            const sseUrl = `${apiClient.defaults.baseURL}/diagnostics/live_job_status?queue_id=${queueId}`;
            try {
                eventSourceRef.current = new EventSource(sseUrl);
                eventSourceRef.current.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data) as StatusPayload;
                        const counts = hydrateCounts({
                            counts: payload.counts ?? {},
                            total: payload.total ?? expectedTotal,
                        });
                        applyCounts(counts);
                    } catch (err) {
                        console.error('Failed to parse SSE payload', err);
                    }
                };
                eventSourceRef.current.onerror = () => {
                    stopMonitoring();
                    startPolling();
                };
            } catch (err) {
                console.warn('SSE unavailable, falling back to polling', err);
                startPolling();
            }
        },
        [applyCounts, queueId, startPolling, stopMonitoring],
    );

    const runEvaluations = useCallback(async (): Promise<RunResult> => {
        if (!queueId) {
            setState((prev) => ({ ...prev, message: 'No queue selected.' }));
            return { success: false, enqueued: 0 };
        }
        stopMonitoring();
        setState({
            running: true,
            progress: 0,
            message: `Starting evaluations for queue ${queueId}...`,
            counts: null,
        });

        const { data, error } = await safeAsync(() =>
            apiClient.post(`/queue/run`, null, { params: { queue_id: queueId } }),
        );
        if (error) {
            console.error(error);
            setState((prev) => ({ ...prev, running: false, message: 'Failed to run evaluations.' }));
            return { success: false, enqueued: 0 };
        }

        const enqueued = data?.data?.enqueued ?? 0;
        if (enqueued === 0) {
            setState({
                running: false,
                progress: 100,
                message: 'No evaluations enqueued for this queue.',
                counts: null,
            });
            return { success: true, enqueued: 0 };
        }

        const initialCounts: JobStatusCounts = {
            pending: enqueued,
            running: 0,
            done: 0,
            failed: 0,
            total: enqueued,
        };
        applyCounts(initialCounts, `Enqueued ${enqueued} jobs — monitoring progress...`);
        beginMonitoring(enqueued);
        return { success: true, enqueued };
    }, [applyCounts, beginMonitoring, queueId, stopMonitoring]);

    return {
        running: state.running,
        progress: state.progress,
        message: state.message,
        counts: state.counts,
        runEvaluations,
        refreshStatus,
    };
}

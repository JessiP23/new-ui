import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../lib/api';
import { safeAsync } from '../utils/safeAsync';
import type { JobStatusCounts } from '../types';

interface RunnerState {
    running: boolean;
    progress: number;
    message: string;
    counts: JobStatusCounts | null;
}

const initialState: RunnerState = {
    running: false,
    progress: 0,
    message: '',
    counts: null,
};

export function useRunner(queueId?: string) {
    const [state, setState] = useState<RunnerState>(initialState);
    const pollIntervalRef = useRef<number | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    const cleanup = useCallback(() => {
        if (pollIntervalRef.current) {
            window.clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    }, []);

    useEffect(() => cleanup, [cleanup]);

    const updateState = useCallback((partial: Partial<RunnerState>) => {
        setState((prev) => ({ ...prev, ...partial }));
    }, []);

    const computeProgress = (counts: JobStatusCounts, total: number) => {
        const finished = (counts.done ?? 0) + (counts.failed ?? 0);
        const base = total > 0 ? Math.round((finished / total) * 100) : 0;
        return Math.min(100, Math.max(0, base));
    };

    const fetchJobStatus = useCallback(async () => {
        if (!queueId) return;
        const { data, error } = await safeAsync(() =>
            apiClient.get<{ counts: Record<string, number>; total: number }>(
                `/diagnostics/job_status?queue_id=${queueId}`,
            ),
        );
        if (error) {
            console.error('Failed to fetch job status', error);
            return;
        }

        const counts = {
            pending: data?.data.counts.pending ?? 0,
            running: data?.data.counts.running ?? 0,
            done: data?.data.counts.done ?? 0,
            failed: data?.data.counts.failed ?? 0,
            total: data?.data.total ?? 0,
        } satisfies JobStatusCounts;
        const progress = computeProgress(counts, counts.total);
        updateState({ counts, progress });
        if (counts.total > 0 && counts.pending + counts.running === 0) {
            updateState({ running: false, message: `Processing complete — ${counts.done + counts.failed}/${counts.total} finished.` });
            cleanup();
        }
    }, [cleanup, queueId, updateState]);

    const runEvaluations = useCallback(async () => {
        if (!queueId) {
            updateState({ message: 'No queue selected.' });
            return;
        }
        updateState({ running: true, message: `Starting evaluations for queue ${queueId}...`, progress: 0, counts: null });
        cleanup();

        try {
            const { data, error } = await safeAsync(() =>
                apiClient.post(`/queue/run`, null, { params: { queue_id: queueId } }),
            );
            if (error) {
                throw error;
            }
            const enqueued = data?.data?.enqueued ?? 0;
            updateState({ message: `Enqueued ${enqueued} jobs — monitoring progress...` });

            const sseUrl = `${apiClient.defaults.baseURL}/diagnostics/live_job_status?queue_id=${queueId}`;
            try {
                eventSourceRef.current = new EventSource(sseUrl);
                eventSourceRef.current.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data) as { counts: Record<string, number>; total: number };
                        const counts: JobStatusCounts = {
                            pending: payload.counts.pending ?? 0,
                            running: payload.counts.running ?? 0,
                            done: payload.counts.done ?? 0,
                            failed: payload.counts.failed ?? 0,
                            total: payload.total ?? enqueued,
                        };
                        const progress = computeProgress(counts, counts.total);
                        updateState({ counts, progress });
                        if ((counts.pending + counts.running === 0) && counts.total > 0) {
                            updateState({
                                running: false,
                                message: `Processing complete — ${counts.done + counts.failed}/${counts.total} finished (${progress}%).`,
                            });
                            cleanup();
                        }
                    } catch (err) {
                        console.error('Failed to parse SSE payload', err);
                    }
                };
                eventSourceRef.current.onerror = () => {
                    cleanup();
                    pollIntervalRef.current = window.setInterval(() => {
                        void fetchJobStatus();
                    }, 1500);
                };
            } catch (err) {
                console.warn('SSE unavailable, falling back to polling', err);
                pollIntervalRef.current = window.setInterval(() => {
                    void fetchJobStatus();
                }, 1500);
                await fetchJobStatus();
            }
        } catch (err) {
            console.error(err);
            updateState({ running: false, message: 'Failed to run evaluations.' });
            cleanup();
        }
    }, [cleanup, fetchJobStatus, queueId, updateState]);

    return {
        running: state.running,
        progress: state.progress,
        message: state.message,
        counts: state.counts,
        runEvaluations,
        refreshStatus: fetchJobStatus,
    };
}

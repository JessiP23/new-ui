import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import { apiClient } from '../lib/api';
import type { JudgeXCapabilities, JudgeXMode, JudgeXResponse } from '../types';
import { safeAsync } from '../utils/safeAsync';

interface RunOptions {
    mode?: JudgeXMode;
    extraTasks?: string[];
    skipAutoRetry?: boolean;
}

interface UseJudgeXState {
    loading: boolean;
    result: JudgeXResponse | null;
    error: string | null;
    capabilities: JudgeXCapabilities | null;
    runJudgeX: (answer: string, options?: RunOptions) => Promise<void>;
}

export function useJudgeX(): UseJudgeXState {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<JudgeXResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [capabilities, setCapabilities] = useState<JudgeXCapabilities | null>(null);

    useEffect(() => {
        safeAsync(async () => {
            const { data } = await apiClient.get<JudgeXCapabilities>('/judgex/capabilities');
            setCapabilities(data);
            return data;
        }).then((result) => {
            if (!result.data) {
                setCapabilities(null);
            }
        });
    }, []);

    const runJudgeX = useCallback(async (answer: string, options?: RunOptions) => {
        const mode = options?.mode ?? 'standard';
        const endpoint = mode === 'adaptive' ? '/judgex/judge/adaptive' : '/judgex/judge';
        setLoading(true);
        setError(null);
        try {
            const payload = {
                answer,
                mode,
                extra_tasks: options?.extraTasks?.length ? options.extraTasks : undefined,
                skip_auto_retry: options?.skipAutoRetry ?? false,
            };
            const { data } = await apiClient.post<JudgeXResponse>(endpoint, payload);
            setResult(data);
        } catch (err) {
            const axiosError = err as AxiosError<{ detail?: string }>;
            if (axiosError?.response?.data?.detail) {
                setError(axiosError.response.data.detail ?? '');
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Unable to run JudgeX workflow');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    return useMemo(
        () => ({ loading, result, error, capabilities, runJudgeX }),
        [loading, result, error, capabilities, runJudgeX],
    );
}

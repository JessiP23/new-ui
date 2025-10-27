import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useWorkflow } from '../contexts/workflowContext';
import { useQueue } from '../hooks/useQueue';
import { useRunner } from '../hooks/useRunner';
import { apiClient } from '../lib/api';
import { safeAsync } from '../utils/safeAsync';
import type { Assignment } from '../types';

type SelectedJudgesMap = Record<string, string[]>;

export default function QueuePage() {
    const navigate = useNavigate();
    const { queueIds, lastQueueId, setLastQueueId, setCurrentStep, markCompleted } = useWorkflow();
    const [activeQueueId, setActiveQueueId] = useState<string>(lastQueueId);
    const [queueStatuses, setQueueStatuses] = useState<Record<string, 'idle' | 'queued' | 'running' | 'done' | 'error'>>({});
    const [selectedJudgesCache, setSelectedJudgesCache] = useState<Record<string, SelectedJudgesMap>>({});
    const [bulkRunning, setBulkRunning] = useState(false);
    const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
    const {
        queueReady,
        questions,
        judges,
        selectedJudges,
        loading,
        error,
        toggleJudge,
        saveAssignments,
        assignmentsSaved,
        assignmentSummary,
    } = useQueue(activeQueueId);
    const { running, progress, message, counts, runEvaluations } = useRunner(activeQueueId);

    const queueOptions = useMemo(() => queueIds.filter((id) => id.trim().length > 0), [queueIds]);

    useEffect(() => {
        if (!activeQueueId) {
            return;
        }
        setSelectedJudgesCache((prev) => ({
            ...prev,
            [activeQueueId]: selectedJudges,
        }));
    }, [activeQueueId, selectedJudges]);

    useEffect(() => {
        if (!queueOptions.length) {
            setQueueStatuses({});
            return;
        }
        setQueueStatuses((prev) => {
            const next: Record<string, 'idle' | 'queued' | 'running' | 'done' | 'error'> = {};
            queueOptions.forEach((queueId) => {
                next[queueId] = prev[queueId] ?? 'idle';
            });
            return next;
        });
    }, [queueOptions]);

    useEffect(() => {
        if (!queueOptions.length) {
            if (activeQueueId) {
                setActiveQueueId('');
                setLastQueueId('');
            }
            return;
        }

        if (activeQueueId && queueOptions.includes(activeQueueId)) {
            if (lastQueueId !== activeQueueId) {
                setLastQueueId(activeQueueId);
            }
            return;
        }

        const fallback = queueOptions.includes(lastQueueId) ? lastQueueId : queueOptions[0];
        setActiveQueueId(fallback);
        setLastQueueId(fallback);
    }, [activeQueueId, lastQueueId, setLastQueueId, queueOptions]);

    const canSave = queueReady && questions.length > 0 && !running && !loading;
    const canRun = assignmentsSaved && questions.length > 0 && !running;

    useEffect(() => {
        if (!activeQueueId) return;
        if (!counts) return;
        if (counts.total === 0) {
            setQueueStatuses((prev) => ({ ...prev, [activeQueueId]: 'done' }));
            return;
        }
        if (counts.pending + counts.running === 0) {
            setQueueStatuses((prev) => ({ ...prev, [activeQueueId]: 'done' }));
            return;
        }
        setQueueStatuses((prev) => ({ ...prev, [activeQueueId]: 'running' }));
    }, [counts, activeQueueId]);

    useEffect(() => {
        setCurrentStep('queue');
    }, [setCurrentStep]);

    useEffect(() => {
        if (redirectCountdown !== null) return;
        if (!running && counts && counts.total > 0 && (counts.pending + counts.running) === 0) {
            setRedirectCountdown(5);
        }
    }, [running, counts, redirectCountdown]);

    useEffect(() => {
        if (redirectCountdown === null) {
            return;
        }
        if (redirectCountdown <= 0) {
            navigate('/results');
            return;
        }
        const timer = window.setTimeout(() => {
            setRedirectCountdown((prev) => (prev === null ? prev : prev - 1));
        }, 1000);
        return () => {
            window.clearTimeout(timer);
        };
    }, [navigate, redirectCountdown]);

    const getJudgeSet = (queueId: string): Set<string> => {
        const cached = selectedJudgesCache[queueId] ?? selectedJudgesCache[activeQueueId] ?? selectedJudges;
        const judgeSet = new Set<string>();
        Object.values(cached ?? {}).forEach((list) => {
            list.forEach((judgeId) => {
                judgeSet.add(judgeId);
            });
        });
        return judgeSet;
    };

    const ensureAssignments = async (queueId: string): Promise<boolean> => {
        if (!queueId) {
            return false;
        }

        if (queueId === activeQueueId && !assignmentsSaved) {
            await saveAssignments();
        }

        const { data: existingResponse } = await safeAsync(() =>
            apiClient.get<Assignment[]>(`/queue/assignments`, { params: { queue_id: queueId } }),
        );
        const existingAssignments = existingResponse?.data ?? [];
        if (existingAssignments.length > 0) {
            return true;
        }

        const judgeSet = getJudgeSet(queueId);
        if (!judgeSet.size) {
            setQueueStatuses((prev) => ({ ...prev, [queueId]: 'error' }));
            return false;
        }

        const { data: questionsResponse } = await safeAsync(() =>
            apiClient.get<string[]>(`/queue/questions?queue_id=${queueId}`),
        );
        const questionIds = questionsResponse?.data ?? [];
        if (!questionIds.length) {
            setQueueStatuses((prev) => ({ ...prev, [queueId]: 'error' }));
            return false;
        }

        const payload = questionIds.flatMap((questionId) =>
            Array.from(judgeSet).map((judgeId) => ({
                question_id: questionId,
                judge_id: judgeId,
                queue_id: queueId,
            })),
        );

        const { error: saveError } = await safeAsync(() => apiClient.post('/queue/assignments', payload));
        if (saveError) {
            setQueueStatuses((prev) => ({ ...prev, [queueId]: 'error' }));
            return false;
        }

        setSelectedJudgesCache((prev) => ({
            ...prev,
            [queueId]: questionIds.reduce<SelectedJudgesMap>((acc, questionId) => {
                acc[questionId] = Array.from(judgeSet);
                return acc;
            }, {}),
        }));

        return true;
    };

    const handleRun = async (navigateOnEmpty = true): Promise<boolean> => {
        if (!activeQueueId) {
            return false;
        }
        const ready = await ensureAssignments(activeQueueId);
        if (!ready) {
            setQueueStatuses((prev) => ({ ...prev, [activeQueueId]: 'error' }));
            return false;
        }
        setRedirectCountdown(null);
        setQueueStatuses((prev) => ({ ...prev, [activeQueueId]: 'running' }));
        const result = await runEvaluations();
        if (!result.success) {
            setQueueStatuses((prev) => ({ ...prev, [activeQueueId]: 'error' }));
            return false;
        }
        markCompleted('queue');
        if (result.enqueued === 0) {
            setQueueStatuses((prev) => ({ ...prev, [activeQueueId]: 'done' }));
            if (navigateOnEmpty) {
                navigate('/results');
            }
        }
        return true;
    };

    const runQueueWithoutMonitor = async (queueId: string): Promise<boolean> => {
        if (!queueId) {
            return false;
        }
        const ready = await ensureAssignments(queueId);
        if (!ready) {
            return false;
        }
        setQueueStatuses((prev) => ({ ...prev, [queueId]: 'queued' }));
        const { data, error } = await safeAsync(() =>
            apiClient.post(`/queue/run`, null, { params: { queue_id: queueId } }),
        );
        if (error || !data) {
            setQueueStatuses((prev) => ({ ...prev, [queueId]: 'error' }));
            return false;
        }
        const enqueued = data.data?.enqueued ?? 0;
        setQueueStatuses((prev) => ({ ...prev, [queueId]: enqueued === 0 ? 'done' : 'queued' }));
        return true;
    };

    const handleRunAll = async () => {
        if (!queueOptions.length) {
            return;
        }
        setBulkRunning(true);
        try {
            for (const queueId of queueOptions) {
                const success =
                    queueId === activeQueueId ? await handleRun(false) : await runQueueWithoutMonitor(queueId);
                if (!success) {
                    break;
                }
            }
        } finally {
            setBulkRunning(false);
        }
    };

    const statusLabel = (status: 'idle' | 'queued' | 'running' | 'done' | 'error') => {
        switch (status) {
            case 'queued':
                return 'Queued';
            case 'running':
                return 'Running';
            case 'done':
                return 'Complete';
            case 'error':
                return 'Needs attention';
            default:
                return 'Idle';
        }
    };

    const statusClassNames = (status: 'idle' | 'queued' | 'running' | 'done' | 'error') => {
        switch (status) {
            case 'queued':
                return 'border-indigo-200 bg-indigo-50 text-indigo-600';
            case 'running':
                return 'border-amber-200 bg-amber-50 text-amber-600';
            case 'done':
                return 'border-emerald-200 bg-emerald-50 text-emerald-600';
            case 'error':
                return 'border-rose-200 bg-rose-50 text-rose-600';
            default:
                return 'border-slate-200 bg-slate-50 text-slate-600';
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Queue management</h1>
                    <p className="text-sm text-slate-500">
                        {activeQueueId
                            ? `Assign judges to questions for queue ${activeQueueId}.`
                            : 'Upload submissions first to generate a queue ID.'}
                    </p>
                </div>
                <Button
                    variant="secondary"
                    onClick={() => {
                        markCompleted('queue');
                        navigate('/results');
                    }}
                >
                    Skip to results
                </Button>
            </div>

            {redirectCountdown !== null ? (
                <div className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
                    Redirecting to results in {redirectCountdown}s. Keep this tab open while evaluations finish.
                </div>
            ) : null}

            {!queueReady ? (
                <EmptyState
                    title="No queue selected"
                    description="Upload submissions to generate a queue before assigning judges."
                    action={<Button onClick={() => navigate('/upload')}>Go to upload</Button>}
                />
            ) : (
                <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                    {queueOptions.length > 1 ? (
                        <div className="lg:col-span-2">
                            <Card>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">Active queue</p>
                                        <p className="text-xs text-slate-500">
                                            {`Processing ${queueOptions.length} queues from the latest upload.`}
                                        </p>
                                    </div>
                                    <select
                                        value={activeQueueId}
                                        onChange={(event) => {
                                            const next = event.target.value;
                                            setActiveQueueId(next);
                                            setLastQueueId(next);
                                        }}
                                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                                    >
                                        {queueOptions.map((queueId) => (
                                            <option key={queueId} value={queueId}>
                                                {queueId}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {queueOptions.map((queueId) => {
                                        const status = queueStatuses[queueId] ?? 'idle';
                                        return (
                                            <span
                                                key={queueId}
                                                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusClassNames(status)}`}
                                            >
                                                <span className="truncate max-w-[140px]" title={queueId}>
                                                    {queueId}
                                                </span>
                                                <span>•</span>
                                                <span>{statusLabel(status)}</span>
                                            </span>
                                        );
                                    })}
                                </div>
                            </Card>
                        </div>
                    ) : null}

                    <Card title="Questions" description="Select one or more judges for each label question.">
                        {loading ? (
                            <Loading label="Loading queue" />
                        ) : error ? (
                            <p className="text-sm text-red-500">{error}</p>
                        ) : questions.length === 0 ? (
                            <EmptyState title="No questions detected" description="Ensure submissions include question metadata." />
                        ) : (
                            <div className="space-y-4">
                                {questions.map((questionId) => (
                                    <div key={questionId} className="rounded-lg border border-slate-200 bg-white p-4">
                                        <h3 className="text-sm font-semibold text-slate-800">Question: {questionId}</h3>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {judges.map((judge) => {
                                                const checked = (selectedJudges[questionId] || []).includes(judge.id);
                                                return (
                                                    <label key={judge.id} className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => toggleJudge(questionId, judge.id)}
                                                        />
                                                        {judge.name}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <div className="space-y-4">
                        <Card
                            title="Actions"
                            description="Persist judge assignments before running the evaluation pipeline."
                            actions={
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        onClick={async () => {
                                            await saveAssignments();
                                        }}
                                        disabled={!canSave}
                                    >
                                        Save assignments
                                    </Button>
                                    {assignmentsSaved ? (
                                        <Button
                                            onClick={() => {
                                                void handleRun();
                                            }}
                                            disabled={!canRun}
                                        >
                                            {running ? 'Running...' : 'Run evaluations'}
                                        </Button>
                                    ) : null}
                                    {assignmentsSaved && queueOptions.length > 1 ? (
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                void handleRunAll();
                                            }}
                                            disabled={running || bulkRunning}
                                        >
                                            {bulkRunning ? 'Running all…' : 'Run all queues'}
                                        </Button>
                                    ) : null}
                                </div>
                            }
                        >
                            {assignmentSummary ? (
                                <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                    <p className="font-medium text-slate-700">Saved assignment set</p>
                                    <p>
                                        {assignmentSummary.assignments_count} judge slots × {assignmentSummary.submissions_count} submissions →{' '}
                                        <strong>{assignmentSummary.expected_evaluations}</strong> planned evaluations
                                    </p>
                                </div>
                            ) : null}
                            {counts ? (
                                <div className="space-y-3 text-sm text-slate-600">
                                    <div className="flex justify-between">
                                        <span>Pending</span>
                                        <span>{counts.pending}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Running</span>
                                        <span>{counts.running}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Done</span>
                                        <span>{counts.done}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Failed</span>
                                        <span>{counts.failed}</span>
                                    </div>
                                    <div className="flex justify-between font-medium text-slate-700">
                                        <span>Total</span>
                                        <span>{counts.total}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                        <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
                                    </div>
                                    {message ? <p className="text-xs text-slate-500">{message}</p> : null}
                                    {redirectCountdown !== null ? (
                                        <p className="text-xs text-indigo-600">Redirecting to results in {redirectCountdown}s…</p>
                                    ) : null}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">Run evaluations to see live progress.</p>
                            )}
                            {!assignmentsSaved && questions.length > 0 ? (
                                <p className="text-xs text-slate-400">Save assignments to unlock “Run evaluations”.</p>
                            ) : null}
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useWorkflow } from '../contexts/WorkflowContext';
import { useQueue } from '../hooks/useQueue';
import { useRunner } from '../hooks/useRunner';

export default function QueuePage() {
    const navigate = useNavigate();
    const { lastQueueId, setCurrentStep, markCompleted } = useWorkflow();
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
    } = useQueue(lastQueueId);
    const { running, progress, message, counts, runEvaluations } = useRunner(lastQueueId);

    const canSave = queueReady && questions.length > 0 && !running && !loading;
    const canRun = assignmentsSaved && questions.length > 0 && !running;

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

    const handleRun = async () => {
        setRedirectCountdown(null);
        const result = await runEvaluations();
        if (!result.success) {
            return;
        }
        markCompleted('queue');
        if (result.enqueued === 0) {
            navigate('/results');
            return;
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Queue management</h1>
                    <p className="text-sm text-slate-500">
                        {lastQueueId ? `Assign judges to questions for queue ${lastQueueId}.` : 'Upload submissions first to generate a queue ID.'}
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
                                        <Button onClick={handleRun} disabled={!canRun}>
                                            {running ? 'Running...' : 'Run evaluations'}
                                        </Button>
                                    ) : null}
                                </div>
                            }
                        >
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

import { useEffect } from 'react';
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

    useEffect(() => {
        setCurrentStep('queue');
    }, [setCurrentStep]);

    const handleRun = async () => {
        await runEvaluations();
        markCompleted('queue');
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
                                        disabled={loading || !questions.length || running}
                                    >
                                        Save assignments
                                    </Button>
                                    <Button onClick={handleRun} disabled={running || !questions.length || !assignmentsSaved}>
                                        {running ? 'Running...' : 'Run evaluations'}
                                    </Button>
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
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { FilterBar } from '../components/ui/FilterBar';
import { Loading } from '../components/ui/Loading';
import { Table, type TableColumn } from '../components/ui/Table';
import { useWorkflow } from '../contexts/WorkflowContext';
import { useResults } from '../hooks/useResults';
import type { Evaluation, Judge, Verdict } from '../types';

export default function ResultsPage() {
    const { setCurrentStep, markCompleted, lastQueueId } = useWorkflow();
    const { evaluations, filters, setFilters, loading, error, total, judges, questions, passCount } = useResults();

    useEffect(() => {
        setCurrentStep('results');
        setFilters((prev) => {
            const nextQueueId = lastQueueId || prev.queue_id;
            if (prev.queue_id === nextQueueId) {
                return prev;
            }
            return { ...prev, queue_id: nextQueueId };
        });
        markCompleted('results');
    }, [lastQueueId, markCompleted, setCurrentStep, setFilters]);

    const passRate = total ? ((passCount / total) * 100).toFixed(1) : '0.0'; // REFACTORED by GPT-5 — use aggregate counts from backend

    const columns: TableColumn<Evaluation>[] = [
        { key: 'submission_id', header: 'Submission' },
        { key: 'question_id', header: 'Question' },
        {
            key: 'judge_id',
            header: 'Judge',
            render: (evaluation) => evaluation.judges?.name ?? evaluation.judge_id,
        },
        { key: 'verdict', header: 'Verdict' },
        {
            key: 'reasoning',
            header: 'Reasoning',
            render: (evaluation) => <p className="max-w-xs whitespace-pre-wrap text-sm text-slate-600">{evaluation.reasoning}</p>,
        },
        {
            key: 'created_at',
            header: 'Created',
            render: (evaluation) => new Date(evaluation.created_at).toLocaleString(),
        },
    ];

    const toggleFilter = (value: string, list: string[]) => {
        return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
    };

    const verdictOptions: Array<'' | Verdict> = ['', 'pass', 'fail', 'inconclusive'];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Results</h1>
                    <p className="text-sm text-slate-500">Inspect verdicts, reasoning, and judge performance across the queue.</p>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-1 text-sm text-slate-600">Pass rate: {passRate}% ({passCount} of {total})</div>
            </div>

            <FilterBar
                title="Filters"
                actions={
                    <Button
                        variant="pill"
                        size="sm"
                        onClick={() =>
                            setFilters({
                                judge_ids: [],
                                question_ids: [],
                                verdict: '',
                                page: 1,
                                limit: filters.limit,
                                queue_id: lastQueueId,
                            })
                        }
                    >
                        Clear filters
                    </Button>
                }
            >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {(judges || []).map((judge: Judge) => {
                        const active = filters.judge_ids.includes(judge.id);
                        return (
                            <Button
                                key={judge.id}
                                variant={active ? 'primary' : 'pill'}
                                size="sm"
                                onClick={() =>
                                setFilters((prev) => ({
                                    ...prev,
                                    page: 1,
                                    judge_ids: toggleFilter(judge.id, prev.judge_ids),
                                }))
                                }
                            >
                                {judge.name}
                            </Button>
                        );
                    })}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {questions.map((questionId) => {
                        const active = filters.question_ids.includes(questionId);
                        return (
                            <Button
                                key={questionId}
                                variant={active ? 'primary' : 'pill'}
                                size="sm"
                                onClick={() =>
                                setFilters((prev) => ({
                                    ...prev,
                                    page: 1,
                                    question_ids: toggleFilter(questionId, prev.question_ids),
                                }))
                                }
                            >
                                {questionId}
                            </Button>
                        );
                    })}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {verdictOptions.map((verdictOption) => (
                        <Button
                            key={verdictOption || 'all'}
                            variant={filters.verdict === verdictOption ? 'primary' : 'pill'}
                            size="sm"
                            onClick={() => setFilters((prev) => ({ ...prev, page: 1, verdict: verdictOption }))}
                        >
                            {verdictOption ? verdictOption.charAt(0).toUpperCase() + verdictOption.slice(1) : 'All verdicts'}
                        </Button>
                    ))}
                </div>
            </FilterBar>

            <Card>
                {loading ? (
                    <Loading label="Loading evaluations" />
                ) : error ? (
                    <p className="text-sm text-red-500">{error}</p>
                ) : evaluations.length ? (
                    <Table columns={columns} data={evaluations} getRowKey={(evaluation) => evaluation.id} />
                ) : (
                    <EmptyState title="No evaluations yet" description="Run the queue to generate verdicts." />
                )}
            </Card>

            <div className="flex items-center justify-between text-sm text-slate-600">
                <span>
                    Showing page {filters.page} of {Math.max(1, Math.ceil(total / filters.limit || 1))}
                </span>
                <div className="flex items-center gap-2">
                    <Button
                        variant="pill"
                        size="sm"
                        disabled={filters.page <= 1}
                        onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="pill"
                        size="sm"
                        disabled={filters.page * filters.limit >= total}
                        onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}

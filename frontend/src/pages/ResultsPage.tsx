import { useCallback, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { Table, type TableColumn } from '../components/ui/Table';
import { ResultsFiltersBar } from '../components/results/ResultsFiltersBar';
import { useWorkflow } from '../contexts/workflowContext';
import { useResults } from '../hooks/useResults';
import type { Evaluation, ResultsFilters } from '../types';
import { buildSearchParams, DEFAULT_RESULTS_FILTERS, filtersEqual, parseFiltersFromSearch } from '../utils/resultsFilters';

export default function ResultsPage() {
    const { setCurrentStep, markCompleted } = useWorkflow();
    const { evaluations, filters, setFilters: setFiltersInternal, loading, error, total, judges, questions, passCount } = useResults();
    const [searchParams, setSearchParams] = useSearchParams();
    const searchKey = searchParams.toString();
    const parsedFilters = useMemo(() => parseFiltersFromSearch(searchParams), [searchParams]);

    const setFilters = useCallback<Dispatch<SetStateAction<ResultsFilters>>>(
        (value) => {
            setFiltersInternal((prev) => {
                const next = typeof value === 'function' ? (value as (current: ResultsFilters) => ResultsFilters)(prev) : value;
                const params = buildSearchParams(next);
                if (params.toString() !== searchKey) {
                    setSearchParams(params, { replace: true });
                }
                return next;
            });
        },
        [searchKey, setFiltersInternal, setSearchParams],
    );

    useEffect(() => {
        setCurrentStep('results');
        markCompleted('results');
    }, [markCompleted, setCurrentStep]);

    useEffect(() => {
        setFiltersInternal((prev) => (filtersEqual(prev, parsedFilters) ? prev : { ...prev, ...parsedFilters }));
    }, [parsedFilters, setFiltersInternal]);

    const passRate = total ? ((passCount / total) * 100).toFixed(1) : '0.0';

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

    const handleClearFilters = useCallback(() => {
        setFilters({
            ...DEFAULT_RESULTS_FILTERS,
            limit: filters.limit,
            queue_id: parsedFilters.queue_id,
        });
    }, [filters.limit, parsedFilters.queue_id, setFilters]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Results</h1>
                    <p className="text-sm text-slate-500">Inspect verdicts, reasoning, and judge performance across the queue.</p>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-1 text-sm text-slate-600">Pass rate: {passRate}% ({passCount} of {total})</div>
            </div>

            <ResultsFiltersBar filters={filters} judges={judges} questions={questions} setFilters={setFilters} onClear={handleClearFilters} />

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

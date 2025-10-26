import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { useAnalytics } from '../hooks/useAnalytics';
import { useQueues } from '../hooks/useQueues';
import { useWorkflow } from '../contexts/WorkflowContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { FilterBar } from '../components/ui/FilterBar';
import { JudgePassRateChart } from '../components/analytics/JudgePassRateChart';
import { VerdictDistributionChart } from '../components/analytics/VerdictDistributionChart';
import { JudgeLeaderboard } from '../components/analytics/JudgeLeaderboard';
import { metrics } from '../lib/dataAnnotation';

export default function DashboardPage() {
    const { setCurrentStep, markCompleted, lastQueueId, setLastQueueId } = useWorkflow();
    const { data, loading, error, refresh } = useDashboard();
    const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | '90d' | 'all'>('all');
    const [interval, setInterval] = useState<'hour' | 'day' | 'week' | 'month'>('week');
    const [limit, setLimit] = useState<number | 'all'>(4);
    const [anchorTs, setAnchorTs] = useState(() => Math.floor(Date.now() / 1000));
    const [selectedQueue, setSelectedQueue] = useState('');
    const [judgeFocus, setJudgeFocus] = useState<'all' | string>('all');

    const {
        queues,
        loading: queuesLoading,
        error: queuesError,
        refresh: refreshQueues,
    } = useQueues();

    useEffect(() => {
        setCurrentStep('dashboard');
        markCompleted('dashboard');
    }, [markCompleted, setCurrentStep]);

    useEffect(() => {
        if (lastQueueId) {
            setSelectedQueue((prev) => (prev === lastQueueId ? prev : lastQueueId));
        }
    }, [lastQueueId]);

    useEffect(() => {
        if (!queues.length) {
            return;
        }

        const queueIds = queues.map((queue) => queue.queue_id);
        const hasLastQueue = lastQueueId && queueIds.includes(lastQueueId);

        if (lastQueueId && !hasLastQueue) {
            const fallback = queues.find((queue) => (queue.evaluation_count ?? 0) > 0) ?? queues[0];
            if (fallback) {
                if (selectedQueue !== fallback.queue_id) {
                    setSelectedQueue(fallback.queue_id);
                }
                if (lastQueueId !== fallback.queue_id) {
                    setLastQueueId(fallback.queue_id);
                }
            }
            return;
        }

        if (!selectedQueue) {
            const preferred = (hasLastQueue
                ? queues.find((queue) => queue.queue_id === lastQueueId)
                : queues.find((queue) => (queue.evaluation_count ?? 0) > 0)) ?? queues[0];
            if (preferred) {
                if (selectedQueue !== preferred.queue_id) {
                    setSelectedQueue(preferred.queue_id);
                }
                if (!lastQueueId || lastQueueId !== preferred.queue_id) {
                    setLastQueueId(preferred.queue_id);
                }
            }
        }
    }, [queues, lastQueueId, selectedQueue, setLastQueueId]);

    useEffect(() => {
        if (lastQueueId) {
            setAnchorTs(Math.floor(Date.now() / 1000));
        }
    }, [lastQueueId]);

    useEffect(() => {
        if (timeframe === '24h' && interval !== 'hour') {
            setInterval('hour');
        } else if (timeframe === '90d' && (interval === 'hour' || interval === 'day')) {
            setInterval('week');
        } else if (timeframe === '30d' && interval === 'hour') {
            setInterval('day');
        } else if (timeframe === '7d' && interval === 'month') {
            setInterval('week');
        } else if (timeframe === 'all' && interval === 'hour') {
            setInterval('week');
        }
    }, [timeframe, interval]);

    const now = useMemo(() => anchorTs, [anchorTs]);

    const from = useMemo(() => {
        if (timeframe === 'all') {
            return undefined;
        }

        const ranges: Record<'24h' | '7d' | '30d' | '90d', number> = {
            '24h': 60 * 60 * 24,
            '7d': 60 * 60 * 24 * 7,
            '30d': 60 * 60 * 24 * 30,
            '90d': 60 * 60 * 24 * 90,
        };
        return now - ranges[timeframe];
    }, [now, timeframe]);

    const to = useMemo(() => (timeframe === 'all' ? undefined : now), [now, timeframe]);

    const {
        data: analytics,
        loading: analyticsLoading,
        error: analyticsError,
        refresh: refreshAnalytics,
    } = useAnalytics({
        queueId: selectedQueue || undefined,
        from,
        to,
        interval,
        limit: limit === 'all' ? undefined : limit,
        enabled: Boolean(selectedQueue),
    });

    useEffect(() => {
        setJudgeFocus('all');
    }, [selectedQueue]);

    useEffect(() => {
        if (judgeFocus === 'all') {
            return;
        }

        if (!analytics?.series?.length) {
            setJudgeFocus('all');
            return;
        }

        const exists = analytics.series.some((seriesItem) => seriesItem.judge_id === judgeFocus);
        if (!exists) {
            setJudgeFocus('all');
        }
    }, [analytics?.series, judgeFocus]);

    const handleRefresh = () => {
        setAnchorTs(Math.floor(Date.now() / 1000));
        refresh();
        void refreshAnalytics();
        void refreshQueues();
    };

    const selectedQueueMeta = useMemo(() => queues.find((queue) => queue.queue_id === selectedQueue), [queues, selectedQueue]);
    const queueHasEvaluations = (selectedQueueMeta?.evaluation_count ?? 0) > 0;

    const judgeOptions = useMemo(
        () =>
            (analytics?.series ?? [])
                .map((seriesItem) => ({
                    id: seriesItem.judge_id,
                    name: seriesItem.judge_name,
                    total: seriesItem.totals.total,
                }))
                .sort((a, b) => b.total - a.total),
        [analytics?.series],
    );

    const selectedJudgeSeries = useMemo(
        () => analytics?.series.find((seriesItem) => seriesItem.judge_id === judgeFocus),
        [analytics, judgeFocus],
    );

    const filteredSeries = useMemo(() => {
        if (!analytics?.series?.length) {
            return [];
        }
        if (judgeFocus === 'all') {
            return analytics.series;
        }
        return selectedJudgeSeries ? [selectedJudgeSeries] : [];
    }, [analytics?.series, judgeFocus, selectedJudgeSeries]);

    const filteredTimeline = useMemo(() => {
        if (!analytics) {
            return [];
        }
        if (judgeFocus === 'all') {
            return analytics.timeline;
        }
        return selectedJudgeSeries?.points ?? [];
    }, [analytics, judgeFocus, selectedJudgeSeries]);

    const filteredRankings = useMemo(() => {
        if (!analytics) {
            return [];
        }
        if (judgeFocus === 'all') {
            return analytics.rankings;
        }
        return analytics.rankings.filter((ranking) => ranking.judge_id === judgeFocus);
    }, [analytics, judgeFocus]);

    const visibleRankings = useMemo(() => {
        if (judgeFocus === 'all') {
            if (limit === 'all') {
                return filteredRankings;
            }
            return filteredRankings.slice(0, limit);
        }
        return filteredRankings;
    }, [filteredRankings, judgeFocus, limit]);

    const displayPassRate = useMemo(() => {
        if (judgeFocus === 'all') {
            return analytics?.totals.pass_rate ?? 0;
        }
        return selectedJudgeSeries?.totals.pass_rate ?? 0;
    }, [analytics, judgeFocus, selectedJudgeSeries]);

    const displayTotalEvaluations = useMemo(() => {
        if (judgeFocus === 'all') {
            return analytics?.totals.total_evals ?? 0;
        }
        return selectedJudgeSeries?.totals.total ?? 0;
    }, [analytics, judgeFocus, selectedJudgeSeries]);

    const judgeFocusLabel = useMemo(() => {
        if (judgeFocus === 'all') {
            return 'All judges';
        }
        return selectedJudgeSeries?.judge_name ?? 'Selected judge';
    }, [judgeFocus, selectedJudgeSeries?.judge_name]);

    const analyticsEmptyMessage = selectedQueue
        ? queueHasEvaluations
            ? judgeFocus === 'all'
                ? timeframe === 'all'
                    ? 'No analytics available for this queue yet. Trigger fresh evaluations to generate insights.'
                    : 'No analytics found for the selected timeframe. Extend the window or rerun evaluations to generate fresh verdicts.'
                : `No analytics found for ${selectedJudgeSeries?.judge_name ?? 'the selected judge'} in this window. Try broadening the timeframe or running fresh evaluations.`
            : `No evaluations recorded for ${selectedQueue}. Run this queue from the Queue tab to populate analytics.`
        : 'Select a queue to view judge analytics.';

    const handleQueueChange = (value: string) => {
        setSelectedQueue(value);
        setLastQueueId(value);
        setAnchorTs(Math.floor(Date.now() / 1000));
        setJudgeFocus('all');
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
                    <p className="text-sm text-slate-500">Monitor throughput and jump back into your evaluation workflow.</p>
                </div>
                <Button variant="primary" onClick={handleRefresh} disabled={loading || analyticsLoading || queuesLoading}>
                    Refresh
                </Button>
            </div>

            {loading ? (
                <Loading label="Loading summary..." />
            ) : error ? (
                <EmptyState title={error} description="Check your backend connection and try again." action={<Button onClick={() => refresh()}>Retry</Button>} />
            ) : data ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {metrics.map((metric) => {
                        const rawValue = data[metric.key];
                        const numericValue = Number(rawValue ?? 0);
                        const displayValue = metric.key === 'pass_rate' ? `${numericValue.toFixed(1)}${metric.suffix ?? ''}` : numericValue.toLocaleString();
                        return (
                            <Card key={metric.key} className="space-y-2">
                                <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                                <p className="text-2xl font-semibold text-slate-900">{displayValue}</p>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <EmptyState title="No data yet" description="Upload a batch of submissions to get started." />
            )}

            <section className="space-y-4">
                <FilterBar
                    title="Judge analytics"
                    actions={
                        <Button
                            variant="secondary"
                            onClick={handleRefresh}
                            disabled={analyticsLoading || queuesLoading || !selectedQueue}
                        >
                            Sync analytics
                        </Button>
                    }
                >
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Queue</span>
                        <select
                            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-inner focus:border-indigo-500 focus:outline-none"
                            value={selectedQueue}
                            onChange={(event) => handleQueueChange(event.target.value)}
                            disabled={queuesLoading || queues.length === 0}
                        >
                            <option value="" disabled>
                                {queuesLoading ? 'Loading queues...' : 'Select a queue'}
                            </option>
                            {queues.map((queue) => (
                                <option key={queue.queue_id} value={queue.queue_id}>
                                    {queue.queue_id}
                                    {typeof queue.evaluation_count === 'number' ? ` (${queue.evaluation_count} eval${queue.evaluation_count === 1 ? '' : 's'})` : ''}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Timeframe</span>
                        <select
                            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-inner focus:border-indigo-500 focus:outline-none"
                            value={timeframe}
                            onChange={(event) => setTimeframe(event.target.value as typeof timeframe)}
                            disabled={!selectedQueue}
                        >
                            <option value="24h">Last 24 hours</option>
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                            <option value="all">Entire history</option>
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Interval</span>
                        <select
                            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-inner focus:border-indigo-500 focus:outline-none"
                            value={interval}
                            onChange={(event) => setInterval(event.target.value as typeof interval)}
                            disabled={!selectedQueue}
                        >
                            <option value="hour" disabled={timeframe === 'all'}>Hourly</option>
                            <option value="day">Daily</option>
                            <option value="week">Weekly</option>
                            <option value="month">Monthly</option>
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Judge focus</span>
                        <select
                            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-inner focus:border-indigo-500 focus:outline-none"
                            value={judgeFocus}
                            onChange={(event) => setJudgeFocus(event.target.value)}
                            disabled={!selectedQueue || analyticsLoading || !judgeOptions.length}
                        >
                            <option value="all">All judges</option>
                            {judgeOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.name} · {option.total.toLocaleString()} eval{option.total === 1 ? '' : 's'}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Top judges</span>
                        <select
                            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-inner focus:border-indigo-500 focus:outline-none"
                            value={limit === 'all' ? 'all' : String(limit)}
                            onChange={(event) => {
                                const value = event.target.value;
                                setLimit(value === 'all' ? 'all' : Number(value));
                            }}
                            disabled={!selectedQueue || judgeFocus !== 'all'}
                        >
                            {[3, 4, 5, 6].map((value) => (
                                <option key={value} value={value}>
                                    Top {value}
                                </option>
                            ))}
                            <option value="all">Show all judges</option>
                        </select>
                    </label>
                    <div className="space-y-1 text-xs text-slate-500">
                        <p>
                            Queue in focus:{' '}
                            {selectedQueue ? (
                                <span className="font-semibold text-slate-900">
                                    {selectedQueue}
                                    {typeof selectedQueueMeta?.evaluation_count === 'number'
                                        ? ` · ${selectedQueueMeta.evaluation_count} evaluation${selectedQueueMeta.evaluation_count === 1 ? '' : 's'}`
                                        : ''}
                                </span>
                            ) : (
                                'Upload a dataset to unlock analytics'
                            )}
                        </p>
                        <p>
                            Judge focus:{' '}
                            <span className="font-semibold text-slate-900">{judgeFocusLabel}</span>
                        </p>
                    </div>
                </FilterBar>

                {queuesError ? (
                    <Card className="border-rose-200 bg-rose-50">
                        <p className="text-sm font-medium text-rose-700">{queuesError}</p>
                        <p className="mt-2 text-xs text-rose-600">Refresh the page or check diagnostics permissions.</p>
                    </Card>
                ) : !selectedQueue ? (
                    <Card className="bg-slate-50 text-sm text-slate-600">
                        <p>Select or upload a queue to unlock judge analytics. Once evaluations are running, we surface pass-rate trends, verdict distributions, and performance leaderboards in real time.</p>
                    </Card>
                ) : analyticsError ? (
                    <Card className="border-rose-200 bg-rose-50">
                        <p className="text-sm font-medium text-rose-700">{analyticsError}</p>
                        <p className="mt-2 text-xs text-rose-600">Verify the analytics endpoint and try syncing again.</p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {judgeFocus !== 'all' && selectedJudgeSeries ? (
                            <Card
                                className="border-indigo-100 bg-indigo-50/60"
                                title={`Judge snapshot · ${selectedJudgeSeries.judge_name}`}
                                description="Focused metrics for the selected judge."
                            >
                                <div className="grid gap-4 sm:grid-cols-4">
                                    <div className="rounded-lg border border-indigo-100 bg-white/70 p-4 shadow-sm sm:col-span-1">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Pass rate</p>
                                        <p className="mt-1 text-2xl font-semibold text-slate-900">
                                            {selectedJudgeSeries.totals.pass_rate.toFixed(1)}%
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Across {selectedJudgeSeries.totals.total.toLocaleString()} evaluations
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 sm:col-span-3">
                                        <div className="rounded-lg border border-white/80 bg-white/70 p-3">
                                            <p className="text-xs font-medium text-slate-500">Pass</p>
                                            <p className="text-lg font-semibold text-emerald-600">
                                                {selectedJudgeSeries.totals.pass.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-white/80 bg-white/70 p-3">
                                            <p className="text-xs font-medium text-slate-500">Fail</p>
                                            <p className="text-lg font-semibold text-rose-600">
                                                {selectedJudgeSeries.totals.fail.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-white/80 bg-white/70 p-3">
                                            <p className="text-xs font-medium text-slate-500">Inconclusive</p>
                                            <p className="text-lg font-semibold text-amber-600">
                                                {selectedJudgeSeries.totals.inconclusive.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-white/80 bg-white/70 p-3">
                                            <p className="text-xs font-medium text-slate-500">Cumulative total</p>
                                            <p className="text-lg font-semibold text-slate-900">
                                                {selectedJudgeSeries.totals.total.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ) : null}
                        <div className="grid gap-4 lg:grid-cols-3">
                            <Card
                                className="lg:col-span-2"
                                title="Pass rate momentum"
                                description="Track cumulative pass rate by judge to spot emerging trends."
                            >
                                <JudgePassRateChart
                                    series={filteredSeries}
                                    overallPassRate={displayPassRate}
                                    interval={interval}
                                    loading={analyticsLoading}
                                    emptyMessage={analyticsEmptyMessage}
                                    referenceLabel={judgeFocus === 'all' ? 'Team avg' : `${judgeFocusLabel} avg`}
                                />
                            </Card>
                            <Card title="Judge leaderboard" description="Who is delivering the most consistent verdicts?">
                                <JudgeLeaderboard
                                    rankings={visibleRankings}
                                    loading={analyticsLoading}
                                    totalEvaluations={displayTotalEvaluations}
                                    emptyMessage={analyticsEmptyMessage}
                                />
                            </Card>
                        </div>
                        <Card title="Verdict distribution" description="Volume of pass, fail, and inconclusive calls over time.">
                            <VerdictDistributionChart
                                timeline={filteredTimeline}
                                interval={interval}
                                loading={analyticsLoading}
                                overallPassRate={displayPassRate}
                                emptyMessage={analyticsEmptyMessage}
                                referenceLabel={judgeFocus === 'all' ? 'Team avg' : `${judgeFocusLabel} avg`}
                            />
                        </Card>
                    </div>
                )}
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card
                    title="1. Upload submissions"
                    description="Import the JSON payload you received from Besimple."
                    actions={<Link to="/upload"><Button variant="secondary">Go to Upload</Button></Link>}
                >
                    <p className="text-sm text-slate-600">
                        Drag & drop or paste submissions to start a queue. We automatically group by <code className="rounded bg-slate-100 px-1">queueId</code>.
                    </p>
                </Card>
                <Card
                    title="2. Manage judges"
                    description="Create prompts, toggle activation, and assign models."
                    actions={<Link to="/judges"><Button variant="secondary">Manage Judges</Button></Link>}
                >
                    <p className="text-sm text-slate-600">Reuse existing prompts or spin up variations for each evaluation style.</p>
                </Card>
                <Card
                    title="3. Run evaluations"
                    description="Assign judges per question and monitor live progress."
                    actions={<Link to="/queue"><Button variant="secondary">Open Queue</Button></Link>}
                >
                    <p className="text-sm text-slate-600">Sense-check verdicts and dive into reasoning with clear pass/fail stats.</p>
                </Card>
            </div>
        </div>
    );
}
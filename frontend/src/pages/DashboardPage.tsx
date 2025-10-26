import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { useAnalytics } from '../hooks/useAnalytics';
import { useQueues } from '../hooks/useQueues';
import { useWorkflow } from '../contexts/workflowContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { JudgeAnalyticsSection } from '../components/dashboard/JudgeAnalyticsSection';
import { metrics } from '../lib/dataAnnotation';
import { coerceInterval, timeframeToSeconds, type AnalyticsInterval, type AnalyticsTimeframe } from '../constants/analytics';

export default function DashboardPage() {
    const { setCurrentStep, markCompleted, lastQueueId, setLastQueueId } = useWorkflow();
    const { data, loading, error, refresh } = useDashboard();
    const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('all');
    const [interval, setInterval] = useState<AnalyticsInterval>('week');
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
            const preferred =
                (hasLastQueue
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
        setInterval((current) => {
            const next = coerceInterval(timeframe, current);
            return next === current ? current : next;
        });
    }, [timeframe]);

    const now = useMemo(() => anchorTs, [anchorTs]);

    const from = useMemo(() => {
        const seconds = timeframeToSeconds(timeframe);
        return typeof seconds === 'number' ? now - seconds : undefined;
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

    const selectedQueueMeta = useMemo(
        () => queues.find((queue) => queue.queue_id === selectedQueue),
        [queues, selectedQueue],
    );
    const queueHasEvaluations = (selectedQueueMeta?.evaluation_count ?? 0) > 0;

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
                <EmptyState
                    title={error}
                    description="Check your backend connection and try again."
                    action={<Button onClick={() => refresh()}>Retry</Button>}
                />
            ) : data ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {metrics.map((metric) => {
                        const rawValue = data[metric.key];
                        const numericValue = Number(rawValue ?? 0);
                        const displayValue =
                            metric.key === 'pass_rate'
                                ? `${numericValue.toFixed(1)}${metric.suffix ?? ''}`
                                : numericValue.toLocaleString();
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

            <JudgeAnalyticsSection
                analytics={analytics}
                analyticsLoading={analyticsLoading}
                analyticsError={analyticsError}
                queues={queues}
                queuesLoading={queuesLoading}
                queuesError={queuesError}
                selectedQueue={selectedQueue}
                onQueueChange={handleQueueChange}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                interval={interval}
                onIntervalChange={setInterval}
                limit={limit}
                onLimitChange={setLimit}
                judgeFocus={judgeFocus}
                onJudgeFocusChange={setJudgeFocus}
                handleRefresh={handleRefresh}
                queueMeta={selectedQueueMeta}
                queueHasEvaluations={queueHasEvaluations}
            />

            <div className="grid gap-4 lg:grid-cols-3">
                <Card
                    title="1. Upload submissions"
                    description="Import the JSON payload you received from Besimple."
                    actions={
                        <Link to="/upload">
                            <Button variant="secondary">Go to Upload</Button>
                        </Link>
                    }
                >
                    <p className="text-sm text-slate-600">
                        Drag & drop or paste submissions to start a queue. We automatically group by{' '}
                        <code className="rounded bg-slate-100 px-1">queueId</code>.
                    </p>
                </Card>
                <Card
                    title="2. Manage judges"
                    description="Create prompts, toggle activation, and assign models."
                    actions={
                        <Link to="/judges">
                            <Button variant="secondary">Manage Judges</Button>
                        </Link>
                    }
                >
                    <p className="text-sm text-slate-600">Reuse existing prompts or spin up variations for each evaluation style.</p>
                </Card>
                <Card
                    title="3. Run evaluations"
                    description="Assign judges per question and monitor live progress."
                    actions={
                        <Link to="/queue">
                            <Button variant="secondary">Open Queue</Button>
                        </Link>
                    }
                >
                    <p className="text-sm text-slate-600">Sense-check verdicts and dive into reasoning with clear pass/fail stats.</p>
                </Card>
            </div>
        </div>
    );
}
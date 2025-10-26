import type { AnalyticsResponse, QueueOption } from '../../types';
import { FilterBar } from '../ui/FilterBar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { JudgePassRateChart } from '../analytics/JudgePassRateChart';
import { JudgeLeaderboard } from '../analytics/JudgeLeaderboard';
import { VerdictDistributionChart } from '../analytics/VerdictDistributionChart';
import { useJudgeAnalyticsView } from '../../hooks/useJudgeAnalyticsView';
import {
    ANALYTICS_INTERVALS,
    ANALYTICS_TIMEFRAMES,
    isIntervalDisabled,
    type AnalyticsInterval,
    type AnalyticsTimeframe,
} from '../../constants/analytics';

type JudgeFocus = 'all' | string;

interface JudgeAnalyticsSectionProps {
    analytics: AnalyticsResponse | null | undefined;
    analyticsLoading: boolean;
    analyticsError: string;
    queues: QueueOption[];
    queuesLoading: boolean;
    queuesError: string;
    selectedQueue: string;
    onQueueChange: (value: string) => void;
    timeframe: AnalyticsTimeframe;
    onTimeframeChange: (value: AnalyticsTimeframe) => void;
    interval: AnalyticsInterval;
    onIntervalChange: (value: AnalyticsInterval) => void;
    limit: number | 'all';
    onLimitChange: (value: number | 'all') => void;
    judgeFocus: JudgeFocus;
    onJudgeFocusChange: (value: JudgeFocus) => void;
    handleRefresh: () => void;
    queueMeta?: QueueOption;
    queueHasEvaluations: boolean;
}

export function JudgeAnalyticsSection({
    analytics,
    analyticsLoading,
    analyticsError,
    queues,
    queuesLoading,
    queuesError,
    selectedQueue,
    onQueueChange,
    timeframe,
    onTimeframeChange,
    interval,
    onIntervalChange,
    limit,
    onLimitChange,
    judgeFocus,
    onJudgeFocusChange,
    handleRefresh,
    queueMeta,
    queueHasEvaluations,
}: JudgeAnalyticsSectionProps) {
    const {
        judgeOptions,
        selectedJudgeSeries,
        filteredSeries,
        filteredTimeline,
        visibleRankings,
        displayPassRate,
        displayTotalEvaluations,
        judgeFocusLabel,
        analyticsEmptyMessage,
    } = useJudgeAnalyticsView({
        analytics,
        judgeFocus,
        limit,
        timeframe,
        selectedQueue,
        queueHasEvaluations,
    });

    const selectedQueueEvaluations = queueMeta?.evaluation_count ?? 0;

    return (
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
                        onChange={(event) => onQueueChange(event.target.value)}
                        disabled={queuesLoading || queues.length === 0}
                    >
                        <option value="" disabled>
                            {queuesLoading ? 'Loading queues...' : 'Select a queue'}
                        </option>
                        {queues.map((queue) => (
                            <option key={queue.queue_id} value={queue.queue_id}>
                                {queue.queue_id}
                                {typeof queue.evaluation_count === 'number'
                                    ? ` (${queue.evaluation_count} eval${queue.evaluation_count === 1 ? '' : 's'})`
                                    : ''}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Timeframe</span>
                    <select
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-inner focus:border-indigo-500 focus:outline-none"
                        value={timeframe}
                        onChange={(event) => onTimeframeChange(event.target.value as AnalyticsTimeframe)}
                        disabled={!selectedQueue}
                    >
                        {ANALYTICS_TIMEFRAMES.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Interval</span>
                    <select
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-inner focus:border-indigo-500 focus:outline-none"
                        value={interval}
                        onChange={(event) => onIntervalChange(event.target.value as AnalyticsInterval)}
                        disabled={!selectedQueue}
                    >
                        {ANALYTICS_INTERVALS.map((option) => (
                            <option key={option.value} value={option.value} disabled={isIntervalDisabled(option.value, timeframe)}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Judge focus</span>
                    <select
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-inner focus:border-indigo-500 focus:outline-none"
                        value={judgeFocus}
                        onChange={(event) => onJudgeFocusChange(event.target.value)}
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
                            onLimitChange(value === 'all' ? 'all' : Number(value));
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
                                {typeof selectedQueueEvaluations === 'number' && selectedQueueEvaluations > 0
                                    ? ` · ${selectedQueueEvaluations} evaluation${selectedQueueEvaluations === 1 ? '' : 's'}`
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
                    <p>
                        Select or upload a queue to unlock judge analytics. Once evaluations are running, we surface pass-rate trends, verdict distributions, and performance leaderboards in real time.
                    </p>
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
    );
}
export const ANALYTICS_TIMEFRAMES = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'all', label: 'Entire history' },
] as const;

export type AnalyticsTimeframe = (typeof ANALYTICS_TIMEFRAMES)[number]['value'];

export const ANALYTICS_INTERVALS = [
    { value: 'hour', label: 'Hourly' },
    { value: 'day', label: 'Daily' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' },
] as const;

export type AnalyticsInterval = (typeof ANALYTICS_INTERVALS)[number]['value'];

const TIMEFRAME_SECONDS: Record<Exclude<AnalyticsTimeframe, 'all'>, number> = {
    '24h': 60 * 60 * 24,
    '7d': 60 * 60 * 24 * 7,
    '30d': 60 * 60 * 24 * 30,
    '90d': 60 * 60 * 24 * 90,
};

export function timeframeToSeconds(timeframe: AnalyticsTimeframe): number | undefined {
    if (timeframe === 'all') {
        return undefined;
    }
    return TIMEFRAME_SECONDS[timeframe];
}

export function coerceInterval(timeframe: AnalyticsTimeframe, interval: AnalyticsInterval): AnalyticsInterval {
    if (timeframe === '24h') {
        return 'hour';
    }
    if (timeframe === '30d' && interval === 'hour') {
        return 'day';
    }
    if (timeframe === '90d' && (interval === 'hour' || interval === 'day')) {
        return 'week';
    }
    if (timeframe === '7d' && interval === 'month') {
        return 'week';
    }
    if (timeframe === 'all' && interval === 'hour') {
        return 'week';
    }
    return interval;
}

export function isIntervalDisabled(interval: AnalyticsInterval, timeframe: AnalyticsTimeframe): boolean {
    if (timeframe === 'all') {
        return interval === 'hour';
    }
    if (timeframe === '24h') {
        return interval !== 'hour';
    }
    if (timeframe === '30d') {
        return interval === 'hour';
    }
    if (timeframe === '90d') {
        return interval === 'hour' || interval === 'day';
    }
    if (timeframe === '7d') {
        return interval === 'month';
    }
    return false;
}

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { AnalyticsPoint } from '../../types';
import { withAlpha } from '../../utils/palette';
import { Loading } from '../ui/Loading';
import { EmptyState } from '../ui/EmptyState';

interface VerdictDistributionChartProps {
  timeline: AnalyticsPoint[];
  interval: 'hour' | 'day' | 'week' | 'month';
  loading: boolean;
  overallPassRate: number;
  emptyMessage?: string;
  referenceLabel?: string;
}

type ChartDatum = {
  ts: number;
  label: string;
  pass: number;
  fail: number;
  inconclusive: number;
  total: number;
  passRate: number;
  cumulativePassRate: number;
};

const formatterByInterval: Record<VerdictDistributionChartProps['interval'], Intl.DateTimeFormatOptions> = {
  hour: { month: 'short', day: 'numeric', hour: 'numeric' },
  day: { month: 'short', day: 'numeric' },
  week: { month: 'short', day: 'numeric' },
  month: { month: 'short', year: 'numeric' },
};

function formatTimestamp(ts: number, interval: VerdictDistributionChartProps['interval']) {
  const options = formatterByInterval[interval] ?? formatterByInterval.day;
  return new Intl.DateTimeFormat('en-US', options).format(new Date(ts * 1000));
}

const renderTooltip = (props: TooltipContentProps<number, string>) => {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload as ChartDatum | undefined;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
        <p className="col-span-2 text-sm font-semibold text-slate-900">
          Total evaluations: {point.total.toLocaleString()}
        </p>
        <span className="font-medium text-emerald-600">Pass: {point.pass.toLocaleString()}</span>
        <span className="font-medium text-rose-600">Fail: {point.fail.toLocaleString()}</span>
        <span className="font-medium text-amber-600">Inconclusive: {point.inconclusive.toLocaleString()}</span>
        <span className="col-span-2 text-slate-500">
          Cohort pass rate: {point.passRate.toFixed(1)}% · Running avg: {point.cumulativePassRate.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

export function VerdictDistributionChart({ timeline, interval, loading, overallPassRate, emptyMessage, referenceLabel }: VerdictDistributionChartProps) {
  const data = useMemo<ChartDatum[]>(
    () =>
      timeline
        .map((point) => ({
          ts: point.ts,
          label: formatTimestamp(point.ts, interval),
          pass: point.pass,
          fail: point.fail,
          inconclusive: point.inconclusive,
          total: point.total,
          passRate: point.pass_rate,
          cumulativePassRate: point.cumulative_pass_rate,
        }))
        .sort((a, b) => a.ts - b.ts),
    [interval, timeline],
  );

  if (loading) {
    return <Loading label="Loading verdict distribution" />;
  }

  if (!timeline.length) {
    return <EmptyState title="No verdicts yet" description={emptyMessage ?? 'Once evaluations run, trendlines will appear here.'} />;
  }

  const maxTotal = Math.max(...data.map((point) => point.total));
  const referenceText = referenceLabel ?? 'Team avg';
  const referenceDisplay = `${referenceText} ${overallPassRate.toFixed(1)}%`;

  return (
    <div className="h-[320px] w-full min-w-0 min-h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 24, left: 4, bottom: 12 }}>
          <defs>
            <linearGradient id="area-pass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={withAlpha('#10b981', 0.65)} />
              <stop offset="90%" stopColor={withAlpha('#10b981', 0)} />
            </linearGradient>
            <linearGradient id="area-fail" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={withAlpha('#f43f5e', 0.6)} />
              <stop offset="90%" stopColor={withAlpha('#f43f5e', 0)} />
            </linearGradient>
            <linearGradient id="area-inconclusive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={withAlpha('#f59e0b', 0.55)} />
              <stop offset="90%" stopColor={withAlpha('#f59e0b', 0)} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(148, 163, 184, 0.3)" vertical={false} />
          <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} minTickGap={32} />
          <YAxis
            yAxisId="left"
            stroke="#94a3b8"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `${value}`}
            domain={[0, (maxTotal || 10) * 1.15]}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#94a3b8"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `${value}%`}
            domain={[0, 100]}
          />
          <Tooltip content={renderTooltip} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(148,163,184,0.5)' }} />
          <Legend wrapperStyle={{ paddingTop: 12 }} />
          <ReferenceLine
            yAxisId="right"
            y={overallPassRate}
            stroke="#0ea5e9"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ position: 'right', value: referenceDisplay, fill: '#0ea5e9', fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="pass"
            name="Pass"
            yAxisId="left"
            stackId="verdict"
            stroke="#0f766e"
            fill="url(#area-pass)"
          />
          <Area
            type="monotone"
            dataKey="fail"
            name="Fail"
            yAxisId="left"
            stackId="verdict"
            stroke="#b91c1c"
            fill="url(#area-fail)"
          />
          <Area
            type="monotone"
            dataKey="inconclusive"
            name="Inconclusive"
            yAxisId="left"
            stackId="verdict"
            stroke="#b45309"
            fill="url(#area-inconclusive)"
          />
          <Line
            type="monotone"
            dataKey="cumulativePassRate"
            name="Running pass rate"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            yAxisId="right"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

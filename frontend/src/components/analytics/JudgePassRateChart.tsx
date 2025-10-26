import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { JudgeSeries } from '../../types';
import { getSeriesColor, withAlpha } from '../../utils/palette';
import { Loading } from '../ui/Loading';
import { EmptyState } from '../ui/EmptyState';

interface JudgePassRateChartProps {
  series: JudgeSeries[];
  overallPassRate: number;
  interval: 'hour' | 'day' | 'week' | 'month';
  loading: boolean;
  emptyMessage?: string;
  referenceLabel?: string;
}

type ChartDatum = Record<string, number | string> & {
  ts: number;
  label: string;
};

const formatterByInterval: Record<JudgePassRateChartProps['interval'], Intl.DateTimeFormatOptions> = {
  hour: { month: 'short', day: 'numeric', hour: 'numeric' },
  day: { month: 'short', day: 'numeric' },
  week: { month: 'short', day: 'numeric' },
  month: { month: 'short', year: 'numeric' },
};

function formatTimestamp(ts: number, interval: JudgePassRateChartProps['interval']) {
  const options = formatterByInterval[interval] ?? formatterByInterval.day;
  return new Intl.DateTimeFormat('en-US', options).format(new Date(ts * 1000));
}

type TooltipItem = NonNullable<TooltipContentProps<number, string>['payload']>[number];

const tooltipContent = (seriesMap: Map<string, JudgeSeries>) =>
  function TooltipComponent(props: TooltipContentProps<number, string>) {
    const { active, payload, label } = props;
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    return (
      <div className="rounded-lg border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <ul className="mt-2 space-y-1">
          {payload.map((item) => {
            const entry = item as TooltipItem;
            if (!entry || typeof entry.dataKey !== 'string') return null;
            const judge = seriesMap.get(entry.dataKey);
            if (!judge) return null;
            const baseColor = entry.color ?? '#0f172a';
            const point = (entry.payload ?? {}) as Record<string, number>;
            const bucketRate = point[`${entry.dataKey}__latest`] ?? 0;
            const total = point[`${entry.dataKey}__total`] ?? 0;
            const pass = point[`${entry.dataKey}__pass`] ?? 0;
            const fail = point[`${entry.dataKey}__fail`] ?? 0;
            const inconclusive = point[`${entry.dataKey}__inconclusive`] ?? 0;

            return (
              <li key={entry.dataKey} className="flex flex-col gap-1 rounded-md bg-slate-50/80 p-2">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: baseColor }} />
                    {judge.judge_name}
                  </span>
                  <span>{Number(entry.value ?? 0).toFixed(1)}%</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 text-xs text-slate-500">
                  <span>Cohort pass rate: {bucketRate?.toFixed?.(1) ?? bucketRate}%</span>
                  <span>Total evaluated: {total}</span>
                  <span>Pass: {pass}</span>
                  <span>Fail: {fail}</span>
                  <span className="col-span-2">Inconclusive: {inconclusive}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

export function JudgePassRateChart({
  series,
  overallPassRate,
  interval,
  loading,
  emptyMessage = 'Analytics will appear once a queue has results.',
  referenceLabel,
}: JudgePassRateChartProps) {
  const seriesMap = useMemo(() => new Map(series.map((item) => [item.judge_id, item])), [series]);

  const data = useMemo<ChartDatum[]>(() => {
    const dataset = new Map<number, ChartDatum>();

    series.forEach((judge) => {
      judge.points.forEach((point) => {
        const entry = dataset.get(point.ts) ?? ({ ts: point.ts } as ChartDatum);
        entry[judge.judge_id] = point.cumulative_pass_rate;
        entry[`${judge.judge_id}__latest`] = point.pass_rate;
        entry[`${judge.judge_id}__total`] = point.total;
        entry[`${judge.judge_id}__pass`] = point.pass;
        entry[`${judge.judge_id}__fail`] = point.fail;
        entry[`${judge.judge_id}__inconclusive`] = point.inconclusive;
        dataset.set(point.ts, entry);
      });
    });

    return Array.from(dataset.values())
      .sort((a, b) => (a.ts as number) - (b.ts as number))
      .map((entry) => ({
        ...entry,
        label: formatTimestamp(entry.ts, interval),
      }));
  }, [interval, series]);

  const TooltipComponent = useMemo(() => tooltipContent(seriesMap), [seriesMap]);

  if (loading) {
    return <Loading label="Loading analytics" />;
  }

  if (!series.length || data.length === 0) {
    return <EmptyState title="No analytics yet" description={emptyMessage} />;
  }

  const referenceText = referenceLabel ?? 'Team avg';
  const referenceDisplay = `${referenceText} ${overallPassRate.toFixed(1)}%`;

  return (
    <div className="h-[360px] w-full min-w-0 min-h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 24, left: 4, bottom: 12 }}>
          <defs>
            {series.map((judge, index) => {
              const color = getSeriesColor(index);
              return (
                <linearGradient key={judge.judge_id} id={`area-${judge.judge_id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={withAlpha(color, 0.35)} />
                  <stop offset="95%" stopColor={withAlpha(color, 0)} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(148, 163, 184, 0.3)" vertical={false} />
          <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} minTickGap={32} />
          <YAxis domain={[0, 100]} stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value: number) => `${value}%`} />
          <Tooltip content={TooltipComponent} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(148,163,184,0.5)' }} />
          <Legend wrapperStyle={{ paddingTop: 16 }} formatter={(value: string) => seriesMap.get(value)?.judge_name ?? value} />
          <ReferenceLine
            y={overallPassRate}
            stroke="#0ea5e9"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ position: 'left', value: referenceDisplay, fill: '#0ea5e9', fontSize: 12 }}
          />
          {series.map((judge, index) => {
            const color = getSeriesColor(index);
            return (
              <Line
                key={judge.judge_id}
                type="monotone"
                dataKey={judge.judge_id}
                name={judge.judge_name}
                stroke={color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, stroke: color, fill: withAlpha(color, 0.2) }}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

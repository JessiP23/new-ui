import type { JudgeRanking } from '../../types';
import { getSeriesColor, withAlpha } from '../../utils/palette';
import { EmptyState } from '../ui/EmptyState';
import { Loading } from '../ui/Loading';

interface JudgeLeaderboardProps {
  rankings: JudgeRanking[];
  loading: boolean;
  totalEvaluations: number;
  emptyMessage?: string;
}

export function JudgeLeaderboard({ rankings, loading, totalEvaluations, emptyMessage }: JudgeLeaderboardProps) {
  if (loading) {
    return <Loading label="Loading leaderboard" />;
  }

  if (!rankings.length) {
    return <EmptyState title="No judges yet" description={emptyMessage ?? 'Add judges and run evaluations to populate the leaderboard.'} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Top performers</span>
        <span>Total evaluations analysed: {totalEvaluations.toLocaleString()}</span>
      </div>
      <ul className="space-y-3">
        {rankings.map((ranking, index) => {
          const rank = index + 1;
          const accent = getSeriesColor(index);
          const glow = withAlpha(accent, 0.35);

          return (
            <li key={ranking.judge_id} className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white shadow">
                    {rank}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{ranking.judge_name}</p>
                    <p className="text-xs text-slate-500">{ranking.total.toLocaleString()} evaluations</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-slate-900">{ranking.pass_rate.toFixed(1)}%</p>
                  <p className="text-xs text-slate-500">Pass rate</p>
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, ranking.pass_rate)}%`,
                    background: accent,
                    boxShadow: `0 0 12px ${glow}`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

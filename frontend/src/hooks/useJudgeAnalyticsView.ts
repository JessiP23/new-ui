import { useMemo } from 'react';
import type { AnalyticsPoint, AnalyticsResponse, JudgeRanking, JudgeSeries } from '../types';
import type { AnalyticsTimeframe } from '../constants/analytics';

type JudgeFocus = 'all' | string;

interface UseJudgeAnalyticsViewParams {
  analytics: AnalyticsResponse | null | undefined;
  judgeFocus: JudgeFocus;
  limit: number | 'all';
  timeframe: AnalyticsTimeframe;
  selectedQueue: string;
  queueHasEvaluations: boolean;
}

interface UseJudgeAnalyticsViewResult {
  judgeOptions: Array<{ id: string; name: string; total: number }>;
  selectedJudgeSeries: JudgeSeries | undefined;
  filteredSeries: JudgeSeries[];
  filteredTimeline: AnalyticsPoint[];
  visibleRankings: JudgeRanking[];
  displayPassRate: number;
  displayTotalEvaluations: number;
  judgeFocusLabel: string;
  analyticsEmptyMessage: string;
}

export function useJudgeAnalyticsView({
  analytics,
  judgeFocus,
  limit,
  timeframe,
  selectedQueue,
  queueHasEvaluations,
}: UseJudgeAnalyticsViewParams): UseJudgeAnalyticsViewResult {
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

  const analyticsEmptyMessage = useMemo(() => {
    if (!selectedQueue) {
      return 'Select a queue to view judge analytics.';
    }
    if (!queueHasEvaluations) {
      return `No evaluations recorded for ${selectedQueue}. Run this queue from the Queue tab to populate analytics.`;
    }
    if (judgeFocus === 'all') {
      return timeframe === 'all'
        ? 'No analytics available for this queue yet. Trigger fresh evaluations to generate insights.'
        : 'No analytics found for the selected timeframe. Extend the window or rerun evaluations to generate fresh verdicts.';
    }
    return `No analytics found for ${selectedJudgeSeries?.judge_name ?? 'the selected judge'} in this window. Try broadening the timeframe or running fresh evaluations.`;
  }, [judgeFocus, queueHasEvaluations, selectedJudgeSeries?.judge_name, selectedQueue, timeframe]);

  return {
    judgeOptions,
    selectedJudgeSeries,
    filteredSeries,
    filteredTimeline,
    visibleRankings,
    displayPassRate,
    displayTotalEvaluations,
    judgeFocusLabel,
    analyticsEmptyMessage,
  };
}

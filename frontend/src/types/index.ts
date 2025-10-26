export type Verdict = 'pass' | 'fail' | 'inconclusive';

export interface SubmissionQuestion {
  data: Record<string, unknown>;
}

export interface Submission {
  id: string;
  queueId: string;
  labelingTaskId: string;
  createdAt: number;
  questions: SubmissionQuestion[];
  answers: Record<string, Record<string, unknown>>;
}

export interface Judge {
  id: string;
  name: string;
  system_prompt: string;
  model: string;
  provider: string;
  active: boolean;
}

export interface Assignment {
  id?: string;
  question_id: string;
  judge_id: string;
  queue_id: string;
}

export interface Evaluation {
  id: string;
  submission_id: string;
  question_id: string;
  judge_id: string;
  verdict: Verdict;
  reasoning: string;
  created_at: string;
  judges?: {
    name: string;
  };
}

export interface JobStatusCounts {
  pending: number;
  running: number;
  done: number;
  failed: number;
  total: number;
}

export interface ResultsFilters {
  queue_id?: string;
  judge_ids: string[];
  question_ids: string[];
  verdict: '' | Verdict;
  page: number;
  limit: number;
}

export interface DashboardSummary {
  submissions: number;
  judges: number;
  evaluations: number;
  pass_rate: number;
  jobs: number;
}

export interface AnalyticsMeta {
  queue_id: string;
  from: number | null;
  to: number | null;
  interval: 'hour' | 'day' | 'week' | 'month';
  judges: number;
}

export interface AnalyticsPoint {
  ts: number;
  pass: number;
  fail: number;
  inconclusive: number;
  total: number;
  pass_rate: number;
  cumulative_pass_rate: number;
  cumulative_total: number;
}

export interface JudgeTotals {
  pass: number;
  fail: number;
  inconclusive: number;
  total: number;
  pass_rate: number;
}

export interface JudgeSeries {
  judge_id: string;
  judge_name: string;
  totals: JudgeTotals;
  points: AnalyticsPoint[];
}

export interface JudgeRanking {
  judge_id: string;
  judge_name: string;
  total: number;
  pass_rate: number;
}

export interface AnalyticsTotals {
  total_evals: number;
  pass_count: number;
  pass_rate: number;
}

export interface AnalyticsResponse {
  meta: AnalyticsMeta;
  series: JudgeSeries[];
  totals: AnalyticsTotals;
  rankings: JudgeRanking[];
  timeline: AnalyticsPoint[];
}

export interface QueueOption {
  queue_id: string;
  created_at?: string;
  evaluation_count?: number;
}

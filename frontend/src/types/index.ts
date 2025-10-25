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

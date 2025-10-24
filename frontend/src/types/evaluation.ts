// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Captures evaluation verdict models and filter/query contracts for result fetching.
export type Verdict = "pass" | "fail" | "inconclusive";

export interface Evaluation {
  id: string;
  submissionId: string;
  questionId: string;
  judgeId: string;
  verdict: Verdict;
  reasoning: string;
  createdAt: string;
  judgeName?: string;
}

export interface EvaluationFilters {
  queueId?: string;
  judgeIds: string[];
  questionIds: string[];
  verdict?: Verdict | "";
  page: number;
  limit: number;
}

export interface EvaluationResponse {
  evaluations: Evaluation[];
  total: number;
}

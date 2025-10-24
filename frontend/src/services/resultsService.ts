// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Fetches evaluation results with filterable query parameters and normalizes responses.
import { apiClient, withRequest } from "../lib/api-client";
import type { Evaluation, EvaluationFilters, EvaluationResponse } from "../types/evaluation";

interface EvaluationApiModel {
  id: string;
  submission_id: string;
  question_id: string;
  judge_id: string;
  verdict: string;
  reasoning: string;
  created_at: string;
  judges?: { name: string };
}

interface EvaluationApiResponse {
  evaluations: EvaluationApiModel[];
  total: number;
}

const mapEvaluation = (payload: EvaluationApiModel): Evaluation => ({
  id: payload.id,
  submissionId: payload.submission_id,
  questionId: payload.question_id,
  judgeId: payload.judge_id,
  verdict: payload.verdict as Evaluation["verdict"],
  reasoning: payload.reasoning,
  createdAt: payload.created_at,
  judgeName: payload.judges?.name,
});

export const fetchEvaluations = (filters: EvaluationFilters) =>
  withRequest(async () => {
    const params = new URLSearchParams();
    filters.judgeIds.forEach((id) => params.append("judge_id", id));
    filters.questionIds.forEach((id) => params.append("question_id", id));
    if (filters.queueId) params.append("queue_id", filters.queueId);
    if (filters.verdict) params.append("verdict", filters.verdict);
    params.append("page", String(filters.page));
    params.append("limit", String(filters.limit));

    const { data } = await apiClient.get<EvaluationApiResponse>(`/evaluations?${params.toString()}`);

    const mapped: EvaluationResponse = {
      evaluations: data.evaluations.map(mapEvaluation),
      total: data.total,
    };

    return mapped;
  });

// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Centralizes evaluation fetching, filtering state, and status messaging for the results view.
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJudges } from "../../../services/judgesService";
import { fetchQueueQuestions } from "../../../services/queueService";
import { fetchEvaluations } from "../../../services/resultsService";
import type { Evaluation, EvaluationFilters } from "../../../types/evaluation";
import type { Judge } from "../../../types/judge";
import type { QueueQuestion } from "../../../types/queue";
import type { StatusMessage } from "../../../types/status";

const DEFAULT_FILTERS: EvaluationFilters = {
  queueId: "",
  judgeIds: [],
  questionIds: [],
  verdict: "",
  page: 1,
  limit: 25,
};

interface UseResultsDataOptions {
  queueId?: string;
}

interface UseResultsDataState {
  filters: EvaluationFilters;
  setQueueId: (queueId: string) => void;
  setVerdict: (verdict: EvaluationFilters["verdict"]) => void;
  toggleJudge: (id: string) => void;
  toggleQuestion: (id: string) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  evaluations: Evaluation[];
  total: number;
  judges: Judge[];
  questions: QueueQuestion[];
  isLoading: boolean;
  status: StatusMessage | null;
  passRate: string;
  resetFilters: () => void;
}

const toggleValue = (values: string[], id: string) =>
  values.includes(id) ? values.filter((value) => value !== id) : [...values, id];

export const useResultsData = ({ queueId }: UseResultsDataOptions): UseResultsDataState => {
  const [filters, setFilters] = useState<EvaluationFilters>({ ...DEFAULT_FILTERS, queueId: queueId ?? "" });
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [total, setTotal] = useState(0);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [questions, setQuestions] = useState<QueueQuestion[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const loadAppendixData = useCallback(async () => {
    const [judgesResponse, questionsResponse] = await Promise.all([
      fetchJudges(),
      filters.queueId ? fetchQueueQuestions(filters.queueId) : Promise.resolve([]),
    ]);
    setJudges(judgesResponse);
    setQuestions(questionsResponse);
  }, [filters.queueId]);

  const loadEvaluations = useCallback(async () => {
    if (!filters.queueId) {
      setEvaluations([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setStatus({ tone: "info", description: "Fetching evaluations…" });
    try {
      const response = await fetchEvaluations(filters);
      setEvaluations(response.evaluations);
      setTotal(response.total);
      setStatus(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to fetch evaluations.";
      setStatus({ tone: "error", description: message });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadAppendixData();
  }, [loadAppendixData]);

  useEffect(() => {
    void loadEvaluations();
  }, [loadEvaluations]);

  useEffect(() => {
    if (queueId) {
      setFilters((prev) => ({ ...prev, queueId }));
    }
  }, [queueId]);

  const passRate = useMemo(() => {
    if (evaluations.length === 0) return "0.0%";
    const passes = evaluations.filter((evaluation) => evaluation.verdict === "pass").length;
    return `${((passes / evaluations.length) * 100).toFixed(1)}%`;
  }, [evaluations]);

  const setQueueId = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, queueId: value, page: 1 }));
  }, []);

  const setVerdict = useCallback((verdict: EvaluationFilters["verdict"]) => {
    setFilters((prev) => ({ ...prev, verdict, page: 1 }));
  }, []);

  const toggleJudge = useCallback((id: string) => {
    setFilters((prev) => ({ ...prev, judgeIds: toggleValue(prev.judgeIds, id), page: 1 }));
  }, []);

  const toggleQuestion = useCallback((id: string) => {
    setFilters((prev) => ({ ...prev, questionIds: toggleValue(prev.questionIds, id), page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setFilters((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters((prev) => ({ ...DEFAULT_FILTERS, queueId: prev.queueId }));
  }, []);

  return {
    filters,
    setQueueId,
    setVerdict,
    toggleJudge,
    toggleQuestion,
    setPage,
    setLimit,
    evaluations,
    total,
    judges,
    questions,
    isLoading,
    status,
    passRate,
    resetFilters,
  };
};

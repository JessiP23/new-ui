// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Handles judge roster data fetching, persistence, and status messaging for UI consumers.
import { useCallback, useEffect, useState } from "react";
import { createJudge, deleteJudge, fetchJudges, updateJudge } from "../../../services/judgesService";
import type { Judge, JudgeInput } from "../../../types/judge";
import type { StatusMessage } from "../../../types/status";

interface UseJudgesDataState {
  judges: Judge[];
  isLoading: boolean;
  status: StatusMessage | null;
  upsertJudge: (payload: JudgeInput, id?: string) => Promise<void>;
  editJudge: (judge: Judge) => void;
  removeJudge: (id: string) => Promise<void>;
  activeJudge?: Judge;
  resetEditor: () => void;
}

const defaultStatus: StatusMessage | null = null;

export const useJudgesData = (): UseJudgesDataState => {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<StatusMessage | null>(defaultStatus);
  const [activeJudge, setActiveJudge] = useState<Judge | undefined>(undefined);

  const loadJudges = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJudges();
      setJudges(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load judges.";
      setStatus({ tone: "error", description: message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJudges();
  }, [loadJudges]);

  const upsertJudge = useCallback(
    async (payload: JudgeInput, id?: string) => {
      setLoading(true);
      setStatus({ tone: "info", description: id ? "Updating judge…" : "Creating judge…" });
      try {
        if (id) {
          const updated = await updateJudge(id, payload);
          setJudges((prev) => prev.map((judge) => (judge.id === id ? updated : judge)));
          setStatus({ tone: "success", title: "Judge updated", description: `${updated.name} saved.` });
        } else {
          const created = await createJudge(payload);
          setJudges((prev) => [created, ...prev]);
          setStatus({ tone: "success", title: "Judge created", description: `${created.name} is ready to use.` });
        }
        setActiveJudge(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save judge.";
        setStatus({ tone: "error", description: message });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const removeJudge = useCallback(async (id: string) => {
    setLoading(true);
    setStatus({ tone: "info", description: "Deleting judge…" });
    try {
      await deleteJudge(id);
      setJudges((prev) => prev.filter((judge) => judge.id !== id));
      setStatus({ tone: "success", title: "Judge deleted", description: "Removed from workspace." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete judge.";
      setStatus({ tone: "error", description: message });
    } finally {
      setLoading(false);
    }
  }, []);

  const editJudge = useCallback((judge: Judge) => {
    setActiveJudge(judge);
  }, []);

  const resetEditor = useCallback(() => {
    setActiveJudge(undefined);
    setStatus(defaultStatus);
  }, []);

  return {
    judges,
    isLoading,
    status,
    upsertJudge,
    editJudge,
    removeJudge,
    activeJudge,
    resetEditor,
  };
};

// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Tracks workflow progress, queue metadata, and provides helpers for navigation synchronization.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { WORKFLOW_STEPS } from "../constants/workflow";
import type { WorkflowStep, WorkflowStepId } from "../types/workflow";

interface WorkflowContextValue {
  steps: WorkflowStep[];
  currentStep: WorkflowStepId;
  setCurrentStep: (step: WorkflowStepId) => void;
  setCurrentStepByPath: (path: string) => void;
  lastQueueId: string;
  setLastQueueId: (id: string) => void;
  completedSteps: Set<WorkflowStepId>;
  markStepComplete: (step: WorkflowStepId) => void;
  resetWorkflow: () => void;
}

const WorkflowContext = createContext<WorkflowContextValue | undefined>(undefined);

export const WorkflowProvider = ({ children }: { children: ReactNode }) => {
  const [currentStep, setCurrentStep] = useState<WorkflowStepId>("upload");
  const [lastQueueId, setLastQueueId] = useState("");
  const [completedSteps, setCompletedSteps] = useState<Set<WorkflowStepId>>(new Set());

  const setCurrentStepByPath = useCallback((path: string) => {
    const match = WORKFLOW_STEPS.find((step) => step.path === path);
    if (match) {
      setCurrentStep(match.id);
    }
  }, []);

  const markStepComplete = useCallback((step: WorkflowStepId) => {
      setCompletedSteps((prev) => {
        if (prev.has(step)) {
          return prev;
        }
        const next = new Set(prev);
        next.add(step);
        return next;
      });
  }, []);

  const resetWorkflow = useCallback(() => {
    setCurrentStep("upload");
    setCompletedSteps(new Set());
    setLastQueueId("");
  }, []);

  const value = useMemo<WorkflowContextValue>(() => ({
    steps: WORKFLOW_STEPS,
    currentStep,
    setCurrentStep,
    setCurrentStepByPath,
    lastQueueId,
    setLastQueueId,
    completedSteps,
    markStepComplete,
    resetWorkflow,
  }), [completedSteps, currentStep, lastQueueId, markStepComplete, resetWorkflow, setCurrentStepByPath]);

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflow must be used within WorkflowProvider");
  }
  return context;
};
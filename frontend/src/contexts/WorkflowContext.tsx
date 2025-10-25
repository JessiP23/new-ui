import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Step = 'dashboard' | 'upload' | 'judges' | 'queue' | 'results';

interface WorkflowContextType {
  currentStep: Step;
  setCurrentStep: (step: Step) => void;
  completedSteps: Set<Step>;
  markCompleted: (step: Step) => void;
  lastQueueId: string;
  setLastQueueId: (id: string) => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const WorkflowProvider = ({ children }: { children: ReactNode }) => {
  const [currentStep, setCurrentStepState] = useState<Step>('dashboard');
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set(['dashboard']));
  const [lastQueueId, setLastQueueIdState] = useState('');

  const setCurrentStep = useCallback((step: Step) => {
    setCurrentStepState((prev) => (prev === step ? prev : step));
  }, []);

  const markCompleted = useCallback((step: Step) => {
    setCompletedSteps((prev) => {
      if (prev.has(step)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }, []);

  const setLastQueueId = useCallback((id: string) => {
    setLastQueueIdState((prev) => (prev === id ? prev : id));
  }, []);

  const value = useMemo(
    () => ({ currentStep, setCurrentStep, completedSteps, markCompleted, lastQueueId, setLastQueueId }),
    [completedSteps, currentStep, lastQueueId, markCompleted, setCurrentStep, setLastQueueId],
  );

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error('useWorkflow must be used within WorkflowProvider');
  return context;
};
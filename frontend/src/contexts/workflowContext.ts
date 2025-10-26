import { createContext, useContext } from 'react';

export type WorkflowStep = 'dashboard' | 'upload' | 'judges' | 'queue' | 'results';

export interface WorkflowContextValue {
    currentStep: WorkflowStep;
    setCurrentStep: (step: WorkflowStep) => void;
    completedSteps: Set<WorkflowStep>;
    markCompleted: (step: WorkflowStep) => void;
    lastQueueId: string;
    setLastQueueId: (id: string) => void;
}

export const WorkflowContext = createContext<WorkflowContextValue | undefined>(undefined);

export function useWorkflow(): WorkflowContextValue {
    const context = useContext(WorkflowContext);
    if (!context) {
        throw new Error('useWorkflow must be used within WorkflowProvider');
    }
    return context;
}

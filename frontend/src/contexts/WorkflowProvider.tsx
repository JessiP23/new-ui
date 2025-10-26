import { useCallback, useMemo, useState, type PropsWithChildren } from 'react';
import { WorkflowContext, type WorkflowContextValue, type WorkflowStep } from './workflowContext';

export function WorkflowProvider({ children }: PropsWithChildren) {
    const [currentStep, setCurrentStepState] = useState<WorkflowStep>('dashboard');
    const [completedSteps, setCompletedSteps] = useState<Set<WorkflowStep>>(new Set(['dashboard']));
    const [lastQueueId, setLastQueueIdState] = useState('');

    const setCurrentStep = useCallback((step: WorkflowStep) => {
        setCurrentStepState((prev) => (prev === step ? prev : step));
    }, []);

    const markCompleted = useCallback((step: WorkflowStep) => {
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

    const value = useMemo<WorkflowContextValue>(
        () => ({ currentStep, setCurrentStep, completedSteps, markCompleted, lastQueueId, setLastQueueId }),
        [completedSteps, currentStep, lastQueueId, markCompleted, setCurrentStep, setLastQueueId],
    );

    return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

import { useCallback, useMemo, useState, type PropsWithChildren } from 'react';
import { WorkflowContext, type WorkflowContextValue, type WorkflowStep } from './workflowContext';

export function WorkflowProvider({ children }: PropsWithChildren) {
    const [currentStep, setCurrentStepState] = useState<WorkflowStep>('dashboard');
    const [completedSteps, setCompletedSteps] = useState<Set<WorkflowStep>>(new Set(['dashboard']));
    const [lastQueueId, setLastQueueIdState] = useState('');
    const [queueIds, setQueueIdsState] = useState<string[]>([]);

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

    const setQueueIds = useCallback((ids: string[]) => {
        const unique = Array.from(new Set(ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)));
        setQueueIdsState((prev) => {
            if (prev.length === unique.length && prev.every((value, index) => value === unique[index])) {
                return prev;
            }
            return unique;
        });
    }, []);

    const value = useMemo<WorkflowContextValue>(
        () => ({ currentStep, setCurrentStep, completedSteps, markCompleted, lastQueueId, setLastQueueId, queueIds, setQueueIds }),
        [completedSteps, currentStep, lastQueueId, markCompleted, setCurrentStep, setLastQueueId, queueIds, setQueueIds],
    );

    return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

import { createContext, useContext, useState, type ReactNode } from 'react';

type Step = 'upload' | 'judges' | 'queue' | 'results';

interface WorkflowContextType {
  currentStep: Step;
  setCurrentStep: (step: Step) => void;
  lastQueueId: string;
  setLastQueueId: (id: string) => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const WorkflowProvider = ({ children }: { children: ReactNode }) => {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [lastQueueId, setLastQueueId] = useState('');

  return (
    <WorkflowContext.Provider value={{ currentStep, setCurrentStep, lastQueueId, setLastQueueId }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error('useWorkflow must be used within WorkflowProvider');
  return context;
};
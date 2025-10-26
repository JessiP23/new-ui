import { Link, useLocation } from 'react-router-dom';
import { useWorkflow } from '../contexts/WorkflowContext';
import { cn } from '../lib/cn';
import { steps } from '../lib/dataAnnotation';

export default function Topbar() {
  const location = useLocation();
  const { currentStep, setCurrentStep, completedSteps } = useWorkflow();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <Link to="/" className="text-xl font-semibold text-slate-900" onClick={() => setCurrentStep('dashboard')}>
              AI Judge Workspace
            </Link>
            <p className="text-sm text-slate-500">Evaluate submissions with confident, auditable AI feedback.</p>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {steps.map((step, index) => {
            const isActive = currentStep === step.key || location.pathname === step.path;
            const isCompleted = completedSteps.has(step.key);
            return (
              <div key={step.key} className="flex items-center gap-2">
                <Link
                  to={step.path}
                  onClick={() => setCurrentStep(step.key)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isCompleted
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                  )}
                >
                  {step.label}
                </Link>
                {index < steps.length - 1 ? <span className="text-slate-300">/</span> : null}
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
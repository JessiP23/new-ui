import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";
import { useWorkflow } from "../../contexts/WorkflowContext";

export const WorkflowStepper = () => {
  const { steps, currentStep, completedSteps } = useWorkflow();

  return (
    <nav aria-label="Workflow steps" className="w-full">
      <ol className="grid grid-cols-4 gap-3">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isPast = completedSteps.has(step.id) || index < steps.findIndex((s) => s.id === currentStep);
          return (
            <li key={step.id}>
              <Link
                to={step.path}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "group flex h-full flex-col justify-between rounded-2xl border px-4 py-3 transition-all duration-200",
                  isCurrent
                    ? "border-[var(--color-primary)]/60 bg-[var(--color-primary)]/10"
                    : isPast
                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                    : "border-white/5 bg-white/2 hover:border-white/10",
                )}
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span className="font-semibold">Step {index + 1}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", isPast ? "bg-[var(--color-success)]/20 text-[var(--color-success)]" : "bg-white/10 text-white/70")}
                  >
                    {isPast ? "Done" : isCurrent ? "Now" : "Next"}
                  </span>
                </div>
                <div className="mt-3 text-base font-semibold text-white">{step.label}</div>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
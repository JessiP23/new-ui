import { useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWorkflow } from "../../contexts/WorkflowContext";
import { Button } from "../ui/Button";
import { WorkflowStepper } from "./WorkflowStepper";

interface AppShellProps {
  primary: ReactNode;
  sidebar?: ReactNode;
}

export const AppShell = ({ primary, sidebar }: AppShellProps) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { steps, currentStep, setCurrentStepByPath, markStepComplete, completedSteps } = useWorkflow();

  useEffect(() => {
    setCurrentStepByPath(pathname);
  }, [pathname, setCurrentStepByPath]);

  useEffect(() => {
    const index = steps.findIndex((step) => step.id === currentStep);
    const completed = steps.slice(0, index);
    completed.forEach((step) => markStepComplete(step.id));
  }, [currentStep, markStepComplete, steps]);

  const currentStepMeta = steps.find((step) => step.id === currentStep);

  return (
    <div className="min-h-screen bg-[color:var(--color-background)] pb-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.4em] text-muted-foreground">AI Judge Studio</div>
            <h1 className="mt-2 text-3xl font-semibold text-white">Design, run, and trust your evaluations</h1>
            {currentStepMeta && <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{currentStepMeta.description}</p>}
          </div>
          <div className="flex items-center gap-3">
            {completedSteps.has("results") ? (
              <Button variant="secondary" onClick={() => navigate("/results")}>View latest run</Button>
            ) : (
              <Button variant="ghost" onClick={() => navigate("/results")}>Browse results</Button>
            )}
          </div>
        </header>

        <WorkflowStepper />

        <main className="grid gap-8 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-6">{primary}</div>
          <aside className="space-y-4">
            {sidebar ?? (
              <div className="glass-surface p-6">
                <h2 className="text-lg font-semibold text-white">How this works</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Move through the workflow from left to right. Each step unlocks the next and highlights what still needs your
                  attention. Actions automatically mark steps as complete so you always know where you stand.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  You can revisit any step at any time—your progress and configuration persist while you iterate.
                </p>
              </div>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
};

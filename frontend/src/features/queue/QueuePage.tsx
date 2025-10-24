// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Assembles queue workflow, handling assignments, actions, and status messaging.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { useWorkflow } from "../../contexts/WorkflowContext";
import { QueueAssignmentBoard } from "./components/QueueAssignmentBoard";
import { QueueActionsPanel } from "./components/QueueActionsPanel";
import { QueueReadinessPanel } from "./components/QueueReadinessPanel";
import { useQueueAssignments } from "./hooks/useQueueAssignments";

export const QueuePage = () => {
  const navigate = useNavigate();
  const { lastQueueId, markStepComplete, setCurrentStep } = useWorkflow();

  const queue = useQueueAssignments({ queueId: lastQueueId });

  useEffect(() => {
    return () => {
      queue.resetStatus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assignmentsCount = Object.values(queue.assignments).reduce((total, judges) => total + judges.length, 0);
  const hasAssignments = assignmentsCount > 0;

  if (!lastQueueId) {
    return (
      <AppShell
        primary={
          <Card>
            <CardHeader>
              <CardTitle>No queue yet</CardTitle>
              <CardDescription>
                Upload a batch first to generate a queue. Once created, you can assign judges and run evaluations here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/upload")}>Back to upload</Button>
            </CardContent>
          </Card>
        }
      />
    );
  }

  return (
    <AppShell
      primary={
        <div className="space-y-6">
          {queue.isLoading && <Alert tone="info">Loading queue data…</Alert>}
          <QueueAssignmentBoard
            questions={queue.questions}
            judges={queue.judges}
            assignments={queue.assignments}
            onToggle={queue.toggleAssignment}
          />
          <QueueReadinessPanel hasAssignments={hasAssignments} queueId={lastQueueId} />
        </div>
      }
      sidebar={
        <div className="space-y-4">
          <QueueActionsPanel
            queueId={lastQueueId}
            onSave={queue.saveAssignments}
            onRun={async () => {
              await queue.runQueue();
              markStepComplete("queue");
              setCurrentStep("results");
              navigate("/results");
            }}
            isSaving={queue.isSaving}
            isRunning={queue.isRunning}
            assignmentsCount={assignmentsCount}
            status={queue.status}
            jobStatus={queue.jobStatus}
            progress={queue.progressPercent}
          />

          <Card surface="glass">
            <CardHeader>
              <CardTitle>Need more judges?</CardTitle>
              <CardDescription>
                You can jump back to tweak judges without losing assignments. Changes apply immediately when you return here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" onClick={() => navigate("/judges")}>Adjust judges</Button>
            </CardContent>
          </Card>
        </div>
      }
    />
  );
};

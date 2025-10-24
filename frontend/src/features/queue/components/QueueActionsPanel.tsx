// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Provides save/run controls and progress telemetry for queue executions.
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/Card";
import { Progress } from "../../../components/ui/Progress";
import type { JobStatus } from "../../../types/queue";
import type { StatusMessage } from "../../../types/status";

interface QueueActionsPanelProps {
  queueId?: string;
  onSave: () => Promise<void>;
  onRun: () => Promise<void>;
  isSaving: boolean;
  isRunning: boolean;
  assignmentsCount: number;
  status: StatusMessage | null;
  jobStatus: JobStatus | null;
  progress: number;
}

export const QueueActionsPanel = ({
  queueId,
  onSave,
  onRun,
  isSaving,
  isRunning,
  assignmentsCount,
  status,
  jobStatus,
  progress,
}: QueueActionsPanelProps) => (
  <Card surface="glass">
    <CardHeader>
      <CardTitle>Run evaluations</CardTitle>
      <CardDescription>Persist assignments, then launch the job queue to gather verdicts.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5 text-sm">
      <div className="grid gap-3">
        <Button variant="secondary" onClick={onSave} isLoading={isSaving} loadingLabel="Saving…" disabled={!queueId}>
          Save assignments
        </Button>
        <Button
          onClick={onRun}
          isLoading={isRunning}
          loadingLabel="Launching…"
          disabled={!queueId || assignmentsCount === 0}
        >
          Run evaluations
        </Button>
      </div>

      {status && (
        <Alert tone={status.tone} title={status.title}>
          {status.description}
        </Alert>
      )}

      {jobStatus && (
        <div className="space-y-3">
          <Progress value={progress} label="Progress" />
          <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <dt className="uppercase tracking-wide">Pending</dt>
              <dd className="text-white">{jobStatus.counts.pending}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide">Running</dt>
              <dd className="text-white">{jobStatus.counts.running}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide">Done</dt>
              <dd className="text-white">{jobStatus.counts.done}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide">Failed</dt>
              <dd className="text-white">{jobStatus.counts.failed}</dd>
            </div>
            <div className="col-span-2">
              <dt className="uppercase tracking-wide">Total jobs</dt>
              <dd className="text-white">{jobStatus.total}</dd>
            </div>
          </dl>
        </div>
      )}
    </CardContent>
  </Card>
);

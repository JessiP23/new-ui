// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Surfaces readiness guidance before executing the queue and displays queue metadata.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/Card";

interface QueueReadinessPanelProps {
  hasAssignments: boolean;
  queueId?: string;
}

export const QueueReadinessPanel = ({ hasAssignments, queueId }: QueueReadinessPanelProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Before you run</CardTitle>
      <CardDescription>
        Confirm each question has at least one judge. Balanced coverage improves verdict quality and reduces bias.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-3 text-sm text-muted-foreground">
      <p>
        Queue <span className="font-medium text-white">{queueId ?? "not yet selected"}</span>
      </p>
      <ul className="list-inside list-disc space-y-1">
        <li>Assign two judges to critical questions for consensus.</li>
        <li>Mix tones (strict, empathetic, analytical) to uncover blind spots.</li>
        <li>Save assignments whenever you make changes.</li>
      </ul>
      {!hasAssignments && <p className="text-[var(--color-warning)]">Assign at least one judge per question to continue.</p>}
    </CardContent>
  </Card>
);

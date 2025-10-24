// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Surfaces contextual guidance and summary metrics for the upload step.
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import type { UploadSummary } from "../../../types/submission";

interface UploadInsightsProps {
  summary: UploadSummary | null;
}

export const UploadInsights = ({ summary }: UploadInsightsProps) => (
  <div className="space-y-4">
    <Card surface="glass">
      <CardHeader>
        <CardTitle>Step guide</CardTitle>
        <CardDescription>
          Uploading generates a queue ID that powers judge assignments. Keep JSON tidy and consistent—the next steps build on
          this foundation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="font-semibold text-white">Quality checklist</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Array of submission objects</li>
            <li>Each record includes queueId, submissionId, and questionId</li>
            <li>Use consistent property casing across entries</li>
            <li>Avoid personal data in prompts or responses</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Need inspiration?</p>
          <p className="mt-2">
            Start with a small batch (3–5 submissions). Run through the flow once, then iterate with larger datasets.
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Submission snapshot</CardTitle>
        <CardDescription>
          We surface essential metadata so you can confirm we detected the queue and structure correctly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {summary ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Queue ID</span>
              <Badge variant="info">{summary.queueId}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Submissions</span>
              <span className="font-medium text-white">{summary.totalSubmissions}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Sample keys</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {summary.sampleKeys.map((key) => (
                  <Badge key={key} variant="neutral" className="capitalize">
                    {key}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">
            Drop or paste JSON to preview queue details. We highlight the detected queueId and top-level keys instantly.
          </p>
        )}
      </CardContent>
    </Card>
  </div>
);

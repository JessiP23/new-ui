// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Presents the submission intake interface with drag-and-drop, textarea, and status feedback.
import { useDropzone } from "react-dropzone";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Field } from "../../../components/ui/FormField";
import { Textarea } from "../../../components/ui/Textarea";
import type { UploadSummary, UploadValidationState } from "../../../types/submission";
import type { StatusMessage } from "../../../types/status";

interface UploadFormProps {
  jsonText: string;
  setJsonText: (value: string) => void;
  summary: UploadSummary | null;
  validation: UploadValidationState;
  status: StatusMessage | null;
  isLoading: boolean;
  onSubmit: () => void;
  onDrop: (files: File[]) => void;
}

export const UploadForm = ({
  jsonText,
  setJsonText,
  summary,
  validation,
  status,
  isLoading,
  onSubmit,
  onDrop,
}: UploadFormProps) => {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "application/json": [".json"] },
    maxFiles: 1,
    noClick: true,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload submissions</CardTitle>
        <CardDescription>
          Drag a JSON file or paste submissions below. We validate everything in real-time so you can trust the queue before
          moving on.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            isDragActive ? "border-[var(--color-primary)]/60 bg-[var(--color-primary)]/10" : "border-white/10"
          }`}
        >
          <input {...getInputProps()} aria-label="Upload JSON file" />
          <p className="text-sm font-medium text-white">Drop your submissions file here</p>
          <p className="text-xs text-muted-foreground">.json up to 5MB • first record must include a queueId</p>
          <Button variant="secondary" size="sm" onClick={open} type="button">
            Browse files
          </Button>
        </div>

        <Field label="Paste JSON" required helperText={validation.message}>
          <Textarea
            spellCheck={false}
            rows={14}
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            placeholder='[
  { "queueId": "demo-queue", "submissionId": "123", ... }
]'
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onSubmit} isLoading={isLoading} loadingLabel="Uploading…">
            {isLoading ? "Uploading" : "Validate & Upload"}
          </Button>
          {summary && (
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {summary.totalSubmissions} submissions • queue {summary.queueId}
            </span>
          )}
        </div>

        {status && (
          <Alert tone={status.tone} title={status.title}>
            {status.description}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

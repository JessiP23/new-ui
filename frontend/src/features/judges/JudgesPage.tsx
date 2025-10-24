// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Coordinates judge creation UI with workflow readiness messaging and advancement controls.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { useWorkflow } from "../../contexts/WorkflowContext";
import { JUDGE_MODELS_BY_PROVIDER, JUDGE_PROMPT_TEMPLATES } from "../../constants/judges";
import { useJudgesData } from "./hooks/useJudgesData";
import { useJudgeForm } from "./hooks/useJudgeForm";
import { JudgeForm } from "./components/JudgeForm";
import { JudgesTable } from "./components/JudgesTable";

export const JudgesPage = () => {
  const navigate = useNavigate();
  const { lastQueueId, setCurrentStep, markStepComplete } = useWorkflow();
  const data = useJudgesData();
  const form = useJudgeForm(data.activeJudge);

  const hasJudges = data.judges.length > 0;

  const canAdvance = hasJudges && Boolean(lastQueueId);

  const nextStepMessage = useMemo(() => {
    if (!lastQueueId) {
      return "Upload submissions first to generate a queue before assigning judges.";
    }
    if (!hasJudges) {
      return "Create at least one active judge to continue to assignments.";
    }
    return `Queue ${lastQueueId} is ready — continue to assignments.`;
  }, [hasJudges, lastQueueId]);

  const handleSubmit = async () => {
    if (!form.validate()) {
      return;
    }
    await data.upsertJudge(form.values, data.activeJudge?.id);
  };

  const handleDelete = async (judgeId: string) => {
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm("Delete this judge? This cannot be undone.");
    if (!confirmed) return;
    await data.removeJudge(judgeId);
  };

  return (
    <AppShell
      primary={
        <div className="space-y-6">
          <JudgeForm
            values={form.values}
            errors={form.errors}
            onChange={form.updateField}
            onToggleActive={form.toggleActive}
            onSubmit={handleSubmit}
            onCancel={form.reset}
            templates={JUDGE_PROMPT_TEMPLATES}
            modelsByProvider={JUDGE_MODELS_BY_PROVIDER}
            isWorking={data.isLoading}
            status={data.status}
            isEditing={Boolean(data.activeJudge)}
          />

          <JudgesTable
            judges={data.judges}
            onEdit={(judge) => data.editJudge(judge)}
            onDelete={(judge) => handleDelete(judge.id)}
            isWorking={data.isLoading}
          />
        </div>
      }
      sidebar={
        <div className="space-y-4">
          <Card surface="glass">
            <CardHeader>
              <CardTitle>Assignment readiness</CardTitle>
              <CardDescription>
                Judges become available for queue assignments as soon as they are active. Keep a mix of tones to reduce bias.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{nextStepMessage}</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Design prompts that return explicit verdicts.</li>
                <li>Include guidance on how to justify each decision.</li>
                <li>Keep names unique so they are easy to assign later.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ready to continue?</CardTitle>
              <CardDescription>When you advance, you can still return to tweak judges at any time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert tone={canAdvance ? "success" : "warning"}>{nextStepMessage}</Alert>
              <Button
                variant={canAdvance ? "primary" : "ghost"}
                disabled={!canAdvance}
                onClick={() => {
                  markStepComplete("judges");
                  setCurrentStep("queue");
                  navigate("/queue");
                }}
              >
                Continue to queue
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    />
  );
};

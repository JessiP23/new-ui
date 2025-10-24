// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Offers a guided interface for authoring judges with prompts, providers, and active states.
import type { FormEvent } from "react";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Field } from "../../../components/ui/FormField";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Switch } from "../../../components/ui/Switch";
import { Textarea } from "../../../components/ui/Textarea";
import type { JudgeInput, JudgeTemplate } from "../../../types/judge";
import type { StatusMessage } from "../../../types/status";

interface JudgeFormProps {
  values: JudgeInput;
  errors: Record<string, string>;
  onChange: <K extends keyof JudgeInput>(key: K, value: JudgeInput[K]) => void;
  onToggleActive: () => void;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  templates: JudgeTemplate[];
  modelsByProvider: Record<string, { value: string; label: string }[]>;
  isWorking: boolean;
  status: StatusMessage | null;
  isEditing: boolean;
}

export const JudgeForm = ({
  values,
  errors,
  onChange,
  onToggleActive,
  onSubmit,
  onCancel,
  templates,
  modelsByProvider,
  isWorking,
  status,
  isEditing,
}: JudgeFormProps) => {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit();
  };

  const providerModels = modelsByProvider[values.provider] ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit judge" : "Create a judge"}</CardTitle>
        <CardDescription>
          Judges evaluate submissions with the tone and rubric you describe. Craft prompts that reflect your brand and
          scoring playbook.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <Field label="Judge name" required error={errors.name} helperText="Give each judge a memorable purpose." inputId="judge-name">
            <Input
              id="judge-name"
              value={values.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="e.g. Product-market-fit grader"
            />
          </Field>

          <Field
            label="System prompt"
            required
            error={errors.systemPrompt}
            helperText="Explain exactly how this judge should decide. Mention verdict format, tone, and required evidence."
            inputId="judge-system-prompt"
          >
            <Textarea
              id="judge-system-prompt"
              rows={8}
              value={values.systemPrompt}
              onChange={(event) => onChange("systemPrompt", event.target.value)}
              placeholder="You are a seasoned reviewer..."
            />
          </Field>

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Prompt starters</span>
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <Button
                  key={template.title}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange("systemPrompt", template.prompt)}
                >
                  {template.title}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Provider" required error={errors.provider}>
              <Select value={values.provider} onChange={(event) => onChange("provider", event.target.value)}>
                {Object.keys(modelsByProvider).map((provider) => (
                  <option key={provider} value={provider}>
                    {provider.toUpperCase()}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Model" required error={errors.model}>
              <Select value={values.model} onChange={(event) => onChange("model", event.target.value)}>
                {providerModels.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Switch
            checked={values.active}
            onChange={onToggleActive}
            label="Active"
            description="Inactive judges remain in the roster but won't be assigned to queues."
          />

          {status && (
            <Alert tone={status.tone} title={status.title}>
              {status.description}
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" isLoading={isWorking} loadingLabel={isEditing ? "Saving changes…" : "Creating…"}>
              {isEditing ? "Save changes" : "Create judge"}
            </Button>
            {isEditing && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel edit
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

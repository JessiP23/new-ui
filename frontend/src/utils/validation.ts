// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Houses reusable validation helpers for forms and upload flows.
import type { JudgeInput } from "../types/judge";
import type { UploadValidationState } from "../types/submission";

export const isNonEmpty = (value: string): boolean => value.trim().length > 0;

export const validateJudgeInput = (input: JudgeInput): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!isNonEmpty(input.name)) {
    errors.name = "Give this judge a descriptive name.";
  }
  if (!isNonEmpty(input.systemPrompt)) {
    errors.systemPrompt = "Describe how this judge should evaluate submissions.";
  }
  if (!isNonEmpty(input.model)) {
    errors.model = "Select a model.";
  }
  if (!isNonEmpty(input.provider)) {
    errors.provider = "Choose a provider.";
  }
  return errors;
};

export const buildUploadValidation = (message: string | null, isValid: boolean): UploadValidationState => ({
  isValid,
  message: message ?? (isValid ? "Ready to upload." : "Paste valid JSON to continue."),
});

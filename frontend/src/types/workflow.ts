// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Describes workflow step identifiers and metadata consumed by navigation components.
export type WorkflowStepId = "upload" | "judges" | "queue" | "results";

export interface WorkflowStep {
  id: WorkflowStepId;
  label: string;
  description: string;
  path: string;
}

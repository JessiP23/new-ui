// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Centralizes ordered workflow steps for navigation and guidance components.
import type { WorkflowStep } from "../types/workflow";

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "upload",
    label: "Upload Submissions",
    description: "Provide the submission batch to prepare a review queue.",
    path: "/upload",
  },
  {
    id: "judges",
    label: "Configure Judges",
    description: "Craft evaluators tailored to your scoring rubric.",
    path: "/judges",
  },
  {
    id: "queue",
    label: "Assign & Run",
    description: "Pair judges with questions and kick off evaluations.",
    path: "/queue",
  },
  {
    id: "results",
    label: "Review Results",
    description: "Filter and interpret the final AI verdicts.",
    path: "/results",
  },
];

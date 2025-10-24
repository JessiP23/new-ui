// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Enumerates status tones and message contracts for alerting components.
export type StatusTone = "info" | "success" | "warning" | "error";

export interface StatusMessage {
  tone: StatusTone;
  title?: string;
  description: string;
}

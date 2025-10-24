// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Shapes standardized API error payloads for consistent error surfaces.
export interface ApiError {
  status?: number;
  message: string;
  details?: unknown;
}

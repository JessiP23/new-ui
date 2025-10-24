// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Models submission payloads and upload validation metadata.
export type SubmissionRecord = Record<string, unknown> & {
  queueId: string;
};

export interface UploadSummary {
  queueId: string;
  totalSubmissions: number;
  sampleKeys: string[];
}

export interface UploadValidationState {
  isValid: boolean;
  message: string;
}

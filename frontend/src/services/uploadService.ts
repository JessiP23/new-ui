// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Wraps API calls for submission uploads.
import { apiClient, withRequest } from "../lib/api-client";
import type { SubmissionRecord } from "../types/submission";

interface UploadResponse {
  message: string;
}

export const uploadSubmissions = (payload: SubmissionRecord[]) =>
  withRequest(async () => {
    const { data } = await apiClient.post<UploadResponse>("/upload", payload);
    return data;
  });

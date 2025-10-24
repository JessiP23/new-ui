// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Manages end-to-end upload parsing, validation, and submission workflow state.
import { useCallback, useState } from "react";
import { uploadSubmissions } from "../../../services/uploadService";
import type { SubmissionRecord, UploadSummary, UploadValidationState } from "../../../types/submission";
import type { StatusMessage } from "../../../types/status";
import { safeParseJson } from "../../../utils/json";
import { buildUploadValidation } from "../../../utils/validation";

interface UseUploadFlowOptions {
  onSuccess?: (queueId: string) => void;
  onFailure?: () => void;
}

interface UseUploadFlowState {
  jsonText: string;
  setJsonText: (value: string) => void;
  summary: UploadSummary | null;
  validation: UploadValidationState;
  status: StatusMessage | null;
  isLoading: boolean;
  handleFileDrop: (files: File[]) => void;
  handleSubmit: () => Promise<void>;
  resetStatus: () => void;
}

const initialValidation: UploadValidationState = {
  isValid: false,
  message: "Drop a JSON file or paste content to begin.",
};

export const useUploadFlow = ({ onSuccess, onFailure }: UseUploadFlowOptions = {}): UseUploadFlowState => {
  const [jsonText, setJsonTextState] = useState("");
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [validation, setValidation] = useState<UploadValidationState>(initialValidation);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isLoading, setLoading] = useState(false);

  const analyzeText = useCallback((value: string) => {
    const { data, error } = safeParseJson<SubmissionRecord[]>(value);

    if (error) {
      setSummary(null);
      setValidation(buildUploadValidation(`Fix JSON: ${error}`, false));
      return null;
    }

    if (!Array.isArray(data)) {
      setSummary(null);
      setValidation(buildUploadValidation("Expected a JSON array of submissions.", false));
      return null;
    }

    if (data.length === 0) {
      setSummary(null);
      setValidation(buildUploadValidation("Add at least one submission record.", false));
      return null;
    }

    const queueId = data[0]?.queueId;
    if (typeof queueId !== "string" || queueId.trim().length === 0) {
      setSummary(null);
      setValidation(buildUploadValidation("The first record must include a queueId to route evaluations.", false));
      return null;
    }

    const sampleKeys = Object.keys(data[0] || {}).slice(0, 5);
    const uploadSummary: UploadSummary = {
      queueId,
      totalSubmissions: data.length,
      sampleKeys,
    };

    setSummary(uploadSummary);
    setValidation(
      buildUploadValidation(
        `Ready to upload ${data.length} submissions for queue ${queueId}. Review keys: ${sampleKeys.join(", ")}.`,
        true,
      ),
    );

    return uploadSummary;
  }, []);

  const setJsonText = useCallback(
    (value: string) => {
      setJsonTextState(value);
      if (!value.trim()) {
        setSummary(null);
        setValidation(initialValidation);
        return;
      }
      analyzeText(value);
    },
    [analyzeText],
  );

  const handleFileDrop = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const value = String(event.target?.result ?? "");
        setJsonText(value);
      };
      reader.readAsText(file);
    },
    [setJsonText],
  );

  const resetStatus = useCallback(() => setStatus(null), []);

  const handleSubmit = useCallback(async () => {
    const analysis = analyzeText(jsonText);
    if (!analysis) {
      setStatus({ tone: "error", description: "Resolve validation issues before uploading." });
      onFailure?.();
      return;
    }

    const { data, error } = safeParseJson<SubmissionRecord[]>(jsonText);
    if (error || !data) {
      setStatus({ tone: "error", description: `Unable to parse JSON: ${error}` });
      onFailure?.();
      return;
    }

    setLoading(true);
    setStatus({ tone: "info", description: "Uploading submissions…" });

    try {
      const response = await uploadSubmissions(data);
      setStatus({ tone: "success", title: "Upload complete", description: response.message ?? "Files uploaded." });
      onSuccess?.(analysis.queueId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setStatus({ tone: "error", description: message });
      onFailure?.();
    } finally {
      setLoading(false);
    }
  }, [analyzeText, jsonText, onFailure, onSuccess]);

  return {
    jsonText,
    setJsonText,
    summary,
    validation,
    status,
    isLoading,
    handleFileDrop,
    handleSubmit,
    resetStatus,
  };
};

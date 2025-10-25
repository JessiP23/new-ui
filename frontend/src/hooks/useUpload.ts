import { useState } from 'react';
import { apiClient } from '../lib/api';

interface UseUploadOptions {
  onComplete?: (queueId: string, message: string) => void;
}

interface UploadState {
  jsonText: string;
  message: string;
  loading: boolean;
}

export function useUpload(options?: UseUploadOptions) {
  const [state, setState] = useState<UploadState>({ jsonText: '', message: '', loading: false });
  const setJsonText = (value: string) => setState((prev) => ({ ...prev, jsonText: value }));

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = typeof event.target?.result === 'string' ? event.target.result : '';
      setJsonText(result);
    };
    reader.readAsText(file);
  };

  const handleJsonSubmit = async () => {
    setState((prev) => ({ ...prev, loading: true, message: '' }));
    try {
      const parsed = JSON.parse(state.jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('Input must be a JSON array of submissions.');
      }
      if (parsed.length === 0) {
        throw new Error('Array cannot be empty.');
      }
      const [first] = parsed;
      if (!first?.queueId) {
        throw new Error('First submission must include a queueId field.');
      }

      const response = await apiClient.post('/submissions', parsed);
      const queueId: string = first.queueId;
      const message: string = response.data?.message ?? 'Upload complete';
      setState((prev) => ({ ...prev, message }));
      options?.onComplete?.(queueId, message);
    } catch (error: unknown) {
      const detail =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? 'Unexpected error';
      setState((prev) => ({ ...prev, message: `Upload failed: ${detail}` }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  return {
    jsonText: state.jsonText,
    message: state.message,
    loading: state.loading,
    setJsonText,
    onDrop,
    handleJsonSubmit,
  };
}

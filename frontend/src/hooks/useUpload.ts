import { useState } from 'react';
import { apiClient } from '../lib/api';
import type { AttachmentMetadata, Submission } from '../types';

interface UseUploadOptions {
  onComplete?: (queueId: string, message: string) => void;
}

type AttachmentTarget = 'all' | string;

type AttachmentStatus = 'pending' | 'uploading' | 'done' | 'error';

interface AttachmentDraft {
  id: string;
  file: File;
  target: AttachmentTarget;
  status: AttachmentStatus;
  progress: number;
  error?: string;
}

interface UploadState {
  jsonText: string;
  message: string;
  loading: boolean;
  attachments: AttachmentDraft[];
}

const createAttachmentDraft = (file: File): AttachmentDraft => ({
  id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  file,
  target: 'all',
  status: 'pending',
  progress: 0,
});

const deriveErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const maybeResponse = (error as { response?: { data?: { detail?: string } } }).response;
    if (maybeResponse?.data?.detail) {
      return maybeResponse.data.detail;
    }
  }
  return 'Unexpected error';
};

const collectSubmissionIds = (submissions: Submission[]): string[] => {
  const ids = submissions.map((item) => item.id).filter((id): id is string => Boolean(id));
  return Array.from(new Set(ids));
};

export function useUpload(options?: UseUploadOptions) {
  const [state, setState] = useState<UploadState>({ jsonText: '', message: '', loading: false, attachments: [] });

  const setJsonText = (value: string) => setState((prev) => ({ ...prev, jsonText: value }));

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = typeof event.target?.result === 'string' ? event.target.result : '';
      setJsonText(result);
    };
    reader.readAsText(file);
  };

  const addAttachments = (files: File[]) => {
    if (!files.length) {
      return;
    }
    setState((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files.map((file) => createAttachmentDraft(file))],
    }));
  };

  const removeAttachment = (attachmentId: string) => {
    setState((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((attachment) => attachment.id !== attachmentId),
    }));
  };

  const updateAttachmentTarget = (attachmentId: string, target: AttachmentTarget) => {
    setState((prev) => ({
      ...prev,
      attachments: prev.attachments.map((attachment) =>
        attachment.id === attachmentId ? { ...attachment, target } : attachment,
      ),
    }));
  };

  const updateAttachment = (attachmentId: string, updater: (draft: AttachmentDraft) => AttachmentDraft) => {
    setState((prev) => ({
      ...prev,
      attachments: prev.attachments.map((attachment) =>
        attachment.id === attachmentId ? updater(attachment) : attachment,
      ),
    }));
  };

  const uploadAttachmentForSubmission = async (
    submissionId: string,
    attachment: AttachmentDraft,
  ): Promise<AttachmentMetadata> => {
    const formData = new FormData();
    formData.append('files', attachment.file);
    const response = await apiClient.post<{ attachments: AttachmentMetadata[] }>(
      `/submissions/${submissionId}/attachments?persist=false`,
      formData,
    );
    const metadata = response.data?.attachments ?? [];
    if (!metadata.length) {
      throw new Error('Attachment upload returned no metadata.');
    }
    return metadata[0];
  };

  const handleJsonSubmit = async () => {
    setState((prev) => ({ ...prev, loading: true, message: '' }));
    try {
      if (!state.jsonText.trim()) {
        throw new Error('Add a JSON payload before uploading submissions and attachments.');
      }
      const parsed = JSON.parse(state.jsonText) as Submission[];
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

      const submissionIds = collectSubmissionIds(parsed);
      const attachmentMap: Record<string, AttachmentMetadata[]> = {};

      for (const attachment of state.attachments) {
        const targets = attachment.target === 'all' ? submissionIds : [attachment.target];
        const validTargets = targets.filter((target) => submissionIds.includes(target));
        if (!validTargets.length) {
          updateAttachment(attachment.id, (draft) => ({
            ...draft,
            status: 'error',
            error: 'Select a submission mapping before uploading.',
          }));
          throw new Error(`Attachment "${attachment.file.name}" is missing a valid submission mapping.`);
        }

        updateAttachment(attachment.id, (draft) => ({
          ...draft,
          status: 'uploading',
          progress: validTargets.length === 1 ? 25 : 5,
          error: undefined,
        }));

        for (let index = 0; index < validTargets.length; index += 1) {
          const submissionId = validTargets[index];
          try {
            const metadata = await uploadAttachmentForSubmission(submissionId, attachment);
            attachmentMap[submissionId] = [...(attachmentMap[submissionId] ?? []), metadata];
            const progress = Math.round(((index + 1) / validTargets.length) * 100);
            updateAttachment(attachment.id, (draft) => ({ ...draft, progress }));
          } catch (error) {
            const detail = deriveErrorMessage(error);
            updateAttachment(attachment.id, (draft) => ({
              ...draft,
              status: 'error',
              error: detail,
            }));
            throw new Error(detail);
          }
        }

        updateAttachment(attachment.id, (draft) => ({ ...draft, status: 'done', progress: 100 }));
      }

      const payload = parsed.map((submission) => ({
        ...submission,
        attachments: attachmentMap[submission.id] ?? submission.attachments ?? [],
      }));

      const response = await apiClient.post('/submissions', payload);
      const queueId: string = first.queueId;
      const message: string = response.data?.message ?? `Uploaded ${payload.length} submissions`;
      setState((prev) => ({
        ...prev,
        message,
        attachments: [],
      }));
      options?.onComplete?.(queueId, message);
    } catch (error: unknown) {
      const detail = deriveErrorMessage(error);
      setState((prev) => ({ ...prev, message: `Upload failed: ${detail}` }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  return {
    jsonText: state.jsonText,
    message: state.message,
    loading: state.loading,
    attachments: state.attachments,
    setJsonText,
    onDrop,
    addAttachments,
    removeAttachment,
    updateAttachmentTarget,
    handleJsonSubmit,
  };
}

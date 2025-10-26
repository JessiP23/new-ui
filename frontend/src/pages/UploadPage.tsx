import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { UploadModal } from '../components/ui/UploadModal';
import { useWorkflow } from '../contexts/workflowContext';
import { useUpload } from '../hooks/useUpload';
import type { Submission } from '../types';

export default function UploadPage() {
    const navigate = useNavigate();
    const { setCurrentStep, markCompleted, setLastQueueId } = useWorkflow();
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        setCurrentStep('upload');
    }, [setCurrentStep]);

    const {
        jsonText,
        setJsonText,
        message,
        loading,
        onDrop,
        handleJsonSubmit,
        attachments,
        addAttachments,
        removeAttachment,
        updateAttachmentTarget,
    } = useUpload({
        onComplete: (queueId) => {
            setLastQueueId(queueId);
            markCompleted('upload');
            setCurrentStep('judges');
            navigate('/judges');
        },
    });

    const jsonDropzone = useDropzone({ onDrop, accept: { 'application/json': ['.json'] } });
    const attachmentsDropzone = useDropzone({
        onDrop: (files) => addAttachments(files),
        accept: {
            'image/*': [],
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt'],
            'application/zip': ['.zip'],
        },
        multiple: true,
    });

    const parsedSubmissions = useMemo<Submission[]>(() => {
        if (!jsonText) {
            return [];
        }
        try {
            const parsed = JSON.parse(jsonText);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }, [jsonText]);

    const summary = useMemo(() => {
        if (!jsonText) return '';
        try {
            const parsed = JSON.parse(jsonText);
            if (!Array.isArray(parsed)) return 'Expected a JSON array of submissions.';
            const attachmentCount = attachments.length;
            const attachmentsLabel = attachmentCount ? ` · ${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'} queued` : '';
            return `Ready to upload ${parsed.length} submissions${attachmentsLabel}.`;
        } catch (error) {
            return error instanceof Error ? `Invalid JSON: ${error.message}` : 'Invalid JSON input.';
        }
    }, [attachments.length, jsonText]);

    const showMessage = message || summary;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Upload submissions</h1>
                    <p className="text-sm text-slate-500">Drag in your JSON payload or paste it below to seed a new evaluation queue.</p>
                </div>
                <Button variant="secondary" onClick={() => setModalOpen(true)}>
                    Use upload helper
                </Button>
            </div>

            <Card className="space-y-4 p-0">
                <div
                    {...jsonDropzone.getRootProps({
                        className:
                        'rounded-t-xl border-b border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 outline-none transition-colors hover:bg-slate-100',
                    })}
                >
                    <input {...jsonDropzone.getInputProps()} />
                    {jsonDropzone.isDragActive ? 'Drop the JSON file here...' : 'Drag & drop a JSON file here, or click to browse'}
                </div>

                <div className="space-y-3 p-6">
                    <label className="text-sm font-medium text-slate-700" htmlFor="upload-json">
                        Or paste JSON
                    </label>
                    <textarea
                        id="upload-json"
                        value={jsonText}
                        onChange={(event) => setJsonText(event.target.value)}
                        rows={12}
                        className="w-full rounded-lg border border-slate-200 bg-white p-4 font-mono text-sm text-slate-700 shadow-inner focus:border-indigo-500 focus:outline-none"
                        placeholder={'[{ "id": "submission-123", "queueId": "demo-queue" }]'}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                        <span>Ensure each submission includes a unique <code className="rounded bg-slate-100 px-1">queueId</code>.</span>
                        <Button onClick={() => handleJsonSubmit()} disabled={loading}>
                            {loading ? <Loading label="Uploading" /> : 'Upload' }
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="space-y-4 p-0">
                <div
                    {...attachmentsDropzone.getRootProps({
                        className:
                        'rounded-t-xl border-b border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 outline-none transition-colors hover:bg-slate-100',
                    })}
                >
                    <input {...attachmentsDropzone.getInputProps()} />
                    {attachmentsDropzone.isDragActive
                        ? 'Drop attachments here...'
                        : 'Drag & drop attachments (images, PDF, TXT, ZIP) or click to browse'}
                </div>

                <div className="space-y-4 p-6">
                    {attachments.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            Attach supplementary files to individual submissions or the entire upload. Mapping options activate once valid JSON is provided.
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {attachments.map((attachment) => {
                                const statusLabel =
                                    attachment.status === 'uploading'
                                        ? `Uploading… ${attachment.progress}%`
                                        : attachment.status === 'done'
                                            ? 'Ready'
                                            : attachment.status === 'error'
                                                ? attachment.error ?? 'Error'
                                                : 'Pending mapping';
                                return (
                                    <li key={attachment.id} className="rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{attachment.file.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {(attachment.file.size / 1024).toFixed(1)} KB · {attachment.file.type || 'Unknown type'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">{statusLabel}</span>
                                                <Button variant="ghost" size="sm" onClick={() => removeAttachment(attachment.id)}>
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                                                Attach to
                                                <select
                                                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-inner focus:border-indigo-500 focus:outline-none"
                                                    value={attachment.target}
                                                    onChange={(event) => updateAttachmentTarget(attachment.id, event.target.value as typeof attachment.target)}
                                                    disabled={parsedSubmissions.length === 0}
                                                >
                                                    <option value="all">All submissions</option>
                                                    {parsedSubmissions.map((submission) => (
                                                        <option key={submission.id} value={submission.id}>
                                                            {submission.id}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                            <div className="flex-1">
                                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className="h-full rounded-full bg-indigo-500 transition-all"
                                                        style={{ width: `${attachment.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </Card>

            {showMessage ? (
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
                    {showMessage}
                </div>
            ) : null}

            {!jsonText && !loading ? (
                <EmptyState
                    title="No submissions yet"
                    description="Upload a dataset to kick off the evaluation workflow."
                    action={<Button onClick={() => setModalOpen(true)}>Open upload helper</Button>}
                />
            ) : null}

            <UploadModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onFileAccepted={(content) => setJsonText(content)}
                description="Supports JSON arrays exported from Besimple labeling tasks."
            />
        </div>
    );
}

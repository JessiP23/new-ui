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
    } = useUpload({
        onComplete: (queueId) => {
            setLastQueueId(queueId);
            markCompleted('upload');
            setCurrentStep('judges');
            navigate('/judges');
        },
    });

    const jsonDropzone = useDropzone({ onDrop, accept: { 'application/json': ['.json'] } });
    const summary = useMemo(() => {
        if (!jsonText) return '';
        try {
            const parsed = JSON.parse(jsonText);
            if (!Array.isArray(parsed)) return 'Expected a JSON array of submissions.';
            return `Ready to upload ${parsed.length} submissions.`;
        } catch (error) {
            return error instanceof Error ? `Invalid JSON: ${error.message}` : 'Invalid JSON input.';
        }
    }, [jsonText]);

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

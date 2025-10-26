import { Button } from './Button';

interface UploadModalProps {
    open: boolean;
    onClose: () => void;
    onFileAccepted: (content: string) => void;
    title?: string;
    description?: string;
}

export function UploadModal({ open, onClose, title = 'Upload Submissions', description }: UploadModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        Close
                    </Button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-medium text-slate-700">Requirements</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-left">
                        <li>JSON array of submissions</li>
                        <li>Each submission must include a <code className="rounded bg-slate-200 px-1">queueId</code></li>
                        <li>Use UTF-8 encoding</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

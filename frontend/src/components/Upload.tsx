import { useDropzone } from 'react-dropzone';
import { useMemo } from 'react';
import { useUpload } from '../hooks/useUpload';
import { useNavigate } from 'react-router-dom';
import { useWorkflow } from '../contexts/WorkflowContext';

export default function Upload() {
  const navigate = useNavigate();
  const { setCurrentStep, setLastQueueId } = useWorkflow();
  const { jsonText, setJsonText, message, loading, onDrop, handleJsonSubmit } = useUpload(navigate, setCurrentStep, setLastQueueId);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/json': ['.json'] } });

  const summary = useMemo(() => {
    if (!jsonText) return null;
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) return 'Expected an array of submissions';
      return `Parsed ${parsed.length} submissions`;
    } catch (e: any) {
      return `Invalid JSON: ${e.message}`;
    }
  }, [jsonText]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Upload Submissions</h2>
        <div className="text-sm text-gray-400">Tip: drag & drop JSON or paste below</div>
      </div>

      <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center ${isDragActive ? 'border-indigo-500 bg-white/2' : 'border-white/5'}`}>
        <input {...getInputProps()} />
        <p className="text-gray-300">{isDragActive ? 'Drop the JSON file here...' : 'Drag & drop a JSON file here, or click to select'}</p>
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-2">Or paste JSON</label>
        <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} rows={12} className="w-full p-4 rounded-lg bg-white/3 border border-white/5 font-mono text-sm text-gray-100" />
      </div>

      <div className="flex items-center gap-4">
        <button onClick={handleJsonSubmit} disabled={loading} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700">{loading ? 'Working...' : 'Upload'}</button>
      </div>

      {summary && <div className="message">{summary}</div>}
      {message && <div className="message">{message}</div>}
    </div>
  );
}
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useQueue } from '../hooks/useQueue';
import { useNavigate } from 'react-router-dom';
import { useWorkflow } from '../contexts/WorkflowContext';

const API_BASE = 'http://localhost:8000';

export default function Queue() {
  const navigate = useNavigate();
  const { setCurrentStep, lastQueueId } = useWorkflow();
  const {
    questions,
    judges,
    selectedJudges,
    error,
    handleAssign,
    toggleJudge,
    fetchJobStatus,
  } = useQueue(lastQueueId);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState('');
  const [jobCounts, setJobCounts] = useState<{ pending: number; running: number; done: number; failed: number; total: number } | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const pollHandleRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollHandleRef.current) {
        window.clearInterval(pollHandleRef.current);
      }
    };
  }, []);

  const handleRunEvaluations = async () => {
    if (!lastQueueId) {
      setRunMessage('No queue ID available.');
      return;
    }
    console.log(`Running evaluations for queue_id: ${lastQueueId}`);
    setRunning(true);
    setRunMessage(`Starting evaluations for queue: ${lastQueueId}...`);
    try {
      const resp = await axios.post(`${API_BASE}/run_judges?queue_id=${lastQueueId}`);
      const enqueued = resp.data?.enqueued || 0;
      const pollInterval = 1500; 
      let total = enqueued;
      setRunMessage(`Enqueued ${enqueued} jobs — polling progress...`);

      const sseUrl = `${API_BASE}/live_job_status?queue_id=${lastQueueId}`;
      let es: EventSource | null = null;
      try {
        es = new EventSource(sseUrl);
      } catch (e) {
        es = null;
      }

      if (es) {
        es.onmessage = (ev) => {
          try {
            const status = JSON.parse(ev.data);
            const counts = status.counts || { pending: 0, running: 0, done: 0, failed: 0 };
            const totalReported = status.total || total || enqueued;
            total = totalReported;
            setJobCounts({ ...counts, total: totalReported });
            const finished = (counts.done || 0) + (counts.failed || 0);
            const percent = Math.round((finished / Math.max(1, total)) * 100);
            setProgressPercent(percent);

            if ((counts.pending || 0) + (counts.running || 0) === 0 && total > 0) {
              es?.close();
              setRunning(false);
              setRunMessage(`Processing complete — ${finished}/${total} finished (${percent}%).`);
              setCurrentStep('results');
              navigate('/results');
            }
          } catch (e) {
            console.error('SSE parse error', e);
          }
        };

        es.onerror = (err) => {
          console.warn('SSE error, falling back to polling', err);
          es?.close();
          pollHandleRef.current = window.setInterval(async () => {
            const status = await fetchJobStatus(lastQueueId);
            const counts = status.counts || { pending: 0, running: 0, done: 0, failed: 0 };
            const statusTotal = status.total || total || enqueued;
            total = statusTotal || total;
            setJobCounts({ ...counts, total });
            const finished = (counts.done || 0) + (counts.failed || 0);
            const percent = Math.round((finished / Math.max(1, total)) * 100);
            setProgressPercent(percent);
            if ((counts.pending || 0) + (counts.running || 0) === 0 && total > 0) {
              if (pollHandleRef.current) window.clearInterval(pollHandleRef.current);
              setRunning(false);
              setRunMessage(`Processing complete — ${finished}/${total} finished (${percent}%).`);
              setCurrentStep('results');
              navigate('/results');
            }
          }, pollInterval);
        };

      } else {
        pollHandleRef.current = window.setInterval(async () => {
          const status = await fetchJobStatus(lastQueueId);
          const counts = status.counts || { pending: 0, running: 0, done: 0, failed: 0 };
          const statusTotal = status.total || total || enqueued;
          total = statusTotal || total;
          setJobCounts({ ...counts, total });
          const finished = (counts.done || 0) + (counts.failed || 0);
          const percent = Math.round((finished / Math.max(1, total)) * 100);
          setProgressPercent(percent);
          if ((counts.pending || 0) + (counts.running || 0) === 0 && total > 0) {
            if (pollHandleRef.current) window.clearInterval(pollHandleRef.current);
            setRunning(false);
            setRunMessage(`Processing complete — ${finished}/${total} finished (${percent}%).`);
            setCurrentStep('results');
            navigate('/results');
          }
        }, pollInterval);
        (async () => {
          const status = await fetchJobStatus(lastQueueId);
          const counts = status.counts || { pending: 0, running: 0, done: 0, failed: 0 };
          const statusTotal = status.total || total || enqueued;
          total = statusTotal || total;
          setJobCounts({ ...counts, total });
          const finished = (counts.done || 0) + (counts.failed || 0);
          const percent = Math.round((finished / Math.max(1, total)) * 100);
          setProgressPercent(percent);
        })();
      }
    } catch (error: any) {
      setRunMessage(`Failed to run evaluations for queue: ${lastQueueId}: ${error.response?.data?.detail || error.message}`);
    } finally {
      if (!pollHandleRef.current) setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Queue Management</h2>
        <div className="text-sm text-gray-400">
          {lastQueueId ? `Assigning judges for queue: ${lastQueueId}` : 'Assign judges to questions'}
        </div>
      </div>

      {error && <p className="text-red-400">{error}</p>}

      {questions.length > 0 && (
        <div className="space-y-4">
          {questions.map(q => (
            <div key={q} className="bg-white/3 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Question: {q}</h3>
              <div className="flex flex-wrap gap-2">
                {judges.map(j => (
                  <label key={j.id} className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-md cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(selectedJudges[q] || []).includes(j.id)}
                      onChange={() => toggleJudge(q, j.id)}
                    />
                    {j.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {questions.length > 0 && (
        <div className="flex gap-4">
          <button onClick={handleAssign} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700">Save Assignments</button>
          <button onClick={handleRunEvaluations} disabled={running} className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 disabled:opacity-50">
            {running ? 'Running Evaluations...' : 'Run Evaluations'}
          </button>
        </div>
      )}

      {jobCounts && (
        <div className="mt-4">
          <div className="text-sm text-gray-300 mb-2">Progress</div>
          <div className="w-full bg-gray-700 h-3 rounded overflow-hidden">
            <div className="h-3 bg-green-500" style={{ width: `${progressPercent}%`, transition: 'width 300ms ease' }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <div>Done: {jobCounts.done}</div>
            <div>Running: {jobCounts.running}</div>
            <div>Pending: {jobCounts.pending}</div>
            <div>Failed: {jobCounts.failed}</div>
            <div>Total: {jobCounts.total}</div>
          </div>
        </div>
      )}

      {runMessage && (
        <div className="mt-4 p-4 rounded-md bg-white/10 text-white">
          {runMessage}
        </div>
      )}
    </div>
  );
}

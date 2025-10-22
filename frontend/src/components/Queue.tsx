import { useState } from 'react';
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
  } = useQueue(lastQueueId);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState('');

  const handleRunEvaluations = async () => {
    if (!lastQueueId) {
      setRunMessage('No queue ID available.');
      return;
    }
    console.log(`Running evaluations for queue_id: ${lastQueueId}`);
    setRunning(true);
    setRunMessage(`Starting evaluations for queue: ${lastQueueId}...`);
    try {
      await axios.post(`${API_BASE}/run_judges?queue_id=${lastQueueId}`);
      setRunMessage(`Evaluations completed successfully for queue: ${lastQueueId}!`);
      setCurrentStep('results');
      navigate('/results');
    } catch (error: any) {
      setRunMessage(`Failed to run evaluations for queue: ${lastQueueId}: ${error.response?.data?.detail || error.message}`);
    } finally {
      setRunning(false);
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

      {runMessage && (
        <div className="mt-4 p-4 rounded-md bg-white/10 text-white">
          {runMessage}
        </div>
      )}
    </div>
  );
}
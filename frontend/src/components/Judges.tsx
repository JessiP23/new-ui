import { useState } from 'react';
import { useJudges } from '../hooks/useJudges';
import { useNavigate } from 'react-router-dom';
import { useWorkflow } from '../contexts/WorkflowContext';

interface Judge {
  id: string;
  name: string;
  system_prompt: string;
  model: string;
  active: boolean;
}

export default function Judges() {
  const navigate = useNavigate();
  const { setCurrentStep, lastQueueId } = useWorkflow();
  const { judges, loading, error, createJudge, updateJudge, deleteJudge } = useJudges();
  const [form, setForm] = useState({ name: '', system_prompt: '', model: 'llama-3.3-70b-versatile', active: true });
  const [editing, setEditing] = useState<string | null>(null);
  const promptTemplates = [
    { title: 'Concise grader', text: 'You are a short and strict grader. Provide verdict (pass/fail/inconclusive) and one-line reasoning.' },
    { title: 'Detailed reviewer', text: 'You are a thorough reviewer. Provide a verdict and a paragraph explaining strengths and weaknesses.' },
    { title: 'Policy checker', text: 'Check the answer against the provided policy requirements. Output pass/fail and cite which policy lines match or do not match.' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await updateJudge(editing, form);
    } else {
      await createJudge(form);
    }
    setForm({ name: '', system_prompt: '', model: 'llama-3.3-70b-versatile', active: true });
    setEditing(null);
  };

  const handleEdit = (judge: Judge) => {
    setForm({ name: judge.name, system_prompt: judge.system_prompt, model: judge.model, active: judge.active });
    setEditing(judge.id);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this judge?')) {
      await deleteJudge(id);
    }
  };

  if (loading) return <p>Loading judges...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">AI Judges</h2>
        <div className="text-sm text-gray-400">
          {lastQueueId ? `Using queue: ${lastQueueId}` : 'Create and manage judges'}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-5">
          <div className="bg-white/3 p-4 rounded-lg">
            <form onSubmit={handleSubmit} className="space-y-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Concise Grader" required className="w-full p-2 rounded-md bg-transparent border border-white/5" />
              <textarea value={form.system_prompt} onChange={e => setForm({ ...form, system_prompt: e.target.value })} placeholder="Describe the judge's role and evaluation criteria..." required className="w-full p-2 rounded-md bg-transparent border border-white/5 h-28" />
              <div className="flex gap-2 flex-wrap">
                {promptTemplates.map(t => (
                  <button type="button" key={t.title} className="px-2 py-1 rounded-md border border-white/5 text-sm" onClick={() => setForm(prev => ({ ...prev, system_prompt: t.text }))}>{t.title}</button>
                ))}
              </div>
              <select value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="w-full p-2 rounded-md bg-transparent border border-white/5">
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile</option>
                <option value="llama3-70b-8192">Llama 3 70B</option>
                <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant</option>
              </select>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active
              </label>
              <div>
                <button type="submit" className="px-3 py-2 rounded-md bg-indigo-600">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <div className="bg-white/3 rounded-lg p-4 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-sm text-gray-300">
                  <th className="p-2">Name</th>
                  <th className="p-2">Model</th>
                  <th className="p-2">Active</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {judges.map(j => (
                  <tr key={j.id} className="border-t border-white/5">
                    <td className="p-2 align-top">{j.name}</td>
                    <td className="p-2 align-top">{j.model}</td>
                    <td className="p-2 align-top">{j.active ? 'Yes' : 'No'}</td>
                    <td className="p-2 align-top">
                      <button onClick={() => handleEdit(j)} className="mr-2 px-2 py-1 rounded-md border">Edit</button>
                      <button onClick={() => handleDelete(j.id)} className="px-2 py-1 rounded-md border text-red-400">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            setCurrentStep('queue');
            navigate('/queue');
          }}
          className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
        >
          Continue to Queue
        </button>
      </div>
    </div>
  );
}
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Table, type TableColumn } from '../components/ui/Table';
import { useWorkflow } from '../contexts/WorkflowContext';
import { useJudges } from '../hooks/useJudges';
import type { Judge } from '../types';
import { promptTemplates } from '../lib/dataAnnotation';
import { modelOptions } from '../lib/dataAnnotation';

interface JudgeFormState {
    name: string;
    system_prompt: string;
    model: string;
    active: boolean;
    provider: string;
}

const defaultForm: JudgeFormState = {
    name: '',
    system_prompt: '',
    model: 'llama-3.1-8b-instant',
    active: true,
    provider: 'groq',
};

export default function JudgesPage() {
    const navigate = useNavigate();
    const { setCurrentStep, markCompleted, lastQueueId } = useWorkflow();
    const { judges, loading, error, createJudge, updateJudge, deleteJudge } = useJudges();
    const [form, setForm] = useState<JudgeFormState>(defaultForm);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        setCurrentStep('judges');
    }, [setCurrentStep]);

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        if (editingId) {
            await updateJudge(editingId, form);
        } else {
            await createJudge(form);
        }
        setForm(defaultForm);
        setEditingId(null);
    };

    const handleEdit = (judge: Judge) => {
        setForm({
            name: judge.name,
            system_prompt: judge.system_prompt,
            model: judge.model,
            active: judge.active,
            provider: judge.provider ?? 'groq',
        });
        setEditingId(judge.id);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Delete this judge?')) {
            await deleteJudge(id);
        }
    };

    const columns: TableColumn<Judge>[] = useMemo(
        () => [
            { key: 'name', header: 'Name' },
            { key: 'provider', header: 'Provider' },
            { key: 'model', header: 'Model' },
            { key: 'active', header: 'Active', render: (judge) => (judge.active ? 'Yes' : 'No') },
            {
                key: 'actions',
                header: 'Actions',
                render: (judge) => (
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleEdit(judge)}>
                    Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleDelete(judge.id)}>
                    Delete
                    </Button>
                </div>
                ),
            },
        ],[],
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">AI judges</h1>
                    <p className="text-sm text-slate-500">
                        Configure prompts and models for each evaluation persona.{lastQueueId ? ` Last upload queue: ${lastQueueId}` : ''}
                    </p>
                </div>
                <Button
                    variant="secondary"
                    onClick={() => {
                        markCompleted('judges');
                        setCurrentStep('queue');
                        navigate('/queue');
                    }}
                >
                    Continue to queue
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                <Card title={editingId ? 'Update judge' : 'Create judge'}>
                    <form className="space-y-4 max-w-2xl" onSubmit={handleSubmit}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="font-medium text-slate-700">Display name</span>
                                <input
                                    value={form.name}
                                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                                    required
                                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                                    placeholder="Concise Grader"
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="font-medium text-slate-700">Provider</span>
                                <select
                                    value={form.provider}
                                    onChange={(event) => {
                                        const provider = event.target.value;
                                        const options = modelOptions[provider] ?? [];
                                        setForm((prev) => ({
                                        ...prev,
                                        provider,
                                        model: options[0]?.value ?? prev.model,
                                        }));
                                    }}
                                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                                >
                                    <option value="groq">Groq</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="anthropic">Anthropic</option>
                                    <option value="gemini">Gemini</option>
                                </select>
                            </label>
                        </div>

                        <label className="flex flex-col gap-1 text-sm">
                            <span className="font-medium text-slate-700">Model</span>
                            <select
                                value={form.model}
                                onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
                                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                            >
                                {(modelOptions[form.provider] ?? []).map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="flex flex-col gap-1 text-sm">
                            <span className="font-medium text-slate-700">System prompt</span>
                            <textarea
                                value={form.system_prompt}
                                onChange={(event) => setForm((prev) => ({ ...prev, system_prompt: event.target.value }))}
                                required
                                rows={6}
                                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                                placeholder="Describe the judge's tone, evaluation criteria, and format."
                            />
                        </label>

                        <div className="-mx-2 overflow-x-auto py-2">
                            <div className="flex gap-2 px-2">
                                {promptTemplates.map((template) => (
                                <div key={template.title} className="flex-shrink-0">
                                    <Button
                                    type="button"
                                    variant="pill"
                                    onClick={() => setForm((prev) => ({ ...prev, system_prompt: template.text }))}
                                    >
                                    {template.title}
                                    </Button>
                                </div>
                                ))}
                            </div>
                        </div>


                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={form.active}
                                onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                            />
                            Active
                        </label>

                        <div className="flex items-center gap-3">
                            <Button type="submit">{editingId ? 'Update judge' : 'Create judge'}</Button>
                            {editingId ? (
                                <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                                    Cancel edit
                                </Button>
                            ) : null}
                        </div>
                    </form>
                </Card>

                <Card title="Existing judges" description="Edit prompts or deactivate judges you no longer need.">
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading judges...</p>
                    ) : error ? (
                        <p className="text-sm text-red-500">{error}</p>
                    ) : judges.length ? (
                        <Table columns={columns} data={judges} getRowKey={(judge) => judge.id} />
                    ) : (
                        <EmptyState title="No judges yet" description="Create your first AI judge to start evaluating submissions." />
                    )}
                </Card>
            </div>
        </div>
    );
}

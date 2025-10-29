import { useCallback, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Loading } from '../ui/Loading';
import { useJudgeX } from '../../hooks/useJudgeX';
import type { JudgeXMode } from '../../types';
const MAX_INPUT_CHARS = 4000;

function formatConfidence(value: number | null | undefined): string {
    if (value === null || value === undefined) {
        return '—';
    }
    return `${(value * 100).toFixed(1)}%`;
}

export function JudgeXPanel() {
    const { runJudgeX, loading, error, result, capabilities } = useJudgeX();
    const [input, setInput] = useState('');
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [skipAutoRetry, setSkipAutoRetry] = useState(false);

    const canSubmit = input.trim().length > 0 && !loading;

    const optionalTasks = useMemo(() => capabilities?.optional_tasks ?? [], [capabilities]);

    const toggleTask = useCallback((task: string) => {
        setSelectedTasks((prev) => (prev.includes(task) ? prev.filter((item) => item !== task) : [...prev, task]));
    }, []);

    const handleRun = useCallback(
        async (mode: JudgeXMode) => {
            if (!canSubmit) return;
            await runJudgeX(input, {
                mode,
                extraTasks: selectedTasks,
                skipAutoRetry,
            });
        },
        [canSubmit, input, runJudgeX, selectedTasks, skipAutoRetry],
    );

    return (
        <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">JudgeX orchestrated verdicts</h2>
                    <p className="text-sm text-slate-500">
                        Run Dedalus-managed agents (evaluation, feedback, reasoning, and adaptive specialists) against any answer.
                    </p>
                </div>
                {capabilities && (
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                        Model {capabilities.default_model} · {capabilities.base_tasks.length + capabilities.optional_tasks.length} agents
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-3">
                <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value.slice(0, MAX_INPUT_CHARS))}
                    placeholder="Paste a submission or answer here..."
                    rows={4}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <span>{input.length}/{MAX_INPUT_CHARS} characters</span>
                    <label className="inline-flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={skipAutoRetry}
                            onChange={(event) => setSkipAutoRetry(event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Skip confidence retry loop
                    </label>
                </div>
            </div>

            {optionalTasks.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    {optionalTasks.map((task) => {
                        const active = selectedTasks.includes(task);
                        return (
                            <button
                                key={task}
                                type="button"
                                onClick={() => toggleTask(task)}
                                className={`rounded-full border px-3 py-1 transition-all ${
                                    active
                                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50'
                                }`}
                            >
                                {active ? '✓ ' : ''}{task}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                <Button onClick={() => handleRun('standard')} disabled={!canSubmit}>
                    Run standard workflow
                </Button>
                <Button variant="secondary" onClick={() => handleRun('adaptive')} disabled={!canSubmit}>
                    Run adaptive workflow
                </Button>
            </div>

            {loading && <Loading label="Running Dedalus workflows" />}
            {error && <p className="text-sm text-red-500">{error}</p>}

            {result && !loading && (
                <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-700">
                            {result.mode}
                        </span>
                        <span>Domain: <strong className="text-slate-800">{result.domain}</strong></span>
                        <span>Confidence: <strong className="text-slate-800">{formatConfidence(result.confidence ?? null)}</strong></span>
                        <span>Agents: {result.agents_called.join(', ')}</span>
                        <span>Latency: {result.telemetry.elapsed_ms} ms</span>
                    </div>
                    <p className="text-base font-semibold text-slate-900">{result.final_decision ?? 'No decision returned'}</p>
                    <div className="grid gap-2">
                        {Object.entries(result.agent_outputs).map(([agent, payload]) => (
                            <details key={agent} className="group rounded border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                                <summary className="cursor-pointer select-none font-medium text-slate-700">
                                    {agent}
                                </summary>
                                <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-600">
                                    {JSON.stringify(payload, null, 2)}
                                </pre>
                            </details>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}

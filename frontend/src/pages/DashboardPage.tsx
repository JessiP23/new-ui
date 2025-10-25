import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { useWorkflow } from '../contexts/WorkflowContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';

const metrics = [
    { key: 'submissions', label: 'Submissions' },
    { key: 'judges', label: 'Active Judges' },
    { key: 'evaluations', label: 'Evaluations' },
    { key: 'pass_rate', label: 'Pass Rate', suffix: '%' },
] as const;

export default function DashboardPage() {
    const { setCurrentStep, markCompleted } = useWorkflow();
    const { data, loading, error, refresh } = useDashboard();

    useEffect(() => {
        setCurrentStep('dashboard');
        markCompleted('dashboard');
    }, [markCompleted, setCurrentStep]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
                    <p className="text-sm text-slate-500">Monitor throughput and jump back into your evaluation workflow.</p>
                </div>
                <Button variant="primary" onClick={() => refresh()} disabled={loading}>
                    Refresh
                </Button>
            </div>

            {loading ? (
                <Loading label="Loading summary..." />
            ) : error ? (
                <EmptyState title={error} description="Check your backend connection and try again." action={<Button onClick={() => refresh()}>Retry</Button>} />
            ) : data ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {metrics.map((metric) => {
                        const rawValue = data[metric.key];
                        const numericValue = Number(rawValue ?? 0);
                        const displayValue = metric.key === 'pass_rate' ? `${numericValue.toFixed(1)}${metric.suffix ?? ''}` : numericValue.toLocaleString();
                        return (
                            <Card key={metric.key} className="space-y-2">
                                <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                                <p className="text-2xl font-semibold text-slate-900">{displayValue}</p>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <EmptyState title="No data yet" description="Upload a batch of submissions to get started." />
            )}

            <div className="grid gap-4 lg:grid-cols-3">
                <Card
                    title="1. Upload submissions"
                    description="Import the JSON payload you received from Besimple."
                    actions={<Link to="/upload"><Button variant="secondary">Go to Upload</Button></Link>}
                >
                    <p className="text-sm text-slate-600">
                        Drag & drop or paste submissions to start a queue. We automatically group by <code className="rounded bg-slate-100 px-1">queueId</code>.
                    </p>
                </Card>
                <Card
                    title="2. Manage judges"
                    description="Create prompts, toggle activation, and assign models."
                    actions={<Link to="/judges"><Button variant="secondary">Manage Judges</Button></Link>}
                >
                    <p className="text-sm text-slate-600">Reuse existing prompts or spin up variations for each evaluation style.</p>
                </Card>
                <Card
                    title="3. Run evaluations"
                    description="Assign judges per question and monitor live progress."
                    actions={<Link to="/queue"><Button variant="secondary">Open Queue</Button></Link>}
                >
                    <p className="text-sm text-slate-600">Sense-check verdicts and dive into reasoning with clear pass/fail stats.</p>
                </Card>
            </div>
        </div>
    );
}
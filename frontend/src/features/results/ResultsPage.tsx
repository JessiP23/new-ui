// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Coordinates results retrieval, filtering, and workflow completion for the final step.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { useWorkflow } from "../../contexts/WorkflowContext";
import { ResultsFiltersPanel } from "./components/ResultsFiltersPanel";
import { ResultsSummaryCard } from "./components/ResultsSummaryCard";
import { ResultsTable } from "./components/ResultsTable";
import { ResultsPagination } from "./components/ResultsPagination";
import { useResultsData } from "./hooks/useResultsData";

export const ResultsPage = () => {
  const navigate = useNavigate();
  const { lastQueueId, markStepComplete } = useWorkflow();
  const results = useResultsData({ queueId: lastQueueId });

  const totalPages = Math.max(1, Math.ceil(results.total / results.filters.limit));

  if (!lastQueueId) {
    return (
      <AppShell
        primary={
          <Card>
            <CardHeader>
              <CardTitle>No results yet</CardTitle>
              <CardDescription>
                Upload submissions and run evaluations to generate verdicts you can explore here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/upload")}>Start workflow</Button>
            </CardContent>
          </Card>
        }
      />
    );
  }

  useEffect(() => {
    markStepComplete("results");
  }, [markStepComplete]);

  return (
    <AppShell
      primary={
        <div className="space-y-6">
          {results.status && <Alert tone={results.status.tone}>{results.status.description}</Alert>}
          <ResultsFiltersPanel
            filters={results.filters}
            judges={results.judges}
            questions={results.questions}
            setVerdict={results.setVerdict}
            toggleJudge={results.toggleJudge}
            toggleQuestion={results.toggleQuestion}
            setLimit={results.setLimit}
            resetFilters={results.resetFilters}
          />

          <ResultsTable evaluations={results.evaluations} />

          <ResultsPagination
            page={results.filters.page}
            limit={results.filters.limit}
            total={results.total}
            onPageChange={(page) => {
              if (page < 1 || page > totalPages) return;
              results.setPage(page);
            }}
          />
        </div>
      }
      sidebar={
        <div className="space-y-4">
          <ResultsSummaryCard passRate={results.passRate} total={results.total} />

          <Card surface="glass">
            <CardHeader>
              <CardTitle>Close the loop</CardTitle>
              <CardDescription>
                Iterate quickly: revisit assignments, adjust judges, or re-run queues to test improvements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="ghost" onClick={() => navigate("/queue")}>Back to queue</Button>
              <Button variant="ghost" onClick={() => navigate("/judges")}>Fine-tune judges</Button>
            </CardContent>
          </Card>
        </div>
      }
    />
  );
};

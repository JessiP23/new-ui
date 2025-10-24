// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Offers interactive verdict, judge, and question filters to refine evaluation results.
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/Card";
import { Select } from "../../../components/ui/Select";
import { Badge } from "../../../components/ui/Badge";
import type { EvaluationFilters } from "../../../types/evaluation";
import type { Judge } from "../../../types/judge";
import type { QueueQuestion } from "../../../types/queue";

interface ResultsFiltersPanelProps {
  filters: EvaluationFilters;
  judges: Judge[];
  questions: QueueQuestion[];
  setVerdict: (verdict: EvaluationFilters["verdict"]) => void;
  toggleJudge: (id: string) => void;
  toggleQuestion: (id: string) => void;
  setLimit: (limit: number) => void;
  resetFilters: () => void;
}

const verdictOptions: Array<{ value: EvaluationFilters["verdict"]; label: string }> = [
  { value: "", label: "All verdicts" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "inconclusive", label: "Inconclusive" },
];

const pageSizeOptions = [25, 50, 100];

export const ResultsFiltersPanel = ({
  filters,
  judges,
  questions,
  setVerdict,
  toggleJudge,
  toggleQuestion,
  setLimit,
  resetFilters,
}: ResultsFiltersPanelProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Filters</CardTitle>
      <CardDescription>Use these controls to drill into the verdicts that matter.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5 text-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="verdict" className="text-xs uppercase tracking-wide text-muted-foreground">
            Verdict
          </label>
          <Select
            id="verdict"
            value={filters.verdict ?? ""}
            onChange={(event) => setVerdict(event.target.value as EvaluationFilters["verdict"])}
          >
            {verdictOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="page-size" className="text-xs uppercase tracking-wide text-muted-foreground">
            Page size
          </label>
          <Select
            id="page-size"
            value={filters.limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Judges</div>
        <div className="flex flex-wrap gap-2">
          {judges.map((judge) => {
            const active = filters.judgeIds.includes(judge.id);
            return (
              <Badge
                key={judge.id}
                variant={active ? "info" : "neutral"}
                className="cursor-pointer"
                onClick={() => toggleJudge(judge.id)}
              >
                {judge.name}
              </Badge>
            );
          })}
          {judges.length === 0 && <span className="text-muted-foreground">No judges available.</span>}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Questions</div>
        <div className="flex flex-wrap gap-2">
          {questions.map((question) => {
            const active = filters.questionIds.includes(question.id);
            return (
              <Badge
                key={question.id}
                variant={active ? "info" : "neutral"}
                className="cursor-pointer"
                onClick={() => toggleQuestion(question.id)}
              >
                {question.label}
              </Badge>
            );
          })}
          {questions.length === 0 && <span className="text-muted-foreground">Questions appear after runs.</span>}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="ghost" onClick={resetFilters}>
          Reset filters
        </Button>
      </div>
    </CardContent>
  </Card>
);

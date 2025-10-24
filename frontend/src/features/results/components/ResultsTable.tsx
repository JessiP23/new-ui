// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Renders the detailed evaluations table with verdict highlights and metadata.
import { Card, CardContent } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import type { Evaluation } from "../../../types/evaluation";
import { formatDateTime } from "../../../utils/format";

interface ResultsTableProps {
  evaluations: Evaluation[];
}

const verdictTone = (verdict: Evaluation["verdict"]) => {
  switch (verdict) {
    case "pass":
      return "success";
    case "fail":
      return "danger";
    case "inconclusive":
    default:
      return "warning";
  }
};

export const ResultsTable = ({ evaluations }: ResultsTableProps) => (
  <Card>
    <CardContent className="overflow-x-auto">
      <table className="min-w-full table-auto text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-3 pr-4">Submission</th>
            <th className="py-3 pr-4">Question</th>
            <th className="py-3 pr-4">Judge</th>
            <th className="py-3 pr-4">Verdict</th>
            <th className="py-3 pr-4">Reasoning</th>
            <th className="py-3 pr-4">Created</th>
          </tr>
        </thead>
        <tbody>
          {evaluations.map((evaluation) => (
            <tr key={evaluation.id} className="border-t border-white/5 text-white/90">
              <td className="py-4 pr-4 font-medium">{evaluation.submissionId}</td>
              <td className="py-4 pr-4 text-muted-foreground">{evaluation.questionId}</td>
              <td className="py-4 pr-4 text-muted-foreground">{evaluation.judgeName ?? evaluation.judgeId}</td>
              <td className="py-4 pr-4">
                <Badge variant={verdictTone(evaluation.verdict)}>{evaluation.verdict}</Badge>
              </td>
              <td className="py-4 pr-4 text-muted-foreground">
                <p className="whitespace-pre-wrap leading-relaxed">{evaluation.reasoning}</p>
              </td>
              <td className="py-4 pr-4 text-muted-foreground">{formatDateTime(evaluation.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {evaluations.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">Run evaluations to populate this table.</div>
      )}
    </CardContent>
  </Card>
);

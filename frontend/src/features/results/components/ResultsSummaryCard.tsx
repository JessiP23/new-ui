// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Summarizes key evaluation KPIs to contextualize the detailed results table.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";

interface ResultsSummaryCardProps {
  passRate: string;
  total: number;
}

export const ResultsSummaryCard = ({ passRate, total }: ResultsSummaryCardProps) => (
  <Card surface="glass">
    <CardHeader>
      <CardTitle>Snapshot</CardTitle>
      <CardDescription>Monitor quality at a glance before diving deeper.</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-6">
      <div>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Pass rate</span>
        <div className="mt-2 text-3xl font-semibold text-white">{passRate}</div>
      </div>
      <div>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Evaluations loaded</span>
        <div className="mt-2 flex items-center gap-2">
          <div className="text-2xl font-semibold text-white">{total}</div>
          <Badge variant="info">Live</Badge>
        </div>
      </div>
    </CardContent>
  </Card>
);

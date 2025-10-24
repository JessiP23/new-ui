// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Displays the judge roster with quick access to edit and delete actions.
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import type { Judge } from "../../../types/judge";

interface JudgesTableProps {
  judges: Judge[];
  onEdit: (judge: Judge) => void;
  onDelete: (judge: Judge) => void;
  isWorking: boolean;
}

export const JudgesTable = ({ judges, onEdit, onDelete, isWorking }: JudgesTableProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Judges roster</CardTitle>
      <CardDescription>
        Combine different tones and models to cross-check verdicts. Keep at least one primary judge and a fallback for edge
        cases.
      </CardDescription>
    </CardHeader>
    <CardContent className="overflow-x-auto">
      <table className="min-w-full table-fixed text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-3 pr-4">Name</th>
            <th className="py-3 pr-4">Provider</th>
            <th className="py-3 pr-4">Model</th>
            <th className="py-3 pr-4">Prompt excerpt</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {judges.map((judge) => (
            <tr key={judge.id} className="border-t border-white/5 text-white/90">
              <td className="py-4 pr-4 font-semibold">{judge.name}</td>
              <td className="py-4 pr-4 uppercase text-muted-foreground">{judge.provider}</td>
              <td className="py-4 pr-4 text-muted-foreground">{judge.model}</td>
              <td className="py-4 pr-4 text-muted-foreground">
                {judge.systemPrompt.length > 120
                  ? `${judge.systemPrompt.slice(0, 117)}…`
                  : judge.systemPrompt}
              </td>
              <td className="py-4 pr-4">
                <Badge variant={judge.active ? "success" : "warning"}>{judge.active ? "Active" : "Paused"}</Badge>
              </td>
              <td className="py-4 pr-4 text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(judge)} disabled={isWorking}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onDelete(judge)} disabled={isWorking}>
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {judges.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No judges yet. Create one to kick-start your evaluation ensemble.
        </div>
      )}
    </CardContent>
  </Card>
);

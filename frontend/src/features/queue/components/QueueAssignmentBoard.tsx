// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Enables visual mapping between questions and judges with quick toggles.
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import type { Judge } from "../../../types/judge";
import type { AssignmentMap, QueueQuestion } from "../../../types/queue";

interface QueueAssignmentBoardProps {
  questions: QueueQuestion[];
  judges: Judge[];
  assignments: AssignmentMap;
  onToggle: (questionId: string, judgeId: string) => void;
}

export const QueueAssignmentBoard = ({ questions, judges, assignments, onToggle }: QueueAssignmentBoardProps) => {
  if (questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No questions detected yet</CardTitle>
          <CardDescription>Upload submissions to create a queue, then return to map judges.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question) => {
        const selected = assignments[question.id] ?? [];
        return (
          <Card key={question.id}>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Question {question.label}</CardTitle>
                <CardDescription>Pick at least one judge to provide coverage.</CardDescription>
              </div>
              <Badge variant={selected.length > 0 ? "success" : "warning"}>
                {selected.length > 0 ? `${selected.length} assigned` : "Unassigned"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {judges.map((judge) => {
                  const isSelected = selected.includes(judge.id);
                  return (
                    <Button
                      key={judge.id}
                      variant={isSelected ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => onToggle(question.id, judge.id)}
                    >
                      {judge.name}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

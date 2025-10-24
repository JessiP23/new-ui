// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Handles paging controls and display for the results dataset.
import { Button } from "../../../components/ui/Button";

interface ResultsPaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export const ResultsPagination = ({ page, limit, total, onPageChange }: ResultsPaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <div>
        Showing page <span className="font-medium text-white">{page}</span> of
        <span className="font-medium text-white"> {totalPages}</span>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
};

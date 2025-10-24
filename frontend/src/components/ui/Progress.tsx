// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Visualizes completion percentages with Tailwind-styled progress bars.
import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  label?: string;
}

export const Progress = ({ className, value, label, ...props }: ProgressProps) => (
  <div className={cn("w-full space-y-2", className)} {...props}>
    {label && <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>}
    <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-[var(--color-success)] transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  </div>
);

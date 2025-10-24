// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Shows contextual feedback messages with tonal styling for workflow status.
import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import type { StatusTone } from "../../types/status";

const TONALITIES: Record<StatusTone, string> = {
  info: "border-blue-500/40 bg-blue-500/10 text-blue-100",
  success: "border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]",
  warning: "border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  error: "border-[var(--color-error)]/50 bg-[var(--color-error)]/10 text-[var(--color-error)]",
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: StatusTone;
  title?: string;
}

export const Alert = ({ className, tone = "info", title, children, ...props }: AlertProps) => (
  <div
    role="status"
    className={cn(
      "flex w-full flex-col gap-1 rounded-2xl border px-4 py-3 text-sm",
      TONALITIES[tone],
      className,
    )}
    {...props}
  >
    {title && <span className="text-sm font-semibold leading-none">{title}</span>}
    {children && <span className="text-sm leading-relaxed">{children}</span>}
  </div>
);

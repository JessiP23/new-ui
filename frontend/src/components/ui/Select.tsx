// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Delivers a themed select element supporting validation states across forms.
import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid = false, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-xl border bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm text-white transition-colors duration-200",
        invalid
          ? "border-[var(--color-error)]/70 focus-visible:ring-[var(--color-error)]/70"
          : "border-white/10 focus-visible:border-[var(--color-primary)]/70",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);

Select.displayName = "Select";

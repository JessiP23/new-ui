// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Implements an accessible toggle switch with optional label metadata.
import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const autoId = useId();
    const controlId = id ?? autoId;

    return (
      <label htmlFor={controlId} className="flex w-full cursor-pointer items-start gap-3">
        <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
          <input
            ref={ref}
            id={controlId}
            type="checkbox"
            className={cn("peer sr-only", className)}
            {...props}
          />
          <span className="absolute inset-0 rounded-full bg-white/15 transition-colors peer-checked:bg-[var(--color-primary)]" />
          <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
        </span>
        {(label || description) && (
          <span className="flex flex-col">
            {label && <span className="text-sm font-medium text-white">{label}</span>}
            {description && <span className="text-xs text-muted-foreground">{description}</span>}
          </span>
        )}
      </label>
    );
  },
);

Switch.displayName = "Switch";

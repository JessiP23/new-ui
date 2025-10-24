// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Supplies an accessible checkbox styled for dark UI surfaces.
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      "h-4 w-4 rounded border-white/40 bg-transparent text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
      className,
    )}
    {...props}
  />
));

Checkbox.displayName = "Checkbox";

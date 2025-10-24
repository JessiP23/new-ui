// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Wraps a styled input element with consistent focus ring and validation states.
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", invalid = false, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "w-full rounded-xl border bg-transparent px-4 py-3 text-sm text-white placeholder:text-muted-foreground/70 transition-colors duration-200",
        invalid
          ? "border-[var(--color-error)]/70 focus-visible:ring-[var(--color-error)]/70"
          : "border-white/10 focus-visible:border-[var(--color-primary)]/70",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";

// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Provides a consistent multiline input with rich state styling for prompts and JSON editing.
import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid = false, rows = 6, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full resize-y rounded-xl border bg-transparent px-4 py-3 text-sm text-white placeholder:text-muted-foreground/70 transition-colors duration-200",
        invalid
          ? "border-[var(--color-error)]/70 focus-visible:ring-[var(--color-error)]/70"
          : "border-white/10 focus-visible:border-[var(--color-primary)]/70",
        "font-mono",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";

import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

const VARIANTS = {
  neutral: "bg-white/10 text-white",
  success: "bg-[var(--color-success)]/25 text-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]/20 text-[var(--color-warning)]",
  danger: "bg-[var(--color-error)]/25 text-[var(--color-error)]",
  info: "bg-[var(--color-primary)]/20 text-[var(--color-primary)]",
} satisfies Record<string, string>;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof VARIANTS;
}

export const Badge = ({ className, variant = "neutral", ...props }: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
      VARIANTS[variant],
      className,
    )}
    {...props}
  />
);

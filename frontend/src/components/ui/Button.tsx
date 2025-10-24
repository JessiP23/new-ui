import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

const VARIANTS = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary)]/90 focus-visible:ring-[var(--color-primary)]",
  secondary:
    "bg-[color:var(--color-surface-elevated)] text-white border border-white/10 hover:border-white/25",
  ghost:
    "bg-transparent text-[var(--color-muted)] hover:bg-white/5",
  success:
    "bg-[var(--color-success)]/90 text-white hover:bg-[var(--color-success)]",
  danger: "bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90",
} satisfies Record<string, string>;

const SIZES = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-12 px-8 text-base",
  xl: "h-14 px-10 text-lg",
} satisfies Record<string, string>;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  isLoading?: boolean;
  loadingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingLabel = "Working…",
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        VARIANTS[variant],
        SIZES[size],
        disabled || isLoading ? "opacity-70 cursor-not-allowed" : "",
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? loadingLabel : children}
    </button>
  ),
);

Button.displayName = "Button";

// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Supplies surface primitives (card + sections) with configurable padding and styling.
import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  surface?: "default" | "glass";
}

const paddingClass: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const surfaceClass: Record<NonNullable<CardProps["surface"]>, string> = {
  default: "card-surface",
  glass: "glass-surface",
};

export const Card = ({
  className,
  padding = "md",
  surface = "default",
  ...props
}: CardProps) => (
  <div className={cn(surfaceClass[surface], paddingClass[padding], className)} {...props} />
);

export const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-6 flex flex-col gap-1", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-lg font-semibold text-white", className)} {...props} />
);

export const CardDescription = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);

export const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn(className)} {...props} />
);

export const CardFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-6 flex flex-wrap items-center gap-3", className)} {...props} />
);

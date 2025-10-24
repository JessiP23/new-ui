// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Lightweight className concatenation helper for conditional styling.
export const cn = (...classes: Array<string | undefined | false | null>) =>
  classes.filter(Boolean).join(" ");

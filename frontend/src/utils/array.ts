// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Implements tiny array helpers for selection toggling and deduplication.
export const unique = <T>(items: T[]): T[] => Array.from(new Set(items));

export const toggleValue = <T>(values: T[], value: T): T[] => {
  const exists = values.includes(value);
  return exists ? values.filter((item) => item !== value) : [...values, value];
};

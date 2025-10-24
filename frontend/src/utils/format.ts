// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Supplies formatting helpers for dates and percentages used in UI summaries.
export const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatPercent = (fraction: number, precision = 1): string => {
  if (!Number.isFinite(fraction) || fraction < 0) {
    return "0%";
  }
  return `${(fraction * 100).toFixed(precision)}%`;
};

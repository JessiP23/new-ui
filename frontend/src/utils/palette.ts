const JUDGE_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#0ea5e9',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#ec4899',
  '#facc15',
  '#10b981',
  '#f43f5e',
];

export function getSeriesColor(index: number): string {
  return JUDGE_COLORS[index % JUDGE_COLORS.length];
}

export function withAlpha(hex: string, alpha: number): string {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Provides safe JSON parsing helpers returning structured success/error results.
export interface SafeParseResult<T> {
  data: T | null;
  error: string | null;
}

export const safeParseJson = <T>(raw: string): SafeParseResult<T> => {
  if (!raw.trim()) {
    return { data: null, error: "Paste JSON or drop a file to begin." };
  }
  try {
    const data = JSON.parse(raw) as T;
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unable to parse JSON.",
    };
  }
};

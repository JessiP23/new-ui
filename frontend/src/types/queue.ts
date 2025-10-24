// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Declares queue question, assignment, and job status data structures.
export interface QueueQuestion {
  id: string;
  label: string;
}

export interface Assignment {
  id?: string;
  questionId: string;
  judgeId: string;
  queueId: string;
}

export interface AssignmentMap {
  [questionId: string]: string[];
}

export interface JobStatusCounts {
  pending: number;
  running: number;
  done: number;
  failed: number;
}

export interface JobStatus {
  counts: JobStatusCounts;
  total: number;
}

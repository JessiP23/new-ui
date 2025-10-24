// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Abstracts queue question retrieval, assignments, job execution, and live status streaming.
import { apiClient, withRequest } from "../lib/api-client";
import type { Assignment, AssignmentMap, JobStatus, QueueQuestion } from "../types/queue";

interface AssignmentApiModel {
  id: string;
  question_id: string;
  judge_id: string;
  queue_id: string;
  judges?: {
    name: string;
  };
}

interface JobStatusApiModel {
  counts: {
    pending: number;
    running: number;
    done: number;
    failed: number;
  };
  total: number;
}

const mapAssignment = (assignment: AssignmentApiModel): Assignment => ({
  id: assignment.id,
  questionId: assignment.question_id,
  judgeId: assignment.judge_id,
  queueId: assignment.queue_id,
});

const toAssignmentPayload = (assignment: Assignment) => ({
  question_id: assignment.questionId,
  judge_id: assignment.judgeId,
  queue_id: assignment.queueId,
});

export const fetchQueueQuestions = (queueId: string) =>
  withRequest(async () => {
    const { data } = await apiClient.get<string[]>("/questions", { params: { queue_id: queueId } });
    return data.map<QueueQuestion>((questionId) => ({ id: questionId, label: questionId }));
  });

export const fetchAssignments = (queueId: string) =>
  withRequest(async () => {
    const { data } = await apiClient.get<AssignmentApiModel[]>("/assignments", { params: { queue_id: queueId } });
    return data.map(mapAssignment);
  });

export const saveAssignments = (queueId: string, map: AssignmentMap) =>
  withRequest(async () => {
    const payload: Assignment[] = Object.entries(map).flatMap(([questionId, judgeIds]) =>
      judgeIds.map((judgeId) => ({
        questionId,
        judgeId,
        queueId,
      })),
    );
    await apiClient.post("/assignments", payload.map(toAssignmentPayload));
  });

export const runQueue = (queueId: string) =>
  withRequest(async () => {
    const { data } = await apiClient.post<{ enqueued: number }>("/run_judges", null, {
      params: { queue_id: queueId },
    });
    return data;
  });

export const fetchJobStatus = (queueId: string) =>
  withRequest(async () => {
    const { data } = await apiClient.get<JobStatusApiModel>("/job_status", {
      params: { queue_id: queueId },
    });
    return data as JobStatus;
  });

export const createJobStatusStream = (queueId: string): EventSource => {
  const baseURL = apiClient.defaults.baseURL ?? "";
  const url = `${baseURL}/live_job_status?queue_id=${encodeURIComponent(queueId)}`;
  return new EventSource(url);
};

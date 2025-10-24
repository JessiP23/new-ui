// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Handles CRUD operations for judge resources and maps API payloads to domain models.
import { apiClient, withRequest } from "../lib/api-client";
import type { Judge, JudgeInput } from "../types/judge";

interface JudgeApiModel {
  id: string;
  name: string;
  system_prompt: string;
  model: string;
  active: boolean;
  provider: string;
  created_at?: string;
  updated_at?: string;
}

const mapJudge = (payload: JudgeApiModel): Judge => ({
  id: payload.id,
  name: payload.name,
  systemPrompt: payload.system_prompt,
  model: payload.model,
  active: payload.active,
  provider: payload.provider,
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
});

const toApiPayload = (payload: JudgeInput) => ({
  name: payload.name,
  system_prompt: payload.systemPrompt,
  model: payload.model,
  active: payload.active,
  provider: payload.provider,
});

export const fetchJudges = () =>
  withRequest(async () => {
    const { data } = await apiClient.get<JudgeApiModel[]>("/judges");
    return data.map(mapJudge);
  });

export const createJudge = (payload: JudgeInput) =>
  withRequest(async () => {
    const { data } = await apiClient.post<JudgeApiModel>("/judges", toApiPayload(payload));
    return mapJudge(data);
  });

export const updateJudge = (id: string, payload: JudgeInput) =>
  withRequest(async () => {
    const { data } = await apiClient.put<JudgeApiModel>(`/judges/${id}`, toApiPayload(payload));
    return mapJudge(data);
  });

export const deleteJudge = (id: string) => withRequest(async () => apiClient.delete(`/judges/${id}`));

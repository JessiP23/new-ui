// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Defines judge domain models, creation payloads, and prompt template structure.
export interface Judge {
  id: string;
  name: string;
  systemPrompt: string;
  model: string;
  active: boolean;
  provider: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface JudgeInput {
  name: string;
  systemPrompt: string;
  model: string;
  active: boolean;
  provider: string;
}

export interface JudgeTemplate {
  title: string;
  description: string;
  prompt: string;
}

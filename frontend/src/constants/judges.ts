// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Provides prompt templates and model catalogues reusable across judge workflows.
import type { JudgeTemplate } from "../types/judge";

export const JUDGE_PROMPT_TEMPLATES: JudgeTemplate[] = [
  {
    title: "Concise Grader",
    description: "Strict binary verdict with succinct reasoning.",
    prompt:
      "You are a decisive reviewer. Return a verdict of pass, fail, or inconclusive with a single sentence that justifies the decision.",
  },
  {
    title: "Detailed Reviewer",
    description: "Balanced feedback summarizing strengths and gaps.",
    prompt:
      "You are a thoughtful evaluator. Provide a verdict and a short paragraph outlining notable strengths and areas for improvement.",
  },
  {
    title: "Positive Coach",
    description: "Highlight wins while suggesting a single improvement.",
    prompt:
      "You are an encouraging coach. Focus on what works well, give a verdict, and share one constructive suggestion.",
  },
  {
    title: "Critical Analyst",
    description: "Lean into risk assessment and failure points.",
    prompt:
      "You are a meticulous analyst. Deliver a verdict and enumerate critical risks or missing elements in detail.",
  },
];

export const JUDGE_MODELS_BY_PROVIDER: Record<string, { value: string; label: string }[]> = {
  groq: [
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
    { value: "llama3-70b-8192", label: "Llama 3 70B" },
    { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
  ],
  openai: [
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4o-mini", label: "GPT-4o mini" },
    { value: "gpt-4o", label: "GPT-4o" },
  ],
};

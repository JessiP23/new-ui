// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Manages judge form state, default values, and validation lifecycle.
import { useCallback, useEffect, useState } from "react";
import type { Judge, JudgeInput } from "../../../types/judge";
import { validateJudgeInput } from "../../../utils/validation";

const DEFAULT_FORM: JudgeInput = {
  name: "",
  systemPrompt: "",
  model: "llama-3.1-8b-instant",
  active: true,
  provider: "groq",
};

export const useJudgeForm = (initial?: Judge) => {
  const [values, setValues] = useState<JudgeInput>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initial) {
      setValues({
        name: initial.name,
        systemPrompt: initial.systemPrompt,
        model: initial.model,
        active: initial.active,
        provider: initial.provider,
      });
      setErrors({});
    } else {
      setValues(DEFAULT_FORM);
      setErrors({});
    }
  }, [initial]);

  const updateField = useCallback(<K extends keyof JudgeInput>(key: K, value: JudgeInput[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleActive = useCallback(() => {
    setValues((prev) => ({ ...prev, active: !prev.active }));
  }, []);

  const validate = useCallback(() => {
    const nextErrors = validateJudgeInput(values);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [values]);

  const reset = useCallback(() => {
    setValues(DEFAULT_FORM);
    setErrors({});
  }, []);

  return {
    values,
    errors,
    updateField,
    toggleActive,
    validate,
    reset,
  };
};

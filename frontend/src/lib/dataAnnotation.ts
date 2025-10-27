export const promptTemplates = [
    { 
        title: 'Concise grader', 
        text: 'You are a short and strict grader. Provide verdict (pass/fail/inconclusive) and one-line reasoning.' 
    }, { 
        title: 'Detailed reviewer', 
        text: 'You are a thorough reviewer. Provide a verdict and a paragraph explaining strengths and weaknesses.' 
    },{ 
        title: 'Positive feedback', 
        text: 'You are an encouraging evaluator. Focus on the positive aspects and provide constructive feedback.' 
    },{ 
        title: 'Critical analyst', text: 'You are a critical analyst. Highlight flaws and areas for improvement in detail.' 
    }, { 
        title: 'Rubric scorer', 
        text: 'Score according to a rubric: break down criteria and give per-criterion scores, plus an overall pass/fail.' 
    },{ 
        title: 'Binary strict', 
        text: 'Return only pass or fail with a brief justification (1-2 sentences). Be very strict.' 
    },{ 
        title: 'Summarizer & judge', 
        text: 'Summarize the submission in one sentence, then give a short verdict and one-line reasoning.' 
    },{ 
        title: 'Actionable suggestions', 
        text: 'Give a concise verdict and 2–3 actionable suggestions to improve the submission.' 
    },
] as const;

export const modelOptions: Record<string, Array<{ value: string; label: string }>> = {
    llama: [
        { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
        { value: 'llama3-70b-8192', label: 'Llama 3 70B' },
        { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
    ],
    openai: [
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
    anthropic: [
        { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
        { value: 'claude-opus-4-1-20250805', label: 'Claude Opus 4.1' },
    ],
    gemini: [
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { value: 'Gemini 2.5 Flash-Lite', label: 'Gemini 2.5 Flash-Lite' },
    ],
};

export const metrics = [
    { key: 'submissions', label: 'Submissions' },
    { key: 'judges', label: 'Active Judges' },
    { key: 'evaluations', label: 'Evaluations' },
    { key: 'pass_rate', label: 'Pass Rate', suffix: '%' },
] as const;

export const steps = [
  { key: 'dashboard', label: 'Dashboard', path: '/' },
  { key: 'upload', label: 'Upload', path: '/upload' },
  { key: 'judges', label: 'Judges', path: '/judges' },
  { key: 'queue', label: 'Queue', path: '/queue' },
  { key: 'results', label: 'Results', path: '/results' },
] as const;
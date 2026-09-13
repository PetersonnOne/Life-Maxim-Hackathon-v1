export const AI_MODELS = {
  luna: "openai/gpt-5.6-luna",
  terra: "openai/gpt-5.6-terra",
} as const;

export type IntelligenceTask = "profileSuggestion" | "guidance" | "planning" | "researchSynthesis";
// Explicit task policy: simple categorization uses Luna; contextual reasoning uses Terra.
// No heuristic diagnoses, arbitrary model IDs, or automatic provider fallback.
export function modelForTask(task: IntelligenceTask) {
  return task === "profileSuggestion" ? AI_MODELS.luna : AI_MODELS.terra;
}

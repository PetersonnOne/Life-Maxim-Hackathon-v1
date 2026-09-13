import { afterEach, expect, test, vi } from "vitest";
import { modelForTask, AI_MODELS } from "./modelRouting";
import { createAssistant } from "./modelProvider";

afterEach(() => vi.unstubAllEnvs());
test("routing uses only the approved OpenRouter models", () => {
  expect(modelForTask("profileSuggestion")).toBe(AI_MODELS.luna);
  for (const task of ["guidance", "planning", "researchSynthesis"] as const) {
    expect(modelForTask(task)).toBe(AI_MODELS.terra);
  }
});
test("missing OpenRouter credentials fail closed with no gateway fallback", () => {
  vi.stubEnv("OPENROUTER_API_KEY", "");
  expect(() => createAssistant(AI_MODELS.luna)).toThrow("not configured");
});
test("arbitrary model overrides are rejected", () => {
  expect(() => createAssistant("unapproved/model")).toThrow("Unsupported model");
});

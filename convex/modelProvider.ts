import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { AI_INSTRUCTIONS } from "./aiContracts";
import { AI_MODELS } from "./modelRouting";

// Call only inside actions. Never import this module from browser components.
export function createAssistant(model: string) {
  if (model !== AI_MODELS.luna && model !== AI_MODELS.terra) throw new Error("Unsupported model");
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey?.trim()) throw new Error("OpenRouter is not configured");
  const provider = createOpenAICompatible({
    name: "openrouter", baseURL: "https://openrouter.ai/api/v1", apiKey,
    supportsStructuredOutputs: true,
    transformRequestBody: body => ({ ...body, provider: { require_parameters: true, allow_fallbacks: false } }),
  });
  return new Agent(components.agent, {
    name: "Life Maxim", languageModel: provider.chatModel(model), instructions: AI_INSTRUCTIONS,
    contextOptions: { recentMessages: 0, searchOtherThreads: false },
    callSettings: { maxRetries: 0, maxOutputTokens: 4000 },
  });
}

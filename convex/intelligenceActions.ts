import { ConvexError, v } from "convex/values";
import type { Infer } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/core";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { guidanceSchema, profileSuggestion, suggestionSchema } from "./aiContracts";
import { createAssistant } from "./modelProvider";
import { modelForTask } from "./modelRouting";

// Deployment-owner diagnostic only: names/presence, never credential values.
export const integrationStatus = internalAction({
  args: {}, returns: v.object({ openrouter: v.boolean(), firecrawl: v.boolean(), agentmail: v.boolean() }),
  handler: async () => {
    return { openrouter: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
      firecrawl: Boolean(process.env.FIRECRAWL_API_KEY?.trim()), agentmail: Boolean(process.env.AGENTMAIL_API_KEY?.trim()) };
  },
});

export const suggestProfile = action({
  args: { draft: v.string() }, returns: profileSuggestion,
  handler: async (ctx, { draft }): Promise<Infer<typeof profileSuggestion>> => {
    const ownerId = await getAuthUserId(ctx);
    if (!ownerId) throw new ConvexError("Please sign in.");
    if (draft.trim().length < 10 || draft.length > 4000) throw new ConvexError("Describe your entry in 10–4000 characters.");
    const profiles = await ctx.runQuery(api.profiles.list, {});
    await ctx.runMutation(internal.intelligence.consumeSuggestionQuota, {});
    try {
      const assistant = createAssistant(modelForTask("profileSuggestion"));
      const { object } = await assistant.generateObject(ctx, { userId: ownerId }, {
        prompt: `Suggest ONE suitable existing profile, or draft a broad new profile. Return its exact existingProfileId only if it is in the provided list, otherwise null. Explain your rationale and give qualitative confidence, not a calibrated probability. Do not assume a profession from a topic alone. Leave role and industry blank unless explicitly stated. Nothing will be saved until user confirmation.\n${JSON.stringify({ draft, profiles: profiles.map(p => ({ id: p._id, name: p.name, description: p.description.slice(0, 300), role: p.role, industry: p.industry })) })}`,
        schema: suggestionSchema, abortSignal: AbortSignal.timeout(60000),
      }, { storageOptions: { saveMessages: "none" } });
      const result = suggestionSchema.parse(object);
      const existing = profiles.find(p => p._id === result.existingProfileId);
      if (result.existingProfileId && !existing) throw new Error("Invalid suggested profile");
      return { ...result, existingProfileId: existing?._id ?? null,
        ...(existing ? { name: existing.name, description: existing.description, role: existing.role, industry: existing.industry } : {}) };
    } catch {
      throw new ConvexError("AI suggestions are unavailable right now. Your draft is safe; select or create a profile, or try again later.");
    }
  },
});

export const generateGuidance = internalAction({
  args: { id: v.id("aiGuidance") }, returns: v.null(),
  handler: async (ctx, { id }): Promise<null> => {
    try {
      const context = await ctx.runQuery(internal.intelligence.context, { id });
      if (!context) { await ctx.runMutation(internal.intelligence.finish, { id, memoryIds: [] }); return null; }
      const { run, objective, profile, memories } = context;
      const assistant = createAssistant(run.model);
      const { object } = await assistant.generateObject(ctx, { threadId: run.threadId }, {
        schema: guidanceSchema, abortSignal: AbortSignal.timeout(60000),
        prompt: `Understand this entry and respond to the user's question, or offer initial guidance if the question is empty. Give a concise understanding, useful response, explicitly labeled assumptions, up to five clarifying questions and up to five suggested next steps. Do not claim to have researched or executed anything.\n${JSON.stringify({
          question: run.question, entry: { title: objective.title, description: objective.description, desiredOutcome: objective.desiredOutcome, deadline: objective.deadline },
          profile: { name: profile.name, description: profile.description, role: profile.role, industry: profile.industry },
          confirmedMemories: memories.map(m => ({ kind: m.kind, content: m.content.slice(0, 1500) })),
        })}`,
      });
      await ctx.runMutation(internal.intelligence.finish, { id, result: guidanceSchema.parse(object), memoryIds: memories.map(m => m._id) });
    } catch {
      // Provider errors may contain prompt text or credentials; never persist raw errors.
      await ctx.runMutation(internal.intelligence.finish, { id, memoryIds: [] });
    }
    return null;
  },
});

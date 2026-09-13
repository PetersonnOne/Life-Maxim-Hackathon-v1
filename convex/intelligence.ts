import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/core";
import { createThread } from "@convex-dev/agent";
import { RateLimiter, MINUTE, DAY } from "@convex-dev/rate-limiter";
import { components, internal } from "./_generated/api";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import { guidance } from "./aiContracts";
import { modelForTask } from "./modelRouting";

const limits = new RateLimiter(components.rateLimiter, {
  aiMinute: { kind: "token bucket", rate: 3, period: MINUTE, capacity: 3 },
  aiDay: { kind: "fixed window", rate: 30, period: DAY },
  globalDay: { kind: "fixed window", rate: 300, period: DAY },
});

export const consumeSuggestionQuota = internalMutation({
  args: {}, returns: v.null(), handler: async ctx => {
    const ownerId = await getAuthUserId(ctx);
    if (!ownerId) throw new ConvexError("Please sign in.");
    await limits.limit(ctx, "aiMinute", { key: ownerId, throws: true });
    await limits.limit(ctx, "aiDay", { key: ownerId, throws: true });
    await limits.limit(ctx, "globalDay", { throws: true });
    return null;
  },
});

export const requestGuidance = mutation({
  args: { objectiveId: v.id("objectives"), requestId: v.string(), question: v.string() },
  returns: v.id("aiGuidance"), handler: async (ctx, args): Promise<Id<"aiGuidance">> => {
    const ownerId = await getAuthUserId(ctx);
    const objective = await ctx.db.get("objectives", args.objectiveId);
    if (!ownerId || !objective || objective.ownerId !== ownerId) throw new ConvexError("Objective not found.");
    const profile = await ctx.db.get("profiles", objective.profileId);
    if (!profile || profile.ownerId !== ownerId || profile.archived) throw new ConvexError("Choose an active profile.");
    if (!args.requestId || args.requestId.length > 100 || args.question.length > 6000) throw new ConvexError("Check your question.");
    const existing = await ctx.db.query("aiGuidance").withIndex("by_ownerId_and_requestId", q => q.eq("ownerId", ownerId).eq("requestId", args.requestId)).unique();
    if (existing) {
      if (existing.objectiveId !== args.objectiveId || existing.question !== args.question) throw new ConvexError("Request identifier already used.");
      return existing._id;
    }
    const latest = await ctx.db.query("aiGuidance").withIndex("by_objectiveId", q => q.eq("objectiveId", objective._id)).order("desc").first();
    if (latest?.status === "pending") throw new ConvexError("An answer is already being prepared.");
    await limits.limit(ctx, "aiMinute", { key: ownerId, throws: true });
    await limits.limit(ctx, "aiDay", { key: ownerId, throws: true });
    await limits.limit(ctx, "globalDay", { throws: true });
    // A separate thread per response prevents stale/deleted memories or other profile history from leaking into context.
    const threadId = await createThread(ctx, components.agent, { userId: ownerId });
    const id = await ctx.db.insert("aiGuidance", { ...args, ownerId, profileId: profile._id, threadId,
      model: modelForTask("guidance"), status: "pending", memoryIds: [], updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.intelligenceActions.generateGuidance, { id });
    await ctx.scheduler.runAfter(120000, internal.intelligence.expire, { id });
    return id;
  },
});

export const list = query({
  args: { objectiveId: v.id("objectives") }, returns: v.array(schema.doc("aiGuidance")),
  handler: async (ctx, { objectiveId }) => {
    const ownerId = await getAuthUserId(ctx);
    const objective = await ctx.db.get("objectives", objectiveId);
    if (!ownerId || !objective || objective.ownerId !== ownerId) throw new ConvexError("Objective not found.");
    return await ctx.db.query("aiGuidance").withIndex("by_objectiveId", q => q.eq("objectiveId", objectiveId)).order("desc").take(10);
  },
});

export const context = internalQuery({
  args: { id: v.id("aiGuidance") },
  returns: v.union(v.null(), v.object({ run: schema.doc("aiGuidance"), objective: schema.doc("objectives"), profile: schema.doc("profiles"), memories: v.array(schema.doc("memories")) })),
  handler: async (ctx, { id }) => {
    const run = await ctx.db.get("aiGuidance", id);
    if (!run || run.status !== "pending") return null;
    const objective = await ctx.db.get("objectives", run.objectiveId);
    const profile = await ctx.db.get("profiles", run.profileId);
    if (!objective || !profile || profile.archived || objective.ownerId !== run.ownerId || profile.ownerId !== run.ownerId || objective.profileId !== run.profileId) return null;
    const memories = await ctx.db.query("memories").withIndex("by_profileId", q => q.eq("profileId", profile._id)).order("desc").take(12);
    return { run, objective, profile, memories };
  },
});

export const finish = internalMutation({
  args: { id: v.id("aiGuidance"), result: v.optional(guidance), memoryIds: v.array(v.id("memories")) }, returns: v.null(),
  handler: async (ctx, { id, result, memoryIds }) => {
    const run = await ctx.db.get("aiGuidance", id);
    if (!run || run.status !== "pending") return null;
    await ctx.db.patch("aiGuidance", id, { status: result ? "ready" : "failed", ...(result ? { result } : { error: "AI could not prepare an answer. Please try again later." }), memoryIds, updatedAt: Date.now() });
    return null;
  },
});
export const expire = internalMutation({
  args: { id: v.id("aiGuidance") }, returns: v.null(), handler: async (ctx, { id }) => {
    const run = await ctx.db.get("aiGuidance", id);
    if (run?.status === "pending") await ctx.db.patch("aiGuidance", id, { status: "failed", error: "The response timed out. You can try again.", updatedAt: Date.now() });
    return null;
  },
});

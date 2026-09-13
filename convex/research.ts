import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/core";
import { RateLimiter, MINUTE, DAY } from "@convex-dev/rate-limiter";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { evidenceInput, evidenceListSchema, searchInputSchema } from "./researchContracts";

const limits = new RateLimiter(components.rateLimiter, {
  researchMinute: { kind: "fixed window", rate: 2, period: MINUTE },
  researchDay: { kind: "fixed window", rate: 10, period: DAY },
  researchGlobal: { kind: "fixed window", rate: 100, period: DAY },
});
export const request = mutation({
  args: { objectiveId: v.id("objectives"), query: v.string(), country: v.string(), requestId: v.string() },
  returns: v.id("researchRuns"), handler: async (ctx, args): Promise<Id<"researchRuns">> => {
    const ownerId = await getAuthUserId(ctx);
    const objective = await ctx.db.get("objectives", args.objectiveId);
    if (!ownerId || !objective || objective.ownerId !== ownerId) throw new ConvexError("Objective not found.");
    const profile = await ctx.db.get("profiles", objective.profileId);
    if (!profile || profile.ownerId !== ownerId || profile.archived) throw new ConvexError("Choose an active profile.");
    const input = searchInputSchema.safeParse(args);
    if (!input.success) throw new ConvexError("Enter a search query and a two-letter search country code.");
    const existing = await ctx.db.query("researchRuns").withIndex("by_ownerId_and_requestId", q => q.eq("ownerId", ownerId).eq("requestId", args.requestId)).unique();
    if (existing) {
      if (existing.objectiveId !== args.objectiveId || existing.query !== input.data.query || existing.country !== args.country) throw new ConvexError("Request identifier already used.");
      return existing._id;
    }
    const latest = await ctx.db.query("researchRuns").withIndex("by_objectiveId", q => q.eq("objectiveId", args.objectiveId)).order("desc").first();
    if (latest?.status === "pending") throw new ConvexError("Research is already running.");
    await limits.limit(ctx, "researchMinute", { key: ownerId, throws: true });
    await limits.limit(ctx, "researchDay", { key: ownerId, throws: true });
    await limits.limit(ctx, "researchGlobal", { throws: true });
    const id = await ctx.db.insert("researchRuns", { ...input.data, objectiveId: args.objectiveId, ownerId, profileId: objective.profileId, status: "pending", updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.researchActions.search, { id });
    await ctx.scheduler.runAfter(120000, internal.research.expire, { id });
    return id;
  },
});
export const list = query({
  args: { objectiveId: v.id("objectives") },
  returns: v.object({ runs: v.array(schema.doc("researchRuns")), sources: v.array(schema.doc("evidence")) }),
  handler: async (ctx, { objectiveId }) => {
    const ownerId = await getAuthUserId(ctx);
    const objective = await ctx.db.get("objectives", objectiveId);
    if (!ownerId || !objective || objective.ownerId !== ownerId) throw new ConvexError("Objective not found.");
    const runs = await ctx.db.query("researchRuns").withIndex("by_objectiveId", q => q.eq("objectiveId", objectiveId)).order("desc").take(10);
    const sources = (await Promise.all(runs.map(run => ctx.db.query("evidence").withIndex("by_runId", q => q.eq("runId", run._id)).take(3)))).flat();
    return { runs, sources };
  },
});
export const context = internalQuery({
  args: { id: v.id("researchRuns") }, returns: v.union(v.null(), schema.doc("researchRuns")),
  handler: async (ctx, { id }) => {
    const run = await ctx.db.get("researchRuns", id);
    if (!run || run.status !== "pending") return null;
    const objective = await ctx.db.get("objectives", run.objectiveId);
    const profile = await ctx.db.get("profiles", run.profileId);
    return objective?.ownerId === run.ownerId && objective.profileId === run.profileId && profile?.ownerId === run.ownerId && !profile.archived ? run : null;
  },
});
export const finish = internalMutation({
  args: { id: v.id("researchRuns"), sources: v.optional(v.array(evidenceInput)) }, returns: v.null(),
  handler: async (ctx, { id, sources }) => {
    const run = await ctx.db.get("researchRuns", id);
    if (!run || run.status !== "pending") return null;
    const profile = await ctx.db.get("profiles", run.profileId);
    const objective = await ctx.db.get("objectives", run.objectiveId);
    const valid = sources !== undefined && profile?.ownerId === run.ownerId && !profile.archived && objective?.ownerId === run.ownerId && objective.profileId === run.profileId;
    if (valid) {
      const validated = evidenceListSchema.parse(sources);
      for (const source of validated) await ctx.db.insert("evidence", { ...source, ownerId: run.ownerId, objectiveId: run.objectiveId, runId: id, retrievedAt: Date.now() });
    }
    await ctx.db.patch("researchRuns", id, { status: valid ? "ready" : "failed", ...(valid ? {} : { error: "Research could not finish. Check your search details or try again later." }), updatedAt: Date.now() });
    return null;
  },
});
export const expire = internalMutation({
  args: { id: v.id("researchRuns") }, returns: v.null(), handler: async (ctx, { id }) => {
    const run = await ctx.db.get("researchRuns", id);
    if (run?.status === "pending") await ctx.db.patch("researchRuns", id, { status: "failed", error: "Research timed out. You may retry; another provider request may consume credits.", updatedAt: Date.now() });
    return null;
  },
});

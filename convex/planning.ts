import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/core";
import { createThread } from "@convex-dev/agent";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { modelForTask } from "./modelRouting";
import { proposal, proposalSchema, planStep, stepsSchema } from "./planningContracts";

export const request = mutation({
  args: { objectiveId: v.id("objectives"), requestId: v.string(), scenario: v.string() }, returns: v.id("planProposals"),
  handler: async (ctx, args): Promise<Id<"planProposals">> => {
    const ownerId = await getAuthUserId(ctx); const objective = await ctx.db.get("objectives", args.objectiveId);
    if (!ownerId || objective?.ownerId !== ownerId) throw new ConvexError("Objective not found.");
    const profile = await ctx.db.get("profiles", objective.profileId);
    if (!profile || profile.ownerId !== ownerId || profile.archived) throw new ConvexError("Choose an active profile.");
    if (!args.requestId || args.requestId.length > 100 || args.scenario.length > 2000) throw new ConvexError("Check your scenario.");
    const existing = await ctx.db.query("planProposals").withIndex("by_ownerId_and_requestId", q => q.eq("ownerId", ownerId).eq("requestId", args.requestId)).unique();
    if (existing) {
      if (existing.objectiveId !== args.objectiveId || existing.scenario !== args.scenario) throw new ConvexError("Request identifier already used.");
      return existing._id;
    }
    const latest = await ctx.db.query("planProposals").withIndex("by_objectiveId", q => q.eq("objectiveId", args.objectiveId)).order("desc").first();
    if (latest?.status === "pending") throw new ConvexError("A proposal is already being prepared.");
    // Shared quotas apply across suggestions, guidance and planning, not once per feature.
    await ctx.runMutation(internal.intelligence.consumeSuggestionQuota, {});
    const threadId = await createThread(ctx, components.agent, { userId: ownerId });
    const id = await ctx.db.insert("planProposals", { ...args, ownerId, profileId: objective.profileId, model: modelForTask("planning"), threadId, status: "pending", updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.planningActions.generate, { id });
    await ctx.scheduler.runAfter(120000, internal.planning.expire, { id }); return id;
  },
});
export const list = query({
  args: { objectiveId: v.id("objectives") }, returns: v.object({ proposals: v.array(schema.doc("planProposals")), sources: v.array(schema.doc("evidence")) }),
  handler: async (ctx, { objectiveId }) => {
    const ownerId = await getAuthUserId(ctx); const objective = await ctx.db.get("objectives", objectiveId);
    if (!ownerId || objective?.ownerId !== ownerId) throw new ConvexError("Objective not found.");
    const proposals = await ctx.db.query("planProposals").withIndex("by_objectiveId", q => q.eq("objectiveId", objectiveId)).order("desc").take(5);
    const ids = [...new Set(proposals.flatMap(p => p.result?.sourceIds ?? []))];
    const sources = [];
    for (const value of ids) {
      const id = ctx.db.normalizeId("evidence", value); if (!id) continue;
      const source = await ctx.db.get("evidence", id);
      if (source?.ownerId === ownerId && source.objectiveId === objectiveId) sources.push(source);
    }
    return { proposals, sources };
  },
});
export const context = internalQuery({
  args: { id: v.id("planProposals") }, returns: v.union(v.null(), v.object({ run: schema.doc("planProposals"), objective: schema.doc("objectives"), profile: schema.doc("profiles"), memories: v.array(schema.doc("memories")), sources: v.array(schema.doc("evidence")) })),
  handler: async (ctx, { id }) => {
    const run = await ctx.db.get("planProposals", id); if (!run || run.status !== "pending") return null;
    const objective = await ctx.db.get("objectives", run.objectiveId); const profile = await ctx.db.get("profiles", run.profileId);
    if (!objective || objective.ownerId !== run.ownerId || objective.profileId !== run.profileId || !profile || profile.ownerId !== run.ownerId || profile.archived) return null;
    const memories = await ctx.db.query("memories").withIndex("by_profileId", q => q.eq("profileId", run.profileId)).order("desc").take(12);
    const sources = await ctx.db.query("evidence").withIndex("by_objectiveId", q => q.eq("objectiveId", run.objectiveId)).order("desc").take(6);
    return { run, objective, profile, memories, sources };
  },
});
export const finish = internalMutation({
  args: { id: v.id("planProposals"), result: v.optional(proposal) }, returns: v.null(),
  handler: async (ctx, { id, result }) => {
    const run = await ctx.db.get("planProposals", id); if (!run || run.status !== "pending") return null;
    const profile = await ctx.db.get("profiles", run.profileId); const objective = await ctx.db.get("objectives", run.objectiveId);
    const usable = result && profile?.ownerId === run.ownerId && !profile.archived && objective?.ownerId === run.ownerId && objective.profileId === run.profileId;
    const parsed = usable ? proposalSchema.parse(result) : undefined;
    if (parsed) for (const sourceId of parsed.sourceIds) {
      const source = ctx.db.normalizeId("evidence", sourceId);
      const evidence = source ? await ctx.db.get("evidence", source) : null;
      if (!evidence || evidence.ownerId !== run.ownerId || evidence.objectiveId !== run.objectiveId) throw new ConvexError("Invalid source reference.");
    }
    await ctx.db.patch("planProposals", id, { status: parsed ? "ready" : "failed", ...(parsed ? { result: parsed } : { error: "Could not prepare a proposal. Please try again later." }), updatedAt: Date.now() }); return null;
  },
});
export const accept = mutation({
  args: { id: v.id("planProposals"), steps: v.array(planStep) }, returns: v.array(v.id("tasks")),
  handler: async (ctx, { id, steps }) => {
    const ownerId = await getAuthUserId(ctx); const run = await ctx.db.get("planProposals", id);
    if (!ownerId || run?.ownerId !== ownerId) throw new ConvexError("Proposal not found.");
    if (run.status === "accepted") return run.acceptedTaskIds ?? [];
    if (run.status !== "ready") throw new ConvexError("Proposal is not ready.");
    const profile = await ctx.db.get("profiles", run.profileId); const objective = await ctx.db.get("objectives", run.objectiveId);
    if (!profile || profile.ownerId !== ownerId || profile.archived || !objective || objective.ownerId !== ownerId || objective.profileId !== run.profileId) throw new ConvexError("Choose an active profile.");
    const checked = stepsSchema.safeParse(steps); if (!checked.success) throw new ConvexError("Use 1–8 tasks with dependencies only on earlier tasks.");
    const current = await ctx.db.query("tasks").withIndex("by_objectiveId", q => q.eq("objectiveId", run.objectiveId)).take(100);
    if (current.length + steps.length > 100) throw new ConvexError("This objective has too many tasks.");
    const ids: Id<"tasks">[] = [];
    for (const step of checked.data) ids.push(await ctx.db.insert("tasks", { ownerId, profileId: run.profileId, objectiveId: run.objectiveId, title: step.title, done: false, dependsOn: step.dependsOn.map(index => ids[index]), updatedAt: Date.now() }));
    await ctx.db.patch("planProposals", id, { status: "accepted", acceptedTaskIds: ids, updatedAt: Date.now() });
    await ctx.db.insert("activityEvents", { ownerId, profileId: run.profileId, objectiveId: run.objectiveId, kind: "plan.accepted", summary: "Reviewed and accepted an AI-assisted plan" }); return ids;
  },
});
export const expire = internalMutation({
  args: { id: v.id("planProposals") }, returns: v.null(), handler: async (ctx, { id }) => {
    const run = await ctx.db.get("planProposals", id);
    if (run?.status === "pending") await ctx.db.patch("planProposals", id, { status: "failed", error: "Proposal timed out. You may retry.", updatedAt: Date.now() }); return null;
  },
});

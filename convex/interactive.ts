import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { RateLimiter, DAY, MINUTE } from "@convex-dev/rate-limiter";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { api, components, internal } from "./_generated/api";
import schema from "./schema";
import { consume } from "./entitlements";
import { brief, briefSchema, LIVE_SECONDS } from "./liveContracts";

const limits = new RateLimiter(components.rateLimiter, {
  liveStarts: { kind: "fixed window", rate: 6, period: DAY },
  liveGlobal: { kind: "fixed window", rate: 12, period: DAY },
  liveMinute: { kind: "token bucket", rate: 1, period: MINUTE, capacity: 1 },
  sessionCreates: { kind: "fixed window", rate: 30, period: DAY },
});
async function owned(ctx: QueryCtx | MutationCtx, id: Id<"interactiveSessions">) {
  const owner = await getAuthUserId(ctx); const session = await ctx.db.get("interactiveSessions", id);
  if (!owner || session?.ownerId !== owner) throw new ConvexError("Session not found.");
  return session;
}
async function activeContext(ctx: QueryCtx | MutationCtx, id: Id<"interactiveSessions">) {
  const session = await owned(ctx, id); const profile = await ctx.db.get("profiles", session.profileId);
  if (!profile || profile.archived || profile.ownerId !== session.ownerId || profile.updatedAt !== session.profileUpdatedAt) throw new ConvexError("Profile changed. Start a new session and confirm its context.");
  if (session.guidanceId) { const guidance = await ctx.db.get("aiGuidance", session.guidanceId); if (!guidance?.result || guidance.status !== "ready" || guidance.ownerId !== session.ownerId || guidance.profileId !== profile._id || guidance.objectiveId !== session.objectiveId) throw new ConvexError("Selected guidance is unavailable."); }
  return { session, profile };
}
export const discussGuidance = mutation({ args: { guidanceId: v.id("aiGuidance") }, returns: v.id("interactiveSessions"), handler: async (ctx, { guidanceId }) => {
  const ownerId = await getAuthUserId(ctx);
  const guidance = await ctx.db.get("aiGuidance", guidanceId);
  if (!ownerId || guidance?.ownerId !== ownerId || guidance.status !== "ready" || !guidance.result) throw new ConvexError("Completed guidance not found.");
  const profile = await ctx.db.get("profiles", guidance.profileId);
  const objective = await ctx.db.get("objectives", guidance.objectiveId);
  if (!profile || profile.archived || profile.ownerId !== ownerId || objective?.ownerId !== ownerId || objective.profileId !== profile._id) throw new ConvexError("Choose an active profile.");
  const existing = await ctx.db.query("interactiveSessions").withIndex("by_ownerId_and_guidanceId", q => q.eq("ownerId", ownerId).eq("guidanceId", guidanceId)).order("desc").first();
  if (existing?.profileUpdatedAt === profile.updatedAt) return existing._id;
  await limits.limit(ctx, "sessionCreates", { key: ownerId, throws: true });
  return await ctx.db.insert("interactiveSessions", { ownerId, profileId: profile._id, profileUpdatedAt: profile.updatedAt, objectiveId: guidance.objectiveId, guidanceId, updatedAt: Date.now() });
} });
export const create = mutation({
  args: { profileId: v.id("profiles"), expectedUpdatedAt: v.number(), objectiveId: v.optional(v.id("objectives")) }, returns: v.id("interactiveSessions"),
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx); const profile = await ctx.db.get("profiles", args.profileId);
    if (!ownerId || profile?.ownerId !== ownerId || profile.archived || profile.updatedAt !== args.expectedUpdatedAt) throw new ConvexError("Confirm an active profile.");
    if (args.objectiveId) { const objective = await ctx.db.get("objectives", args.objectiveId); if (objective?.ownerId !== ownerId || objective.profileId !== profile._id) throw new ConvexError("Entry not found in this profile."); }
    await limits.limit(ctx, "sessionCreates", { key: ownerId, throws: true });
    return await ctx.db.insert("interactiveSessions", { ownerId, profileId: profile._id, profileUpdatedAt: profile.updatedAt, objectiveId: args.objectiveId, updatedAt: Date.now() });
  },
});
export const list = query({ args: {}, returns: v.array(schema.doc("interactiveSessions")), handler: async ctx => {
  const owner = await getAuthUserId(ctx); if (!owner) throw new ConvexError("Sign in.");
  return await ctx.db.query("interactiveSessions").withIndex("by_ownerId", q => q.eq("ownerId", owner)).order("desc").take(20);
} });
export const get = query({ args: { id: v.id("interactiveSessions") }, returns: schema.doc("interactiveSessions"), handler: ownedWrapper });
async function ownedWrapper(ctx: QueryCtx, { id }: { id: Id<"interactiveSessions"> }) { return await owned(ctx, id); }
export const context = internalQuery({ args: { id: v.id("interactiveSessions") }, returns: v.string(), handler: async (ctx, { id }) => {
  const { session, profile } = await activeContext(ctx, id);
  if (session.guidanceId) {
    const guidance = await ctx.db.get("aiGuidance", session.guidanceId);
    return JSON.stringify({ mode: "guidanceDiscussion", profile: { name: profile.name, role: profile.role, industry: profile.industry }, question: guidance!.question, selectedGuidance: guidance!.result, note: "Discuss only this selected guidance. It is AI-generated advice, not verified fact. No other cards or profile history are included." });
  }
  const memories = await ctx.db.query("memories").withIndex("by_profileId", q => q.eq("profileId", profile._id)).order("desc").take(8);
  const objective = session.objectiveId ? await ctx.db.get("objectives", session.objectiveId) : null;
  const guidance = objective ? await ctx.db.query("aiGuidance").withIndex("by_objectiveId", q => q.eq("objectiveId", objective._id)).order("desc").take(2) : [];
  const sources = objective ? await ctx.db.query("evidence").withIndex("by_objectiveId", q => q.eq("objectiveId", objective._id)).order("desc").take(3) : [];
  const plan = objective ? await ctx.db.query("planProposals").withIndex("by_objectiveId", q => q.eq("objectiveId", objective._id)).order("desc").first() : null;
  return JSON.stringify({ profile: { name: profile.name, description: profile.description.slice(0,1000), role: profile.role, industry: profile.industry }, memories: memories.map(m => ({ kind: m.kind, content: m.content.slice(0,500) })), brief: session.brief, entry: objective ? { title: objective.title, description: objective.description.slice(0,1500), goal: objective.desiredOutcome.slice(0,1000) } : null,
    guidance: guidance.filter(g => g.status === "ready").map(g => ({ understanding: g.result?.understanding.slice(0,500), responseExcerpt: g.result?.response.slice(0,1500), assumptions: g.result?.assumptions })),
    sources: sources.map(s => ({ url:s.url, title:s.title, excerpt:s.excerpt.slice(0,400), retrievedAt:s.retrievedAt })),
    plan: plan ? { status:plan.status, resultExcerpt:plan.result ? JSON.stringify(plan.result).slice(0,2000) : null } : null,
    note:"Results may be abbreviated. Refer to the complete result cards; do not claim pending work is ready." });
} });
export const reserve = internalMutation({ args: { sessionId: v.id("interactiveSessions"), requestId: v.string() }, returns: v.id("voiceConnections"), handler: async (ctx, args) => {
  const { session } = await activeContext(ctx, args.sessionId);
  if (!args.requestId || args.requestId.length > 80) throw new ConvexError("Invalid request.");
  const duplicate = await ctx.db.query("voiceConnections").withIndex("by_ownerId_and_requestId", q => q.eq("ownerId", session.ownerId).eq("requestId", args.requestId)).unique();
  if (duplicate) throw new ConvexError("This connection request was already used. Stop it before starting again.");
  // Only six starts per day are admitted. The latest record remains locked until server hangup succeeds.
  const last = await ctx.db.query("voiceConnections").withIndex("by_ownerId", q => q.eq("ownerId", session.ownerId)).order("desc").first();
  if (last && last.status !== "closed") throw new ConvexError("Another voice connection is active or awaiting cleanup. Stop voice and try again.");
  for (const name of ["liveMinute", "liveStarts", "liveGlobal"] as const) {
    const result = await limits.limit(ctx, name, name === "liveGlobal" ? {} : { key: session.ownerId });
    if (!result.ok) throw new ConvexError(`Life Maxim voice ${name === "liveMinute" ? "cooldown" : "daily allowance"} reached. Wait at least ${Math.ceil(result.retryAfter / 1000)} seconds before trying again. No OpenAI request was made.`);
  }
  await consume(ctx,session.ownerId,"voice");
  const expiresAt = Date.now() + LIVE_SECONDS * 1000;
  const id = await ctx.db.insert("voiceConnections", { ...args, ownerId: session.ownerId, status: "starting", expiresAt, updatedAt: Date.now() });
  await ctx.scheduler.runAt(expiresAt, internal.liveActions.hangup, { id, attempt: 0 });
  return id;
} });
export const attach = internalMutation({ args: { id: v.id("voiceConnections"), providerId: v.string() }, returns: v.boolean(), handler: async (ctx, args) => {
  const row = await ctx.db.get("voiceConnections", args.id); if (!row) return false;
  const active = row.status === "starting" && row.expiresAt > Date.now();
  await ctx.db.patch("voiceConnections", row._id, { providerId: args.providerId, status: active ? "active" : "closing", updatedAt: Date.now() });
  if (active) await ctx.scheduler.runAfter(30000, internal.interactive.checkContext, { id: row._id });
  if (!active) await ctx.scheduler.runAfter(0, internal.liveActions.hangup, { id: row._id, attempt: 0 });
  return active;
} });
export const checkContext = internalMutation({ args: { id: v.id("voiceConnections") }, returns: v.null(), handler: async (ctx, { id }) => {
  const row = await ctx.db.get("voiceConnections", id); if (!row || row.status !== "active") return null;
  const session = await ctx.db.get("interactiveSessions", row.sessionId);
  const profile = session ? await ctx.db.get("profiles", session.profileId) : null;
  if (!session || !profile || profile.archived || profile.ownerId !== row.ownerId || profile.updatedAt !== session.profileUpdatedAt || Date.now() >= row.expiresAt) {
    await ctx.db.patch("voiceConnections", id, { status: "closing", updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.liveActions.hangup, { id, attempt: 0 });
  } else await ctx.scheduler.runAfter(30000, internal.interactive.checkContext, { id });
  return null;
} });
export const connection = internalQuery({ args: { id: v.id("voiceConnections") }, returns: v.union(v.null(), schema.doc("voiceConnections")), handler: async (ctx, { id }) => await ctx.db.get("voiceConnections", id) });
export const finish = internalMutation({ args: { id: v.id("voiceConnections"), certain: v.boolean() }, returns: v.null(), handler: async (ctx, { id, certain }) => {
  const row = await ctx.db.get("voiceConnections", id); if (row && row.status !== "closed") await ctx.db.patch("voiceConnections", id, { status: certain ? "closed" : "uncertain", updatedAt: Date.now() }); return null;
} });
export const stop = mutation({ args: { sessionId: v.id("interactiveSessions") }, returns: v.null(), handler: async (ctx, { sessionId }) => {
  await owned(ctx, sessionId);
  const row = await ctx.db.query("voiceConnections").withIndex("by_sessionId", q => q.eq("sessionId", sessionId)).order("desc").first();
  if (row && row.status !== "closed") {
    await ctx.db.patch("voiceConnections", row._id, { status: "closing", updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.liveActions.hangup, { id: row._id, attempt: 0 });
  } return null;
} });
export const voiceState = query({ args: { sessionId: v.id("interactiveSessions") }, returns: v.union(v.null(), v.object({ status: schema.tables.voiceConnections.validator.fields.status, expiresAt: v.number() })), handler: async (ctx, { sessionId }) => {
  await owned(ctx, sessionId); const row = await ctx.db.query("voiceConnections").withIndex("by_sessionId", q => q.eq("sessionId", sessionId)).order("desc").first();
  return row ? { status: row.status, expiresAt: row.expiresAt } : null;
} });
export const confirm = mutation({ args: { id: v.id("interactiveSessions"), brief }, returns: v.id("objectives"), handler: async (ctx, args): Promise<Id<"objectives">> => {
  const { session } = await activeContext(ctx, args.id); const checked = briefSchema.safeParse(args.brief);
  if (session.guidanceId) throw new ConvexError("This discussion is grounded in an existing guidance card. Start a separate Interactive Mode session to create a new brief.");
  if (!checked.success) throw new ConvexError("Check the brief length and title.");
  if (session.brief && session.objectiveId) { if ((["title", "goal", "context", "questions"] as const).some(key => session.brief![key] !== checked.data[key])) throw new ConvexError("This brief was already confirmed. Start a new discussion to change it."); return session.objectiveId; }
  const objectiveId = session.objectiveId ?? await ctx.runMutation(api.objectives.create, { profileId: session.profileId, title: checked.data.title, description: checked.data.context, desiredOutcome: checked.data.goal, requestId: `interactive-${session._id}` });
  await ctx.db.patch("interactiveSessions", session._id, { brief: checked.data, objectiveId, updatedAt: Date.now() });
  await ctx.runMutation(api.intelligence.requestGuidance, { objectiveId, question: `${checked.data.goal}\n${checked.data.questions}\n${checked.data.context}`, requestId: `interactive-${session._id}` });
  return objectiveId;
} });

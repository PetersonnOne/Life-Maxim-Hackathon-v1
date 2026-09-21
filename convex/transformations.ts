import { getAuthUserId } from "@convex-dev/auth/server";
import { RateLimiter, DAY, MINUTE } from "@convex-dev/rate-limiter";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import { mutation, query, internalMutation, env, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { transformationKind } from "./transformationContracts";
import { accountTier, consume } from "./entitlements";
import { transformationWorkflow } from "./transformationWorkflow";

const limiter = new RateLimiter(components.rateLimiter, {
  transformMinute: { kind: "token bucket", rate: 2, period: MINUTE, capacity: 2 },
  transformGlobal: { kind: "fixed window", rate: 100, period: DAY },
  mediaGlobal: { kind: "fixed window", rate: 20, period: DAY },
});
export async function ownedGuidance(ctx: QueryCtx | MutationCtx, guidanceId: Id<"aiGuidance">) {
  const owner = await getAuthUserId(ctx);
  const row = await ctx.db.get("aiGuidance", guidanceId);
  if (!owner || row?.ownerId !== owner) throw new ConvexError("Guidance not found.");
  return row;
}
async function usable(ctx: QueryCtx | MutationCtx, guidanceId: Id<"aiGuidance">) {
  const row = await ctx.db.get("aiGuidance", guidanceId);
  const profile = row ? await ctx.db.get("profiles", row.profileId) : null;
  const entry = row ? await ctx.db.get("objectives", row.objectiveId) : null;
  return row?.status === "ready" && row.result && profile && !profile.archived && profile.ownerId === row.ownerId && entry?.ownerId === row.ownerId && entry.profileId === row.profileId ? row : null;
}
export const request = mutation({
  args: { guidanceId: v.id("aiGuidance"), kind: transformationKind, custom: v.string(), requestId: v.string() }, returns: v.id("guidanceTransformations"),
  handler: async (ctx, args): Promise<Id<"guidanceTransformations">> => {
    const source = await ownedGuidance(ctx, args.guidanceId);
    if (!await usable(ctx, source._id)) throw new ConvexError("Choose completed guidance in an active profile.");
    if (!args.requestId || args.requestId.length > 100 || args.custom.length > 1500 || (args.kind === "custom" && args.custom.trim().length < 5)) throw new ConvexError("Describe the custom output in 5–1500 characters.");
    const existing = await ctx.db.query("guidanceTransformations").withIndex("by_ownerId_and_requestId", q => q.eq("ownerId", source.ownerId).eq("requestId", args.requestId)).unique();
    if (existing) {
      if (existing.guidanceId !== args.guidanceId || existing.kind !== args.kind || existing.custom !== args.custom) throw new ConvexError("Request identifier already used.");
      return existing._id;
    }
    const isMedia = args.kind === "mp3" || args.kind === "infographic";
    if (isMedia && !env.OPENAI_API_KEY) throw new ConvexError("Media generation is not configured.");
    const latest = await ctx.db.query("guidanceTransformations").withIndex("by_guidanceId", q => q.eq("guidanceId", source._id)).order("desc").first();
    if (latest && (latest.status === "pending" || latest.status === "processing")) throw new ConvexError("A transformation is already running for this card.");
    if (isMedia) {
      const tier = await accountTier(ctx, source.ownerId);
      const cap = tier === "free" ? 1 : tier === "premium" ? 3 : 5;
      const start = Math.floor(Date.now() / DAY) * DAY;
      const config = { kind: "fixed window" as const, rate: 5, capacity: 5, period: DAY, start };
      const name = `transform:${args.kind}:${start}`;
      const current = await limiter.getValue(ctx, name, { key: source.ownerId, config });
      if (5 - current.value >= cap) throw new ConvexError(`Daily ${args.kind === "mp3" ? "MP3" : "infographic"} limit reached (${cap}/day). Resets at midnight UTC.`);
      await limiter.limit(ctx, name, { key: source.ownerId, config, throws: true });
      await limiter.limit(ctx, "mediaGlobal", { throws: true });
    } else await consume(ctx, source.ownerId, args.kind === "custom" || args.kind === "article" ? "heavyAI" : "lightAI");
    await limiter.limit(ctx, "transformMinute", { key: source.ownerId, throws: true });
    await limiter.limit(ctx, "transformGlobal", { throws: true });
    const id = await ctx.db.insert("guidanceTransformations", { ...args, ownerId: source.ownerId, profileId: source.profileId, status: "pending", updatedAt: Date.now() });
    await transformationWorkflow.start(ctx, internal.transformationWorkflow.process, { id }, { startAsync: true });
    await ctx.scheduler.runAfter(600000, internal.transformations.fail, { id, error: "Generation timed out. No automatic paid retry was made." });
    return id;
  },
});
export const list = query({ args: { guidanceId: v.id("aiGuidance"), paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(schema.doc("guidanceTransformations")), handler: async (ctx, args) => {
  await ownedGuidance(ctx, args.guidanceId);
  return await ctx.db.query("guidanceTransformations").withIndex("by_guidanceId", q => q.eq("guidanceId", args.guidanceId)).order("desc").paginate(args.paginationOpts);
} });
export const files = query({ args: { id: v.id("guidanceTransformations") }, returns: v.object({ text: v.union(v.string(), v.null()), document: v.union(v.string(), v.null()), media: v.union(v.string(), v.null()) }), handler: async (ctx, { id }) => {
  const row = await ctx.db.get("guidanceTransformations", id);
  if (!row) return { text: null, document: null, media: null };
  await ownedGuidance(ctx, row.guidanceId);
  return { text: row.textStorageId ? await ctx.storage.getUrl(row.textStorageId) : null, document: row.documentStorageId ? await ctx.storage.getUrl(row.documentStorageId) : null, media: row.mediaStorageId ? await ctx.storage.getUrl(row.mediaStorageId) : null };
} });
export const remove = mutation({ args: { id: v.id("guidanceTransformations") }, returns: v.null(), handler: async (ctx, { id }) => {
  const row = await ctx.db.get("guidanceTransformations", id);
  if (!row) return null;
  await ownedGuidance(ctx, row.guidanceId);
  if (row.status === "pending" || row.status === "processing") throw new ConvexError("Wait for generation to finish before deleting.");
  for (const storageId of [row.textStorageId, row.documentStorageId, row.mediaStorageId]) if (storageId) await ctx.storage.delete(storageId);
  await ctx.db.delete("guidanceTransformations", id);
  return null;
} });
export const claim = internalMutation({ args: { id: v.id("guidanceTransformations"), render: v.boolean() }, returns: v.union(v.null(), v.object({ row: schema.doc("guidanceTransformations"), source: v.string() })), handler: async (ctx, { id, render }) => {
  const row = await ctx.db.get("guidanceTransformations", id);
  if (!row || (render ? row.status !== "processing" || row.renderStarted || !row.text : row.status !== "pending")) return null;
  const source = await usable(ctx, row.guidanceId);
  if (!source || source.ownerId !== row.ownerId) return null;
  await ctx.db.patch("guidanceTransformations", id, render ? { renderStarted: true } : { status: "processing", updatedAt: Date.now() });
  return { row, source: JSON.stringify({ question: source.question, guidance: source.result }) };
} });
export const prepared = internalMutation({ args: { id: v.id("guidanceTransformations"), title: v.string(), text: v.string(), model: v.string() }, returns: v.null(), handler: async (ctx, { id, ...data }) => {
  const row = await ctx.db.get("guidanceTransformations", id);
  if (row?.status === "processing" && !row.renderStarted && data.text.length <= 16000 && data.title.length <= 160) await ctx.db.patch("guidanceTransformations", id, { ...data, updatedAt: Date.now() });
  return null;
} });
export const finish = internalMutation({ args: { id: v.id("guidanceTransformations"), textStorageId: v.id("_storage"), documentStorageId: v.id("_storage"), mediaStorageId: v.optional(v.id("_storage")), duration: v.optional(v.number()) }, returns: v.null(), handler: async (ctx, { id, ...files }) => {
  const row = await ctx.db.get("guidanceTransformations", id);
  const valid = row && row.status === "processing" && await usable(ctx, row.guidanceId);
  if (!valid) { for (const file of [files.textStorageId, files.documentStorageId, files.mediaStorageId]) if (file) await ctx.storage.delete(file); return null; }
  if (row.kind === "mp3" && (!files.duration || files.duration > 120)) throw new ConvexError("Audio exceeds two minutes.");
  await ctx.db.patch("guidanceTransformations", id, { ...files, status: "ready", updatedAt: Date.now() }); return null;
} });
export const fail = internalMutation({ args: { id: v.id("guidanceTransformations"), error: v.string() }, returns: v.null(), handler: async (ctx, { id, error }) => {
  const row = await ctx.db.get("guidanceTransformations", id);
  if (row && row.status !== "ready" && row.status !== "failed") await ctx.db.patch("guidanceTransformations", id, { status: "failed", error: error.slice(0,400), updatedAt: Date.now() });
  return null;
} });

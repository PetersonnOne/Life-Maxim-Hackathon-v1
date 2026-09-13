import { v } from "convex/values";
import { RateLimiter, MINUTE, DAY } from "@convex-dev/rate-limiter";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal, components } from "./_generated/api";
import schema from "./schema";

export const POLL_INTERVAL = 5 * MINUTE;
const limits = new RateLimiter(components.rateLimiter, {
  readsMinute: { kind: "fixed window", rate: 60, period: MINUTE },
  readsDay: { kind: "fixed window", rate: 10000, period: DAY },
});

// Each cron tick reserves at most 20 due inboxes. The due-time index is fair to
// older work; the lease plus generation token excludes overlapping/stale workers.
export const dispatch = internalMutation({ args: {}, returns: v.number(), handler: async ctx => {
  const now = Date.now();
  const cooldown = await ctx.db.query("mailPollControl").withIndex("by_key", q => q.eq("key", "agentmail")).unique();
  if (cooldown && cooldown.retryAt > now) return 0;
  const inboxes = await ctx.db.query("mailInboxes").withIndex("by_status_and_nextPollAt", q => q.eq("status", "ready").lte("nextPollAt", now)).take(20);
  let count = 0;
  for (const inbox of inboxes) {
    const profile = await ctx.db.get("profiles", inbox.profileId);
    if (!inbox.providerId || profile?.ownerId !== inbox.ownerId || profile.archived) {
      await ctx.db.patch("mailInboxes", inbox._id, { nextPollAt: now + 60 * MINUTE }); continue;
    }
    const generation = (inbox.pollGeneration ?? 0) + 1;
    await ctx.db.patch("mailInboxes", inbox._id, { pollGeneration: generation, pollStarted: false, nextPollAt: now + POLL_INTERVAL });
    await ctx.scheduler.runAfter(count++ * 2000, internal.mailPollingActions.poll, { id: inbox._id, generation });
  }
  return count;
} });
export const begin = internalMutation({ args: { id: v.id("mailInboxes"), generation: v.number() }, returns: v.union(v.null(), schema.doc("mailInboxes")), handler: async (ctx, { id, generation }) => {
  const inbox = await ctx.db.get("mailInboxes", id);
  if (!inbox || inbox.status !== "ready" || inbox.pollGeneration !== generation || inbox.pollStarted) return null;
  const profile = await ctx.db.get("profiles", inbox.profileId);
  if (!inbox.providerId || profile?.ownerId !== inbox.ownerId || profile.archived) return null;
  await ctx.db.patch("mailInboxes", id, { pollStarted: true }); return inbox;
} });
// All polling HTTP reads share API-key quotas and provider Retry-After cooldown.
export const permit = internalMutation({ args: {}, returns: v.number(), handler: async ctx => {
  const now = Date.now();
  const cooldown = await ctx.db.query("mailPollControl").withIndex("by_key", q => q.eq("key", "agentmail")).unique();
  if (cooldown && cooldown.retryAt > now) return cooldown.retryAt;
  for (const name of ["readsMinute", "readsDay"] as const) {
    const result = await limits.limit(ctx, name);
    if (!result.ok) return now + result.retryAfter;
  }
  return 0;
} });
export const known = internalQuery({ args: { id: v.id("mailInboxes"), messageId: v.string() }, returns: v.boolean(), handler: async (ctx, { id, messageId }) => {
  const inbox = await ctx.db.get("mailInboxes", id); if (!inbox) return true;
  return !!await ctx.db.query("mailMessages").withIndex("by_profileId_and_providerMessageId", q => q.eq("profileId", inbox.profileId).eq("providerMessageId", messageId)).unique();
} });
export const finish = internalMutation({
  args: { id: v.id("mailInboxes"), generation: v.number(), ok: v.boolean(), pageToken: v.optional(v.string()), retryAt: v.optional(v.number()), resetCursor: v.optional(v.boolean()) }, returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    // A 429 affects this API key, including other inboxes already queued.
    if (args.retryAt && Number.isFinite(args.retryAt) && args.retryAt > now) {
      const state = await ctx.db.query("mailPollControl").withIndex("by_key", q => q.eq("key", "agentmail")).unique();
      if (!state) await ctx.db.insert("mailPollControl", { key: "agentmail", retryAt: args.retryAt });
      else if (args.retryAt > state.retryAt) await ctx.db.patch("mailPollControl", state._id, { retryAt: args.retryAt });
    }
    const inbox = await ctx.db.get("mailInboxes", args.id);
    if (!inbox || inbox.pollGeneration !== args.generation || inbox.status !== "ready") return null;
    const failures = args.ok ? 0 : (inbox.pollFailures ?? 0) + 1;
    const wait = args.ok ? POLL_INTERVAL : Math.min(60 * MINUTE, POLL_INTERVAL * 2 ** Math.min(failures - 1, 4));
    await ctx.db.patch("mailInboxes", args.id, {
      nextPollAt: Math.max(now + wait, args.retryAt ?? 0), pollFailures: failures,
      ...(args.ok ? { lastPolledAt: now, pollPageToken: args.pageToken, pollError: undefined } : {
        pollError: "Inbox check delayed. Automatic checks will retry with backoff.",
        ...(args.resetCursor ? { pollPageToken: undefined } : {}),
      }),
    }); return null;
  },
});

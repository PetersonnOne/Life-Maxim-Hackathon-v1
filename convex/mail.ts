import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/core";
import { RateLimiter, DAY } from "@convex-dev/rate-limiter";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal, components } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import { draftSchema } from "./mailContracts";
const limits = new RateLimiter(components.rateLimiter, {
  inboxDay: { kind: "fixed window", rate: 2, period: DAY },
  inboxGlobal: { kind: "fixed window", rate: 20, period: DAY },
  sendDay: { kind: "fixed window", rate: 5, period: DAY },
  sendGlobal: { kind: "fixed window", rate: 50, period: DAY },
});
export const list = query({
  args: { objectiveId: v.id("objectives") }, returns: v.object({ inbox: v.union(v.null(), schema.doc("mailInboxes")), drafts: v.array(schema.doc("mailDrafts")), messages: v.array(schema.doc("mailMessages")) }),
  handler: async (ctx, { objectiveId }) => {
    const ownerId = await getAuthUserId(ctx); const objective = await ctx.db.get("objectives", objectiveId);
    if (!ownerId || objective?.ownerId !== ownerId) throw new ConvexError("Objective not found.");
    const inbox = await ctx.db.query("mailInboxes").withIndex("by_profileId", q => q.eq("profileId", objective.profileId)).unique();
    const drafts = await ctx.db.query("mailDrafts").withIndex("by_objectiveId", q => q.eq("objectiveId", objectiveId)).order("desc").take(20);
    const messages = await ctx.db.query("mailMessages").withIndex("by_profileId", q => q.eq("profileId", objective.profileId)).order("desc").take(30);
    return { inbox, drafts, messages };
  },
});
export const createInbox = mutation({
  args: { profileId: v.id("profiles") }, returns: v.id("mailInboxes"), handler: async (ctx, { profileId }): Promise<Id<"mailInboxes">> => {
    const ownerId = await getAuthUserId(ctx); const profile = await ctx.db.get("profiles", profileId);
    if (!ownerId || profile?.ownerId !== ownerId || profile.archived) throw new ConvexError("Profile not found.");
    const existing = await ctx.db.query("mailInboxes").withIndex("by_profileId", q => q.eq("profileId", profileId)).unique();
    if (existing) return existing._id;
    await limits.limit(ctx, "inboxDay", { key: ownerId, throws: true });
    await limits.limit(ctx, "inboxGlobal", { throws: true });
    const id = await ctx.db.insert("mailInboxes", { ownerId, profileId, status: "pending" });
    await ctx.scheduler.runAfter(0, internal.mailActions.provision, { id });
    await ctx.scheduler.runAfter(120000, internal.mail.finishInbox, { id }); return id;
  },
});
export const claimInbox = internalMutation({ args: { id: v.id("mailInboxes") }, returns: v.union(v.null(), schema.doc("mailInboxes")), handler: async (ctx, { id }) => {
  const inbox = await ctx.db.get("mailInboxes", id); if (!inbox || inbox.provisioningStarted || inbox.status !== "pending") return null;
  const profile = await ctx.db.get("profiles", inbox.profileId); if (profile?.ownerId !== inbox.ownerId || profile.archived) return null;
  await ctx.db.patch("mailInboxes", id, { provisioningStarted: true }); return inbox;
} });
export const finishInbox = internalMutation({ args: { id: v.id("mailInboxes"), providerId: v.optional(v.string()), address: v.optional(v.string()) }, returns: v.null(), handler: async (ctx, args) => {
  const inbox = await ctx.db.get("mailInboxes", args.id); if (!inbox || inbox.status !== "pending") return null;
  await ctx.db.patch("mailInboxes", args.id, args.providerId && args.address ? { status: "ready", providerId: args.providerId, address: args.address } : { status: "failed", error: "Inbox setup needs administrator review before retrying, to avoid duplicate inboxes." }); return null;
} });
export const saveDraft = mutation({
  args: { objectiveId: v.id("objectives"), id: v.optional(v.id("mailDrafts")), version: v.optional(v.number()), to: v.string(), subject: v.string(), body: v.string() }, returns: v.id("mailDrafts"),
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx); const objective = await ctx.db.get("objectives", args.objectiveId);
    if (!ownerId || objective?.ownerId !== ownerId) throw new ConvexError("Objective not found.");
    const profile = await ctx.db.get("profiles", objective.profileId); if (!profile || profile.ownerId !== ownerId || profile.archived) throw new ConvexError("Choose an active profile.");
    const input = draftSchema.safeParse(args); if (!input.success) throw new ConvexError("Check recipient, subject and message.");
    if (args.id) {
      const draft = await ctx.db.get("mailDrafts", args.id);
      if (draft?.ownerId !== ownerId || draft.objectiveId !== args.objectiveId || draft.version !== args.version || !["draft", "approved"].includes(draft.status)) throw new ConvexError("Draft changed or cannot be edited. Reload it.");
      await ctx.db.patch("mailDrafts", args.id, { ...input.data, version: draft.version + 1, status: "draft", approvedVersion: undefined, approvalExpiresAt: undefined, updatedAt: Date.now() }); return args.id;
    }
    const drafts = await ctx.db.query("mailDrafts").withIndex("by_objectiveId", q => q.eq("objectiveId", args.objectiveId)).take(20);
    if (drafts.length >= 20) throw new ConvexError("This objective has reached its draft limit.");
    return await ctx.db.insert("mailDrafts", { ...input.data, ownerId, profileId: objective.profileId, objectiveId: args.objectiveId, version: 1, status: "draft", updatedAt: Date.now() });
  },
});
export const approve = mutation({
  args: { id: v.id("mailDrafts"), version: v.number() }, returns: v.null(), handler: async (ctx, { id, version }) => {
    const ownerId = await getAuthUserId(ctx); const draft = await ctx.db.get("mailDrafts", id);
    if (!ownerId || draft?.ownerId !== ownerId || draft.version !== version || !["draft", "approved"].includes(draft.status)) throw new ConvexError("Draft changed or cannot be approved.");
    const profile = await ctx.db.get("profiles", draft.profileId);
    if (profile?.ownerId !== ownerId || profile.archived) throw new ConvexError("Choose an active profile.");
    await ctx.db.patch("mailDrafts", id, { status: "approved", approvedVersion: version, approvedProfileUpdatedAt: profile.updatedAt, approvalExpiresAt: Date.now() + 10 * 60000, updatedAt: Date.now() }); return null;
  },
});
export const send = mutation({
  args: { id: v.id("mailDrafts"), version: v.number() }, returns: v.null(), handler: async (ctx, { id, version }) => {
    const ownerId = await getAuthUserId(ctx); const draft = await ctx.db.get("mailDrafts", id);
    if (!ownerId || draft?.ownerId !== ownerId || draft.version !== version) throw new ConvexError("Draft not found or changed.");
    if (draft.status === "sending" || draft.status === "sent") return null;
    if (draft.status !== "approved" || draft.approvedVersion !== version || !draft.approvalExpiresAt || draft.approvalExpiresAt < Date.now()) throw new ConvexError("Review and approve this version before sending.");
    const profile = await ctx.db.get("profiles", draft.profileId); if (!profile || profile.ownerId !== ownerId || profile.archived) throw new ConvexError("Choose an active profile.");
    if (draft.approvedProfileUpdatedAt !== profile.updatedAt) throw new ConvexError("Profile changed. Review and approve this message again.");
    const inbox = await ctx.db.query("mailInboxes").withIndex("by_profileId", q => q.eq("profileId", draft.profileId)).unique();
    if (inbox?.status !== "ready" || !inbox.providerId) throw new ConvexError("Create an inbox first.");
    await limits.limit(ctx, "sendDay", { key: ownerId, throws: true }); await limits.limit(ctx, "sendGlobal", { throws: true });
    await ctx.db.patch("mailDrafts", id, { status: "sending", updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.mailActions.sendApproved, { id, version });
    await ctx.scheduler.runAfter(120000, internal.mail.finishSend, { id, version }); return null;
  },
});
export const claimSend = internalMutation({ args: { id: v.id("mailDrafts"), version: v.number() }, returns: v.union(v.null(), v.object({ draft: schema.doc("mailDrafts"), inbox: schema.doc("mailInboxes") })), handler: async (ctx, { id, version }) => {
  const draft = await ctx.db.get("mailDrafts", id); if (!draft || draft.dispatchStarted || draft.status !== "sending" || draft.version !== version || draft.approvedVersion !== version || !draft.approvalExpiresAt || draft.approvalExpiresAt < Date.now()) return null;
  const profile = await ctx.db.get("profiles", draft.profileId); if (!profile || profile.ownerId !== draft.ownerId || profile.archived) return null;
  if (draft.approvedProfileUpdatedAt !== profile.updatedAt) return null;
  const inbox = await ctx.db.query("mailInboxes").withIndex("by_profileId", q => q.eq("profileId", draft.profileId)).unique();
  if (inbox?.status !== "ready" || inbox.ownerId !== draft.ownerId || !inbox.providerId) return null;
  await ctx.db.patch("mailDrafts", id, { dispatchStarted: true });
  return { draft, inbox };
} });
export const finishSend = internalMutation({ args: { id: v.id("mailDrafts"), version: v.number(), messageId: v.optional(v.string()), threadId: v.optional(v.string()) }, returns: v.null(), handler: async (ctx, args) => {
  const draft = await ctx.db.get("mailDrafts", args.id); if (!draft || draft.version !== args.version || draft.status !== "sending") return null;
  await ctx.db.patch("mailDrafts", args.id, args.messageId && args.threadId ? { status: "sent", providerMessageId: args.messageId, threadId: args.threadId, updatedAt: Date.now() } : { status: "uncertain", error: "Delivery outcome is uncertain. Do not resend until the administrator checks AgentMail.", updatedAt: Date.now() }); return null;
} });
export const receive = internalMutation({
  args: { inboxId: v.string(), messageId: v.string(), threadId: v.string(), sender: v.string(), subject: v.string(), body: v.string() }, returns: v.null(), handler: async (ctx, args) => {
    const inbox = await ctx.db.query("mailInboxes").withIndex("by_providerId", q => q.eq("providerId", args.inboxId)).unique(); if (!inbox || inbox.status !== "ready") return null;
    const profile = await ctx.db.get("profiles", inbox.profileId);
    if (profile?.ownerId !== inbox.ownerId || profile.archived) return null;
    const existing = await ctx.db.query("mailMessages").withIndex("by_profileId_and_providerMessageId", q => q.eq("profileId", inbox.profileId).eq("providerMessageId", args.messageId)).unique();
    if (!existing) {
      const draft = await ctx.db.query("mailDrafts").withIndex("by_profileId_and_threadId", q => q.eq("profileId", inbox.profileId).eq("threadId", args.threadId)).first();
      await ctx.db.insert("mailMessages", { ownerId: inbox.ownerId, profileId: inbox.profileId, ...(draft ? { objectiveId: draft.objectiveId } : {}), providerMessageId: args.messageId, threadId: args.threadId, sender: args.sender.slice(0, 1000), subject: args.subject.slice(0, 200), body: args.body.slice(0, 10000) });
    }
    return null;
  },
});

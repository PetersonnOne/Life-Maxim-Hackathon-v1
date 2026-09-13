import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { inboxResponse, sentResponse } from "./mailContracts";

async function agentMail(path: string, body?: unknown) {
  const key = process.env.AGENTMAIL_API_KEY; if (!key?.trim()) throw new Error("Not configured");
  const response = await fetch(`https://api.agentmail.to/v0/${path}`, { method: body === undefined ? "GET" : "POST", redirect: "error", signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) { await response.body?.cancel(); throw new Error("Mail provider unavailable"); }
  const text = await response.text(); if (text.length > 100000) throw new Error("Oversized provider response");
  return JSON.parse(text) as unknown;
}
export const checkConnection = internalAction({ args: {}, returns: v.boolean(), handler: async () => {
  try { await agentMail("inboxes?limit=1"); return true; } catch { return false; }
} });
export const provision = internalAction({ args: { id: v.id("mailInboxes") }, returns: v.null(), handler: async (ctx, { id }): Promise<null> => {
  try {
    const inbox = await ctx.runMutation(internal.mail.claimInbox, { id }); if (!inbox) return null;
    const result = inboxResponse.parse(await agentMail("inboxes", { display_name: "Life Maxim", client_id: id }));
    await ctx.runMutation(internal.mail.finishInbox, { id, providerId: result.inbox_id, address: result.email });
  } catch { await ctx.runMutation(internal.mail.finishInbox, { id }); }
  return null;
} });
export const sendApproved = internalAction({ args: { id: v.id("mailDrafts"), version: v.number() }, returns: v.null(), handler: async (ctx, args): Promise<null> => {
  const context = await ctx.runMutation(internal.mail.claimSend, args);
  if (!context) return null; // Already dispatched, changed, expired or unavailable. Never retry.
  try {
    const { draft, inbox } = context;
    const result = sentResponse.parse(await agentMail(`inboxes/${encodeURIComponent(inbox.providerId!)}/messages/send`, { to: [draft.to], subject: draft.subject, text: draft.body }));
    await ctx.runMutation(internal.mail.finishSend, { ...args, messageId: result.message_id, threadId: result.thread_id });
  } catch { await ctx.runMutation(internal.mail.finishSend, args); }
  return null;
} });

import { env } from "./_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { inboxResponse, sentResponse } from "./mailContracts";

async function agentMail(path: string, body?: unknown) {
  const key = env.AGENTMAIL_API_KEY; if (!key?.trim()) throw new Error("Not configured");
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
  let dispatched=false;
  try {
    const inbox = await ctx.runMutation(internal.mail.claimInbox, { id }); if (!inbox) return null;
    const capacity=Number(env.AGENTMAIL_INBOX_CAPACITY??"3");
    if(!Number.isInteger(capacity)||capacity<1||capacity>100)throw new Error("Invalid inbox capacity");
    const existing=z.object({inboxes:z.array(z.object({inbox_id:z.string()})).max(100),next_page_token:z.string().nullish()}).parse(await agentMail("inboxes?limit="+capacity));
    if(existing.inboxes.length>=capacity||existing.next_page_token){await ctx.runMutation(internal.mail.finishInbox,{id,error:"Customer inbox capacity is full. The Life Maxim operator must add AgentMail capacity before another inbox can be created."});return null;}
    dispatched=true;
    const result = inboxResponse.parse(await agentMail("inboxes", { display_name: "Life Maxim", client_id: id }));
    await ctx.runMutation(internal.mail.finishInbox, { id, providerId: result.inbox_id, address: result.email });
  } catch { await ctx.runMutation(internal.mail.finishInbox, { id, ...(!dispatched?{error:"Inbox capacity could not be checked. Administrator review is required; no creation request was sent."}:{}) }); }
  return null;
} });
export const sendApproved = internalAction({ args: { id: v.id("mailDrafts"), version: v.number() }, returns: v.null(), handler: async (ctx, args): Promise<null> => {
  const context = await ctx.runMutation(internal.mail.claimSend, args);
  if (!context) return null; // Already dispatched, changed, expired or unavailable. Never retry.
  try {
    const { draft, inbox } = context;
    const original=draft.replyToMessageId?await ctx.runQuery(internal.clientMail.context,{id:draft.replyToMessageId}):null;
    if(draft.replyToMessageId&&(!original||original.client.email!==draft.to))throw new Error("Client reply context changed");
    const path=original?`inboxes/${encodeURIComponent(inbox.providerId!)}/messages/${encodeURIComponent(original.message.providerMessageId)}/reply`:`inboxes/${encodeURIComponent(inbox.providerId!)}/messages/send`;
    const result = sentResponse.parse(await agentMail(path, { to: [draft.to], ...(original?{reply_all:false}:{subject:draft.subject}), text: draft.body }));
    await ctx.runMutation(internal.mail.finishSend, { ...args, messageId: result.message_id, threadId: result.thread_id });
  } catch { await ctx.runMutation(internal.mail.finishSend, args); }
  return null;
} });

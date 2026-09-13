import { z } from "zod";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";

const message = z.object({ inbox_id: z.string().max(500), message_id: z.string().min(1).max(1000), thread_id: z.string().min(1).max(1000),
  labels: z.array(z.string()).max(100), from: z.string().max(1000), subject: z.string().optional(), preview: z.string().optional(), text: z.string().optional() });
const page = z.object({ messages: z.array(message).max(10), next_page_token: z.string().max(10000).nullish() });
class PollError extends Error {
  constructor(readonly retryAt?: number, readonly resetCursor = false) { super("Mail polling failed"); }
}
export function retryTime(value: string | null, now: number): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value); const at = Number.isFinite(seconds) ? now + Math.max(0, seconds) * 1000 : Date.parse(value);
  return Number.isFinite(at) && at > now ? at : undefined;
}
async function read(ctx: ActionCtx, path: string) {
  const retryAt: number = await ctx.runMutation(internal.mailPolling.permit, {});
  if (retryAt) throw new PollError(retryAt);
  const key = process.env.AGENTMAIL_API_KEY; if (!key?.trim()) throw new PollError();
  const response = await fetch(`https://api.agentmail.to/v0/${path}`, { headers: { Authorization: `Bearer ${key}` }, redirect: "error", signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    await response.body?.cancel();
    throw new PollError(response.status === 429 || response.status === 503 ? retryTime(response.headers.get("Retry-After"), Date.now()) ?? Date.now() + 300000 : undefined, response.status === 400);
  }
  const reader = response.body?.getReader(); if (!reader) throw new PollError();
  let size = 0; let text = ""; const decoder = new TextDecoder();
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > 2_000_000) { await reader.cancel(); throw new PollError(); }
      text += decoder.decode(value, { stream: true }); }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  return JSON.parse(text) as unknown;
}
function incoming(labels: string[]) {
  return labels.includes("received") && !labels.some(label => ["spam", "blocked", "unauthenticated", "trash"].includes(label));
}
export const poll = internalAction({ args: { id: v.id("mailInboxes"), generation: v.number() }, returns: v.null(), handler: async (ctx, args): Promise<null> => {
  const inbox = await ctx.runMutation(internal.mailPolling.begin, args); if (!inbox) return null;
  try {
    const path = `inboxes/${encodeURIComponent(inbox.providerId!)}/messages`;
    const params = new URLSearchParams({ limit: "10", labels: "received", include_spam: "false", include_blocked: "false", include_unauthenticated: "false", include_trash: "false" });
    if (inbox.pollPageToken) params.set("page_token", inbox.pollPageToken);
    const result = page.parse(await read(ctx, `${path}?${params}`));
    for (const item of result.messages) {
      if (item.inbox_id !== inbox.providerId) throw new PollError();
      if (!incoming(item.labels) || await ctx.runQuery(internal.mailPolling.known, { id: inbox._id, messageId: item.message_id })) continue;
      const full = message.parse(await read(ctx, `${path}/${encodeURIComponent(item.message_id)}`));
      if (full.inbox_id !== inbox.providerId || full.message_id !== item.message_id || full.thread_id !== item.thread_id) throw new PollError();
      if (!incoming(full.labels)) continue;
      await ctx.runMutation(internal.mail.receive, { inboxId: inbox.providerId!, messageId: full.message_id, threadId: full.thread_id,
        sender: full.from, subject: (full.subject ?? "(No subject)").slice(0, 200), body: (full.text ?? full.preview ?? "No plain-text body available.").slice(0, 10000) });
    }
    // Checkpoint only a fully processed page. Replays deduplicate by message ID.
    // Rescan after reaching the end: no timestamp cursor that can lose late mail.
    await ctx.runMutation(internal.mailPolling.finish, { ...args, ok: true, pageToken: result.next_page_token || undefined });
  } catch (error) {
    await ctx.runMutation(internal.mailPolling.finish, { ...args, ok: false,
      ...(error instanceof PollError ? { retryAt: error.retryAt, resetCursor: error.resetCursor } : {}) });
  }
  return null;
} });

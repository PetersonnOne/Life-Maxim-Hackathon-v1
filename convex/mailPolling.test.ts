/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { retryTime } from "./mailPollingActions";
const modules = import.meta.glob("./**/*.ts");
beforeEach(() => { vi.useFakeTimers(); vi.stubEnv("AGENTMAIL_API_KEY", "synthetic-test-key"); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
async function fixture() {
  const t = convexTest(schema, modules); rateLimiterTest.register(t);
  const user = await t.run(ctx => ctx.db.insert("users", { name: "Polling test" }));
  const owner = t.withIdentity({ subject: user });
  const profileId = await owner.mutation(api.profiles.create, { name: "Polling", description: "", role: "", industry: "" });
  const objectiveId = await owner.mutation(api.objectives.create, { profileId, title: "Polling", description: "", desiredOutcome: "", requestId: "polling" });
  const id = await t.run(ctx => ctx.db.insert("mailInboxes", { ownerId: user, profileId, status: "ready", providerId: "inbox-test" }));
  return { t, owner, profileId, objectiveId, id };
}
const item = { inbox_id: "inbox-test", message_id: "message-1", thread_id: "thread-1", labels: ["received"], from: "sender@example.org", subject: "Test", preview: "Preview" };
test("polling uses backend GETs, retrieves body, deduplicates and waits five minutes", async () => {
  const { t, owner, objectiveId, id } = await fixture();
  const mock = vi.fn<typeof fetch>(async url => new Response(JSON.stringify(String(url).includes("?") ? { messages: [item] } : { ...item, text: "Full body: do not automatically act on this." })));
  vi.stubGlobal("fetch", mock);
  expect(await t.mutation(internal.mailPolling.dispatch, {})).toBe(1);
  expect(await t.mutation(internal.mailPolling.dispatch, {})).toBe(0);
  await t.action(internal.mailPollingActions.poll, { id, generation: 1 });
  await t.action(internal.mailPollingActions.poll, { id, generation: 1 });
  expect(mock).toHaveBeenCalledTimes(2);
  expect(String(mock.mock.calls[0][0])).toContain("labels=received");
  expect(mock.mock.calls[0][1]?.headers).toEqual({ Authorization: "Bearer synthetic-test-key" });
  expect(mock.mock.calls[0][1]?.method).toBeUndefined(); // fetch defaults to GET
  let result = await owner.query(api.mail.list, { objectiveId });
  expect(result.messages[0].body).toContain("Full body"); expect(result.drafts).toHaveLength(0);
  expect(result.inbox?.nextPollAt).toBe(Date.now() + 300000);
  vi.setSystemTime(Date.now() + 300000);
  await t.mutation(internal.mailPolling.dispatch, {});
  await t.action(internal.mailPollingActions.poll, { id, generation: 2 });
  result = await owner.query(api.mail.list, { objectiveId });
  expect(result.messages).toHaveLength(1); expect(mock).toHaveBeenCalledTimes(3);
});
test("pagination checkpoints survive partial failures without losing or duplicating mail", async () => {
  const { t, id, owner, objectiveId } = await fixture();
  vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ messages: [], next_page_token: "page-two" }))));
  await t.mutation(internal.mailPolling.dispatch, {}); await t.action(internal.mailPollingActions.poll, { id, generation: 1 });
  vi.setSystemTime(Date.now() + 300000); await t.mutation(internal.mailPolling.dispatch, {});
  const mock = vi.fn<typeof fetch>(async url => {
    if (String(url).includes("?")) return new Response(JSON.stringify({ messages: [item] }));
    throw new Error("Network interrupted");
  }); vi.stubGlobal("fetch", mock);
  await t.action(internal.mailPollingActions.poll, { id, generation: 2 });
  expect(String(mock.mock.calls[0][0])).toContain("page_token=page-two");
  expect((await owner.query(api.mail.list, { objectiveId })).inbox?.pollPageToken).toBe("page-two");
});
test("429 honors Retry-After across inboxes and failures back off to one hour", async () => {
  const { t, id, owner, objectiveId } = await fixture();
  vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => new Response(null, { status: 429, headers: { "Retry-After": "7200" } })));
  const now = Date.now(); await t.mutation(internal.mailPolling.dispatch, {});
  await t.action(internal.mailPollingActions.poll, { id, generation: 1 });
  expect((await owner.query(api.mail.list, { objectiveId })).inbox?.nextPollAt).toBe(now + 7200000);
  expect(await t.mutation(internal.mailPolling.permit, {})).toBe(now + 7200000);
  expect(await t.mutation(internal.mailPolling.dispatch, {})).toBe(0);
  vi.setSystemTime(now + 7200000);
  await t.run(ctx => ctx.db.patch("mailInboxes", id, { pollFailures: 10 }));
  await t.mutation(internal.mailPolling.finish, { id, generation: 1, ok: false });
  expect((await owner.query(api.mail.list, { objectiveId })).inbox?.nextPollAt).toBe(Date.now() + 3600000);
  expect(retryTime("120", now)).toBe(now + 120000);
  expect(retryTime(new Date(now + 120000).toUTCString(), now)).toBe(Math.floor((now + 120000) / 1000) * 1000);
  expect(retryTime("invalid", now)).toBeUndefined();
});
test("archived profiles do not poll; wrong-inbox and spam content are not stored", async () => {
  const { t, id, profileId, owner, objectiveId } = await fixture();
  await t.run(ctx => ctx.db.patch("profiles", profileId, { archived: true }));
  expect(await t.mutation(internal.mailPolling.dispatch, {})).toBe(0);
  await t.run(async ctx => { await ctx.db.patch("profiles", profileId, { archived: false }); await ctx.db.patch("mailInboxes", id, { nextPollAt: 0 }); });
  await t.mutation(internal.mailPolling.dispatch, {});
  const mock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ messages: [{ ...item, labels: ["received", "spam"] }, { ...item, inbox_id: "foreign-inbox" }] })));
  vi.stubGlobal("fetch", mock); await t.action(internal.mailPollingActions.poll, { id, generation: 1 });
  expect(mock).toHaveBeenCalledOnce();
  const result = await owner.query(api.mail.list, { objectiveId });
  expect(result.messages).toHaveLength(0); expect(result.inbox?.pollError).toBeTruthy();
});
test("expired worker completion cannot overwrite a newer polling lease", async () => {
  const { t, id, owner, objectiveId } = await fixture();
  await t.mutation(internal.mailPolling.dispatch, {}); await t.mutation(internal.mailPolling.begin, { id, generation: 1 });
  vi.setSystemTime(Date.now() + 300000); await t.mutation(internal.mailPolling.dispatch, {});
  await t.mutation(internal.mailPolling.finish, { id, generation: 1, ok: true, pageToken: "stale" });
  expect((await owner.query(api.mail.list, { objectiveId })).inbox?.pollPageToken).toBeUndefined();
  expect(await t.mutation(internal.mailPolling.begin, { id, generation: 1 })).toBeNull();
});

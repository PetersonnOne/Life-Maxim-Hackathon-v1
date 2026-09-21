/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import workflowTest from "@convex-dev/workflow/test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
const modules = import.meta.glob("./**/*.ts");
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-20T12:00:00Z")); vi.stubEnv("OPENAI_API_KEY", "test-only"); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
async function fixture() {
  const t = convexTest(schema, modules); rateLimiterTest.register(t); workflowTest.register(t);
  const data = await t.run(async ctx => {
    const ownerId = await ctx.db.insert("users", { name: "Owner" });
    const otherId = await ctx.db.insert("users", { name: "Other" });
    const profileId = await ctx.db.insert("profiles", { ownerId, name: "Work", normalizedName: "work", description: "", role: "", industry: "", archived: false, updatedAt: Date.now() });
    const objectiveId = await ctx.db.insert("objectives", { ownerId, profileId, title: "Launch", description: "", desiredOutcome: "", status: "active", requestId: "fixture", updatedAt: Date.now() });
    const guidanceId = await ctx.db.insert("aiGuidance", { ownerId, profileId, objectiveId, requestId: "guidance", status: "ready", question: "My selected question", threadId: "fixture", model: "test", memoryIds: [], updatedAt: Date.now(), result: { understanding: "Chosen guidance", response: "Start small and review outcomes.", assumptions: ["Check demand"], questions: [], nextSteps: ["Talk to customers"] } });
    return { ownerId, otherId, profileId, objectiveId, guidanceId };
  });
  return { t, ...data, owner: t.withIdentity({ subject: data.ownerId }), other: t.withIdentity({ subject: data.otherId }) };
}
test("transformation requests, files, listing and deletion are isolated by owner", async () => {
  const { t, owner, other, guidanceId } = await fixture();
  const args = { guidanceId, kind: "article" as const, custom: "", requestId: "one" };
  await expect(other.mutation(api.transformations.request, args)).rejects.toThrow();
  await expect(t.mutation(api.transformations.request, args)).rejects.toThrow();
  const id = await owner.mutation(api.transformations.request, args);
  expect(await owner.mutation(api.transformations.request, args)).toBe(id);
  await expect(owner.mutation(api.transformations.request, { ...args, kind: "business" })).rejects.toThrow("identifier");
  await expect(other.query(api.transformations.list, { guidanceId, paginationOpts: { cursor: null, numItems: 5 } })).rejects.toThrow();
  await expect(other.query(api.transformations.files, { id })).rejects.toThrow();
  await expect(other.mutation(api.transformations.remove, { id })).rejects.toThrow();
  await expect(owner.mutation(api.transformations.remove, { id })).rejects.toThrow("Wait");
});
test("free media limits are independent, persist after deletion and reset at UTC midnight", async () => {
  const { t, owner, guidanceId } = await fixture();
  const request = (kind: "mp3" | "infographic", requestId: string) => owner.mutation(api.transformations.request, { guidanceId, kind, custom: "", requestId });
  const audio = await request("mp3", "audio");
  await t.mutation(internal.transformations.fail, { id: audio, error: "fixture" });
  await owner.mutation(api.transformations.remove, { id: audio });
  await expect(request("mp3", "audio2")).rejects.toThrow("Daily MP3");
  const image = await request("infographic", "image");
  await t.mutation(internal.transformations.fail, { id: image, error: "fixture" });
  await expect(request("infographic", "image2")).rejects.toThrow("Daily infographic");
  vi.setSystemTime(new Date("2026-09-21T00:00:01Z"));
  expect(await request("mp3", "tomorrow")).toBeTruthy();
});
test("claims prevent duplicate paid calls and archival prevents generation", async () => {
  const { t, owner, guidanceId, profileId } = await fixture();
  const id = await owner.mutation(api.transformations.request, { guidanceId, kind: "article", custom: "", requestId: "one" });
  expect(await t.mutation(internal.transformations.claim, { id, render: false })).not.toBeNull();
  expect(await t.mutation(internal.transformations.claim, { id, render: false })).toBeNull();
  await t.mutation(internal.transformations.prepared, { id, title: "Title", text: "Safe text", model: "test" });
  expect(await t.mutation(internal.transformations.claim, { id, render: true })).not.toBeNull();
  expect(await t.mutation(internal.transformations.claim, { id, render: true })).toBeNull();
  await t.mutation(internal.transformations.fail, { id, error: "fixture" });
  await t.run(ctx => ctx.db.patch("profiles", profileId, { archived: true }));
  await expect(owner.mutation(api.transformations.request, { guidanceId, kind: "article", custom: "", requestId: "two" })).rejects.toThrow("active profile");
});
test("persisted exports survive reopening and deletion removes blobs but not original guidance", async () => {
  const { t, owner, guidanceId } = await fixture();
  const id = await owner.mutation(api.transformations.request, { guidanceId, kind: "article", custom: "", requestId: "one" });
  await t.mutation(internal.transformations.claim, { id, render: false });
  await t.mutation(internal.transformations.prepared, { id, title: "Title", text: "Saved content", model: "test" });
  await t.mutation(internal.transformations.claim, { id, render: true });
  const files = await t.run(async ctx => ({ textStorageId: await ctx.storage.store(new Blob(["text"])), documentStorageId: await ctx.storage.store(new Blob(["document"])) }));
  await t.mutation(internal.transformations.finish, { id, ...files });
  const page = await owner.query(api.transformations.list, { guidanceId, paginationOpts: { cursor: null, numItems: 5 } });
  expect(page.page[0].text).toBe("Saved content"); expect(page.page[0].status).toBe("ready");
  expect((await owner.query(api.transformations.files, { id })).text).toBeTruthy();
  await owner.mutation(api.transformations.remove, { id });
  expect(await t.run(ctx => ctx.storage.get(files.textStorageId))).toBeNull();
  expect(await t.run(ctx => ctx.storage.get(files.documentStorageId))).toBeNull();
  expect(await t.run(ctx => ctx.db.get("aiGuidance", guidanceId))).not.toBeNull();
});
test("guidance discussions use full selected card only and cannot silently create another brief", async () => {
  const { t, owner, other, guidanceId, ownerId, profileId, objectiveId } = await fixture();
  await t.run(ctx => ctx.db.insert("aiGuidance", { ownerId, profileId, objectiveId, status: "ready", question: "Another card", requestId: "other", threadId: "x", model: "x", memoryIds: [], updatedAt: Date.now(), result: { understanding: "SECRET OTHER CARD", response: "Do not include", assumptions: [], questions: [], nextSteps: [] } }));
  const id = await owner.mutation(api.interactive.discussGuidance, { guidanceId });
  expect(await owner.mutation(api.interactive.discussGuidance, { guidanceId })).toBe(id);
  await expect(other.mutation(api.interactive.discussGuidance, { guidanceId })).rejects.toThrow();
  const context = await owner.query(internal.interactive.context, { id });
  expect(context).toContain("Chosen guidance"); expect(context).toContain("Talk to customers"); expect(context).not.toContain("SECRET OTHER CARD");
  await expect(owner.mutation(api.interactive.confirm, { id, brief: { title: "No", goal: "", context: "", questions: "" } })).rejects.toThrow("existing guidance");
});
test("text rendering stores real Word and text exports without an OpenAI call", async () => {
  const { t, owner, guidanceId } = await fixture();
  const id = await owner.mutation(api.transformations.request, { guidanceId, kind: "business", custom: "", requestId: "doc" });
  await t.mutation(internal.transformations.claim, { id, render: false });
  await t.mutation(internal.transformations.prepared, { id, title: "Work Notes", text: "First priority\nReview assumptions", model: "test" });
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  // DOCX's ZIP encoder needs real asynchronous timers; no scheduled workflow is driven here.
  vi.useRealTimers();
  await t.action(internal.transformationActions.render, { id });
  const row = await t.run(ctx => ctx.db.get("guidanceTransformations", id));
  expect(row?.status).toBe("ready"); expect(fetcher).not.toHaveBeenCalled();
  const signature = await t.run(async ctx => {
    const blob = await ctx.storage.get(row!.documentStorageId!);
    return Array.from(new Uint8Array(await blob!.arrayBuffer()).slice(0,2));
  });
  expect(signature).toEqual([80,75]);
});
test("media uses the requested OpenAI model and redacts quota errors without retry", async () => {
  const { t, owner, guidanceId } = await fixture();
  const id = await owner.mutation(api.transformations.request, { guidanceId, kind: "mp3", custom: "", requestId: "mp3" });
  await t.mutation(internal.transformations.claim, { id, render: false });
  await t.mutation(internal.transformations.prepared, { id, title: "Brief", text: "Start with one useful step.", model: "test" });
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "insufficient_quota", message: "SECRET" } }), { status: 429 })); vi.stubGlobal("fetch", fetcher);
  await t.action(internal.transformationActions.render, { id });
  await t.action(internal.transformationActions.render, { id });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toBe("https://api.openai.com/v1/audio/speech");
  expect(JSON.parse(fetcher.mock.calls[0][1].body).model).toBe("gpt-4o-mini-tts");
  const row = await t.run(ctx => ctx.db.get("guidanceTransformations", id));
  expect(row?.error).toContain("credits"); expect(row?.error).not.toContain("SECRET"); expect(row?.status).toBe("failed");
});
test("audio duration verification never accepts over two minutes or unknown duration", async () => {
  const { checkedDuration, narrationFits } = await import("./transformationActions");
  expect(checkedDuration(119.9)).toBe(119.9);
  expect(() => checkedDuration(120.01)).toThrow(); expect(() => checkedDuration(undefined)).toThrow();
  expect(narrationFits("word ".repeat(181))).toBe(false);
});

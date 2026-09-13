/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import agentTest from "@convex-dev/agent/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { guidanceSchema, suggestionSchema } from "./aiContracts";

const modules = import.meta.glob("./**/*.ts");
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
async function fixture() {
  const t = convexTest(schema, modules);
  agentTest.register(t); rateLimiterTest.register(t);
  const [one, two] = await t.run(async ctx => Promise.all([ctx.db.insert("users", { name: "One" }), ctx.db.insert("users", { name: "Two" })]));
  const owner = t.withIdentity({ subject: one }); const other = t.withIdentity({ subject: two });
  const profile = await owner.mutation(api.profiles.create, { name: "Learning", description: "Languages", role: "", industry: "" });
  const unrelated = await owner.mutation(api.profiles.create, { name: "Unrelated", description: "Separate context", role: "", industry: "" });
  await owner.mutation(api.workspace.remember, { profileId: profile, content: "Short sessions", kind: "preference" });
  await owner.mutation(api.workspace.remember, { profileId: unrelated, content: "Do not include this", kind: "context" });
  const objectiveId = await owner.mutation(api.objectives.create, { profileId: profile, title: "Study", description: "Learn a language", desiredOutcome: "Conversation", requestId: "entry" });
  return { t, owner, other, objectiveId, profile };
}

test("AI requests and history reject anonymous and foreign accounts", async () => {
  const { t, other, objectiveId } = await fixture();
  const args = { objectiveId, requestId: "ai", question: "" };
  await expect(t.mutation(api.intelligence.requestGuidance, args)).rejects.toThrow();
  await expect(other.mutation(api.intelligence.requestGuidance, args)).rejects.toThrow();
  await expect(other.query(api.intelligence.list, { objectiveId })).rejects.toThrow();
});

test("AI context includes only selected-profile memories and requests are idempotent", async () => {
  const { t, owner, objectiveId, profile } = await fixture();
  const args = { objectiveId, requestId: "ai", question: "" };
  const id = await owner.mutation(api.intelligence.requestGuidance, args);
  expect(await owner.mutation(api.intelligence.requestGuidance, args)).toBe(id);
  const context = await t.query(internal.intelligence.context, { id });
  expect(context?.profile._id).toBe(profile);
  expect(context?.memories.map(m => m.content)).toEqual(["Short sessions"]);
  await expect(owner.mutation(api.intelligence.requestGuidance, { ...args, question: "changed" })).rejects.toThrow("already used");
  await expect(owner.mutation(api.intelligence.requestGuidance, { ...args, requestId: "second" })).rejects.toThrow("already being prepared");
});

test("timeout is recoverable and a late result cannot replace failure", async () => {
  const { t, owner, objectiveId } = await fixture();
  const id = await owner.mutation(api.intelligence.requestGuidance, { objectiveId, requestId: "ai", question: "" });
  await t.mutation(internal.intelligence.expire, { id });
  await t.mutation(internal.intelligence.finish, { id, memoryIds: [], result: { understanding: "Late", response: "Late", assumptions: [], questions: [], nextSteps: [] } });
  expect((await owner.query(api.intelligence.list, { objectiveId }))[0].status).toBe("failed");
  expect(await owner.mutation(api.intelligence.requestGuidance, { objectiveId, requestId: "retry", question: "" })).not.toBe(id);
});

test("profile suggestions validate input before model calls and cannot create profiles", async () => {
  const { t, owner } = await fixture();
  await expect(t.action(api.intelligenceActions.suggestProfile, { draft: "A valid draft about study" })).rejects.toThrow("sign in");
  await expect(owner.action(api.intelligenceActions.suggestProfile, { draft: "short" })).rejects.toThrow("10–4000");
  expect(await owner.query(api.profiles.list, {})).toHaveLength(2);
});

test("AI output contracts bound text, confidence and suggested steps", () => {
  expect(suggestionSchema.safeParse({ existingProfileId: null, name: "Study", description: "", role: "", industry: "", rationale: "Explicit goal", confidence: "certain" }).success).toBe(false);
  expect(guidanceSchema.safeParse({ understanding: "Study", response: "Start small", assumptions: [], questions: [], nextSteps: Array(6).fill("Do something") }).success).toBe(false);
});

test("AI quota rejects excess requests without inserting another run", async () => {
  const { t, owner, objectiveId } = await fixture();
  for (let index = 0; index < 3; index++) {
    const id = await owner.mutation(api.intelligence.requestGuidance, { objectiveId, requestId: `quota-${index}`, question: "" });
    await t.mutation(internal.intelligence.expire, { id });
  }
  await expect(owner.mutation(api.intelligence.requestGuidance, { objectiveId, requestId: "over-quota", question: "" })).rejects.toThrow();
  expect(await owner.query(api.intelligence.list, { objectiveId })).toHaveLength(3);
});

test("archived profiles cannot provide context or start new AI requests", async () => {
  const { t, owner, objectiveId, profile } = await fixture();
  const id = await owner.mutation(api.intelligence.requestGuidance, { objectiveId, requestId: "before-archive", question: "" });
  await t.run(async ctx => { await ctx.db.patch("profiles", profile, { archived: true }); });
  expect(await t.query(internal.intelligence.context, { id })).toBeNull();
  await expect(owner.mutation(api.intelligence.requestGuidance, { objectiveId, requestId: "after-archive", question: "" })).rejects.toThrow("active profile");
});

test("profile suggestion uses the OpenRouter Luna wire contract without saving a profile", async () => {
  const { owner } = await fixture();
  vi.stubEnv("OPENROUTER_API_KEY", "unit-test-placeholder");
  const result = { existingProfileId: null, name: "Learning", description: "Language study", role: "", industry: "", rationale: "An explicit learning goal", confidence: "medium" };
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
    id: "unit-test", object: "chat.completion", created: 1, model: "openai/gpt-5.6-luna",
    choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(result) }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  }), { headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  expect(await owner.action(api.intelligenceActions.suggestProfile, { draft: "I want to study another language" })).toEqual(result);
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url, options] = fetchMock.mock.calls[0];
  expect(String(url)).toBe("https://openrouter.ai/api/v1/chat/completions");
  const body = JSON.parse(String((options as RequestInit).body));
  expect(body.model).toBe("openai/gpt-5.6-luna");
  expect(body.provider).toEqual({ require_parameters: true, allow_fallbacks: false });
  expect(body.response_format.type).toBe("json_schema");
  expect(await owner.query(api.profiles.list, {})).toHaveLength(2);
});

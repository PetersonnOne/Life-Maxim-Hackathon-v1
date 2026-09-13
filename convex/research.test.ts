/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { safeSourceUrl, evidenceListSchema } from "./researchContracts";
const modules = import.meta.glob("./**/*.ts");
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
async function fixture() {
  const t = convexTest(schema, modules); rateLimiterTest.register(t);
  const user = await t.run(ctx => ctx.db.insert("users", { name: "Research tester" }));
  const otherUser = await t.run(ctx => ctx.db.insert("users", { name: "Other tester" }));
  const owner = t.withIdentity({ subject: user }); const other = t.withIdentity({ subject: otherUser });
  const profileId = await owner.mutation(api.profiles.create, { name: "Learning", description: "", role: "", industry: "" });
  const objectiveId = await owner.mutation(api.objectives.create, { profileId, title: "Learn", description: "", desiredOutcome: "", requestId: "research-entry" });
  const args = { objectiveId, query: "language learning evidence", country: "DE", requestId: "research" };
  return { t, owner, other, args, profileId };
}
test("research requires ownership and explicit search country", async () => {
  const { t, owner, other, args } = await fixture();
  await expect(t.mutation(api.research.request, args)).rejects.toThrow();
  await expect(other.mutation(api.research.request, args)).rejects.toThrow();
  await expect(other.query(api.research.list, { objectiveId: args.objectiveId })).rejects.toThrow();
  await expect(owner.mutation(api.research.request, { ...args, country: "" })).rejects.toThrow();
});
test("research is idempotent and completion inserts sources only once", async () => {
  const { t, owner, args } = await fixture();
  const id = await owner.mutation(api.research.request, args);
  expect(await owner.mutation(api.research.request, args)).toBe(id);
  await expect(owner.mutation(api.research.request, { ...args, query: "changed" })).rejects.toThrow("already used");
  const sources = [{ url: "https://example.org/study", title: "Study", excerpt: "Source text" }];
  await t.mutation(internal.research.finish, { id, sources });
  await t.mutation(internal.research.finish, { id, sources });
  const result = await owner.query(api.research.list, { objectiveId: args.objectiveId });
  expect(result.sources).toHaveLength(1); expect(result.runs[0].status).toBe("ready");
});
test("timed-out research ignores late sources and can be retried", async () => {
  const { t, owner, args } = await fixture();
  const id = await owner.mutation(api.research.request, args);
  await t.mutation(internal.research.expire, { id });
  await t.mutation(internal.research.finish, { id, sources: [] });
  expect((await owner.query(api.research.list, { objectiveId: args.objectiveId })).runs[0].status).toBe("failed");
  await owner.mutation(api.research.request, { ...args, requestId: "retry" });
});
test("profile archive during research prevents source persistence", async () => {
  const { t, owner, args, profileId } = await fixture();
  const id = await owner.mutation(api.research.request, args);
  await t.run(ctx => ctx.db.patch("profiles", profileId, { archived: true }));
  expect(await t.query(internal.research.context, { id })).toBeNull();
  await t.mutation(internal.research.finish, { id, sources: [] });
  expect((await owner.query(api.research.list, { objectiveId: args.objectiveId })).runs[0].status).toBe("failed");
});
test("source contracts reject executable URLs and unbounded content", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,test", "http://localhost/test", "http://127.0.0.1/test", "https://user:secret@example.org", "http://[::1]/"]) expect(safeSourceUrl(url)).toBe(false);
  expect(safeSourceUrl("https://example.org/study")).toBe(true);
  expect(evidenceListSchema.safeParse([{ url: "https://example.org", title: "", excerpt: "x".repeat(6001) }]).success).toBe(false);
});

test("Firecrawl wire request shares only approved query and country and stores bounded sources", async () => {
  const { t, owner, args } = await fixture();
  const id = await owner.mutation(api.research.request, args);
  vi.stubEnv("FIRECRAWL_API_KEY", "unit-test-placeholder");
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
    success: true, data: { web: [
      { url: "https://example.org/study", title: "Study", markdown: "x".repeat(7000) },
      { url: "javascript:alert(1)", title: "Unsafe", description: "Ignored" },
    ] },
  }), { headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  await t.action(internal.researchActions.search, { id });
  const [url, options] = fetchMock.mock.calls[0];
  expect(String(url)).toBe("https://api.firecrawl.dev/v2/search");
  const body = JSON.parse(String((options as RequestInit).body));
  expect(body.query).toBe(args.query); expect(body.country).toBe(args.country);
  expect(body.limit).toBe(3); expect(body.profile).toBeUndefined(); expect(body.memories).toBeUndefined();
  const result = await owner.query(api.research.list, { objectiveId: args.objectiveId });
  expect(result.runs[0].status).toBe("ready");
  expect(result.sources).toHaveLength(1); expect(result.sources[0].excerpt).toHaveLength(6000);
});

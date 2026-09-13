/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import agentTest from "@convex-dev/agent/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { stepsSchema } from "./planningContracts";
const modules = import.meta.glob("./**/*.ts");
beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
const result = { summary: "Start with a small routine", assumptions: [], uncertainties: ["Language level unknown"], options: [{ name: "Daily practice", benefits: "Consistency", tradeoffs: "Requires time" }], steps: [{ title: "Choose material", dependsOn: [] as number[] }, { title: "Practice", dependsOn: [0] }], sourceIds: [] as string[] };
async function fixture() {
  const t = convexTest(schema, modules); agentTest.register(t); rateLimiterTest.register(t);
  const user = await t.run(ctx => ctx.db.insert("users", { name: "Planner test" }));
  const otherId = await t.run(ctx => ctx.db.insert("users", { name: "Other test" }));
  const owner = t.withIdentity({ subject: user }); const other = t.withIdentity({ subject: otherId });
  const profileId = await owner.mutation(api.profiles.create, { name: "Learning", description: "", role: "", industry: "" });
  const objectiveId = await owner.mutation(api.objectives.create, { profileId, title: "Learn", description: "", desiredOutcome: "", requestId: "planning-entry" });
  const args = { objectiveId, requestId: "planning", scenario: "Only fifteen minutes available" };
  return { t, owner, other, args, profileId };
}
test("planning requires owner identity for requests, history and acceptance", async () => {
  const { t, owner, other, args } = await fixture();
  await expect(t.mutation(api.planning.request, args)).rejects.toThrow();
  await expect(other.mutation(api.planning.request, args)).rejects.toThrow();
  const id = await owner.mutation(api.planning.request, args);
  await t.mutation(internal.planning.finish, { id, result });
  await expect(other.query(api.planning.list, { objectiveId: args.objectiveId })).rejects.toThrow();
  await expect(other.mutation(api.planning.accept, { id, steps: result.steps })).rejects.toThrow();
  await expect(t.mutation(api.planning.accept, { id, steps: result.steps })).rejects.toThrow();
});
test("proposal creation is task-free and acceptance is editable, atomic and idempotent", async () => {
  const { t, owner, args } = await fixture();
  const id = await owner.mutation(api.planning.request, args);
  expect(await owner.mutation(api.planning.request, args)).toBe(id);
  await expect(owner.mutation(api.planning.request, { ...args, scenario: "Changed" })).rejects.toThrow("already used");
  await t.mutation(internal.planning.finish, { id, result });
  expect(await owner.query(api.workspace.tasks, { objectiveId: args.objectiveId })).toHaveLength(0);
  const steps = [{ title: "User edited material choice", dependsOn: [] }, result.steps[1]];
  const ids = await owner.mutation(api.planning.accept, { id, steps });
  expect(await owner.mutation(api.planning.accept, { id, steps })).toEqual(ids);
  const tasks = await owner.query(api.workspace.tasks, { objectiveId: args.objectiveId });
  expect(tasks).toHaveLength(2); expect(tasks[0].title).toBe(steps[0].title); expect(tasks[1].dependsOn).toEqual([ids[0]]);
});
test("invalid dependencies and task-limit overflow cannot partially create tasks", async () => {
  const { t, owner, args, profileId } = await fixture();
  const id = await owner.mutation(api.planning.request, args); await t.mutation(internal.planning.finish, { id, result });
  await expect(owner.mutation(api.planning.accept, { id, steps: [{ title: "Cycle", dependsOn: [0] }] })).rejects.toThrow();
  await t.run(async ctx => {
    const objective = await ctx.db.get("objectives", args.objectiveId);
    for (let index = 0; index < 99; index++) await ctx.db.insert("tasks", { ownerId: objective!.ownerId, profileId, objectiveId: args.objectiveId, title: `Existing ${index}`, done: false, dependsOn: [], updatedAt: 1 });
  });
  await expect(owner.mutation(api.planning.accept, { id, steps: result.steps })).rejects.toThrow("too many");
  expect(await owner.query(api.workspace.tasks, { objectiveId: args.objectiveId })).toHaveLength(99);
});
test("expired proposals cannot become ready or be accepted", async () => {
  const { t, owner, args } = await fixture(); const id = await owner.mutation(api.planning.request, args);
  await t.mutation(internal.planning.expire, { id }); await t.mutation(internal.planning.finish, { id, result });
  await expect(owner.mutation(api.planning.accept, { id, steps: result.steps })).rejects.toThrow("not ready");
});
test("unknown evidence references are rejected", async () => {
  const { t, owner, args } = await fixture(); const id = await owner.mutation(api.planning.request, args);
  await expect(t.mutation(internal.planning.finish, { id, result: { ...result, sourceIds: ["invented-source"] } })).rejects.toThrow("Invalid source");
});
test("plan contracts reject duplicate, forward and fractional dependencies", () => {
  for (const dependencies of [[1], [0, 0], [0.5]]) expect(stepsSchema.safeParse([{ title: "First", dependsOn: [] }, { title: "Second", dependsOn: dependencies }]).success).toBe(false);
});

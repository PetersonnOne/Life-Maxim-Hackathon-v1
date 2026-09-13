/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");
async function fixture() {
  const t = convexTest(schema, modules);
  const [alice, bob] = await t.run(async ctx => Promise.all([
    ctx.db.insert("users", { name: "Alice" }), ctx.db.insert("users", { name: "Bob" }),
  ]));
  const a = t.withIdentity({ subject: alice });
  const b = t.withIdentity({ subject: bob });
  const profileId = await a.mutation(api.profiles.create, { name: "Personal", description: "", role: "", industry: "" });
  const args = { profileId, title: "Learn a language", description: "Practice regularly", desiredOutcome: "Hold a conversation", requestId: "test-entry" };
  const objectiveId = await a.mutation(api.objectives.create, args);
  return { t, a, b, profileId, objectiveId, args };
}

test("anonymous callers cannot read profiles or objectives", async () => {
  const { t } = await fixture();
  await expect(t.query(api.profiles.list, {})).rejects.toThrow();
  await expect(t.query(api.objectives.list, {})).rejects.toThrow();
});

test("all WebMCP backing reads isolate accounts", async () => {
  const { a, b, profileId, objectiveId } = await fixture();
  await a.mutation(api.workspace.remember, { profileId, content: "Private preference", kind: "preference" });
  expect(await b.query(api.profiles.list, {})).toEqual([]);
  await expect(b.query(api.objectives.list, { profileId })).rejects.toThrow();
  expect(await b.query(api.objectives.get, { id: objectiveId })).toBeNull();
  await expect(b.query(api.workspace.memories, { profileId })).rejects.toThrow();
  await expect(b.query(api.workspace.tasks, { objectiveId })).rejects.toThrow();
  await expect(b.query(api.workspace.activity, { objectiveId })).rejects.toThrow();
});

test("objective retries are idempotent and foreign writes are rejected", async () => {
  const { a, b, args, objectiveId } = await fixture();
  expect(await a.mutation(api.objectives.create, args)).toBe(objectiveId);
  expect(await a.query(api.objectives.list, {})).toHaveLength(1);
  await expect(b.mutation(api.objectives.create, args)).rejects.toThrow();
  await expect(b.mutation(api.objectives.setStatus, { id: objectiveId, status: "completed" })).rejects.toThrow();
});

test("task completion enforces dependencies and ownership", async () => {
  const { a, b, objectiveId } = await fixture();
  const first = await a.mutation(api.workspace.addTask, { objectiveId, title: "Choose a course", dependsOn: [] });
  const second = await a.mutation(api.workspace.addTask, { objectiveId, title: "Start the course", dependsOn: [first] });
  await expect(a.mutation(api.workspace.completeTask, { id: second })).rejects.toThrow("earlier tasks");
  await expect(b.mutation(api.workspace.completeTask, { id: first })).rejects.toThrow();
  await a.mutation(api.workspace.completeTask, { id: first });
  await a.mutation(api.workspace.completeTask, { id: second });
  expect((await a.query(api.workspace.tasks, { objectiveId })).every(task => task.done)).toBe(true);
});

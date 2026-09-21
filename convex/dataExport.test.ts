/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import { exportTables } from "./exportContracts";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");
const paginationOpts = { cursor: null, numItems: 20, maximumRowsRead: 20, maximumBytesRead: 1_000_000 };

test("export is authenticated and excludes all foreign-owner records across its allowlist", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await t.run(ctx => ctx.db.insert("users", { name: "Export owner" }));
  const otherId = await t.run(ctx => ctx.db.insert("users", { name: "Other" }));
  await t.run(async ctx => {
    for (const id of [ownerId, otherId]) {
      const profileId = await ctx.db.insert("profiles", { ownerId: id, name: "Archived", normalizedName: "archived", description: "", role: "", industry: "", archived: true, updatedAt: 1 });
      const objectiveId = await ctx.db.insert("objectives", { ownerId: id, profileId, title: "Entry", description: "", desiredOutcome: "", status: "active", requestId: "export", updatedAt: 1 });
      const base = { ownerId: id, profileId, objectiveId };
      await ctx.db.insert("clients", { ownerId: id, profileId, name: "Client", email: "client@example.com", clientCode: "LM-TEST", active: true, updatedAt: 1 });
      await ctx.db.insert("billingAccounts", { ownerId: id, tier: "free", expiresAt: 0, generation: 0, nextCheckAt: 1, status: "pending", environment: "test" });
      const sessionId = await ctx.db.insert("interactiveSessions", { ...base, profileUpdatedAt: 1, updatedAt: 1 });
      await ctx.db.insert("voiceConnections", { ownerId: id, sessionId, requestId: "export", status: "closed", expiresAt: 1, updatedAt: 1 });
      await ctx.db.insert("memories", { ownerId: id, profileId, content: "Private context", kind: "context", pinned: false, updatedAt: 1 });
      await ctx.db.insert("tasks", { ...base, title: "Task", done: false, dependsOn: [], updatedAt: 1 });
      await ctx.db.insert("activityEvents", { ...base, kind: "test", summary: "Activity" });
      const guidanceId = await ctx.db.insert("aiGuidance", { ...base, requestId: "export", status: "failed", question: "Question", threadId: "thread", model: "test", memoryIds: [], updatedAt: 1 });
      await ctx.db.insert("guidanceTransformations", { ownerId: id, profileId, guidanceId, kind: "article", custom: "", requestId: "export", status: "failed", updatedAt: 1 });
      const runId = await ctx.db.insert("researchRuns", { ...base, requestId: "export", status: "ready", query: "Query", country: "GB", updatedAt: 1 });
      await ctx.db.insert("evidence", { ownerId: id, objectiveId, runId, url: "https://example.com", title: "Source", excerpt: "Text", retrievedAt: 1 });
      await ctx.db.insert("planProposals", { ...base, requestId: "export", status: "pending", scenario: "Scenario", threadId: "thread", model: "test", updatedAt: 1 });
      await ctx.db.insert("mailInboxes", { ownerId: id, profileId, status: "pending" });
      await ctx.db.insert("mailDrafts", { ...base, to: "test@example.com", subject: "Subject", body: "Private draft", version: 1, status: "draft", updatedAt: 1 });
      await ctx.db.insert("mailMessages", { ...base, providerMessageId: "message", threadId: "thread", sender: "test@example.com", subject: "Subject", body: "Private mail" });
    }
  });
  const owner = t.withIdentity({ subject: ownerId });
  for (const table of exportTables) {
    await expect(t.query(api.dataExport.page, { table, paginationOpts })).rejects.toThrow("Sign in");
    const result = await owner.query(api.dataExport.page, { table, paginationOpts });
    expect(result.page).toHaveLength(1);
    expect(result.page[0].ownerId).toBe(ownerId);
  }
  expect(exportTables).not.toContain("users");
  expect(exportTables).not.toContain("mailPollControl");
});

test("export pagination includes every archived record and rejects unbounded reads", async () => {
  const t = convexTest(schema, modules);
  const id = await t.run(ctx => ctx.db.insert("users", { name: "Export" }));
  await t.run(async ctx => {
    for (let i = 0; i < 25; i++) await ctx.db.insert("profiles", { ownerId: id, name: `Profile ${i}`, normalizedName: `profile ${i}`, description: "", role: "", industry: "", archived: true, updatedAt: 1 });
  });
  const owner = t.withIdentity({ subject: id });
  const first = await owner.query(api.dataExport.page, { table: "profiles", paginationOpts });
  expect(first.page).toHaveLength(20); expect(first.isDone).toBe(false);
  const second = await owner.query(api.dataExport.page, { table: "profiles", paginationOpts: { ...paginationOpts, cursor: first.continueCursor } });
  expect(second.page).toHaveLength(5); expect(second.isDone).toBe(true);
  expect(new Set([...first.page, ...second.page].map(row => row._id)).size).toBe(25);
  for (const numItems of [0, 21, 1.5]) await expect(owner.query(api.dataExport.page, { table: "profiles", paginationOpts: { ...paginationOpts, numItems } })).rejects.toThrow("read limits");
  await expect(owner.query(api.dataExport.page, { table: "profiles", paginationOpts: { cursor: null, numItems: 20 } })).rejects.toThrow("read limits");
});

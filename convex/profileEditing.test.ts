/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { api, internal } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");
async function fixture() {
  const t = convexTest(schema, modules); rateLimiterTest.register(t);
  const user = await t.run(ctx => ctx.db.insert("users", { name: "Editing owner" }));
  const otherUser = await t.run(ctx => ctx.db.insert("users", { name: "Other owner" }));
  const owner = t.withIdentity({ subject: user }); const other = t.withIdentity({ subject: otherUser });
  const fields = { name: "Personal", description: "Original", role: "", industry: "" };
  const id = await owner.mutation(api.profiles.create, fields);
  const objectiveId = await owner.mutation(api.objectives.create, { profileId: id, title: "Original entry", description: "", desiredOutcome: "", deadline: "2026-10-01", requestId: "editing-test" });
  const profile = (await owner.query(api.profiles.get, { id }))!;
  const objective = (await owner.query(api.objectives.get, { id: objectiveId }))!;
  return { t, owner, other, user, id, objectiveId, profile, objective, fields };
}
test("profile edit and archive enforce ownership, confirmation, names and stale revisions", async () => {
  const { t, owner, other, id, profile, fields } = await fixture();
  const edit = { ...fields, id, expectedUpdatedAt: profile.updatedAt, name: "Updated" };
  await expect(other.mutation(api.profiles.update, edit)).rejects.toThrow();
  await expect(t.mutation(api.profiles.update, edit)).rejects.toThrow();
  expect(await other.query(api.profiles.get, { id })).toBeNull();
  await expect(owner.mutation(api.profiles.update, { ...edit, name: " " })).rejects.toThrow();
  await owner.mutation(api.profiles.create, { ...fields, name: "Reserved" });
  await expect(owner.mutation(api.profiles.update, { ...edit, name: "RESERVED" })).rejects.toThrow();
  await owner.mutation(api.profiles.update, edit);
  await expect(owner.mutation(api.profiles.update, edit)).rejects.toThrow("changed");
  const current = (await owner.query(api.profiles.get, { id }))!;
  expect(current.name).toBe("Updated"); expect(current.updatedAt).toBeGreaterThan(profile.updatedAt);
  await expect(other.mutation(api.profiles.setArchived, { id, expectedUpdatedAt: current.updatedAt, archived: true, confirmation: current.name })).rejects.toThrow();
  await expect(owner.mutation(api.profiles.setArchived, { id, expectedUpdatedAt: current.updatedAt, archived: true, confirmation: "wrong" })).rejects.toThrow("Type");
});
test("archive and restore retain entries and memories, hide selection and reject silent reuse", async () => {
  const { owner, other, id, profile, fields, objectiveId } = await fixture();
  await owner.mutation(api.workspace.remember, { profileId: id, content: "Retain this", kind: "context" });
  await owner.mutation(api.profiles.setArchived, { id, expectedUpdatedAt: profile.updatedAt, archived: true, confirmation: profile.name });
  expect(await owner.query(api.profiles.list, {})).toHaveLength(0);
  expect((await owner.query(api.profiles.archived, { paginationOpts: { cursor: null, numItems: 20 } })).page).toHaveLength(1);
  expect((await other.query(api.profiles.archived, { paginationOpts: { cursor: null, numItems: 20 } })).page).toHaveLength(0);
  expect(await owner.query(api.objectives.get, { id: objectiveId })).not.toBeNull();
  expect(await owner.query(api.workspace.memories, { profileId: id })).toHaveLength(1);
  await expect(owner.mutation(api.profiles.create, fields)).rejects.toThrow("Restore");
  await expect(owner.mutation(api.objectives.create, { profileId: id, title: "Blocked", description: "", desiredOutcome: "", requestId: "blocked" })).rejects.toThrow("active");
  const archived = (await owner.query(api.profiles.get, { id }))!;
  await owner.mutation(api.profiles.setArchived, { id, expectedUpdatedAt: archived.updatedAt, archived: false });
  expect(await owner.query(api.profiles.list, {})).toHaveLength(1);
});
test("entry edits retain profile/task context, clear deadlines and reject stale or foreign edits", async () => {
  const { t, owner, other, id, objectiveId, objective } = await fixture();
  await owner.mutation(api.workspace.addTask, { objectiveId, title: "Keep task", dependsOn: [] });
  const edit = { id: objectiveId, expectedUpdatedAt: objective.updatedAt, title: "New title", description: "New description", desiredOutcome: "New outcome" };
  await expect(other.mutation(api.objectives.update, edit)).rejects.toThrow();
  await expect(t.mutation(api.objectives.update, edit)).rejects.toThrow();
  await expect(owner.mutation(api.objectives.update, { ...edit, deadline: "2026-02-30" })).rejects.toThrow("deadline");
  await owner.mutation(api.objectives.update, edit);
  const result = (await owner.query(api.objectives.get, { id: objectiveId }))!;
  expect(result.profileId).toBe(id); expect(result.title).toBe("New title"); expect(result.deadline).toBeUndefined();
  expect(await owner.query(api.workspace.tasks, { objectiveId })).toHaveLength(1);
  await expect(owner.mutation(api.objectives.update, edit)).rejects.toThrow("changed");
});
test("archiving and restoring invalidate prior email approvals", async () => {
  const { t, owner, id, user, objectiveId, profile } = await fixture();
  await t.run(ctx => ctx.db.insert("mailInboxes", { ownerId: user, profileId: id, status: "ready", providerId: "synthetic-inbox" }));
  const draft = await owner.mutation(api.mail.saveDraft, { objectiveId, to: "test@example.org", subject: "Test", body: "Synthetic" });
  await owner.mutation(api.mail.approve, { id: draft, version: 1 });
  await owner.mutation(api.profiles.setArchived, { id, expectedUpdatedAt: profile.updatedAt, archived: true, confirmation: profile.name });
  await expect(owner.mutation(api.mail.approve, { id: draft, version: 1 })).rejects.toThrow("active");
  const archived = (await owner.query(api.profiles.get, { id }))!;
  await owner.mutation(api.profiles.setArchived, { id, expectedUpdatedAt: archived.updatedAt, archived: false });
  await expect(owner.mutation(api.mail.send, { id: draft, version: 1 })).rejects.toThrow("Profile changed");
  await owner.mutation(api.mail.approve, { id: draft, version: 1 });
  await t.run(ctx => ctx.db.patch("mailDrafts", draft, { status: "sending" }));
  const current = (await owner.query(api.profiles.get, { id }))!;
  await owner.mutation(api.profiles.update, { id, expectedUpdatedAt: current.updatedAt, name: current.name, description: "Changed", role: "", industry: "" });
  expect(await t.mutation(internal.mail.claimSend, { id: draft, version: 1 })).toBeNull();
});

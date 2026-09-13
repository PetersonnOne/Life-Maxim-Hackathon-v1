import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { guidance } from "./aiContracts";
import { proposal } from "./planningContracts";
import { brief, voiceStatus } from "./liveContracts";

export const objectiveStatus = v.union(v.literal("active"),v.literal("paused"),v.literal("completed"),v.literal("archived"));
export default defineSchema({
  interactiveSessions: defineTable({ ownerId: v.id("users"), profileId: v.id("profiles"), profileUpdatedAt: v.number(), objectiveId: v.optional(v.id("objectives")), brief: v.optional(brief), updatedAt: v.number() }).index("by_ownerId", ["ownerId"]),
  voiceConnections: defineTable({ ownerId: v.id("users"), sessionId: v.id("interactiveSessions"), requestId: v.string(), status: voiceStatus, providerId: v.optional(v.string()), expiresAt: v.number(), updatedAt: v.number() }).index("by_ownerId", ["ownerId"]).index("by_ownerId_and_requestId", ["ownerId", "requestId"]).index("by_sessionId", ["sessionId"]),
  mailInboxes: defineTable({ ownerId: v.id("users"), profileId: v.id("profiles"),
    status: v.union(v.literal("pending"), v.literal("ready"), v.literal("failed")),
    providerId: v.optional(v.string()), address: v.optional(v.string()), error: v.optional(v.string()),
    provisioningStarted: v.optional(v.boolean()),
    nextPollAt: v.optional(v.number()), pollGeneration: v.optional(v.number()), pollStarted: v.optional(v.boolean()),
    pollPageToken: v.optional(v.string()), lastPolledAt: v.optional(v.number()),
    pollFailures: v.optional(v.number()), pollError: v.optional(v.string()),
  }).index("by_ownerId", ["ownerId"]).index("by_profileId", ["profileId"]).index("by_providerId", ["providerId"])
    .index("by_status_and_nextPollAt", ["status", "nextPollAt"]),
  mailPollControl: defineTable({ key: v.string(), retryAt: v.number() }).index("by_key", ["key"]),
  mailDrafts: defineTable({ ownerId: v.id("users"), profileId: v.id("profiles"), objectiveId: v.id("objectives"),
    to: v.string(), subject: v.string(), body: v.string(), version: v.number(),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("sending"), v.literal("sent"), v.literal("uncertain")),
    approvedVersion: v.optional(v.number()), approvalExpiresAt: v.optional(v.number()),
    approvedProfileUpdatedAt: v.optional(v.number()),
    dispatchStarted: v.optional(v.boolean()),
    providerMessageId: v.optional(v.string()), threadId: v.optional(v.string()), error: v.optional(v.string()), updatedAt: v.number(),
  }).index("by_ownerId", ["ownerId"]).index("by_objectiveId", ["objectiveId"]).index("by_profileId_and_threadId", ["profileId", "threadId"]),
  mailMessages: defineTable({ ownerId: v.id("users"), profileId: v.id("profiles"), objectiveId: v.optional(v.id("objectives")),
    providerMessageId: v.string(), threadId: v.string(), sender: v.string(), subject: v.string(), body: v.string(),
  }).index("by_ownerId", ["ownerId"]).index("by_profileId", ["profileId"]).index("by_profileId_and_providerMessageId", ["profileId", "providerMessageId"]),
  // Legacy webhook deduplication records retained; polling never writes this table.
  mailWebhookEvents: defineTable({ eventId: v.string() }).index("by_eventId", ["eventId"]),
  planProposals: defineTable({
    ownerId: v.id("users"), profileId: v.id("profiles"), objectiveId: v.id("objectives"), requestId: v.string(),
    scenario: v.string(), model: v.string(), threadId: v.string(),
    status: v.union(v.literal("pending"), v.literal("ready"), v.literal("failed"), v.literal("accepted")),
    result: v.optional(proposal), error: v.optional(v.string()),
    acceptedTaskIds: v.optional(v.array(v.id("tasks"))), updatedAt: v.number(),
  }).index("by_ownerId", ["ownerId"]).index("by_objectiveId", ["objectiveId"]).index("by_ownerId_and_requestId", ["ownerId", "requestId"]),
  researchRuns: defineTable({
    ownerId: v.id("users"), profileId: v.id("profiles"), objectiveId: v.id("objectives"),
    query: v.string(), country: v.string(), requestId: v.string(),
    status: v.union(v.literal("pending"), v.literal("ready"), v.literal("failed")),
    error: v.optional(v.string()), updatedAt: v.number(),
  }).index("by_ownerId", ["ownerId"]).index("by_objectiveId", ["objectiveId"]).index("by_ownerId_and_requestId", ["ownerId", "requestId"]),
  evidence: defineTable({
    ownerId: v.id("users"), objectiveId: v.id("objectives"), runId: v.id("researchRuns"),
    url: v.string(), title: v.string(), excerpt: v.string(), retrievedAt: v.number(),
  }).index("by_ownerId", ["ownerId"]).index("by_runId", ["runId"]).index("by_objectiveId", ["objectiveId"]),
  aiGuidance: defineTable({
    ownerId: v.id("users"), profileId: v.id("profiles"), objectiveId: v.id("objectives"),
    requestId: v.string(), status: v.union(v.literal("pending"), v.literal("ready"), v.literal("failed")),
    question: v.string(), threadId: v.string(), model: v.string(),
    result: v.optional(guidance), error: v.optional(v.string()),
    memoryIds: v.array(v.id("memories")), updatedAt: v.number(),
  }).index("by_ownerId", ["ownerId"]).index("by_objectiveId", ["objectiveId"])
    .index("by_ownerId_and_requestId", ["ownerId", "requestId"]),
  users: defineTable({name:v.string()}),
  profiles: defineTable({
    ownerId:v.id("users"),name:v.string(),normalizedName:v.string(),description:v.string(),
    role:v.string(),industry:v.string(),archived:v.boolean(),updatedAt:v.number(),
  }).index("by_ownerId",["ownerId"]).index("by_ownerId_and_archived",["ownerId","archived"])
    .index("by_ownerId_and_normalizedName",["ownerId","normalizedName"]),
  objectives: defineTable({
    ownerId:v.id("users"),profileId:v.id("profiles"),title:v.string(),description:v.string(),
    desiredOutcome:v.string(),deadline:v.optional(v.string()),status:objectiveStatus,
    requestId:v.string(),updatedAt:v.number(),
  }).index("by_ownerId",["ownerId"]).index("by_ownerId_and_updatedAt",["ownerId","updatedAt"])
    .index("by_profileId_and_updatedAt",["profileId","updatedAt"])
    .index("by_ownerId_and_requestId",["ownerId","requestId"]),
  memories: defineTable({
    ownerId:v.id("users"),profileId:v.id("profiles"),content:v.string(),
    kind:v.union(v.literal("preference"),v.literal("constraint"),v.literal("lesson"),v.literal("context")),
    pinned:v.boolean(),updatedAt:v.number(),
  }).index("by_ownerId",["ownerId"]).index("by_profileId",["profileId"]),
  tasks: defineTable({
    ownerId:v.id("users"),profileId:v.id("profiles"),objectiveId:v.id("objectives"),
    title:v.string(),done:v.boolean(),dependsOn:v.array(v.id("tasks")),updatedAt:v.number(),
  }).index("by_ownerId",["ownerId"]).index("by_objectiveId",["objectiveId"]),
  activityEvents: defineTable({
    ownerId:v.id("users"),profileId:v.id("profiles"),objectiveId:v.optional(v.id("objectives")),
    kind:v.string(),summary:v.string(),
  }).index("by_ownerId",["ownerId"]).index("by_profileId",["profileId"]).index("by_objectiveId",["objectiveId"]),
});

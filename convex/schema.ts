import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { guidance } from "./aiContracts";
import { proposal } from "./planningContracts";
import { brief, voiceStatus } from "./liveContracts";
import { tierValidator } from "./tierPolicy";
import { transformationKind, transformationStatus } from "./transformationContracts";

export const objectiveStatus = v.union(v.literal("active"),v.literal("paused"),v.literal("completed"),v.literal("archived"));
export default defineSchema({
  ...authTables,
  guidanceTransformations: defineTable({
    ownerId: v.id("users"), guidanceId: v.id("aiGuidance"), profileId: v.id("profiles"),
    kind: transformationKind, custom: v.string(), requestId: v.string(), status: transformationStatus,
    title: v.optional(v.string()), text: v.optional(v.string()), model: v.optional(v.string()), error: v.optional(v.string()),
    textStorageId: v.optional(v.id("_storage")), documentStorageId: v.optional(v.id("_storage")), mediaStorageId: v.optional(v.id("_storage")),
    duration: v.optional(v.number()), renderStarted: v.optional(v.boolean()), updatedAt: v.number(),
  }).index("by_guidanceId", ["guidanceId"]).index("by_ownerId", ["ownerId"]).index("by_ownerId_and_requestId", ["ownerId", "requestId"]),
  billingAccounts: defineTable({provider:v.optional(v.literal("paystack")),ownerId:v.id("users"),tier:tierValidator,expiresAt:v.number(),generation:v.number(),nextCheckAt:v.number(),status:v.string(),checkoutId:v.optional(v.string()),checkoutUrl:v.optional(v.string()),subscriptionId:v.optional(v.string()),customerId:v.optional(v.string()),productId:v.optional(v.string()),environment:v.union(v.literal("test"),v.literal("live"))}).index("by_ownerId",["ownerId"]).index("by_nextCheckAt",["nextCheckAt"]),
  clients: defineTable({ownerId:v.id("users"),profileId:v.id("profiles"),name:v.string(),email:v.string(),clientCode:v.string(),active:v.boolean(),updatedAt:v.number()}).index("by_ownerId",["ownerId"]).index("by_ownerId_and_active",["ownerId","active"]).index("by_profileId",["profileId"]).index("by_profileId_and_clientCode",["profileId","clientCode"]).index("by_profileId_and_email",["profileId","email"]),
  interactiveSessions: defineTable({ ownerId: v.id("users"), profileId: v.id("profiles"), profileUpdatedAt: v.number(), objectiveId: v.optional(v.id("objectives")), guidanceId: v.optional(v.id("aiGuidance")), brief: v.optional(brief), updatedAt: v.number() }).index("by_ownerId", ["ownerId"]).index("by_ownerId_and_guidanceId", ["ownerId", "guidanceId"]),
  voiceConnections: defineTable({ ownerId: v.id("users"), sessionId: v.id("interactiveSessions"), requestId: v.string(), status: voiceStatus, providerId: v.optional(v.string()), expiresAt: v.number(), updatedAt: v.number() }).index("by_ownerId", ["ownerId"]).index("by_ownerId_and_requestId", ["ownerId", "requestId"]).index("by_sessionId", ["sessionId"]),
  mailInboxes: defineTable({ ownerId: v.id("users"), profileId: v.id("profiles"),
    handlerEnabled:v.optional(v.boolean()), acknowledge:v.optional(v.boolean()), handlerEnabledAt:v.optional(v.number()),
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
    replyToMessageId:v.optional(v.id("mailMessages")),
    to: v.string(), subject: v.string(), body: v.string(), version: v.number(),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("sending"), v.literal("sent"), v.literal("uncertain")),
    approvedVersion: v.optional(v.number()), approvalExpiresAt: v.optional(v.number()),
    approvedProfileUpdatedAt: v.optional(v.number()),
    dispatchStarted: v.optional(v.boolean()),
    providerMessageId: v.optional(v.string()), threadId: v.optional(v.string()), error: v.optional(v.string()), updatedAt: v.number(),
  }).index("by_ownerId", ["ownerId"]).index("by_objectiveId", ["objectiveId"]).index("by_profileId_and_threadId", ["profileId", "threadId"]),
  mailMessages: defineTable({ ownerId: v.id("users"), profileId: v.id("profiles"), objectiveId: v.optional(v.id("objectives")),
    clientId:v.optional(v.id("clients")), handlerStatus:v.optional(v.union(v.literal("quarantined"),v.literal("pending"),v.literal("in_progress"),v.literal("resolved"))), handlerReason:v.optional(v.string()),
    triageStatus:v.optional(v.union(v.literal("pending"),v.literal("ready"),v.literal("failed"))), summary:v.optional(v.string()), urgency:v.optional(v.string()), suggestedReply:v.optional(v.string()),
    ackStatus:v.optional(v.union(v.literal("pending"),v.literal("sent"),v.literal("skipped"),v.literal("uncertain"))), ackProviderId:v.optional(v.string()), workflowId:v.optional(v.string()),
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
  users: defineTable({name:v.string(), email:v.optional(v.string()), emailVerificationTime:v.optional(v.number()), image:v.optional(v.string()), phone:v.optional(v.string()), phoneVerificationTime:v.optional(v.number()), isAnonymous:v.optional(v.boolean())}).index("email",["email"]).index("phone",["phone"]),
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

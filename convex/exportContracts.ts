import { v } from "convex/values";

export const exportTables = ["profiles", "objectives", "memories", "tasks", "activityEvents", "aiGuidance", "guidanceTransformations", "researchRuns", "evidence", "planProposals", "mailInboxes", "mailDrafts", "mailMessages", "interactiveSessions", "voiceConnections", "clients", "billingAccounts"] as const;
export const exportTable = v.union(...exportTables.map(table => v.literal(table)));

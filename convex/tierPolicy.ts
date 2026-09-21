import { v } from "convex/values";
export const tierValidator = v.union(v.literal("free"), v.literal("premium"), v.literal("premium_plus"));
export type Tier = "free" | "premium" | "premium_plus";
// Conservative launch allowances; no automatic overage charges. Monthly = calendar month UTC.
export const TIERS = {
  free: { label: "Free", profiles: 3, clients: 5, inboxes: 0, lightAI: 20, heavyAI: 5, research: 3, triage: 20, mail: 20, voice: 1 },
  premium: { label: "Premium", profiles: 10, clients: 100, inboxes: 1, lightAI: 300, heavyAI: 100, research: 50, triage: 500, mail: 500, voice: 6 },
  premium_plus: { label: "Premium Plus", profiles: 30, clients: 500, inboxes: 1, lightAI: 1000, heavyAI: 300, research: 150, triage: 2000, mail: 2000, voice: 12 },
} as const;
export type Meter = "lightAI" | "heavyAI" | "research" | "triage" | "mail" | "voice";

import { v } from "convex/values";
export const transformationKind = v.union(v.literal("article"), v.literal("meeting"), v.literal("business"), v.literal("mp3"), v.literal("infographic"), v.literal("custom"));
export const transformationStatus = v.union(v.literal("pending"), v.literal("processing"), v.literal("ready"), v.literal("failed"));
export const TRANSFORM_LABELS = { article: "Article", meeting: "Brief / Meeting Notes", business: "Business / Work Notes", mp3: "Create MP3", infographic: "Create Infographic", custom: "Custom" } as const;
export type TransformationKind = keyof typeof TRANSFORM_LABELS;

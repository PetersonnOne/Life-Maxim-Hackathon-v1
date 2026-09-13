import { z } from "zod";
import { v } from "convex/values";

export function safeSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password &&
      host.includes(".") && !host.endsWith(".local") && !host.endsWith(".localhost") &&
      !/^\d+(\.\d+){3}$/.test(host) && !host.includes(":");
  } catch { return false; }
}
export const evidenceInput = v.object({ url: v.string(), title: v.string(), excerpt: v.string() });
export const evidenceSchema = z.object({
  url: z.string().max(2000).refine(safeSourceUrl),
  title: z.string().max(300), excerpt: z.string().max(6000),
});
export const evidenceListSchema = z.array(evidenceSchema).max(3);
export const searchInputSchema = z.object({
  query: z.string().trim().min(3).max(500),
  country: z.string().regex(/^[A-Z]{2}$/),
  requestId: z.string().min(1).max(100),
});
export const firecrawlResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ web: z.array(z.object({
    url: z.string(), title: z.string().optional(), description: z.string().optional(), markdown: z.string().optional(),
  })).max(100).default([]) }),
});

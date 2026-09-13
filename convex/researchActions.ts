import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { firecrawlResponseSchema, safeSourceUrl } from "./researchContracts";

export const search = internalAction({
  args: { id: v.id("researchRuns") }, returns: v.null(),
  handler: async (ctx, { id }): Promise<null> => {
    try {
      const run = await ctx.runQuery(internal.research.context, { id });
      if (!run) { await ctx.runMutation(internal.research.finish, { id }); return null; }
      const key = process.env.FIRECRAWL_API_KEY;
      if (!key?.trim()) throw new Error("Not configured");
      // Only the user-approved query and country leave Convex; no profile/memory dump.
      const response = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(65000),
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: run.query, country: run.country, limit: 3, sources: ["web"], timeout: 55000,
          scrapeOptions: { formats: [{ type: "markdown" }], onlyMainContent: true } }),
      });
      if (!response.ok) throw new Error("Research unavailable");
      // Bound response memory before decoding potentially large scraped documents.
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Empty response");
      const decoder = new TextDecoder(); let text = ""; let bytes = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 2_000_000) { await reader.cancel(); throw new Error("Response too large"); }
          text += decoder.decode(value, { stream: true });
        }
        text += decoder.decode();
      } finally { reader.releaseLock(); }
      const result = firecrawlResponseSchema.parse(JSON.parse(text));
      const seen = new Set<string>();
      const sources = result.data.web.filter(source => {
        if (!safeSourceUrl(source.url) || source.url.length > 2000 || seen.has(source.url)) return false;
        seen.add(source.url); return true;
      }).slice(0, 3).map(source => ({ url: source.url, title: (source.title || new URL(source.url).hostname).slice(0, 300),
        excerpt: (source.markdown || source.description || "No extract available; open the source to review.").slice(0, 6000) }));
      await ctx.runMutation(internal.research.finish, { id, sources });
    } catch {
      // No raw provider errors, credentials or page content in error logs.
      await ctx.runMutation(internal.research.finish, { id });
    }
    return null;
  },
});

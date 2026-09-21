import { internalMutation, internalQuery } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";

export const lookup = internalQuery({
  args: { username: v.string() }, returns: v.object({ current: v.boolean(), legacyUserId: v.union(v.string(), v.null()) }),
  handler: async (ctx, { username }) => ({
    current: !!await ctx.db.query("authAccounts").withIndex("providerAndAccountId", q => q.eq("provider", "password").eq("providerAccountId", username)).unique(),
    legacyUserId: await ctx.runQuery(components.authUsername.public.getUserIdByUsername, { username }),
  }),
});
export const verifyLegacy = internalMutation({
  args: { username: v.string(), password: v.string() }, returns: v.union(v.id("users"), v.null()),
  handler: async (ctx, { username, password }) => {
    const current = await ctx.db.query("authAccounts").withIndex("providerAndAccountId", q => q.eq("provider", "password").eq("providerAccountId", username)).unique();
    if (current) return null;
    const userId = await ctx.runQuery(components.authUsername.public.getUserIdByUsername, { username });
    if (!userId) return null;
    const verified = await ctx.runMutation(components.authPasswordProvider.public.verifyPassword, { userId, password });
    // Return failure rather than throwing: commit the component attempt limiter.
    if (!verified.success) return null;
    const id = ctx.db.normalizeId("users", userId);
    return id && await ctx.db.get("users",id) ? id : null;
  },
});

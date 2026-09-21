import { env } from "./_generated/server";
import { ConvexError } from "convex/values";
import { RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { TIERS, type Meter } from "./tierPolicy";
const limiter = new RateLimiter(components.rateLimiter);
export async function accountTier(ctx: MutationCtx, ownerId: Id<"users">) {
  const row = await ctx.db.query("billingAccounts").withIndex("by_ownerId", q=>q.eq("ownerId",ownerId)).unique();
  const environment = env.PAYSTACK_ENVIRONMENT === "live" ? "live" : "test";
  return row && row.provider === "paystack" && row.environment === environment && row.expiresAt > Date.now() ? row.tier : "free";
}
export async function consume(ctx: MutationCtx, ownerId: Id<"users">, meter: Meter) {
  const tier = await accountTier(ctx, ownerId); const cap = TIERS[tier][meter];
  if (!cap) throw new ConvexError("This feature is currently unavailable on your plan. Voice remains paused during the pilot.");
  const now = new Date(); const start = Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1);
  const end = Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1);
  // Keep bucket capacity fixed across plan changes, so upgrading/downgrading cannot reset usage.
  const capacity=TIERS.premium_plus[meter];
  const config={kind:"fixed window" as const,rate:capacity,capacity,period:end-start,start};
  const current=await limiter.getValue(ctx,`plan:${meter}:${start}`,{key:ownerId,config});
  if(capacity-current.value>=cap)throw new ConvexError(`${TIERS[tier].label} monthly ${meter} limit reached. It resets on ${new Date(end).toISOString().slice(0,10)}. No automatic overage charge.`);
  const result = await limiter.limit(ctx, `plan:${meter}:${start}`, {key:ownerId,config});
  if (!result.ok) throw new ConvexError(`${TIERS[tier].label} monthly ${meter} limit reached. It resets on ${new Date(end).toISOString().slice(0,10)}. No automatic overage charge.`);
}

import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError,v } from "convex/values";
import { query,mutation,internalMutation,internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import schema from "./schema";
import { tierValidator } from "./tierPolicy";
import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import { PAID_PLANS_ENABLED, PAID_PLANS_DISABLED_MESSAGE } from "../lib/release-policy";
const syncLimits = new RateLimiter(components.rateLimiter, { sync: {kind:"fixed window",rate:1,period:MINUTE} });

export const current=query({args:{},returns:v.union(v.null(),schema.doc("billingAccounts")),handler:async ctx=>{
 const ownerId=await getAuthUserId(ctx);if(!ownerId)throw new ConvexError("Sign in.");
 return await ctx.db.query("billingAccounts").withIndex("by_ownerId",q=>q.eq("ownerId",ownerId)).unique();
}});
export const reserve=internalMutation({args:{productId:v.string(),environment:v.union(v.literal("test"),v.literal("live"))},returns:v.id("billingAccounts"),handler:async(ctx,args)=>{
 if(!PAID_PLANS_ENABLED)throw new ConvexError(PAID_PLANS_DISABLED_MESSAGE);
 const ownerId=await getAuthUserId(ctx);if(!ownerId)throw new ConvexError("Sign in.");
 const old=await ctx.db.query("billingAccounts").withIndex("by_ownerId",q=>q.eq("ownerId",ownerId)).unique();
 if(old)throw new ConvexError("A checkout or subscription already exists. Use the saved checkout or billing portal; contact support if checkout creation failed. This prevents duplicate subscriptions.");
 return await ctx.db.insert("billingAccounts",{ownerId,...args,provider:"paystack",tier:"free",expiresAt:0,generation:0,nextCheckAt:Date.now()+300000,status:"creating"});
}});
export const attach=internalMutation({args:{id:v.id("billingAccounts"),checkoutId:v.string(),checkoutUrl:v.string()},returns:v.null(),handler:async(ctx,{id,...fields})=>{await ctx.db.patch("billingAccounts",id,{...fields,status:"checkout_pending",nextCheckAt:Date.now()});return null;}});
export const get=internalQuery({args:{id:v.id("billingAccounts")},returns:v.union(v.null(),schema.doc("billingAccounts")),handler:(ctx,{id})=>ctx.db.get("billingAccounts",id)});
export const setReference=internalMutation({args:{id:v.id("billingAccounts"),reference:v.string()},returns:v.null(),handler:async(ctx,{id,reference})=>{await ctx.db.patch("billingAccounts",id,{checkoutId:reference});return null;}});
export const refresh=mutation({args:{},returns:v.null(),handler:async ctx=>{
 const ownerId=await getAuthUserId(ctx);if(!ownerId)throw new ConvexError("Sign in.");
 const row=await ctx.db.query("billingAccounts").withIndex("by_ownerId",q=>q.eq("ownerId",ownerId)).unique();
 if(row && row.nextCheckAt<=Date.now()){
   await ctx.db.patch("billingAccounts",row._id,{nextCheckAt:Date.now()+300000});
   await ctx.scheduler.runAfter(0,internal.billingActions.sync,{id:row._id});
 }return null;
}});
export const dispatch=internalMutation({args:{},returns:v.null(),handler:async ctx=>{
 const rows=await ctx.db.query("billingAccounts").withIndex("by_nextCheckAt",q=>q.lte("nextCheckAt",Date.now())).take(20);
 for(const row of rows){await ctx.scheduler.runAfter(0,internal.billingActions.sync,{id:row._id});await ctx.db.patch("billingAccounts",row._id,{nextCheckAt:Date.now()+300000});}return null;
}});
export const claim=internalMutation({args:{id:v.id("billingAccounts")},returns:v.union(v.null(),schema.doc("billingAccounts")),handler:async(ctx,{id})=>{
 const row=await ctx.db.get("billingAccounts",id);if(!row)return null;
 if(!(await syncLimits.limit(ctx,"sync",{key:id})).ok)return null;
 // Bound overlapping syncs; stale generation results are ignored and expiry fails closed.
 const generation=row.generation+1;await ctx.db.patch("billingAccounts",id,{generation,nextCheckAt:Date.now()+300000});return {...row,generation};
}});
export const apply=internalMutation({args:{id:v.id("billingAccounts"),generation:v.number(),tier:tierValidator,expiresAt:v.number(),status:v.string(),subscriptionId:v.string(),customerId:v.string(),productId:v.string()},returns:v.null(),handler:async(ctx,{id,generation,...fields})=>{
 const row=await ctx.db.get("billingAccounts",id);if(!row||row.generation!==generation)return null;
 await ctx.db.patch("billingAccounts",id,fields);await ctx.scheduler.runAt(Math.max(Date.now(),fields.expiresAt),internal.billing.expire,{id,expiresAt:fields.expiresAt});return null;
}});
export const expire=internalMutation({args:{id:v.id("billingAccounts"),expiresAt:v.number()},returns:v.null(),handler:async(ctx,{id,expiresAt})=>{const row=await ctx.db.get("billingAccounts",id);if(row&&row.expiresAt===expiresAt&&expiresAt<=Date.now())await ctx.db.patch("billingAccounts",id,{tier:"free"});return null;}});

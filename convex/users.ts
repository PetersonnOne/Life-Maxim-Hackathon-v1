import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
export const createUser = internalMutation({
  args:{provider:v.literal("password"),providerAccountId:v.string(),profile:v.object({username:v.string()})},
  returns:v.id("users"),
  handler:async(ctx,args)=>await ctx.db.insert("users",{name:args.profile.username}),
});
export const current = query({
  args:{},returns:v.union(v.null(),v.object({name:v.string()})),
  handler:async(ctx)=>{
    const id=await getAuthUserId(ctx);
    if(!id)return null;
    const user=await ctx.db.get("users",id);
    return user?{name:user.name}:null;
  },
});

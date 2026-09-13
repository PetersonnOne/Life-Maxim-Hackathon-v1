import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/core";
import schema from "./schema";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";

export const list=query({
  args:{},returns:v.array(schema.tables.profiles.validator.extend({_id:v.id("profiles"),_creationTime:v.number()})),
  handler:async(ctx)=>{
    const ownerId=await getAuthUserId(ctx);
    if(!ownerId)throw new ConvexError("Sign in to view your profiles.");
    return await ctx.db.query("profiles").withIndex("by_ownerId_and_archived",q=>q.eq("ownerId",ownerId).eq("archived",false)).take(100);
  },
});
export const create=mutation({
  args:{name:v.string(),description:v.string(),role:v.string(),industry:v.string()},
  returns:v.id("profiles"),
  handler:async(ctx,args)=>{
    const ownerId=await getAuthUserId(ctx);
    if(!ownerId)throw new ConvexError("Sign in to create a profile.");
    const name=args.name.trim();
    if(!name||name.length>80||args.description.length>2000||args.role.length>120||args.industry.length>120)throw new ConvexError("Check the length of your profile fields.");
    const normalizedName=name.toLocaleLowerCase("en-US");
    const existing=await ctx.db.query("profiles").withIndex("by_ownerId_and_normalizedName",q=>q.eq("ownerId",ownerId).eq("normalizedName",normalizedName)).unique();
    if(existing){if(existing.archived)throw new ConvexError("Restore the archived profile with this name first.");return existing._id;}
    const profiles=await ctx.db.query("profiles").withIndex("by_ownerId_and_archived",q=>q.eq("ownerId",ownerId).eq("archived",false)).take(100);
    if(profiles.length>=100)throw new ConvexError("You have reached the profile limit.");
    const profileId=await ctx.db.insert("profiles",{...args,name,normalizedName,ownerId,archived:false,updatedAt:Date.now()});
    await ctx.db.insert("activityEvents",{ownerId,profileId,kind:"profile_created",summary:"Created profile: "+name});
    return profileId;
  },
});

export const archived = query({
  args: { paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(schema.doc("profiles")),
  handler: async (ctx, { paginationOpts }) => {
    const ownerId = await getAuthUserId(ctx); if (!ownerId) throw new ConvexError("Sign in to view profiles.");
    return await ctx.db.query("profiles").withIndex("by_ownerId_and_archived", q => q.eq("ownerId", ownerId).eq("archived", true)).order("desc").paginate(paginationOpts);
  },
});
export const get = query({
  args: { id: v.id("profiles") }, returns: v.union(v.null(), schema.doc("profiles")),
  handler: async (ctx, { id }) => {
    const ownerId = await getAuthUserId(ctx); const profile = await ctx.db.get("profiles", id);
    return ownerId && profile?.ownerId === ownerId ? profile : null;
  },
});
export const update = mutation({
  args: { id: v.id("profiles"), expectedUpdatedAt: v.number(), name: v.string(), description: v.string(), role: v.string(), industry: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx); const profile = await ctx.db.get("profiles", args.id);
    if (!ownerId || profile?.ownerId !== ownerId) throw new ConvexError("Profile not found.");
    if (profile.archived) throw new ConvexError("Restore this profile before editing.");
    if (profile.updatedAt !== args.expectedUpdatedAt) throw new ConvexError("Profile changed in another session. Reload before saving.");
    const name = args.name.trim();
    if (!name || name.length > 80 || args.description.length > 2000 || args.role.length > 120 || args.industry.length > 120) throw new ConvexError("Check profile field lengths.");
    const normalizedName = name.toLocaleLowerCase("en-US");
    const duplicate = await ctx.db.query("profiles").withIndex("by_ownerId_and_normalizedName", q => q.eq("ownerId", ownerId).eq("normalizedName", normalizedName)).unique();
    if (duplicate && duplicate._id !== args.id) throw new ConvexError("Another profile already uses this name.");
    await ctx.db.patch("profiles", args.id, { name, normalizedName, description: args.description, role: args.role, industry: args.industry, updatedAt: Math.max(Date.now(), profile.updatedAt + 1) });
    await ctx.db.insert("activityEvents", { ownerId, profileId: args.id, kind: "profile_updated", summary: "Updated profile details" }); return null;
  },
});
export const setArchived = mutation({
  args: { id: v.id("profiles"), expectedUpdatedAt: v.number(), archived: v.boolean(), confirmation: v.optional(v.string()) }, returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx); const profile = await ctx.db.get("profiles", args.id);
    if (!ownerId || profile?.ownerId !== ownerId) throw new ConvexError("Profile not found.");
    if (profile.archived === args.archived) return null;
    if (profile.updatedAt !== args.expectedUpdatedAt) throw new ConvexError("Profile changed. Review its latest version.");
    if (args.archived && args.confirmation !== profile.name) throw new ConvexError("Type the profile name to confirm archiving.");
    if (!args.archived) {
      const active = await ctx.db.query("profiles").withIndex("by_ownerId_and_archived", q => q.eq("ownerId", ownerId).eq("archived", false)).take(100);
      if (active.length >= 100) throw new ConvexError("Archive another profile before restoring this one.");
    }
    await ctx.db.patch("profiles", args.id, { archived: args.archived, updatedAt: Math.max(Date.now(), profile.updatedAt + 1) });
    await ctx.db.insert("activityEvents", { ownerId, profileId: args.id, kind: args.archived ? "profile_archived" : "profile_restored", summary: args.archived ? "Archived profile; existing history retained" : "Restored profile" }); return null;
  },
});

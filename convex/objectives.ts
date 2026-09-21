import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import schema, {objectiveStatus} from "./schema";
const doc=schema.tables.objectives.validator.extend({_id:v.id("objectives"),_creationTime:v.number()});
export const list=query({
  args:{profileId:v.optional(v.id("profiles"))},returns:v.array(doc),
  handler:async(ctx,{profileId})=>{
    const ownerId=await getAuthUserId(ctx);
    if(!ownerId)throw new ConvexError("Sign in to view objectives.");
    if(profileId){
      const profile=await ctx.db.get("profiles",profileId);
      if(!profile||profile.ownerId!==ownerId)throw new ConvexError("Profile not found.");
      return await ctx.db.query("objectives").withIndex("by_profileId_and_updatedAt",q=>q.eq("profileId",profileId)).order("desc").take(100);
    }
    return await ctx.db.query("objectives").withIndex("by_ownerId_and_updatedAt",q=>q.eq("ownerId",ownerId)).order("desc").take(100);
  },
});
export const get=query({
  args:{id:v.id("objectives")},returns:v.union(v.null(),doc),
  handler:async(ctx,{id})=>{
    const ownerId=await getAuthUserId(ctx);
    if(!ownerId)throw new ConvexError("Sign in to view an objective.");
    const objective=await ctx.db.get("objectives",id);
    if(!objective||objective.ownerId!==ownerId)return null;
    return objective;
  },
});
export const create=mutation({
  args:{profileId:v.id("profiles"),title:v.string(),description:v.string(),desiredOutcome:v.string(),deadline:v.optional(v.string()),requestId:v.string()},
  returns:v.id("objectives"),
  handler:async(ctx,args)=>{
    const ownerId=await getAuthUserId(ctx);
    if(!ownerId)throw new ConvexError("Sign in to create an objective.");
    const profile=await ctx.db.get("profiles",args.profileId);
    if(!profile||profile.ownerId!==ownerId||profile.archived)throw new ConvexError("Choose an active profile you own.");
    if(!args.title.trim()||args.title.length>160||args.description.length>10000||args.desiredOutcome.length>2000||!args.requestId||args.requestId.length>100)throw new ConvexError("Check your objective details.");
    if(args.deadline&&!/^\d{4}-\d{2}-\d{2}$/.test(args.deadline))throw new ConvexError("Choose a valid deadline.");
    const existing=await ctx.db.query("objectives").withIndex("by_ownerId_and_requestId",q=>q.eq("ownerId",ownerId).eq("requestId",args.requestId)).unique();
    if(existing)return existing._id;
    const id=await ctx.db.insert("objectives",{...args,title:args.title.trim(),ownerId,status:"active",updatedAt:Date.now()});
    await ctx.db.insert("activityEvents",{ownerId,profileId:args.profileId,objectiveId:id,kind:"objective_created",summary:"Created objective: "+args.title.trim()});
    return id;
  },
});
export const setStatus=mutation({
  args:{id:v.id("objectives"),status:objectiveStatus},returns:v.null(),
  handler:async(ctx,{id,status})=>{
    const ownerId=await getAuthUserId(ctx);
    const objective=await ctx.db.get("objectives",id);
    if(!ownerId||!objective||objective.ownerId!==ownerId)throw new ConvexError("Objective not found.");
    if(objective.status===status)return null;
    await ctx.db.patch("objectives",id,{status,updatedAt:Math.max(Date.now(),objective.updatedAt+1)});
    await ctx.db.insert("activityEvents",{ownerId,profileId:objective.profileId,objectiveId:id,kind:"objective_status",summary:"Objective marked "+status});
    return null;
  },
});

export const update = mutation({
  args: { id: v.id("objectives"), expectedUpdatedAt: v.number(), title: v.string(), description: v.string(), desiredOutcome: v.string(), deadline: v.optional(v.string()) }, returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx); const objective = await ctx.db.get("objectives", args.id);
    if (!ownerId || objective?.ownerId !== ownerId) throw new ConvexError("Objective not found.");
    const profile = await ctx.db.get("profiles", objective.profileId);
    if (profile?.ownerId !== ownerId || profile.archived) throw new ConvexError("Restore the profile before editing this entry.");
    if (objective.updatedAt !== args.expectedUpdatedAt) throw new ConvexError("Entry changed in another session. Reload before saving.");
    const title = args.title.trim();
    if (!title || title.length > 160 || args.description.length > 10000 || args.desiredOutcome.length > 2000) throw new ConvexError("Check your entry details.");
    if (args.deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(args.deadline) || !Number.isFinite(Date.parse(args.deadline)) || new Date(args.deadline).toISOString().slice(0, 10) !== args.deadline)) throw new ConvexError("Choose a valid deadline.");
    // Profile assignment is immutable: editing must not move private context or mail.
    await ctx.db.patch("objectives", args.id, { title, description: args.description, desiredOutcome: args.desiredOutcome, deadline: args.deadline, updatedAt: Math.max(Date.now(), objective.updatedAt + 1) });
    await ctx.db.insert("activityEvents", { ownerId, profileId: objective.profileId, objectiveId: args.id, kind: "objective_updated", summary: "Updated entry details" }); return null;
  },
});

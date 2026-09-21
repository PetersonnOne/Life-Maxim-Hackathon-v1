import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import schema from "./schema";
export const activity=query({
  args:{profileId:v.optional(v.id("profiles")),objectiveId:v.optional(v.id("objectives"))},
  returns:v.array(schema.tables.activityEvents.validator.extend({_id:v.id("activityEvents"),_creationTime:v.number()})),
  handler:async(ctx,{profileId,objectiveId})=>{
    const ownerId=await getAuthUserId(ctx);
    if(!ownerId)throw new ConvexError("Sign in to view activity.");
    if(objectiveId){
      const objective=await ctx.db.get("objectives",objectiveId);
      if(!objective||objective.ownerId!==ownerId)throw new ConvexError("Objective not found.");
      return await ctx.db.query("activityEvents").withIndex("by_objectiveId",q=>q.eq("objectiveId",objectiveId)).order("desc").take(30);
    }
    if(profileId){
      const profile=await ctx.db.get("profiles",profileId);
      if(!profile||profile.ownerId!==ownerId)throw new ConvexError("Profile not found.");
      return await ctx.db.query("activityEvents").withIndex("by_profileId",q=>q.eq("profileId",profileId)).order("desc").take(30);
    }
    return await ctx.db.query("activityEvents").withIndex("by_ownerId",q=>q.eq("ownerId",ownerId)).order("desc").take(30);
  },
});
export const memories=query({
  args:{profileId:v.id("profiles")},returns:v.array(schema.tables.memories.validator.extend({_id:v.id("memories"),_creationTime:v.number()})),
  handler:async(ctx,{profileId})=>{
    const ownerId=await getAuthUserId(ctx);
    const profile=await ctx.db.get("profiles",profileId);
    if(!ownerId||!profile||profile.ownerId!==ownerId)throw new ConvexError("Profile not found.");
    return await ctx.db.query("memories").withIndex("by_profileId",q=>q.eq("profileId",profileId)).order("desc").take(100);
  },
});
export const remember=mutation({
  args:{profileId:v.id("profiles"),content:v.string(),kind:v.union(v.literal("preference"),v.literal("constraint"),v.literal("lesson"),v.literal("context"))},
  returns:v.id("memories"),
  handler:async(ctx,args)=>{
    const ownerId=await getAuthUserId(ctx);
    const profile=await ctx.db.get("profiles",args.profileId);
    if(!ownerId||!profile||profile.ownerId!==ownerId||profile.archived)throw new ConvexError("Profile not found.");
    if(!args.content.trim()||args.content.length>3000)throw new ConvexError("Memory must contain 1–3000 characters.");
    const id=await ctx.db.insert("memories",{...args,content:args.content.trim(),ownerId,pinned:false,updatedAt:Date.now()});
    await ctx.db.insert("activityEvents",{ownerId,profileId:args.profileId,kind:"memory_confirmed",summary:"Saved a confirmed "+args.kind});
    return id;
  },
});
export const forget=mutation({
  args:{id:v.id("memories")},returns:v.null(),
  handler:async(ctx,{id})=>{
    const ownerId=await getAuthUserId(ctx);
    const memory=await ctx.db.get("memories",id);
    if(!ownerId||!memory||memory.ownerId!==ownerId)throw new ConvexError("Memory not found.");
    await ctx.db.delete("memories",id);
    await ctx.db.insert("activityEvents",{ownerId,profileId:memory.profileId,kind:"memory_forgotten",summary:"Forgot a memory"});
    return null;
  },
});
export const tasks=query({
  args:{objectiveId:v.id("objectives")},returns:v.array(schema.tables.tasks.validator.extend({_id:v.id("tasks"),_creationTime:v.number()})),
  handler:async(ctx,{objectiveId})=>{
    const ownerId=await getAuthUserId(ctx);
    const objective=await ctx.db.get("objectives",objectiveId);
    if(!ownerId||!objective||objective.ownerId!==ownerId)throw new ConvexError("Objective not found.");
    return await ctx.db.query("tasks").withIndex("by_objectiveId",q=>q.eq("objectiveId",objectiveId)).take(100);
  },
});
export const addTask=mutation({
  args:{objectiveId:v.id("objectives"),title:v.string(),dependsOn:v.array(v.id("tasks"))},returns:v.id("tasks"),
  handler:async(ctx,args)=>{
    const ownerId=await getAuthUserId(ctx);
    const objective=await ctx.db.get("objectives",args.objectiveId);
    if(!ownerId||!objective||objective.ownerId!==ownerId)throw new ConvexError("Objective not found.");
    if(!args.title.trim()||args.title.length>240||args.dependsOn.length>20)throw new ConvexError("Check your task details.");
    const tasks=await ctx.db.query("tasks").withIndex("by_objectiveId",q=>q.eq("objectiveId",args.objectiveId)).take(100);
    if(tasks.length>=100)throw new ConvexError("This objective has reached its task limit.");
    for(const dependency of args.dependsOn){
      const task=await ctx.db.get("tasks",dependency);
      if(!task||task.objectiveId!==args.objectiveId)throw new ConvexError("Dependencies must belong to this objective.");
    }
    const id=await ctx.db.insert("tasks",{...args,title:args.title.trim(),ownerId,profileId:objective.profileId,done:false,updatedAt:Date.now()});
    await ctx.db.insert("activityEvents",{ownerId,profileId:objective.profileId,objectiveId:objective._id,kind:"task_added",summary:"Added task: "+args.title.trim()});
    return id;
  },
});
export const completeTask=mutation({
  args:{id:v.id("tasks")},returns:v.null(),
  handler:async(ctx,{id})=>{
    const ownerId=await getAuthUserId(ctx);
    const task=await ctx.db.get("tasks",id);
    if(!ownerId||!task||task.ownerId!==ownerId)throw new ConvexError("Task not found.");
    if(task.done)return null;
    for(const dependency of task.dependsOn){
      const preceding=await ctx.db.get("tasks",dependency);
      if(!preceding?.done)throw new ConvexError("Complete the earlier tasks first.");
    }
    await ctx.db.patch("tasks",id,{done:true,updatedAt:Date.now()});
    await ctx.db.insert("activityEvents",{ownerId,profileId:task.profileId,objectiveId:task.objectiveId,kind:"task_completed",summary:"Completed: "+task.title});
    return null;
  },
});

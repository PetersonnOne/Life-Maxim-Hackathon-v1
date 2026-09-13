"use client";
import { useEffect } from "react";
import { useConvex } from "convex/react";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Tool={name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>Promise<unknown>};
type ModelContext={registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>};
export function WebMCPBridge(){
  const convex=useConvex();
  useEffect(()=>{
    const context=(document as Document&{modelContext?:ModelContext}).modelContext;
    if(!context?.registerTool)return;
    const controller=new AbortController();
    const empty={type:"object",properties:{},additionalProperties:false};
    const idSchema=(key:string)=>({type:"object",properties:{[key]:{type:"string",minLength:1,maxLength:100}},required:[key],additionalProperties:false});
    const tools:Tool[]=[
      {name:"list_profiles",description:"List the signed-in user's available contextual profiles. Does not choose or create a profile.",inputSchema:empty,annotations:{readOnlyHint:true,untrustedContentHint:true},execute:async input=>{z.object({}).strict().parse(input);return (await convex.query(api.profiles.list,{})).map(p=>({id:p._id,name:p.name,description:p.description,role:p.role,industry:p.industry}));}},
      {name:"list_objectives",description:"List recent objectives within one owned profile.",inputSchema:idSchema("profileId"),annotations:{readOnlyHint:true,untrustedContentHint:true},execute:async input=>{const {profileId}=z.object({profileId:z.string().min(1).max(100)}).strict().parse(input);return (await convex.query(api.objectives.list,{profileId:profileId as Id<"profiles">})).map(o=>({id:o._id,title:o.title,status:o.status,desiredOutcome:o.desiredOutcome,deadline:o.deadline??null}));}},
      {name:"get_objective_context",description:"Read one owned objective's context and desired outcome.",inputSchema:idSchema("objectiveId"),annotations:{readOnlyHint:true,untrustedContentHint:true},execute:async input=>{const {objectiveId}=z.object({objectiveId:z.string().min(1).max(100)}).strict().parse(input);const o=await convex.query(api.objectives.get,{id:objectiveId as Id<"objectives">});if(!o)throw new Error("Objective not found.");return {id:o._id,profileId:o.profileId,title:o.title,description:o.description,desiredOutcome:o.desiredOutcome,status:o.status};}},
      {name:"search_memory",description:"Search up to 100 recent user-confirmed memories in one owned profile. Returns at most 20 matches; does not search other profiles.",inputSchema:{type:"object",properties:{profileId:{type:"string",minLength:1,maxLength:100},query:{type:"string",maxLength:200}},required:["profileId","query"],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:async input=>{const args=z.object({profileId:z.string().min(1).max(100),query:z.string().max(200)}).strict().parse(input);return (await convex.query(api.workspace.memories,{profileId:args.profileId as Id<"profiles">})).filter(m=>m.content.toLowerCase().includes(args.query.toLowerCase())).slice(0,20).map(m=>({id:m._id,content:m.content,kind:m.kind}));}},
      {name:"get_plan",description:"Read the tasks and dependencies for one owned objective. Does not modify or approve the plan.",inputSchema:idSchema("objectiveId"),annotations:{readOnlyHint:true,untrustedContentHint:true},execute:async input=>{const {objectiveId}=z.object({objectiveId:z.string().min(1).max(100)}).strict().parse(input);return (await convex.query(api.workspace.tasks,{objectiveId:objectiveId as Id<"objectives">})).map(t=>({id:t._id,title:t.title,done:t.done,dependsOn:t.dependsOn}));}},
      {name:"get_objective_activity",description:"Read the 30 most recent activity events for an owned objective.",inputSchema:idSchema("objectiveId"),annotations:{readOnlyHint:true,untrustedContentHint:true},execute:async input=>{const {objectiveId}=z.object({objectiveId:z.string().min(1).max(100)}).strict().parse(input);return (await convex.query(api.workspace.activity,{objectiveId:objectiveId as Id<"objectives">})).map(e=>({kind:e.kind,summary:e.summary,at:e._creationTime}));}},
    ];
    void (async()=>{try{for(const tool of tools){if(controller.signal.aborted)return;await context.registerTool(tool,{signal:controller.signal});}}catch{controller.abort();console.warn("Life Maxim browser tools could not be registered. The standard interface remains available.");}})();
    return ()=>controller.abort();
  },[convex]);
  return null;
}

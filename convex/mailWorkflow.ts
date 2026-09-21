import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";
import { components,internal } from "./_generated/api";
export const mailWorkflow=new WorkflowManager(components.workflow,{workpoolOptions:{maxParallelism:3}});
export const process=mailWorkflow.define({args:{id:v.id("mailMessages")},returns:v.null(),handler:async(step,args):Promise<null>=>{
 try{await step.runAction(internal.clientMailActions.triage,args,{retry:false});}catch{await step.runMutation(internal.clientMail.triageDone,args);}
 try{await step.runAction(internal.clientMailActions.acknowledge,args,{retry:false});}catch{await step.runMutation(internal.clientMail.failed,args);}
 // Disabled/archived/deactivated context may skip a step without throwing.
 // Close pending states, without changing completed or uncertain outcomes.
 await step.runMutation(internal.clientMail.failed,args);return null;
}});

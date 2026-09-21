import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
export const transformationWorkflow = new WorkflowManager(components.workflow, { workpoolOptions: { maxParallelism: 2 } });
export const process = transformationWorkflow.define({ args: { id: v.id("guidanceTransformations") }, returns: v.null(), handler: async (step, args): Promise<null> => {
  try {
    await step.runAction(internal.transformationActions.prepare, args, { retry: false });
    await step.runAction(internal.transformationActions.render, args, { retry: false });
  } catch { /* The action stores a safe error; finalize skipped or crashed steps below. */ }
  await step.runMutation(internal.transformations.fail, { ...args, error: "Generation did not finish. No automatic paid retry was made; your source guidance is unchanged." });
  return null;
} });

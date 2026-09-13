import { z } from "zod";
import { v } from "convex/values";
export const planStep = v.object({ title: v.string(), dependsOn: v.array(v.number()) });
export const stepsSchema = z.array(z.object({ title: z.string().trim().min(1).max(240), dependsOn: z.array(z.number().int().min(0)).max(7) })).min(1).max(8).superRefine((steps, ctx) => {
  steps.forEach((step, index) => {
    if (step.dependsOn.some(dependency => dependency >= index) || new Set(step.dependsOn).size !== step.dependsOn.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Dependencies must refer to unique earlier steps", path: [index, "dependsOn"] });
  });
});
export const proposal = v.object({
  summary: v.string(), assumptions: v.array(v.string()), uncertainties: v.array(v.string()),
  options: v.array(v.object({ name: v.string(), benefits: v.string(), tradeoffs: v.string() })),
  steps: v.array(planStep), sourceIds: v.array(v.string()),
});
export const proposalSchema = z.object({
  summary: z.string().min(1).max(2000),
  assumptions: z.array(z.string().max(500)).max(5), uncertainties: z.array(z.string().max(500)).max(5),
  options: z.array(z.object({ name: z.string().min(1).max(100), benefits: z.string().max(1000), tradeoffs: z.string().max(1000) })).min(1).max(3),
  steps: stepsSchema, sourceIds: z.array(z.string()).max(6),
});

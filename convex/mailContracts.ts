import { z } from "zod";
export const draftSchema = z.object({
  to: z.string().trim().email().max(254).refine(value => !/[\r\n]/.test(value)),
  subject: z.string().trim().min(1).max(200).refine(value => !/[\r\n]/.test(value)),
  body: z.string().trim().min(1).max(10000),
});
export const inboxResponse = z.object({ inbox_id: z.string().min(1).max(500), email: z.string().email().max(254) });
export const sentResponse = z.object({ message_id: z.string().min(1).max(1000), thread_id: z.string().min(1).max(1000) });

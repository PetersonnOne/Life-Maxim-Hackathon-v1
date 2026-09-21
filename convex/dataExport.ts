import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import schema from "./schema";
import { exportTable } from "./exportContracts";

// Explicit application-record allowlist: never expose auth component tables or secrets.
export const page = query({
  args: { table: exportTable, paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(v.union(
    schema.doc("profiles"), schema.doc("objectives"), schema.doc("memories"),
    schema.doc("tasks"), schema.doc("activityEvents"), schema.doc("aiGuidance"), schema.doc("guidanceTransformations"),
    schema.doc("researchRuns"), schema.doc("evidence"), schema.doc("planProposals"),
    schema.doc("mailInboxes"), schema.doc("mailDrafts"), schema.doc("mailMessages"),
    schema.doc("interactiveSessions"), schema.doc("voiceConnections"), schema.doc("clients"), schema.doc("billingAccounts"),
  )),
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx);
    if (!ownerId) throw new ConvexError("Sign in to export your data.");
    const opts = args.paginationOpts;
    if (!Number.isInteger(opts.numItems) || opts.numItems < 1 || opts.numItems > 20 ||
        opts.maximumRowsRead !== 20 || opts.maximumBytesRead !== 1_000_000 || opts.endCursor != null) {
      throw new ConvexError("Use export pages of at most 20 records with the required read limits.");
    }
    return await ctx.db.query(args.table).withIndex("by_ownerId", q => q.eq("ownerId", ownerId)).paginate(opts);
  },
});

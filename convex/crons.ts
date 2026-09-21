import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
// A one-minute dispatcher finds due work; each inbox waits at least five minutes.
crons.interval("poll due AgentMail inboxes", { minutes: 1 }, internal.mailPolling.dispatch, {});
crons.interval("reconcile Paystack subscriptions", { minutes: 5 }, internal.billing.dispatch, {});
export default crons;

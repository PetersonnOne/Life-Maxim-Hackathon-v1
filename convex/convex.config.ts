import { defineApp } from "convex/server";
import { v } from "convex/values";
// Retain the isolated legacy tables while existing accounts migrate on sign-in.
import auth from "@convex-dev/auth-v2/core/convex.config.js";
import passwordProvider from "@convex-dev/auth-v2/providers/password/convex.config.js";
import username from "@convex-dev/auth-v2/username/convex.config.js";
import agent from "@convex-dev/agent/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import workflow from "@convex-dev/workflow/convex.config";
const app=defineApp({env:{
 AUTH_PRIVATE_KEY:v.string(),AUTH_JWKS:v.string(),OPENAI_API_KEY:v.optional(v.string()),
 PAYSTACK_SECRET_KEY:v.optional(v.string()),PAYSTACK_ENVIRONMENT:v.optional(v.string()),
 PAYSTACK_PREMIUM_PLAN_CODE:v.optional(v.string()),PAYSTACK_PREMIUM_PLUS_PLAN_CODE:v.optional(v.string()),
 APP_URL:v.optional(v.string()),AGENTMAIL_API_KEY:v.optional(v.string()),AGENTMAIL_INBOX_CAPACITY:v.optional(v.string()),
}});
app.use(auth,{httpPrefix:"/auth",env:{AUTH_PRIVATE_KEY:app.env.AUTH_PRIVATE_KEY,AUTH_JWKS:app.env.AUTH_JWKS}});
app.use(passwordProvider);
app.use(username);
app.use(agent);
app.use(rateLimiter);
app.use(workflow);
export default app;

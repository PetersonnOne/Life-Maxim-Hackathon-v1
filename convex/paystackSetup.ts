import { v, ConvexError } from "convex/values";
import { z } from "zod";
import { env, internalAction } from "./_generated/server";

const plan = z.object({ name: z.string(), plan_code: z.string().startsWith("PLN_"), amount: z.number(), currency: z.string(), interval: z.string(), domain: z.string() });

// Operator-only setup. Never schedules itself or creates customer subscriptions.
export const testPlans = internalAction({
  args: { createMissing: v.boolean() },
  returns: v.array(v.object({ tier: v.string(), code: v.string(), amount: v.number(), currency: v.string(), interval: v.string(), domain: v.string() })),
  handler: async (_ctx, { createMissing }) => {
    const key = env.PAYSTACK_SECRET_KEY;
    if (!key?.startsWith("sk_test_") || (env.PAYSTACK_ENVIRONMENT && env.PAYSTACK_ENVIRONMENT !== "test")) {
      throw new ConvexError("Setup requires a Paystack test secret and test environment.");
    }
    async function request(path: string, body?: unknown) {
      const response = await fetch(`https://api.paystack.co${path}`, {
        method: body ? "POST" : "GET", redirect: "error",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000),
      });
      const value = z.object({ status: z.boolean(), data: z.unknown().optional(), message: z.string().optional() }).parse(await response.json());
      if (!response.ok || !value.status) {
        // Provider messages can contain arbitrary data: expose only a classified cause.
        const currencyError = /currency|USD|dollar/i.test(value.message ?? "");
        throw new ConvexError(currencyError ? "Paystack rejected USD for this account. Enable USD with Paystack before continuing." : `Paystack setup failed (HTTP ${response.status}). No automatic POST retry was made.`);
      }
      return value.data;
    }
    const existing: z.infer<typeof plan>[] = [];
    // Bounded inventory; refuse creation if we cannot prove the scan is complete.
    for (let page = 1; page <= 10; page++) {
      const rows = z.array(plan).parse(await request(`/plan?perPage=100&page=${page}`));
      existing.push(...rows);
      if (rows.length < 100) break;
      if (page === 10) throw new ConvexError("Plan inventory exceeds setup limit; reconcile manually.");
    }
    const results = [];
    for (const [tier, name, amount] of [
      ["premium", "Life Maxim Premium", 2000],
      ["premium_plus", "Life Maxim Premium Plus", 5000],
    ] as const) {
      const matches = existing.filter(p => p.name === name && p.amount === amount && p.currency === "USD" && p.interval === "monthly" && p.domain === "test");
      if (matches.length > 1) throw new ConvexError("Duplicate matching plans exist; reconcile before configuring checkout.");
      let selected = matches[0];
      if (!selected && createMissing) selected = plan.parse(await request("/plan", { name, amount, currency: "USD", interval: "monthly" }));
      if (!selected) continue;
      const verified = plan.parse(await request(`/plan/${encodeURIComponent(selected.plan_code)}`));
      if (verified.name !== name || verified.amount !== amount || verified.currency !== "USD" || verified.interval !== "monthly" || verified.domain !== "test") throw new ConvexError("Plan verification mismatch; configuration unchanged.");
      results.push({ tier, code: verified.plan_code, amount: verified.amount, currency: verified.currency, interval: verified.interval, domain: verified.domain });
    }
    return results;
  },
});

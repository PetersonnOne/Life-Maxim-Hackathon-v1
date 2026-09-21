/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { PAID_PLANS_ENABLED, PAID_PLANS_DISABLED_MESSAGE } from "../lib/release-policy";
const modules = import.meta.glob("./**/*.ts");
afterEach(() => vi.unstubAllGlobals());

test("hackathon release blocks direct checkout calls before any provider request or reservation", async () => {
  expect(PAID_PLANS_ENABLED).toBe(false);
  const t = convexTest(schema, modules);
  const ownerId = await t.run(ctx => ctx.db.insert("users", { name: "Free tester" }));
  const owner = t.withIdentity({ subject: ownerId });
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  for (const tier of ["premium", "premium_plus"] as const) {
    await expect(owner.action(api.billingActions.checkout, { tier, email: "test@example.com" })).rejects.toThrow(PAID_PLANS_DISABLED_MESSAGE);
    await expect(t.action(api.billingActions.checkout, { tier, email: "test@example.com" })).rejects.toThrow(PAID_PLANS_DISABLED_MESSAGE);
  }
  await expect(owner.mutation(internal.billing.reserve, { productId: "PLN_test", environment: "test" })).rejects.toThrow(PAID_PLANS_DISABLED_MESSAGE);
  expect(fetcher).not.toHaveBeenCalled();
  expect(await owner.query(api.billing.current, {})).toBeNull();
});

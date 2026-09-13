import { expect, test } from "vitest";
import { dashboardDestination, authDestination } from "../lib/navigation-intent";
test("profile intent survives sign-in without allowing external redirects", () => {
  expect(authDestination("?intent=profile")).toBe("/signin?intent=profile");
  expect(dashboardDestination("?intent=profile")).toBe("/dashboard?intent=profile");
  expect(dashboardDestination("?next=https://example.com")).toBe("/dashboard");
  expect(dashboardDestination("?intent=https://example.com")).toBe("/dashboard");
  expect(authDestination("?intent=profile",true)).toBe("/signup?intent=profile");
});

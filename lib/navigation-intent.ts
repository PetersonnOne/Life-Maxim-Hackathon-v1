// Only app-owned destinations are allowed; never redirect to a supplied URL.
export function dashboardDestination(search: string) {
  return new URLSearchParams(search).get("intent") === "profile" ? "/dashboard?intent=profile" : "/dashboard";
}
export function authDestination(search: string, signup = false) {
  const page = signup ? "/signup" : "/signin";
  return page + (new URLSearchParams(search).get("intent") === "profile" ? "?intent=profile" : "");
}

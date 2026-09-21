import { TIERS, type Tier } from "@/convex/tierPolicy";
import { PAID_PLANS_DISABLED_MESSAGE } from "@/lib/release-policy";

export function LaunchPlans({ compact = false }: { compact?: boolean }) {
  return <section className={compact ? "signup-plans" : "launch-plans"} aria-label="Available plans">
    <h3>{compact ? "Your Plan" : "Free Public Preview"}</h3>
    <p>Start free. No card, payment or automatic upgrade. Usage limits apply.</p>
    <div className="tier-grid">
      {(Object.keys(TIERS) as Tier[]).map(tier => {
        const plan = TIERS[tier];
        return <article key={tier} className={`launch-plan ${tier === "free" ? "selected" : "unavailable"}`}>
          <h4>{plan.label}</h4>
          {tier === "free" ? <span className="plan-selected">Selected · Free</span> : <button type="button" disabled aria-describedby={`plan-${tier}-${compact ? "signup" : "dashboard"}`}>Choose {plan.label}</button>}
          {tier !== "free" && <p id={`plan-${tier}-${compact ? "signup" : "dashboard"}`}>{PAID_PLANS_DISABLED_MESSAGE}</p>}
          {!compact && <ul>
            <li>{plan.profiles} profiles · {plan.clients} active clients</li>
            <li>{plan.lightAI} lightweight AI requests / month</li>
            <li>{plan.heavyAI} guidance or planning requests / month</li>
            <li>{plan.research} research runs / month</li>
            <li>{plan.voice} voice starts / month, up to five minutes each</li>
            <li>{plan.inboxes} new dedicated inboxes (provider capacity applies)</li>
          </ul>}
        </article>;
      })}
    </div>
    {!compact && <p>Monthly limits reset on the first day of each calendar month (UTC). Requests reserve allowance before provider work; shared safety limits also apply. Paid-plan infrastructure is retained, but checkout is disabled for this release.</p>}
  </section>;
}

# Plans and Paystack — development pilot

Implemented September 19, 2026; payment provider changed to Paystack at the owner's request. Default access is Free; no card is required. Paid access requires backend payment/subscription verification, never a checkout redirect or browser-provided tier. Legacy billing rows without the Paystack provider marker do not grant Paystack entitlements.

## Initial allowances

These are conservative pilot limits, not a guarantee of profitability. Revisit using actual per-user costs before public sales. Counts are shared across the user's profiles.

| Allowance | Free | Premium | Premium Plus |
| --- | ---: | ---: | ---: |
| Active profiles | 3 | 10 | 30 |
| Active clients | 5 | 100 | 500 |
| Newly provisioned customer-service inboxes | 0 | 1 | 1 |
| Lightweight AI requests / month | 20 | 300 | 1,000 |
| Terra guidance + planning requests / month | 5 | 100 | 300 |
| Research runs / month | 3 | 50 | 150 |
| Incoming-mail AI analyses / month | 20 | 500 | 2,000 |
| Outgoing messages, including acknowledgements / month | 20 | 500 | 2,000 |
| Pilot voice starts / month (up to five minutes each) | 1 | 6 | 12 |

Voice is still a pilot, with real-call acceptance postponed. Do not market these starts as verified production voice service.

Monthly allowances reset on the first day of each UTC calendar month, independently of the subscription billing date. Requests reserve allowance before provider work, so failed attempts may count. Upgrades/downgrades preserve that month's consumed usage. No automatic overage charges. Existing records are retained after downgrading; new capacity is restricted. Daily/per-minute and shared platform safety caps can also apply.

The split limits reflect very different costs: lightweight Luna work, larger Terra outputs, Firecrawl research, provisioned AgentMail inboxes and voice should not share an unlimited bucket. Provider API keys and provider-plan capacity are shared across the application, not funded separately by each user's subscription. Free-account abuse protection, inbox-cost budgeting and production monitoring remain launch gates.

Provider references consulted: [OpenRouter Terra](https://openrouter.ai/openai/gpt-5.6-terra), [OpenRouter Luna](https://openrouter.ai/openai/gpt-5.6-luna), [AgentMail pricing](https://www.agentmail.to/pricing), [Firecrawl pricing](https://www.firecrawl.dev/pricing). Pricing can change; this implementation does not set a selling price. Choose prices and currency when creating Paystack plans. Checkout fetches the configured monthly plan's amount/currency from Paystack; the browser cannot supply them.

## USD plan setup — blocked by provider currency support

On September 20, 2026 the owner approved actual USD monthly billing: Premium **$20** (2,000 cents), Premium Plus **$50** (5,000 cents). These are launch prices, not a guarantee of profitability.

The test secret was successfully used for plan inventory on development deployment `robust-lemur-250`. The subsequent USD plan creation request was rejected by Paystack with a currency-related error. No automatic POST retry or NGN substitution was made; no plan codes were configured. USD enablement must be resolved with Paystack before retrying. Test plan creation, even when successful, does not establish live USD eligibility or prove recurring checkout.

Operator-only `paystackSetup:testPlans` accepts `createMissing: false` for read-only reconciliation and `true` for explicitly authorized setup. It requires test credentials, scans bounded inventory, reuses exact matches, refuses duplicate matches, and fetches each resulting plan to verify its currency, amount, interval and test domain. It creates no customer subscriptions or charges. Do not run concurrent setup calls.

See [Paystack USD enablement requirements](https://support.paystack.com/en/articles/2130690). All TypeScript checks, targeted lint and the development deployment passed for this setup action.

Create two monthly plans in **Paystack test mode**, one per paid tier. Configure these only in Convex development Settings → Environment Variables:

- `PAYSTACK_SECRET_KEY`: test secret beginning `sk_test_`.
- `PAYSTACK_PREMIUM_PLAN_CODE`: Premium monthly plan code beginning `PLN_`.
- `PAYSTACK_PREMIUM_PLUS_PLAN_CODE`: Premium Plus monthly plan code beginning `PLN_`.
- `PAYSTACK_ENVIRONMENT`: `test` (default); the key prefix must match. Do not use live mode during acceptance.
- `APP_URL`: frontend origin, e.g. `http://localhost:3000` for local testing.

No Paystack public key is needed for this server-initialized hosted checkout. No webhook secret is needed for the current polling implementation. Old Dodo settings are no longer read. Subscriptions use card checkout; other payment channels are not advertised as recurring-capable by this integration.

## AgentMail capacity

Keep the existing `AGENTMAIL_API_KEY` in Convex. It must have organization-wide inbox listing/creation access, not be restricted to a single inbox. `AGENTMAIL_INBOX_CAPACITY` defaults to `3` and is an operator safety ceiling (supported range 1–100), not an API plan upgrade.

The free AgentMail account provides three inboxes total across all Life Maxim users and any inboxes created outside Life Maxim. The owner's reported existing inbox leaves at most two available slots. Premium and Premium Plus users can each provision one dedicated address, assigned to their chosen client-work profile. The backend checks entitlement, account ownership, existing allocation and current provider inventory. Requests are throttled; uncertain creations are not blindly retried. Existing inboxes are retained, not deleted or reassigned on a downgrade.

Upgrade AgentMail capacity before selling inbox-backed access beyond available slots; buying a Life Maxim subscription cannot expand the operator's AgentMail plan. The inbox capacity check is not a reservation against inbox creation in the external AgentMail dashboard. Do not create inboxes concurrently through other applications. Provider hard limits remain authoritative. Capacity/setup failures are visible and currently require administrator reconciliation.

No secrets belong in chat, browser code or public frontend environment variables. Missing settings produce a safe “not configured” response; no billing record or paid entitlement is created when the key is missing.

## Implemented flow

1. Plans & Billing initializes a hosted checkout for the server-mapped monthly plan and signed-in account. A deterministic reference and metadata bind the payment to the owned billing record.
2. Checkout creation does not upgrade the account. Its saved URL can be resumed; a second subscription checkout for the same account is blocked to prevent accidental duplicates.
3. Convex checks due records every five minutes using Paystack API calls. It verifies reference, metadata, domain (test/live), plan, amount, currency and customer. A uniquely matching subscription is discovered from that customer's plan/authorization. Ambiguous results fail closed. Monthly access starts from a verified paid transaction; subsequent periods require a paid subscription invoice and verified renewal transaction. A future next-payment date alone never grants access.
4. Server-side entitlements stop at the verified period end, even if the provider is unavailable. A scheduled update also refreshes the visible tier. Stale generation results cannot overwrite newer verification; test-mode grants cannot be used in live mode.
5. The verified subscription can open its Paystack management link. No webhook is required for this implementation. Cancellation does not erase already-paid access; access ends at the last verified paid-through date. Polling and provider backoff can delay status changes.

## Acceptance and launch gates

- Mocked tests cover missing configuration, checkout/verification separation, amount validation, paid renewals, isolation, usage retention, expiration and paid-only inbox provisioning. They do not prove Paystack account configuration or real recurring billing.
- After credentials/plans exist: verify test checkout, management link, renewal, cancellation, failed payment, refund/dispute and plan changes with Paystack test records. Confirm prices/receipts and actual plan terms before live mode.
- Failed or ambiguous checkout creation currently requires administrator reconciliation; the app deliberately prevents blind retries that could create duplicate subscriptions. Support-assisted restart and abandoned-checkout recovery remain open.
- Refund/dispute reconciliation beyond subscription status, production lifecycle alerts, remaining-usage meters and payment-provider incident handling remain launch work.
- This is a local Sites project using a Convex development deployment, not a published production release.

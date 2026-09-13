# Backend integrations

## Credential setup

The project owner enters these values directly in the intended Convex deployment's
Settings → Environment Variables. Never paste them into chat, source files,
frontend environment variables, screenshots or logs.

- `OPENROUTER_API_KEY`: separately funded OpenRouter account.
- `FIRECRAWL_API_KEY`: separately funded Firecrawl account.
- `AGENTMAIL_API_KEY`: separately funded AgentMail account.

Development and production have separate configuration. No production deployment
or billing changes are implied by development setup. A key's presence does not prove
it is valid, funded, or authorized for the requested service.

The internal `intelligenceActions:integrationStatus` diagnostic reports booleans
only. It never returns keys. Do not use `convex env list` output in public logs.

## Model policy

OpenRouter is the only model transport; Convex AI Gateway is not used.
The Convex Agent component still manages durable response threads.

| Work | Model |
| --- | --- |
| Profile suggestion | `openai/gpt-5.6-luna` |
| Contextual guidance | `openai/gpt-5.6-terra` |
| Planning with stored research evidence | `openai/gpt-5.6-terra` |

These pinned identifiers were checked against OpenRouter's public model catalog
on 2026-09-12. Routing is explicit by task, not a claim that a heuristic can measure
required intelligence. No silent model or provider fallback. Each generation has
bounded input/output, a timeout and no automatic model-call retries.

Profile suggestions use account-owned profile metadata and the submitted draft,
not other profiles' memories. Guidance uses only the objective's selected profile
and up to twelve confirmed memories. Suggestions require user confirmation.

## Research policy

The user supplies the query and two-letter search country. No geographic default
is set by Life Maxim; Firecrawl's own default is avoided by requiring a value.
Search requests share these fields, not profile or memory records. Each call asks
for up to three web results and main-content Markdown extraction; stored excerpts
are limited to 6,000 characters per source. Provider responses are capped at 2 MB.
Source text is rendered as text, never executable HTML. Source links are validated.

Research has per-user minute/day quotas and a global daily quota. Failed runs may
be manually retried; another provider request can consume additional credits.
Use provider-side spending limits too: request quotas are not exact currency caps.
Retrieval time is not publication time. Excerpts are unverified external content,
not instructions, facts endorsed by Life Maxim, or authorization to act.

## Mail setup and safety

Incoming mail uses the backend `AGENTMAIL_API_KEY`; no webhook or signing secret is
required. The former webhook endpoint and Svix dependency have been removed.
Do not configure the previously requested webhook. If you already created it,
disable it in AgentMail; no external webhook settings were changed automatically.

Recommended application interval: five minutes after each completed check (roughly
288 list requests per inbox per day when empty). This is Life Maxim's tradeoff,
not a provider-mandated interval. A one-minute Convex cron dispatches up to 20 due
inboxes, staggered by two seconds. Only ready inboxes with active, owned profiles
are checked. Dispatch leases prevent overlap and stale completion overwrites.

Each check reads one ten-message page, fetching full plaintext only for unseen
received messages. Spam, blocked, unauthenticated and trash are excluded. Pagination
is checkpointed after the full page succeeds, and message IDs deduplicate replays.
After the last page, the next sweep restarts at newest mail; no timestamp cutoff
silently drops late-arriving messages. Large inboxes take longer than five minutes
to sweep. API payloads are capped at 2 MB and stored bodies at 10,000 characters.

Polling reads share limits of 60/minute and 10,000/day across the deployment.
Failures wait 5, 10, 20, 40, then 60 minutes; successful checks reset to five minutes.
Provider `Retry-After` takes precedence when longer and pauses reads across inboxes.
The UI shows the last successful check and delayed-check status. Delivery/bounce
reconciliation remains separate future work; polling never retries email sends.

API contract: [List messages](https://docs.agentmail.to/api-reference/inboxes/messages/list),
[Get message](https://docs.agentmail.to/api-reference/inboxes/messages/get),
[Rate limits](https://www.agentmail.to/docs/knowledge-base/rate-limits).

Users explicitly create one inbox per profile. Drafts belong to an objective within
that profile. Incoming messages are profile-wide and known outgoing threads also
link to the originating objective. No incoming message automatically triggers AI,
approval, a reply or another external action. HTML and attachments are not rendered.

Saving is not approval. Approval binds the recipient, subject and body to a specific
version for ten minutes. Editing invalidates approval; sending requires a separate
explicit action. Atomic dispatch claims prevent repeated application dispatch.
Network failures have an uncertain outcome and require administrator review in
AgentMail before any manual recovery; never blindly resend. Provider acceptance
does not prove delivery. No real email send has yet been tested.

## Live acceptance gates

1. Save development keys securely and run the presence-only diagnostic.
2. Test one synthetic Luna suggestion, explicit confirmation/discard, and one
   Terra response with selected-profile context. Check failure and isolation paths.
3. Run one bounded Firecrawl search and verify saved URLs, excerpts and dates.
4. Verify a real incoming message through scheduled API polling.
   Before any live send, obtain explicit approval for recipient and final content.
5. Obtain target-specific production approval, configure production credentials,
   and validate through the published Sites frontend.

Mocked provider tests verify request/response handling, not live account access.
The development AgentMail read-only connection check passed. Live incoming-message
polling remains to be verified; deterministic provider-adapter tests pass.
On 2026-09-12, real Luna suggestions, Terra selected-profile guidance, Firecrawl
three-source persistence, and Terra evidence-backed plan generation passed on
synthetic development records. Acceptance created edited tasks only after explicit
approval. New browser UI checks remain pending.

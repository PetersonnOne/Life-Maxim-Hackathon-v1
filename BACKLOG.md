# Life Maxim backlog

Status: done / in progress / todo / blocked. Completion requires evidence, not just code.

## Free public release decision — September 20

- [x] ChatGPT Sites confirmed as host. Owner confirms public GitHub repository,
  initial push and root hackathon.md already online.
- [x] Emerald is now the default theme; saved user preferences remain respected.
- [x] Signup and Plans show all three tiers. Free is selected; Premium and Premium
  Plus are disabled with “Disabled until after Hackathon”. Backend checkout and
  reservation reject direct calls, even if a caller bypasses the UI.
- [x] Release-gate regression plus retained post-hackathon billing tests: 70 tests
  across 14 files pass. Clean TypeScript and changed-source lint pass.
- [ ] Verified-email recovery, account deletion/session revocation: chosen recovery
  channel confirmed; installed Auth V2 API lacks complete revocation/deletion.
  Current official docs still warn against production use. Authentication direction
  owner authorized evaluation of a supported alternative. Better Auth recommended
  in docs/auth-migration-evaluation.md; actual migration is not yet approved.
- [x] Development push and full frontend build passed. Secure Node system-CA/IPv4
  connection succeeded; earlier deployment network blocker is cleared for this run.
- [x] One bounded GPT Live 1 backend probe started, received audio and transcript,
  and closed without error. Browser microphone/playback acceptance remains open.
- [ ] User-controlled retention, email reconciliation and related live acceptance.
- [ ] Convex production `dapper-gecko-926` identified, but not yet changed/published.

Paystack activation and billing hardening are **not Free-launch blockers**; preserve
them for after the hackathon. Do not charge users or make paid tiers selectable.

## September 20 recovery — guidance tools and emerald theme

- [x] Selected-card Discuss with AI dialog using the existing GPT Live 1 broker;
  separate explicit Start voice, no other cards/memories in its context.
- [x] Six transformation formats, custom instructions and accessible help tips;
  persisted child records, Convex files, Word/text/media downloads and deletion.
- [x] Backend media allowances: Free one MP3 and one infographic per UTC day;
  Premium three each; Plus five each. MP3 duration validation rejects over 120 seconds.
- [x] Transformation records included in private application JSON export.
- [x] Emerald dark palette and persistent light/dark controls on homepage, auth,
  dashboard and footer; green surfaces, mint accents and scrollbars.
- [x] All 69 automated tests across 13 files pass; targeted lint passes. Full
  frontend build passes; the earlier Windows output-folder lock is resolved.
- [x] Clean TypeScript check passes with ES2020; stale incremental diagnostic
  cache identified. Main emerald text/button/sidebar contrast pairs exceed 4.5:1
  by calculation (not a substitute for whole-page accessibility acceptance).
- [ ] Final development deployment and live voice/media probes: blocked by local
  HTTPS certificate verification/connectivity failure reaching Convex. The prior
  interrupted deployment outcome is not assumed successful. No real voice result
  or media generation is claimed from this recovery run.
- [ ] Authenticated browser acceptance of both themes, nested guidance dialogs,
  downloads/deletion and both voice entry points; actual microphone/playback/hangup.

See `docs/guidance-transformations.md` and `docs/submission-readiness.md` for current
behavior and a prioritized distinction between hackathon and full-product readiness.
Paystack remains paused; no production deployment/publication or submission made.

## USD test-plan setup — September 20, 2026

- [x] Add and deploy operator-only Paystack test plan setup with existing-plan reconciliation and amount/currency verification; TypeScript and targeted lint pass.
- [ ] Create/configure Premium USD $20/month and Premium Plus USD $50/month: blocked by Paystack's currency-related rejection of the USD creation request. No NGN fallback, automatic POST retry, customer subscription or charge was made. Resolve USD support with Paystack, then retry explicitly.

## Verified foundation

- [x] Homepage, username/password Convex Auth V2, protected dashboard.
- [x] User-owned profiles and explicit profile selection for each entry.
- [x] Objectives, dependency-aware tasks, confirmed memories, activity.
- [x] Six read-only WebMCP tools; browser registration, execution and sign-out cleanup verified.
- [x] Initial ownership tests, TypeScript and frontend build (2026-09-11).

## 1. AI intelligence — in progress

Implementation is saved in `convex/intelligence.ts`, `convex/intelligenceActions.ts`,
`convex/aiContracts.ts` and `components/ai-intelligence.tsx`: profile suggestions with
explicit confirmation, profile-scoped guidance, durable response states, timeouts,
validated outputs and per-user/global quotas. The checkboxes below remain open
until live model and UI acceptance checks pass.

**Provider decision (2026-09-12):** use the owner's separately funded OpenRouter
API key, never Convex AI Gateway. Runtime migrated and pushed to development:
Luna (`openai/gpt-5.6-luna`) for profile suggestions; Terra
(`openai/gpt-5.6-terra`) for guidance and complex reasoning. Models are pinned and
unapproved models are rejected. The gateway dependency and diagnostic are removed.

**Credentials configured:** the owner saved all three provider API keys in the
development deployment. Presence-only checks passed, followed by real Luna profile
suggestions, Terra guidance using a confirmed profile constraint, and Firecrawl
research that persisted three sources. Keys remain backend-only.

Latest verification on 2026-09-12: all 37 automated tests pass, and targeted lint
passes. Planning and mail are deployed to development; TypeScript passes. Live Terra
planning and read-only AgentMail connectivity passed. The full frontend build with
the API-polling replacement passed. New UI acceptance checks remain open because
browser automation could not initialize (missing local runtime path).

- [ ] Suggest an existing or new contextual profile from an entry draft.
- [ ] Let users review/edit and explicitly confirm suggestions; never silently assign.
- [x] Understand an entry and generate guidance using only its selected profile and confirmed memories.
- [x] Persist AI responses with pending, success and recoverable failure states.
- [x] Bound model usage, validate output and enforce account/profile isolation.
- [ ] Verify real model calls, UI flows and failure/security tests.

## 2. Internet research — in progress

Implemented first Firecrawl slice: scheduled search with optional page extraction,
three-result cap, user-selected search country (no geographic default), objective-owned
evidence, retrieval dates, bounded text-only excerpts, quotas, idempotency, timeouts
and safe failure states. Research tab is connected to Convex. Live requests, browser
QA remains pending. Real Firecrawl requests and source persistence passed; Terra
planning now uses selected-profile context and validated references to stored evidence.

- [x] Firecrawl search/extraction from Convex actions.
- [x] Objective-linked evidence with source URLs, retrieval dates and citations.
- [x] Research scope, request quotas, explicit manual retries and untrusted-content handling.

## 3. Decisions and planning — implemented; UI acceptance pending

- [x] Compare options and distinguish facts, assumptions and uncertainties.
- [x] User-defined scenarios, without geographic defaults.
- [x] Editable AI-generated plans and explicitly accepted task dependencies.
- [ ] Browser acceptance of proposal editing and dependency selection.

Real Terra generation produced a persisted proposal with a valid evidence reference.
The synthetic objective had no tasks before acceptance; accepting two edited steps
created two dependent tasks; repeating acceptance returned the same IDs without
duplicates. Six planning tests cover ownership, atomic acceptance,
idempotency, dependency validation, task limits, timeouts and source isolation.

## 4. Inbox and authorized actions — in progress

Implemented profile-owned inbox provisioning, plaintext drafts, separate version-bound
approval and send actions, expiring approvals, at-most-once dispatch claims, and
uncertain-outcome states that prohibit automatic resends. Incoming mail now uses
API polling with a five-minute interval, checkpointed pages, message deduplication,
shared rate limits, Retry-After handling and exponential failure backoff. The webhook
endpoint and signing-secret requirement were removed at the owner's request.
All 37 automated tests pass, including five new polling tests. TypeScript and lint
pass; development logs confirm recurring dispatcher execution and the retired
webhook returns HTTP 404. No live email has
been sent. Live receipt, delivery/bounce status and manual reconciliation remain.

- [ ] AgentMail inbox/thread ownership and incoming mail.
- [ ] Draft/review/approve/send flow with explicit, version-bound approval.
- [x] API polling, duplicate protection, thread routing and bounded retries.
- [ ] Live incoming-message verification, delivery errors and reconciliation.
- [ ] Never let research content or WebMCP bypass approval.

## 5. Product completeness — in progress

- [ ] Research, decisions, inbox, approvals and settings screens from UI references.
- [ ] Profile editing/archive and entry editing; preserve drafts during navigation.
  - [x] Owner-scoped profile edits with unique names and stale-revision rejection.
  - [x] Confirmed reversible archive/restore with paginated archived profiles.
  - [x] Entry detail editing without changing profile assignment or linked tasks.
  - [x] New-entry draft retained during workspace navigation (memory-only; clears on refresh/sign-out).
  - [x] Preserve unsaved profile/entry edits across editor close/reopen while their containing module remains mounted; original revision checks remain intact.
  - [ ] Browser acceptance of retained edit drafts and explicit discard.
- [ ] Data export/deletion, retention controls and privacy notices.
  - [x] Development privacy/data-handling page explaining actual controls and limitations.
  - [x] Account-owned, bounded JSON application-record export implemented with privacy confirmation and cancellation; owner-isolation/pagination tests pass.
  - [ ] Export browser-download acceptance; account deletion and retention controls.
- [ ] Responsive, keyboard, contrast and accessibility review.
- [ ] Optional removable Sites/Convex attribution footer.
  - [x] Shared footer and bundled light/dark logo assets implemented.
  - [ ] Visual and keyboard acceptance in browser.

Product-controls slice: four new backend tests pass (41 total). Profile changes
invalidate prior unsent mail approvals, including archive/restore cycles. Development
push passed. The interrupted icon installation, TypeScript and full frontend build
were verified successfully on September 13. The export extension brings the suite
to 43 passing tests. Export TypeScript, targeted lint and development deployment
passed, as did the final full frontend build. Homepage, privacy, sign-in and signup
returned HTTP 200. Browser inventory now connects
through the alternate control path, but the preferred connection fails and the
alternate tab cannot recover from its connection-error page. Authenticated browser
acceptance still requires a signed-in development test session.
See `docs/product-controls.md` for behavior and remaining acceptance steps.

## 6. Launch and hackathon — todo

- [ ] Expanded automated and end-to-end security tests; cost/abuse controls.
  - [x] Automated AI ownership, selected-profile context, request idempotency,
    timeout/late-result handling, output bounds, per-minute quota and archived-profile checks.
    Full suite: 11 tests passed on 2026-09-12. Live abuse and browser tests remain open.
- [ ] Auth V2 alpha upgrade/rollback and account-recovery review.
  - [x] Installed-vs-current-docs compatibility review recorded in `docs/auth-v2-readiness.md`.
  - [ ] Resolve upstream production-alpha warning; select a verified recovery channel and rehearse a pinned upgrade/restore. No auth dependency changed.
- [ ] Production Convex setup with explicit deployment approval.
- [ ] ChatGPT Sites registration, production build, publication and live verification.
- [ ] Demo walkthrough, submission materials and evidence-based hackathon log.

## Interactive Mode — implemented pilot; acceptance in progress

- [x] Dashboard action button (not sidebar), profile confirmation, new/existing-entry discussions and User Mode return.
- [x] Backend-only OpenAI GPT-Live-1 WebRTC broker, client delegation, no recording, explicit microphone start, captions, mute/stop and reconnect.
- [x] Rate Limiter start allowances, account connection lock, five-minute server hangup and cleanup retries; periodic profile-revision checks.
- [x] Luna editable brief through OpenRouter; explicit confirmation atomically queues existing Terra guidance. Research/planning reuse existing approved controls.
- [x] Confirmed brief resume, result excerpts for voice, JSON export of session/connection metadata and privacy disclosure.
- [x] Read-only OpenAI model access HTTP 200; automated backend/wire-contract tests. No actual audio call is claimed verified.
- [ ] Browser microphone/playback, interruptibility, disconnects, mobile and keyboard acceptance.
- [ ] Real WebRTC creation/hangup and final usage reconciliation; operator recovery for unknown creation outcomes.
- [ ] Combined scoped research-to-report workflow, durable job cancellation/progress and richer session summary lifecycle from the PRD extension.
- [ ] Production retention/deletion, abuse and billing controls before public launch.

See `docs/interactive-mode.md` for current behavior, pilot limits and a short manual test.

## September 13 recovery verification

- [x] Recovered saved Interactive Mode implementation; 51 pre-existing tests passed after session restart.
- [x] Fixed late voice events/timers affecting replacement connections and stop-on-hidden during startup.
- [x] Fixed homepage profile CTA intent through sign-in/signup; added allowlisted navigation tests.
- [x] Latest automated suite: 52 tests across 11 files. TypeScript and targeted frontend lint pass.
- [x] Final full five-stage build passed; client-bundle credential-pattern scan: zero hits across 27 files.
- [x] Local server recovered after slow startup; homepage, sign-in, dashboard and privacy routes returned HTTP 200 on port 3000. Development server retained for testing.
- [ ] Authenticated browser and real voice acceptance remain open: browser automation cannot initialize; HTTP responses do not prove interactive behavior.
- [x] Prepared `docs/demo-walkthrough.md` with a truthful demo script and explicit unverified acceptance checks.

## Scope rules

### Profile wizard and voice error follow-up

- [x] Title Case dialog headings; manual profile fields and editable AI suggestions live in workspace draft state, surviving step/tab changes and dialog close/reopen. Refresh/sign-out still clears unsaved drafts.
- [x] Change returns to existing profiles. Profile creation is explicitly labeled as an immediate save; entry creation does not create another profile. Existing user profiles were not deleted or merged.
- [x] Voice errors distinguish local cooldowns, provider quota/access/rejection and unknown transport failure; frontend avoids raw stack traces. Mocked quota/cooldown regression passes; 53 tests total.
- [x] Development push, TypeScript, targeted lint and full five-stage frontend build passed for this follow-up.
- [ ] Browser acceptance of the revised wizard. Paid voice acceptance postponed pending the owner's readiness; existing screenshots do not establish an exhausted OpenAI balance.

Convex owns durable data and backend execution; Sites owns the frontend. Firecrawl supplies internet data; AgentMail supplies mail. No TinyFish. Global users, no named/default geographic scenario. AI suggestions are not facts or authorization; profile assignment and consequential actions require confirmation.

## Next execution gates

### September 19 requested improvements

- [x] Guidance submit uses an immediate duplicate-submit guard, disables while generating and displays “Generating AI Guidance”.
- [x] Guidance history uses full-width compact synopsis cards and Open Card dialogs with vertically scrollable full content. Desktop target is 10:1 with a readable minimum height.
- [x] Guidance UI TypeScript, targeted lint and full frontend build passed on September 19. No backend deployment was needed for this UI-only slice.
- [ ] Browser acceptance of guidance loading state, keyboard dialog return, scrolling and mobile layout.
- [x] Implemented client registry with automatically assigned IDs, sender/ID matching and quarantine, bounded Luna triage, opt-in fixed acknowledgements and profile-scoped AgentMail Handler workspace. Development implementation; live acceptance below remains open.
- [ ] Verify the client-service flow while the owner is offline, including duplicate/loop protection and explicit approval for substantive replies. Existing five-minute polling alone does not complete this feature.
- [x] Added Free, Premium and Premium Plus backend-enforced capacity/monthly allowances, preserving consumed usage across tier changes.
- [x] Replaced Dodo with Paystack hosted checkout, owned subscription management links and API-polled payment/subscription verification; missing credentials fail safely. No webhook required.
- [x] Paid-only dedicated AgentMail inbox provisioning: one new inbox per Premium/Premium Plus account, provider capacity preflight (default ceiling three total), and visible capacity failure. Existing inboxes preserved.
- [ ] Configure Paystack test secret and two monthly plan codes, then verify checkout, renewals, cancellation, failed payments and management links against the test account.
- [ ] Add AgentMail capacity before scaling beyond the free account's three total inboxes; with one existing inbox, at most two slots remain. Live provisioning acceptance still requires a deliberate test allocation.
- [ ] Complete billing recovery/refund/dispute handling, remaining-usage display, mail queue pagination, client editing/reactivation, retention and suppression reconciliation before public launch. See `docs/billing-and-tiers.md`.
- [x] September 19 recovery/Paystack verification: 61 tests across 12 files pass; TypeScript, changed-source lint and all five frontend build stages pass. Final backend push succeeded on development `robust-lemur-250`. Client credential-pattern scan: zero hits in 24 JavaScript files.
- [ ] Authenticated browser acceptance remains open: browser connection cannot initialize. Live Paystack and AgentMail provisioning acceptance require configured test plans and an explicitly allocated inbox slot; no real payment/inbox/email/voice was created by automated tests.
- [x] Local preview recovered using `npm run start -- --port 3000` after development startup stalled. Homepage, sign-in, dashboard and privacy returned HTTP 200 at `http://127.0.0.1:3000`. Built preview retained; frontend edits require a rebuild/restart (this is not the hot-reloading dev server).

1. Development deployment, TypeScript, full frontend build and AgentMail connectivity passed.
2. Verify incoming mail via API polling; no webhook or additional secret is needed.
   A live send separately requires an explicitly approved recipient and final content.
3. Restore browser automation and verify suggestion confirm/discard, research, planning
   and mail UI flows. Backend tests are not a substitute for browser acceptance.
4. Finish delivery status/reconciliation, product/privacy/accessibility work and account recovery.
5. Request production publication approval only after launch checks pass.

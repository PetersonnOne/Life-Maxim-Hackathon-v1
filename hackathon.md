# Hackathon log

- **Project:** Life Maxim
- **Event:** Convex All Gas Hackathon
- **What it does:** An AI life-management environment that helps people understand their lives, make decisions, remember what matters, plan objectives, and carry out authorized actions.
- **Live app:** https://life-maxim.newrealmlevel.chatgpt.site
- **Repo:** https://github.com/PetersonnOne/Life-Maxim-Hackathon-v1
- **Frontend:** Codex Sites
- **Convex deployment:** https://dapper-gecko-926.convex.cloud (production)
- **Components:** @convex-dev/auth (core, password provider, username), @convex-dev/agent, @convex-dev/rate-limiter, @convex-dev/workflow
- **Convex features:** schema, indexes, queries, mutations, actions, scheduled functions, crons, realtime queries, ownership checks, file storage, paginated queries
- **Auth:** Convex Auth
- **AI models:** openai/gpt-5.6-luna, openai/gpt-5.6-terra (OpenRouter); gpt-live-1 (OpenAI; backend audio probe passed, browser acceptance pending); gpt-4o-mini-tts and gpt-image-2 (implemented, media acceptance pending)
- **Started:** 2026-09-10T02:42:52Z
- **Last updated:** 2026-09-21T19:37:44Z

## Log

<!-- Entries below are chronological; development evidence is not a production publication claim. -->

### 2026-09-10
Defined Life Maxim as one integrated AI life manager rather than a collection of unrelated tools. The product brief organizes memory, research, decision support, simulation, planning, and authorized execution around a central life-management workspace (`Life Maxim With WebMCP.txt`). No application code or Convex project exists yet.

Turned the concept into a build-ready, globally relevant MVP specification centered on configurable, profile-scoped objectives. The PRD defines Convex as the realtime system of record, Firecrawl as the source-backed research layer, AgentMail as the approval-gated inbox, and WebMCP as the browser-agent action interface. Added user-confirmed contextual profiles so personal, family, professional, and industry entries remain discoverable and isolated; AI may suggest a profile but cannot silently assign one (`PRD.md`).

Selected Convex Auth V2 with username-and-password authentication for account identity. Documented the alpha-package constraint, provider-managed Argon2id hashing, password validation and rate limiting, protected profile access, key isolation, adapter boundary, upgrade checks, rollback expectations, and authentication acceptance tests. Authentication remains planned rather than implemented (`PRD.md`).

### 2026-09-11
Implemented the Sites frontend and Convex-backed foundation: username/password authentication, confirmed contextual profiles, objective entries, dependency-aware tasks, explicit memories, and activity. Evidence is source and executed checks, not Git history; this workspace is not a Git repository.

Repaired interrupted dependency installation and the Windows Auth V2 setup invocation. Generated Convex bindings and successfully pushed the registered authentication components and application functions to the development deployment. The frontend remains a Local Sites project, not a published Site.

Verified all six read-only WebMCP tools in the running browser, including populated profile, objective, plan, memory, and activity reads, invalid-ID rejection, removal on sign-out, and restoration on sign-in (`components/webmcp-bridge.tsx`). No email approval or sending tools are exposed.

Browser checks passed for signup, returning sign-in, profile selection/creation, objective saving, task saving, memory saving, and realtime persistence. Four automated tests passed for anonymous access rejection, cross-account read isolation, idempotency, write ownership, and task dependencies (`convex/workspace.test.ts`). TypeScript and the frontend build passed; targeted lint reported no errors and four generated-file warnings. AI inference, Firecrawl research, AgentMail delivery, and production publication remain unimplemented or unverified.

### 2026-09-12
Added reviewable AI profile suggestions and selected-profile guidance with confirmed-memory context, durable response states, timeout recovery, validated output and usage quotas (`components/ai-intelligence.tsx`, `convex/intelligence.ts`, `convex/intelligenceActions.ts`). Registered the Agent and Rate Limiter components and pushed the implementation to development. Suggestions require explicit user confirmation; AI cannot send mail or authorize actions.

Resumed interrupted verification: eleven automated tests passed, including quota enforcement, archived-profile exclusion, ownership, context isolation and idempotency. Targeted lint passed. The deployment-owner diagnostic confirmed that AI Gateway is not enabled for this team and requires paid access; no billing or credentials were changed. Real model calls and the new AI browser flows remain unverified. Created `BACKLOG.md` to distinguish saved implementation from acceptance-tested completion. Evidence is local source and executed checks, not Git history.

Completed the interrupted frontend validation: the full five-stage build and TypeScript recheck both passed. This verifies compilation, not live AI access or production publication.

Replaced Convex AI Gateway with the owner's chosen OpenRouter integration. Luna handles profile suggestions; Terra handles contextual guidance, with an explicit routing policy for future complex reasoning. Removed the gateway dependency and fixed a pre-existing Agent invocation that lacked the required user identity (`convex/modelProvider.ts`, `convex/modelRouting.ts`, `convex/intelligenceActions.ts`).

Added the first Firecrawl research slice: explicit search country, bounded three-source extraction, objective-owned evidence with retrieval dates, safe text excerpts, quotas, idempotency and timeout recovery, plus a connected Research tab (`convex/research.ts`, `convex/researchActions.ts`, `components/research-panel.tsx`). Twenty-one tests pass, including mocked OpenRouter and Firecrawl wire contracts; TypeScript, targeted lint and the full frontend build pass. Live calls await backend credentials. Browser automation could not initialize due to a missing local runtime path, so new UI acceptance checks remain open. No email was sent and no production Site was published.

Verified live Luna profile suggestions, Terra guidance using confirmed selected-profile context, and Firecrawl persistence of three source URLs, excerpts and retrieval dates. Credentials were supplied securely by the owner; no credential values or application records are included here.

Implemented evidence-backed option comparison and editable plans with assumptions, uncertainties and user-defined scenarios (`convex/planning.ts`, `convex/planningActions.ts`, `components/planning-panel.tsx`). Live Terra generation passed. Tasks were absent before acceptance; accepting edited steps created dependent tasks, and repeated acceptance returned the same task IDs without duplication.

Implemented and deployed the development mail slice: profile-owned inbox provisioning, version-bound expiring approvals, separate send actions, at-most-once dispatch claims, uncertain-outcome safeguards, and signed incoming-webhook verification with deduplication and thread routing (`convex/mail.ts`, `convex/mailActions.ts`, `convex/mailWebhook.ts`, `convex/http.ts`, `components/mail-panel.tsx`). Read-only AgentMail connectivity passed; the unsigned endpoint returned HTTP 401. No real email was sent. Live signed receipt, delivery/bounce handling and reconciliation remain pending.

All 32 automated tests, TypeScript, targeted lint and the full frontend build passed. The local sign-in page returned HTTP 200. New browser-flow acceptance remains blocked by a browser runtime initialization error; this is not a production publication or end-to-end mail completion claim. Updated `BACKLOG.md` and backend setup documentation with remaining gates.

Replaced webhook-based receiving with backend AgentMail API polling at the owner's request (`convex/crons.ts`, `convex/mailPolling.ts`, `convex/mailPollingActions.ts`). Each inbox waits five minutes between completed checks, with shared read quotas, Retry-After cooldown, capped exponential failure backoff, page checkpoints and duplicate-message protection. Removed the webhook endpoint and Svix dependency; no signing secret is required. Existing mail records were preserved.

Development logs confirm recurring dispatcher execution and the retired webhook returns HTTP 404. All 37 automated tests, TypeScript, targeted lint and the full frontend build pass. The inbox UI displays last-check and delayed-check status; PRD, setup guide and backlog now describe API polling. Live incoming-message receipt and browser acceptance remain unverified, and no email was sent.

### 2026-09-13
Verified the interrupted profile/entry slice: owner-scoped editing, stale-revision rejection, confirmed reversible profile archive/restore, and navigation-preserved new-entry drafts. Profile changes invalidate earlier unsent mail approvals (`convex/profiles.ts`, `convex/objectives.ts`, `convex/mail.ts`). Development deployment and 41 tests passed. The pending icon installation finished; TypeScript and the full frontend build passed with the privacy page and shared removable attribution footer.

Added account-owned application-record JSON export on the Profiles screen, including archived history, explicit private-file confirmation, bounded indexed pagination, cancellation and refusal to download partial results (`convex/dataExport.ts`, `components/data-export.tsx`). Authentication records, credentials and raw Agent conversations are excluded. All 43 backend tests pass, including isolation across twelve application tables and multi-page export. Export TypeScript, targeted lint, development deployment and the full frontend build passed. Homepage, privacy, sign-in and signup returned HTTP 200; browser download acceptance remains open. Evidence is local source and executed checks, not Git history; no mail was sent or production site published.

Implemented the Interactive Mode development pilot with a dashboard action, explicit profile confirmation, backend-only GPT-Live-1 WebRTC setup, client delegation, start quotas, scheduled hangup and cleanup safeguards. Luna prepares a reviewed brief through OpenRouter; explicit confirmation atomically starts existing Terra guidance. Session metadata joins the private export (`convex/interactive.ts`, `convex/liveActions.ts`, `components/interactive-mode.tsx`). Development push and a non-generating model-access check passed; real audio playback and WebRTC acceptance remain unverified.

Recovered interrupted checks and fixed late voice-event/cleanup races, hidden-tab startup, homepage profile-intent routing and editor draft retention. All 52 tests, TypeScript, targeted frontend lint and the full five-stage build pass; a client-bundle credential-pattern scan found zero hits in 27 files. The local development server recovered after slow startup; homepage, sign-in, dashboard and privacy returned HTTP 200 on port 3000. Browser automation still cannot initialize, so authenticated interaction and actual voice acceptance remain open. Added an Auth V2 compatibility/recovery review and a truthful demo checklist. Evidence is local source and executed checks, not Git history. No email was sent or production Site published.

Preserved manual profile fields and edited AI suggestions across entry-wizard steps, tabs and dialog reopening; added Title Case headings and made Change return to existing profiles (`components/workspace-app.tsx`, `components/ai-intelligence.tsx`). Clarified that profile creation saves immediately, while entry saving does not create another profile. Existing records were left untouched; unsaved drafts still clear on refresh or sign-out.

Replaced raw voice failures with distinct local cooldown, provider quota/access and connection messages (`convex/interactive.ts`, `convex/liveActions.ts`, `components/interactive-mode.tsx`). All 53 automated tests, TypeScript, targeted lint, the full frontend build and development push passed. The latest local dashboard probe timed out, so browser acceptance remains open. No paid voice call was made for these fixes; the reported failures do not establish an exhausted API balance. Paid voice acceptance is deferred pending owner readiness. Evidence is local source and executed checks, not Git history.

### 2026-09-20 - working tree
Added selected-guidance voice discussions and six saved transformation formats, with owner-scoped file downloads/deletion, genuine Word exports, independent daily media quotas and a two-minute audio duration check (`components/guidance-tools.tsx`, `convex/transformations.ts`, `convex/transformationActions.ts`). Direct OpenAI model identifiers are `gpt-4o-mini-tts` and `gpt-image-2`; actual media generation and voice transport remain unverified. Text preparation uses the existing Luna/Terra routing.

Recovered validation: 69 automated tests and targeted lint pass; the full frontend build passes after resolving the local output-folder lock. Added a persisted emerald dark theme and retained light mode (`components/theme-control.tsx`, `app/emerald-theme.css`). Latest development deployment attempt was blocked by local HTTPS/network failure, so no live probe or publication success is claimed. Browser acceptance remains open. Submission readiness now separates core demo verification from billing, retention and broader production work (`docs/submission-readiness.md`). Existing client-mail and tier implementation is documented in BACKLOG.md; Paystack USD setup remains paused at the owner's request.

Later verification cleared the development push using Node system certificate trust and IPv4-first resolution; the full build, TypeScript, changed-source lint and 70 tests pass. One bounded GPT Live 1 backend probe started, received audio and transcript events, and closed without error. Browser microphone/playback and generated media acceptance remain open.

Made emerald the default and locked the release to Free: signup and Plans display disabled paid tiers, with backend checkout/reservation enforcement (`lib/release-policy.ts`, `components/launch-plans.tsx`, `convex/releasePolicy.test.ts`). Billing activation is not a Free-release blocker. Recorded a Better Auth migration evaluation; authentication replacement, recovery/deletion, retention and production publication remain incomplete. No existing account was migrated.

### 2026-09-21 - working tree
Moved the application to original Convex Auth username/password sessions while preserving verified legacy-account migration by user ID. Current credentials block fallback to an older password, browser-supplied identity fields are ignored, JWTs are short-lived, and migration tests cover password proof, throttling persistence and cross-account isolation (`convex/auth.ts`, `convex/authMigration.ts`, `convex/authMigration.test.ts`, `convex/http.ts`).

Added the Life Maxim compass-and-growth logo, an Emerald Dark/Light theme selector, and full-page homepage/auth navigation to avoid stale client-router authentication state (`public/life-maxim-logo.png`, `components/brand-mark.tsx`, `components/theme-control.tsx`, `app/page.tsx`, `components/auth-form.tsx`). Paid plans remain visibly disabled for the Free hackathon release.

Recovered the interrupted validation and development deployment. All 76 automated tests, TypeScript and the five-stage frontend build pass. Bounded live development probes verified real password crypto plus disposable signup, authenticated access, wrong-password rejection, sign-in, token refresh, sign-out and cleanup without changing existing users.

Registered the Life Maxim Codex Sites project and persisted its hosted identity in `.openai/hosting.json`. Prepared the separate Convex production environment with backend-only provider configuration and independent authentication signing keys; secret values and user data remain outside source control. This records release preparation, not a claim that a public Sites version is live.

Deployed the validated schema, indexes, functions, HTTP routes, scheduled jobs and registered components to the separate Convex production deployment. Production began without copying development users or application records.

Moved the frontend deployment to the owner's current ChatGPT Sites account while preserving the same validated application source and Convex production backend. The replacement public Site reached version 1 and its canonical live URL was confirmed by the hosting platform; the browser bundle contains the exact production Convex URL and excludes the development deployment URL (`.openai/hosting.json`).

Configured production `APP_URL` to the canonical replacement Site, `https://life-maxim.newrealmlevel.chatgpt.site`. A public HTTP check returned 200 and identified the Life Maxim application; this aligns authentication callbacks and application links with the live frontend without copying development data or redeploying code.

Completed a real public production journey with a disposable account: signup, profile and entry creation, Terra guidance, a saved article transformation, text download, refresh persistence, sign-out and returning sign-in all passed. The theme preference also persisted. Interactive Mode reached its explicit Start voice control and handled denied microphone permission without creating a paid provider session.

A follow-up release check caught a frontend bundle built against the development Convex URL. The affected version was immediately rolled back; a corrected build contains the production URL and no development URL. This check is now part of the release evidence before republishing.

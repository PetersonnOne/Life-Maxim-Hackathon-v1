# Hackathon log

- **Project:** Life Maxim
- **Event:** Convex All Gas Hackathon
- **What it does:** An AI life-management environment that helps people understand their lives, make decisions, remember what matters, plan objectives, and carry out authorized actions.
- **Live app:** not deployed
- **Repo:** none
- **Frontend:** Codex Sites
- **Convex deployment:** https://robust-lemur-250.convex.cloud (development)
- **Components:** @convex-dev/auth (core, password provider, username), @convex-dev/agent, @convex-dev/rate-limiter
- **Convex features:** schema, indexes, queries, mutations, actions, scheduled functions, crons, realtime queries, ownership checks
- **Auth:** Convex Auth
- **AI models:** openai/gpt-5.6-luna, openai/gpt-5.6-terra (OpenRouter); gpt-live-1 (OpenAI; access verified, audio acceptance pending)
- **Started:** 2026-09-10T02:42:52Z
- **Last updated:** 2026-09-13T16:36:12Z

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

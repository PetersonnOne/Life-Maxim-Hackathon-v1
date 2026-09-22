# Life Maxim

## Submission Description

### A clearer mind. A more possible life.

Life Maxim is a context-aware AI workspace that helps people turn thoughts, questions, and ambitions into researched guidance and actionable plans—for life, work, and business.

Its defining idea is simple: **your life does not fit into one job title, and your software should not force it to.**

Instead of hardcoding the experience around a clinic, law firm, shop, or single profession, Life Maxim lets users define their own contextual profiles. A person can be a founder at work, a parent at home, a community organizer on weekends, and a learner pursuing something new. A lawyer, health worker, business owner, or student can bring their own goals and constraints into the same flexible workspace.

**The user defines the context. Life Maxim helps them move forward within it.**

### The Problem

People juggle responsibilities across disconnected tools: chat conversations, notes, search results, task lists, and email. Useful advice gets buried, context must be repeated, and turning an idea into practical next steps takes extra work. Generic AI conversations can also mix unrelated parts of a person's life.

Life Maxim brings those pieces together while keeping each profile's context distinct.

### How It Works

1. Create a contextual profile or ask AI to suggest one for your confirmation.
2. Start an entry with a question, challenge, idea, or objective.
3. Generate guidance grounded in that entry and its selected profile's confirmed context.
4. Research the web with Firecrawl and retain source links, excerpts, and retrieval dates.
5. Compare options and review an editable plan before explicitly accepting tasks.
6. Revisit saved guidance, discuss it with AI, or transform it into reusable content.

Users can navigate through **User Mode** or talk through their thinking in **Interactive Mode**. The goal is continuity: useful thinking becomes something users can return to and build upon.

### Notable Features

- **Flexible contextual profiles:** Support different roles, professions, businesses, and personal responsibilities without a fixed industry template.
- **Context-aware AI guidance:** Use the selected profile's confirmed information and relevant stored context rather than indiscriminately combining unrelated profiles.
- **Voice interaction:** GPT Live 1 powers Interactive Mode and selected-guidance conversations through “Discuss with AI.”
- **Evidence-backed research:** Firecrawl brings internet information into the workspace with traceable sources.
- **Decision support and planning:** Compare options, examine assumptions, and approve plans before creating tasks.
- **Reusable transformations:** Turn guidance into articles, meeting briefs, business notes, custom text, summarized MP3 audio, and infographics. Saved outputs remain attached to their source guidance, with download and deletion controls.
- **AgentMail workflow:** Register clients with assigned IDs, organize incoming correspondence, support AI-assisted triage and drafting, and keep user review central to responses. Background polling supports inbox work even when the user is offline.
- **Read-only WebMCP tools:** Expose protected workspace information to compatible browser agents without granting email-send or approval authority.
- **Realtime persistence:** Convex keeps profiles, objectives, guidance, plans, activity, and stored assets connected across the experience.

### Why I Built It

I wanted a tool that adapts to the whole person—not just one profession or one workflow. People should not need a separate AI product every time they change roles or pursue a different goal.

Life Maxim combines conversation, context, research, and action in one place. Its distinction is not simply offering another chatbot: it gives useful conversations a durable home, a clear context, and a path toward practical action.

### Tech Stack

- **Convex:** Realtime database, backend functions, authentication, scheduled jobs, and file storage.
- **Firecrawl:** Web research and source retrieval.
- **AgentMail:** Email inbox and correspondence integration.
- **OpenAI:** GPT Live 1 voice interaction, GPT-4o Mini TTS audio generation, and GPT-Image-2 infographic generation.
- **OpenRouter:** Separately funded Terra and Luna API calls for substantive guidance and lighter preparation tasks.
- **React and TypeScript:** Web interface, with ChatGPT Sites hosting.
- **WebMCP:** Protected, read-only browser-agent tools.
- **Codex:** Development, debugging, test assistance, and release work.

### Challenges and Engineering Decisions

The central challenge was making a broad, flexible product feel coherent while protecting contextual boundaries. Other challenges included authentication migration without discarding existing accounts, reliable production deployment, browser and network testing constraints, and controlling the cost of voice and media generation.

The implementation separates lightweight preparation from substantive reasoning and live voice. Provider secrets stay on the backend. Ownership checks protect user records, generated files stay associated with their source guidance, and uncertain email sends are not blindly retried.

### Validation and Milestones

- Published a public ChatGPT Sites release backed by Convex production.
- Passed a recorded run of 76 automated tests, including migration and cross-account checks, alongside TypeScript and build checks.
- Verified production re-login and a mobile dashboard check at 390px without horizontal overflow.
- Verified generation and download of a 67-second MP3 and an infographic during production acceptance.
- Manually verified voice microphone input, playback, interruption, and hang-up in a normal browser.

These are engineering and acceptance milestones, not claims of user traction.

**Life Maxim: one person, many roles, a workspace that adapts.**

---

## Starter and Development Reference

The following reference documents the underlying vinext starter. Optional starter capabilities are not necessarily used by Life Maxim, whose application backend and authentication run on Convex.

A clean full-stack starter running on [vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Portable: Windows, macOS, or Linux; no Bash required
- Managed Linux: managed Linux runtime with Bash, `flock`, `curl`, `sha256sum`, and GNU `timeout`
- Git is required only for publishing

## Sites Lifecycle

The Sites initializer copies the shared starter and selects managed-linux only when `SITES_MANAGED_LINUX_CONTAINER=1`; otherwise it selects portable. It saves the selection only in ignored `.sites-runtime/execution-profile.json`. Both profiles copy/configure first, then use the plugin's separate `install-dependencies.mjs` step to measure installation independently. Edit source under `app/` and follow the Sites skill for installation, preview, builds, and publishing.

Whenever reopening or moving a checkout, run `node <plugin-root>/scripts/configure-execution-profile.mjs` before project commands. Profile changes do not alter tracked source or require reinstalling otherwise-valid dependencies; restart an existing preview to use the new selection. Do not commit or upload `.sites-runtime/`.

This starter does not use `wrangler.jsonc`.

`install:ci` runs `npm ci` once against the shared lockfile, disables parent-workspace discovery, and includes required dev/optional dependencies despite production/omit settings. Sharp defaults to prebuilt binaries unless explicitly configured otherwise. Do not overlap installers.

- **Portable:** Preserve host HOME, npm cache, registry, proxy, temporary paths, retry/concurrency settings, and lifecycle-script policy. Use `--prefer-offline --no-audit --no-fund`.
- **Managed Linux:** Use the existing project-local HOME/cache/tmp setup and Linux install lock, tarball preflight, and timeout. Restore the image-seeded npm cache only when its lockfile hash matches; retain network fallback. Builds keep their existing timeout. These helpers are not invoked by the portable profile.

`scripts/sites-env.mjs` preserves the caller's HOME, npm cache, proxy, XDG, and temporary-directory configuration while defaulting Wrangler and Miniflare state to the checkout. If npm reports an unwritable cache, select a writable path with `npm_config_cache` for that install. The `dev` and `start` scripts also keep Wrangler logs inside the checkout. Generated `.sites-runtime/` and `.wrangler/` directories are disposable and ignored by Git.

On portable, `npm run dev` uses `vinext dev` with HMR, starting at port 5173. Vinext records the running server in ignored `.vinext/` state, rejects an ordinary duplicate launch, and recovers stale state after a stopped process; exactly simultaneous starts can race. Pass `--port <port>` or `--hostname <host>` after `npm run dev --` when needed; keep portable previews on loopback.

On managed Linux, use `sites-preview start` only for requested browser QA. The project's dev script runs Vite and accepts the supervisor's `--host 0.0.0.0 --port 4173 --strictPort` arguments. The internal browser uses `http://terminal.local:4173/`; it is not a user-facing URL. The supervisor owns the preview lifecycle. The ignored local profile survives the supervisor's cleared process environment.

The portable profile simulates ChatGPT sign-in only for loopback development requests. Visit `/signin-with-chatgpt?return_to=/` to sign in as `local_seedy` (`seedy@sites.test`, display name `Seedy`) and `/signout-with-chatgpt?return_to=/` to sign out. The development cookie preserves that identity across server restarts. Mock auth is disabled in the managed-linux profile and is not included in production builds; hosted authentication remains dispatch-owned.

The Worker uses `vinext/server/fetch-handler`, including Vinext's config-aware image handling. After building, `npm start` runs that Worker locally through Wrangler on `127.0.0.1`, sharing `.wrangler/state` with dev preview and local D1 migrations; it does not deploy the site or simulate sign-in. Use the URL printed by the server. Pass `npm start -- --port <port>` to select a different built-preview port.

Local previews use Miniflare's placeholder `Request.cf` metadata without a network lookup. Set `CLOUDFLARE_CF_FETCH_ENABLED=true` to opt into fetching preview metadata; this setting does not change hosted request metadata.

Local tool usage metrics are disabled by default. Set `WRANGLER_SEND_METRICS=true` to opt in.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `@cloudflare/workers-types` provides Worker types; `cloudflare-env.d.ts` declares optional `DB`/`BUCKET` bindings—update these declarations if binding names change
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Use it as the durable user key; use email and name for display or contact purposes.

SIWC-authenticated workspace sites may also receive `oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty `name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by `oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use the returned `userId` as the stable user key for user-owned records; do not use email as a durable identifier.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send anonymous visitors through Sign in with ChatGPT.
- In a Server Component, start sign-in with `<a href={chatGPTSignInPath(returnTo)} target="_top">`. The auth helper module is server-only; do not import it into a Client Component.
- Do not use `fetch`, XHR, a client-side router, or a framework link that can prefetch the sign-in route. SIWC must start as a top-level navigation.
- Never request the AuthAPI authorization endpoint directly. The dispatch-owned `/signin-with-chatgpt` route must start the SIWC flow.
- Use `chatGPTSignOutPath(returnTo)` for browser sign-out links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth cookies, and identity header injection. Do not implement app routes for those reserved paths. Routes that do not import and call the helper remain anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the Sites hosting platform's access policy controls for workspace-wide restrictions, or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write actions tied to the current ChatGPT user. Leave public content anonymous.

## Local D1 migrations

For a D1-backed local preview, generate SQL with `npm run db:generate`. Build once through the Sites skill's build entrypoint (or `npm run build` for standalone use) to generate `dist/server/wrangler.json`, rebuilding if bindings change. From the project root, apply each pending migration in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_example.sql
```

Replace the filename with the pending migration and `DB` with your D1 binding name if different. Use `.wrangler/state`, not `.wrangler/state/v3`; Wrangler adds the versioned directories. Do not replay migrations already applied locally. This updates only the preview database; publishing applies production migrations separately.

## Diagnostic Commands

- `npm run install:ci`: perform the one locked dependency install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Sites artifact
- `npm run start`: preview the built Worker locally with D1/R2 support
- `npm run db:generate`: generate Drizzle migrations after schema changes

When using the Sites plugin, follow its skill instructions for installation, builds, and publishing. These npm commands remain available for standalone use.

The portable build runs Vinext directly without a host `timeout` command. The managed-linux build uses `scripts/build-verified.sh` and its existing `SITES_BUILD_TIMEOUT` setting.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

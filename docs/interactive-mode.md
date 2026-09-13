# Interactive Mode — development pilot

Implemented September 13, 2026. This is the first usable slice of `PRD-EXTENSION-Interactive-Mode.md`, not acceptance of every requirement in that extension.

## Using it

1. Sign in and click the conspicuous **Interactive Mode** button above the dashboard content. It is not a sidebar entry. The existing click-driven workspace remains **User Mode**.
2. Select/create a profile or use the existing AI suggestion and confirmation flow. Confirm the profile and choose a new discussion or an existing entry.
3. Click **Start voice** only when ready to share microphone audio and the selected context with OpenAI. Allow microphone access. Alternatively, type notes without a voice connection.
4. Click **Stop voice & prepare brief**. Luna uses OpenRouter to propose a bounded editable brief. You may write the brief manually without this call.
5. Review the title, goal, context/constraints and questions. **Confirm brief & start Terra guidance** saves the brief, creates an entry if needed, and atomically queues one existing Terra guidance request. Retries cannot duplicate the entry or response.
6. Research and planning cards use the existing explicit request controls, Firecrawl and OpenRouter. These are not automatically launched by speech or transcript events. Plans still require acceptance before tasks exist. Mail remains in User Mode with its existing version-bound approval and separate send action.
7. **Discuss results** opens a new paid voice connection using the confirmed brief and bounded excerpts from stored guidance, evidence and the latest plan. Pending results are not presented as completed. Review the full cards for details and citations.

## Cost and privacy controls

- Direct `gpt-live-1` WebRTC, with server-owned session configuration and the existing `OPENAI_API_KEY` in Convex. No API key or ephemeral credential is returned to the browser. The broker returns the SDP answer and connection deadline; opaque provider session IDs can appear in protocol events and the owner's private metadata export, and are not authentication credentials.
- Client delegation only. No OpenAI Responses backend, hosted search, direct voice email tools or Convex AI Gateway. Agent and Rate Limiter components already installed are reused; no new package or server was added. Existing independent backend operations are reused rather than introducing a second orchestration system.
- Five-minute scheduled server hangup, one outstanding connection per account, one start per minute, six daily starts per account and twelve daily starts across this development deployment. Quota is consumed before the paid request; early stops and rejected requests are not refunded. These deliberately conservative **start allowances are not a provider-enforced dollar budget**.
- Server cleanup calls the Live hangup API and retries cleanup up to three times with 15/30/45-second delays. Paid session creation is never automatically retried. Unknown creation outcomes retain an account lock. A missing provider ID or persistent cleanup failure requires operator reconciliation; do not clear the lock blindly. Configure provider billing alerts/limits independently before public release.
- Profile changes/archiving are checked on the client and by a server check every 30 seconds while active. A new discussion is required to confirm changed profile metadata. Previously sent information cannot be retracted from a provider.
- Stop immediately disables local microphone input and requests server hangup. Client transport cleanup waits briefly for finalization. Mute alone continues consuming voice time. The page displays server connection status separately from local microphone state; it does not report final billed usage.
- The ordinary client also stops voice when hidden, on navigation/unmount, or after 90 seconds without a user transcript fragment. This idle heuristic needs real conversation testing; lack of transcript fragments is not authoritative proof of silence. The server duration limit remains independent of browser timers.
- Life Maxim does not store raw audio or live caption history; provider `store` is explicitly false. Browser captions retain at most 600 fragments; brief preparation uses at most 12,000 characters. Unsaved notes/captions clear on leaving the discussion. The brief is reviewed before durable storage; session and connection metadata are retained and included in the existing private JSON export.
- OpenAI/OpenRouter have their own processing policies. Disabling recording is not a promise of provider-wide zero retention. Account deletion and configurable retention remain existing launch gates.

## Verification and remaining acceptance

Verified: backend development push, model access (`GET /v1/models/gpt-live-1`: HTTP 200, no generation), selected-profile context isolation, ownership, duplicate/reserved starts, canceled startup, repeat confirmation, mocked WebRTC request configuration and fail-closed provider errors. No real microphone audio was captured by automation.

Browser automation cannot initialize in this environment. Microphone playback, full-duplex interruption quality, permission-denied recovery, real WebRTC creation/hangup, mobile layout and final provider usage reconciliation still require acceptance. A successful model lookup does **not** prove a working voice call.

Recommended first manual test: use a non-sensitive test profile; talk for 20–30 seconds about a simple goal; verify captions and audible reply; press Stop; wait for server status `closed`; prepare and review a brief; confirm once and verify one entry and one guidance response. Then test typed-only mode, deny microphone permission, switch tabs, and repeat confirmation without duplication. Do not include private medical, legal or financial details during this development test.

Remaining PRD extension work: combined research-to-report workflow with reviewed scope, durable job cancellation and progress; richer session summary/resume and opt-in transcript policy; final usage reconciliation and operator controls; accessible audio acceptance and production abuse/billing limits. Use the official Workflow component if implementing a combined durable multi-step pipeline.

## Official API references

- [Live WebRTC creation and transport](https://developers.openai.com/api/docs/guides/voice-webrtc?api=live)
- [Live create schema and frontend event permissions](https://developers.openai.com/api/reference/typescript/resources/live/methods/create)
- [Client delegation](https://developers.openai.com/api/docs/guides/live-delegation?delegation-mode=client)
- [Session lifecycle and transcripts](https://developers.openai.com/api/docs/guides/live-conversations)
- [Server hangup](https://developers.openai.com/api/reference/typescript/resources/live/subresources/sessions/methods/hangup)

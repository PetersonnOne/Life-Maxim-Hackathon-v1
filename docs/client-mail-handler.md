# Client Mail Handler — requested extension

Status (September 19, 2026): development implementation added. Customer registration, automatic IDs, routing, durable triage/acknowledgement workflow, queue UI and approved threaded replies are implemented. Live end-to-end acceptance is still open; no real email was sent by the implementation tests.

## User workflow

1. In the profile-scoped AgentMail Handler workspace, the owner registers a client name and approved sender address. Convex automatically assigns a unique `LM-…` Client ID. Routing lookups are profile-scoped, not publicly discoverable. Owners can deactivate clients.
2. The owner shares the profile inbox address and a subject convention such as `[Client ID: …]`. The ID is a routing identifier, never a password or proof of identity.
3. Existing Convex cron dispatch checks due inboxes while the browser is closed. Normal checks wait at least five minutes after completion; quotas, provider cooldowns and failures can delay them.
4. New messages are deduplicated by provider message ID and matched against the profile's active client registry. Unknown IDs, mismatched senders, provider authentication failures, spam and automatic mail do not receive automated responses; retain a bounded review/quarantine record rather than silently trusting them.
5. A restricted Luna worker produces a structured summary, urgency and suggested reply for review. Email is untrusted data, never executable instructions. No tool access, cross-profile memory retrieval, automatic research or substantive outgoing answer is authorized by incoming content.
6. With the owner's explicitly enabled acknowledgement policy, send a fixed receipt acknowledgement to the registered client address, at most once per client per day. AI cannot choose recipients or wording. The exact acknowledgement is displayed before enabling the policy. The policy starts disabled.
7. The owner sees pending, in-progress, resolved, quarantined and failed-processing mail with original plain text, client match, AI assessment and acknowledgement state. All reads and writes remain account/profile scoped.
8. Review / Write Reply opens a linked entry. Use its Research or Overview tab for explicitly requested help; use Inbox & approvals to edit the prepared draft, approve its current version, then send. The AgentMail reply endpoint preserves the incoming thread. Changing a client reply to an unrelated recipient is rejected.

## Implemented controls and current limitations

- Five-minute minimum API polling continues without an open browser. Provider cooldowns and shared quotas can delay it; this is not a five-minute delivery SLA.
- Convex Workflow checkpoints triage and acknowledgement separately. Paid actions have no automatic retries. Message-ID deduplication prevents repeated polling from starting duplicate workflows.
- Sender must match the active registered client, ID must be unambiguous, and receipt time must be after handler activation. Provider spam/blocked/unauthenticated labels are excluded before intake. Missing automatic-mail headers fail closed. ID matching does not eliminate phishing or authenticate the human sender.
- Quarantined mail receives no AI work or automatic reply. AI failure leaves the original message available. Ambiguous sends remain `uncertain` and are not retried automatically.
- Monthly plan allowances and global safety caps protect AI and outgoing-mail spend. Acknowledgements consume the outgoing-mail allowance. Attempts reserve quota before external work; failures can consume allowance.
- Client and billing records are included in the private paginated export.
- Current queue displays the newest 50 profile messages; client list is capped at 500 rows. Full queue/client pagination, reactivation/editing, retention/deletion and delivery/bounce suppression reconciliation remain launch work.
- Automated tests cover routing, ownership, deduplication, fixed-recipient acknowledgements, uncertain-send prevention and entitlements. Live offline intake → workflow → acknowledgement → approved response and authenticated browser acceptance remain unverified.
- Paystack integration, paid-tier inbox provisioning and shared AgentMail capacity: `docs/billing-and-tiers.md`.

## Required safeguards and acceptance

- Client ID plus a matching From address is not sufficient authentication. Use provider-authentication evidence; uncertain authentication goes to human review. Never describe this as eliminating scams.
- Ignore bounce, bulk and auto-generated messages for auto-acknowledgement. Send at most one acknowledgement per eligible incoming message, with an additional thread/client cooldown and per-owner/global quotas.
- Use a durable workflow for the composite processing pipeline. Persist per-stage status, cancellation and recovery information. Never automatically resend after an ambiguous provider outcome.
- Recheck client activation, profile ownership/archive state and acknowledgement policy immediately before dispatch. Registering clients or enabling policies must not retroactively send old acknowledgements without a separate explicit action.
- Show errors and uncertain outcomes in the workspace. AI failure must not hide the original message or falsely mark it handled.
- Extend private exports, deletion and retention coverage to client records and processing metadata. Do not expose contacts, IDs or email bodies in public logs or WebMCP without a separate authorization design.
- Test owner isolation, duplicate polls, subject parsing, sender mismatch, prompt injection, auto-reply loops, quotas, disabled policies, archival races and uncertain delivery before enabling live automatic acknowledgements.
- Live outbound acceptance requires an owner-approved test recipient and final test content. No live mail was sent while documenting this extension.

## Existing pieces to reuse

`convex/crons.ts`, `convex/mailPolling.ts`, `convex/mailPollingActions.ts` provide scheduled polling. `convex/mail.ts` and `convex/mailActions.ts` provide owned inboxes, stored messages and manually approved outgoing drafts. Existing Agent and Rate Limiter components support bounded AI processing and usage controls. Keep AgentMail API polling; do not add webhooks or replace the provider.

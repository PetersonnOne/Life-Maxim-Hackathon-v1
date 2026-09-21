# Life Maxim — remaining work and submission readiness

Reviewed September 20, 2026. A saved implementation is not an end-to-end acceptance pass.

## Confirmed release decisions

- ChatGPT Sites is the selected host; do not reopen the hosting decision.
- The owner confirms the GitHub repository is public, has an initial push, and
  includes root hackathon.md online. Future changes still need a reviewed push.
- The public release is Free-only. Premium and Premium Plus stay visible at signup
  and in Plans with “Disabled until after Hackathon”; checkout and reservation are
  rejected on the backend as well. Existing billing infrastructure is preserved.
- Paystack completion, paid-plan activation and billing hardening are post-hackathon
  work, **not blockers for a Free public release**. No money should be collected.
- Emerald is the default theme; an existing explicit saved theme is respected.
- Recovery must use an independently verified recovery email, not an app inbox
  accessible only after login. Current Auth V2 compatibility/security decision is
  pending; no unsupported reset/deletion endpoint has been exposed.
- Production target discovered through the CLI: `dapper-gecko-926`. No production
  write is authorized by discovery alone; confirm the exact write before execution.

## Priority before the hackathon deadline

1. Finish the latest development deploy, tests and build; verify the new emerald
   theme and guidance dialogs in an authenticated browser.
2. Prove actual Interactive Mode / Discuss with AI voice connection and shutdown.
   A successful model lookup alone is insufficient. Test text, MP3 and infographic
   transformations, downloads, persistence and deletion.
3. Prove one controlled AgentMail client-service round trip: registered sender and
   client ID, five-minute offline polling, triage, optional acknowledgement, and
   user-approved reply. Quarantine mismatches; verify no duplicate sends. Obtain
   an explicitly approved test recipient/content before sending mail.
4. Run the principal user journeys: signup, profile suggestions/confirmation,
   retained drafts, guidance, research, plan acceptance, export, sign-out and
   cross-account isolation. Check phone layout, keyboard focus and contrast.
5. Publish a stable public chatgpt.site frontend with the approved Convex backend
   and correctly configured auth origins/secrets. Production changes require
   explicit approval; a local build is not publication.
6. Confirm repository visibility, scan for secrets/private files, update README and
   hackathon.md, record a video under three minutes, share the build on social media,
   and submit the repository/live URL/video on vibeapps.dev. No submission has been made.

## Further work for a complete public product

- Account recovery and the Convex Auth V2 alpha upgrade/rollback review.
- Account deletion, file/record retention and reliable operational cleanup.
- Email delivery/bounce/suppression reconciliation, client editing/reactivation,
  queue pagination, provider inbox capacity and operator recovery.
- After the hackathon only: Paystack USD approval and checkout/renewal/cancellation/
  failure tests, refunds/disputes and billing reconciliation. Not a Free-launch gate.
- Interactive Mode's combined research-to-report pipeline, durable cancellation
  and progress, richer resumable summaries and final voice usage reconciliation.
- Production cost ceilings, abuse checks, monitoring and backup/restore rehearsal.

## Development versus production

The official rules require a public **convex.site or chatgpt.site** app accessible
without an invite. Localhost is explicitly excluded. They do not explicitly specify
the Convex backend deployment label (development versus production); this is not
an organizer guarantee that every development-backed configuration qualifies.
Use a separate production deployment for stability and separation from test data.
Production readiness and hackathon eligibility are different thresholds.

Required materials: public GitHub repository, root hackathon.md, public live URL,
and a demo video under three minutes. The official page also asks for a social post
tagging the sponsors. Deadline: **September 22, 2026 at 12:00 PM Pacific (20:00 Lagos)**.

Sources checked September 20, 2026:
- https://www.convex.dev/hackathons/all-gas
- https://luma.com/convex-allgas-hackathon

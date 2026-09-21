# Life Maxim — remaining work and submission readiness

Reviewed September 21, 2026. A saved implementation is not an end-to-end acceptance pass.

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
  accessible only after login. Original Convex Auth is now active; recovery and
  deletion lifecycle work remains separate and is not falsely exposed as complete.
- Production deployment `dapper-gecko-926` and the replacement ChatGPT Site are
  live. Production `APP_URL` is verified as
  `https://life-maxim.newrealmlevel.chatgpt.site`.

## Priority before the hackathon deadline

1. Run authenticated production browser acceptance for original Auth, the emerald
   theme, profile/entry creation and the principal dashboard journeys.
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
5. Record a video under three minutes, make the required social post, and submit the
   public repository, live URL and video on vibeapps.dev. No submission has been made.

## Further work for a complete public product

- Independently verified recovery email and reset flow for original Convex Auth.
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

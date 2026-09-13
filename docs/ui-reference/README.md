# Life Maxim UI reference guide

These five boards define the intended visual language and core product journeys for the Life Maxim web app. They are implementation references rather than pixel-perfect specifications; accessible, responsive code and real product data take precedence.

## Boards

1. `01-homepage.png` — public homepage, product promise, workflow, trust, and calls to action.
2. `02-auth.png` — Convex Auth V2 sign-up and sign-in using username and password.
3. `03-dashboard-profiles-new-entry.png` — dashboard, active profile context, profile management, and the mandatory new-entry profile gate.
4. `04-objective-workspace.png` — one unified objective workspace with evidence, memories, options, criteria, scenarios, plan, approvals, and activity.
5. `05-inbox-approvals-mobile.png` — AgentMail inbox, external-action review, explicit human approval, action receipt, and responsive mobile states.

## Visual system

- Warm ivory background: `#F7F4ED`
- Midnight navy: `#0B1020`
- Primary indigo: `#5B6CFF`
- Success mint: `#48E0B8`
- Approval amber: `#F4B860`
- Rounded cards, thin neutral borders, restrained shadows, generous whitespace, and accessible contrast
- Amber is reserved for approval-required states; mint communicates successful completion

## Product rules represented

- Life Maxim is globally neutral; examples must not imply a default city, country, profession, or lifestyle.
- One account may contain several profiles. A profile is context, not another login identity.
- Every new entry begins by selecting a profile, creating one, or asking AI to suggest one.
- AI-inferred profile suggestions are never saved until the user confirms them.
- Authentication uses username and password. Passkeys are not part of the MVP reference flow.
- An objective remains one canonical workspace; research, decisions, scenarios, plans, approvals, and activity are lenses over the same record.
- External communication and consequential WebMCP actions show the recipient, information shared, and expected effect before execution.
- AgentMail drafts may be prepared automatically, but sending requires explicit human approval.
- Every approved action produces a visible status trail and receipt.

See the full product requirements in [`../../PRD.md`](../../PRD.md).

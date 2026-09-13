# Life Maxim development demo and acceptance script

Use synthetic, non-sensitive data. This is a rehearsal checklist, not a claim that the browser flows below have passed.

## Five-minute product story

1. **One account, different contexts.** Sign in, open Profiles, create two broadly named profiles and confirm them. Explain that AI suggestions never silently assign a profile.
2. **A goal with a home.** Create a simple learning objective under one profile. Add a confirmed preference such as short practice sessions. Show the same entry in User Mode.
3. **Talk or type.** Open the dashboard's Interactive Mode button, confirm that profile and select the entry. The microphone must remain off until Start voice. If voice has not passed acceptance, use typed notes and explicitly describe live voice as unverified; do not simulate a successful call.
4. **Reviewed handoff.** Prepare one Luna brief or fill it manually, edit a detail, then confirm once. Show the saved brief and one Terra guidance result. Voice should be stopped during this work.
5. **Evidence, then a plan.** Explicitly request one bounded Firecrawl research run with the appropriate selected country. Show source URLs and dates. Request a Terra plan, edit a step, then accept. Tasks must not exist before acceptance, and a repeat click must not duplicate them.
6. **Actions remain controlled.** Show mail draft/approval controls without sending anything. Explain that receiving uses API polling, not webhooks. A real send requires an approved recipient and exact final content outside this rehearsal.
7. **Return and retain control.** Reopen the saved objective, show its activity and profile context, then show privacy and export controls. Finish by distinguishing development status from a published production Site.

## Required checks to record

Record date, browser, viewport, account label (not credentials), expected behavior, observed outcome and pass/fail. Do not put private application records or inbox addresses in the public hackathon log.

| Check | Expected result |
| --- | --- |
| Homepage → create profile while signed in | Opens the profile dialog, not an unrelated empty dashboard |
| Same flow while signed out | Sign-in/signup preserves the profile intent |
| Close/reopen profile or entry editor | Keeps the edit draft within its containing module; Discard clears it |
| Start denied microphone | Helpful error, no paid connection automatically retried |
| Start voice, speak for 20–30 seconds | Audible AI response, captions, no automatic research or mail |
| Interrupt / mute / stop | Interruption works; mute is visibly distinct from ending; stop leads to server closed state |
| Change tab during startup or conversation | Capture stops; server cleanup is requested |
| Restart after stopping | Old session events cannot close or overwrite the new connection |
| Confirm brief twice | One entry and one guidance request |
| Another account | Cannot read or mutate the first account's sessions or objectives |
| Export | Confirmed private download includes fourteen owner-scoped record types and no auth credentials |
| Keyboard / small screen | Reachable mode switch, labeled controls, visible focus, usable scrolling and readable sidebar |

Remaining launch gates are authoritative in `BACKLOG.md`, including real voice acceptance, mail reconciliation, privacy lifecycle, Auth V2 readiness, and explicit production publication approval.

# Product controls and acceptance checks

## Profiles and entries

Profile edits require account ownership, bounded fields, a unique normalized name,
and the revision originally opened by the editor. Revisions advance monotonically,
including same-millisecond edits. A stale form is rejected instead of overwriting
another session; the typed input remains visible for copying before reloading.

Archiving requires typing the exact profile name. It retains entries, tasks,
memories and mail history, removes the profile from new-entry selection, and pauses
inbox polling. Archived profiles are listed with pagination and can be restored,
subject to the 100-active-profile limit. Creating a profile with an archived name
requires restoration rather than silently selecting the archived record.

Profile edits, archive and restore invalidate previous unsent mail approvals.
Both send submission and dispatch recheck the profile revision. Already-dispatched
mail cannot be recalled. These controls do not delete provider-side inboxes.

Entry editing updates title, description, desired outcome and optional deadline.
It preserves the selected profile and linked history; profile reassignment is not
exposed by this editor. Existing AI responses and plans are not regenerated.

New-entry drafts remain in the mounted workspace's React state across dialog
closure, profile-choice changes and workspace section navigation. They are cleared
after successful creation or explicit discard, and on refresh/sign-out. They are
not written into persistent browser storage. Profile/entry edit forms now retain
their controlled input and original saved revision after closing/reopening an editor.
Profile edits survive while the Profiles module remains mounted; entry edits survive
while that entry remains open. Explicit discard, leaving the containing module,
refresh or sign-out clears them. Durable cross-navigation draft recovery remains future work.

## Privacy and attribution

`/privacy` explains the current development implementation, provider data flows,
available controls and the absence of self-service account deletion and retention
settings. The Profiles screen now includes a bounded private application-record
export; see `docs/data-export.md` for its scope and limitations. This is not a
completed production privacy policy.

The root layout includes the removable Sites/Convex footer with the bundled logos.
Life Maxim currently resolves to a light theme; footer CSS also supports an explicit
dark ancestor. Full visual theme/accessibility acceptance has not been completed.

## Remaining browser acceptance

- Edit a profile in one tab, then attempt saving a stale form in another.
- Archive only after exact-name confirmation; verify active selection disappears,
  historical entries remain, and restore returns the profile to the picker.
- Approve an unsent draft, edit/archive/restore its profile, and verify fresh
  approval is required. Do not send a real message without approved content.
- Enter a new-entry draft, change profile, close/reopen the dialog and navigate
  between workspace sections; verify all entry text remains until discard/save.
- Edit entry details, clear a deadline, and confirm tasks and profile are unchanged.
- Check narrow-screen tabs, dialog scrolling, keyboard focus, privacy links and
  footer logos. These require browser testing, not just a successful build.

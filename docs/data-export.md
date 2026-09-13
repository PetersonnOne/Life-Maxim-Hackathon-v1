# Application-record export

In the dashboard, open **Profiles → Your account data**, acknowledge the private-file warning, then choose **Download my application data**. This exports all profiles under the signed-in account, regardless of the active profile filter. Archived profiles are included.

## Scope and safeguards

- Explicit allowlist: profiles, objectives, memories, tasks, activity, saved AI guidance, research runs and evidence, plan proposals, inbox metadata, mail drafts and received messages, interactive sessions and voice connection metadata.
- Each page derives ownership from Convex Auth. No caller-supplied owner ID is accepted. Login/authentication records, credentials, provider secrets, raw Agent component conversations, provider-side copies and backups are excluded.
- Owner indexes provide stable creation-order pagination. Each request targets at most 20 records and requires row/byte read limits. No whole-table collection or new external service is used.
- The browser stops without downloading a partial file on errors, cancellation, account mixing, more than 10,000 records, more than 16 MB of serialized record pages, or excessive/non-advancing pagination.
- Navigating away from Profiles or signing out cancels the pending export. Temporary data stays in memory until download; the download itself remains on the user's device and must be protected there.
- Separate pages are not a transactional snapshot. Avoid editing during export. The JSON is not an importable/restorable backup, and does not claim complete provider or authentication data portability.

## Verification

`convex/dataExport.test.ts` covers unauthenticated rejection, owner isolation across all fourteen tables, archived records, pagination beyond one page, and invalid read limits. These tests use in-memory synthetic records, not real account data or provider calls.

Browser acceptance still needs: warning checkbox gating, a synthetic-account download and JSON inspection, cancel/navigation/sign-out during export, empty account, error display, narrow viewport and keyboard operation. Account deletion and retention settings are separate remaining launch requirements.

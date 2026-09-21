# Original Convex Auth migration

The owner selected original Convex Auth, not Better Auth. The active package is pinned to `@convex-dev/auth@0.0.95`; the original library remains officially beta. This is not a claim of stable/GA status.

## Credential and data preservation

- New sessions, password hashing, refresh and sign-out use original Convex Auth and its app-owned auth tables. JWT lifetime is five minutes.
- A custom ConvexCredentials wrapper preserves username/password login. It uses the pinned Password provider's built-in cryptography, not a custom hash algorithm.
- Legacy V2 component tables remain mounted under their existing names via a pinned package alias. They exist only for migration compatibility, not as the new frontend authentication provider. Their keys are not overwritten.
- Sign-in first checks for a current credential. Only when absent does an internal mutation verify the old password with the legacy component, including its attempt limiter. Successful proof creates an original-auth account referencing the same application user ID.
- The callback never links by name or unverified email. Browser-supplied user IDs/profile fields are ignored. A current credential disables legacy-password fallback. Legacy normalization and input validation are retained.
- Signup refuses names already in the legacy directory. Existing user/profile/objective IDs and ownership relationships are unchanged.
- New JWT keys are distinct. The auth issuer now discovers the original-auth JWKS endpoint; old V2 tokens are not an accepted migration proof. The frontend uses a new token-storage namespace and existing users sign in again.

## Verification and rollout

In-memory tests cover original-auth signup/session issuance, migration ownership, incorrect passwords, rate-limit persistence, forged profile IDs, Unicode normalization and session-shaped ownership resolution. The legacy WASM verifier is mocked only in those in-memory tests; `authVerification:legacyCrypto` separately checks the real verifier on Convex without writing application records. The local smoke-test script creates a random empty test account, tests real API flows, and removes that test account through a narrowly guarded internal cleanup.

A pre-switch development snapshot including storage was exported on September 20. It is available in the development dashboard snapshots. A restore into an isolated deployment has NOT been rehearsed. Do not describe the backup as restoration-tested.

Production is not changed by development rollout. Before production: rehearse existing-account migration/restore, verify browser refresh/sign-out and stale-token behavior, configure production-only signing keys, and obtain exact-target approval.

## Still required

Verified recovery-email enrollment and reset, account deletion/session revocation, legacy credential cleanup, retention jobs, and production browser acceptance remain separate unfinished work. Original Auth supplies primitives for these; this switch does not make their UI or lifecycle implementation complete. Do not remove legacy components until affected accounts are migrated and their retirement is explicitly planned. Do not restore the whole snapshot over later writes without a reviewed recovery plan.

Sources: [original auth](https://docs.convex.dev/auth/convex-auth), [passwords](https://labs.convex.dev/auth/config/passwords), [manual setup](https://labs.convex.dev/auth/setup/manual).

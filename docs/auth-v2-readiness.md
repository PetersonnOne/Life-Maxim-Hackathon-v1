# Convex Auth V2 readiness review

Reviewed September 13, 2026 against the installed package, application wiring and the current [official password guide](https://auth-v2.previews.convex.dev/login-providers/password).

## Current state

Life Maxim retains the requested username/password authentication. `package.json` pins `@convex-dev/auth` to `2.0.0-alpha.1`; preserve the lockfile as well as that version when reproducing the build. Core, username and password components are registered, and `convex/auth.ts` uses the provider setup functions with the app-owned user-creation callback. The installed password component implements Argon2id hashing, validation and per-account verification throttling. No custom password hashing or public arbitrary-user password setter was added.

The application currently exports sign-up, sign-in, sign-out, refresh and authentication checks. It does not provide a forgot-password recovery channel, recovery codes, a change-password screen, complete session-management UI or self-service account deletion.

## Material compatibility finding

The current official guide explicitly warns that Auth V2 is alpha and should not yet be used in production. It now documents a `changePassword` export and sign-in/sign-up results with `status: "complete"`. The installed source in this checkout does not expose that change-password wrapper, while this app uses its installed `success` result contract. Do not paste newer examples into the pinned package or silently reinstall an unreviewed preview build.

This is a production gate, not a reason to replace the user's chosen authentication during development. No package, credential or existing account was changed during this review.

## Required upgrade and rollback gate

1. Identify an exact supported release/artifact and review its migration instructions; preserve the current lockfile and source state.
2. Use an isolated development/preview deployment and synthetic accounts. Do not experiment on production or rely on an application JSON export as an auth backup.
3. Verify existing-account sign-in, fresh signup, validation errors, refresh, sign-out, stale-token handling and cross-account isolation before adding the new password-change wrapper.
4. Prove password change rejects the wrong current password, never logs credentials, and has documented session-invalidation behavior. Keep username/password as the product's selected method.
5. Choose and verify an independent recovery factor/channel before offering forgot-password. The app-generated AgentMail inbox is not automatically a verified external recovery address; do not use the lost account itself as its sole recovery proof.
6. Rehearse backup/restore including authentication-component state before promoting a migration. Rolling back code alone may not reverse a schema or credential migration.
7. Obtain fresh target-specific production approval only after the alpha warning and security/recovery gates are resolved.

An account-recovery implementation needs a product decision about the verified recovery channel. Never create a public password reset accepting only a username, user ID, profile name or AI assertion of identity.

# Production authentication evaluation

Reviewed September 20, 2026. Evaluation only: no authentication package, existing account or production deployment changed.

## Recommendation

Evaluate a pinned, non-prerelease Better Auth release with the official Convex Better Auth component in an isolated development deployment. Keep username/password sign-in and require a verified external email for recovery. This is a candidate implementation, not a claim that Life Maxim has passed production acceptance.

The official Convex integration explicitly supports the Username plugin. Better Auth documents email verification, password recovery, session management and user deletion. Its username signup requires an email, so the signup form must collect the recovery address; do not invent placeholder email addresses. No additional hosted identity-provider account is needed for the self-hosted integration, but email delivery and abuse controls remain our responsibility.

Clerk is a credible alternative with a documented Convex integration and managed identity infrastructure. It introduces a separate provider account/configuration and operational dependency. Better Auth is the preferred candidate here because it keeps authentication data in the Convex component and preserves the chosen username/password experience.

## Existing account safety

Current code pins Convex Auth V2 alpha. Its app user IDs are used throughout ownership checks, including profiles, guidance, mail, exports and transformations. Replacing a React provider alone would break this boundary.

1. Preserve the existing development deployment and accounts. Back up component state as well as application data before a migration rehearsal.
2. Centralize authentication resolution around a server-controlled mapping from provider identity to the existing application user ID. Never accept an owner ID from the browser or link accounts merely because usernames/emails match.
3. For existing accounts, require proof of the old authenticated identity and verification of the new recovery address before issuing an expiring, single-use migration claim. Do not assume password hashes can be imported between providers.
4. Users who cannot prove control of their existing account cannot self-claim its data. A fresh production signup is a separate account unless a tested migration explicitly preserves the old ownership mapping.
5. Test old-token rejection, logout, password reset and session revocation. Account deletion must immediately deny access, stop scheduled jobs, and durably remove owned records/files and authentication state; provider deletion alone is insufficient.

## Acceptance gates before switching

- Pin and inspect exact compatible package releases; the current integration guide specifies Better Auth ~1.6.15 and Convex >=1.25.0. Do not upgrade unrelated dependencies.
- Validate Next-compatible auth routes/cookies on the actual Vinext/ChatGPT Sites runtime, not only a standard Next.js example.
- Verify signup, username normalization/collisions, verified email, single-use expiring recovery, generic anti-enumeration responses, rate limits and email delivery.
- Prove cross-account isolation and mapping preservation across every existing owner-scoped backend function.
- Exercise session expiry/revocation, account deletion, cleanup retries and restoration in isolation.
- Obtain approval for the provider change, then separate exact-target approval before production deployment. Evaluation authorization is not migration authorization.

## Sources

- [Convex authentication overview](https://docs.convex.dev/auth/overview)
- [Convex Better Auth supported plugins](https://labs.convex.dev/better-auth/supported-plugins)
- [Convex Better Auth Next.js integration](https://labs.convex.dev/better-auth/framework-guides/next)
- [Better Auth username plugin](https://better-auth.com/docs/plugins/username)
- [Better Auth email/password recovery](https://better-auth.com/docs/authentication/email-password)
- [Better Auth account management](https://better-auth.com/docs/concepts/users-accounts)
- [Convex Clerk integration](https://docs.convex.dev/auth/clerk)

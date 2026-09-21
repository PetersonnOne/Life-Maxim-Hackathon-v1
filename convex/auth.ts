import { convexAuth, createAccount, retrieveAccount } from "@convex-dev/auth/server";
import { ConvexCredentials, type ConvexCredentialsUserConfig } from "@convex-dev/auth/providers/ConvexCredentials";
import { Password } from "@convex-dev/auth/providers/Password";
import { internal } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import { normalizeUsername, validateUsername, validatePassword } from "./authPolicy";

// Convex Auth owns hashing, sessions, token rotation and login throttling.
// The pinned package returns its provider configuration in `options` before
// Convex Auth materializes it. Reuse its crypto, never implement our own hash.
const passwordDefaults = Password<DataModel>() as unknown as { options: ConvexCredentialsUserConfig<DataModel> };
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  jwt: { durationMs: 5 * 60 * 1000 },
  providers: [ConvexCredentials<DataModel>({
    id: "password",
    crypto: passwordDefaults.options.crypto,
    authorize: async (params, ctx) => {
      const name = validateUsername(params.username);
      const username = normalizeUsername(name);
      const password = validatePassword(params.password, params.flow === "signUp");
      if (params.flow !== "signIn" && params.flow !== "signUp") throw new Error("Unsupported sign-in flow.");
      const state = await ctx.runQuery(internal.authMigration.lookup, { username });
      if (params.flow === "signUp") {
        if (state.current || state.legacyUserId) throw new Error("Username is unavailable.");
        const { user } = await createAccount(ctx, { provider: "password", account: { id: username, secret: password }, profile: { name }, shouldLinkViaEmail: false, shouldLinkViaPhone: false });
        return { userId: user._id };
      }
      if (state.current) {
        const result = await retrieveAccount(ctx, { provider: "password", account: { id: username, secret: password } });
        return result ? { userId: result.user._id } : null;
      }
      // Never fall back to an old password once a current credential exists.
      const legacyUserId: Id<"users"> | null = await ctx.runMutation(internal.authMigration.verifyLegacy, { username, password });
      if (!legacyUserId) throw new Error("Incorrect username or password.");
      const { user } = await createAccount(ctx, { provider: "password", account: { id: username, secret: password }, profile: { name, legacyUserId }, shouldLinkViaEmail: false, shouldLinkViaPhone: false });
      return { userId: user._id };
    },
  })],
  callbacks: {
    createOrUpdateUser: async (ctx, args) => {
      if (args.existingUserId) return args.existingUserId;
      // Only the server constructs legacyUserId, AFTER internal password proof.
      // No provider forwards arbitrary browser profile parameters here.
      if (typeof args.profile.legacyUserId === "string") {
        const id = ctx.db.normalizeId("users", args.profile.legacyUserId);
        if (!id || !await ctx.db.get("users",id)) throw new Error("Account migration could not be completed.");
        return id;
      }
      return await ctx.db.insert("users", { name: validateUsername(args.profile.name) });
    },
  },
});

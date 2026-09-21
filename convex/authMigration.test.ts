/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi, beforeAll, afterAll } from "vitest";
import { generateKeyPair, exportPKCS8 } from "jose";
import { registerUsername } from "@convex-dev/auth-v2/providers/testing/username";
import { registerPasswordProvider } from "@convex-dev/auth-v2/providers/testing/password";
import { components, internal, api } from "./_generated/api";
import schema from "./schema";
import { normalizeUsername, validatePassword } from "./authPolicy";
const modules = import.meta.glob("./**/*.ts");
// The legacy WASM package requires Convex's bundler. In-memory tests cover the
// migration boundary with a deterministic test double; live acceptance must
// separately exercise the real Argon2 verifier before deploying a migration.
vi.mock("argon2id-wasm", () => ({ hashPassword: async (p:string)=>`test-only:${p}`, verifyPassword: async (p:string,h:string)=>h===`test-only:${p}` }));
beforeAll(async()=>{
  const {privateKey}=await generateKeyPair("RS256",{extractable:true});
  vi.stubEnv("JWT_PRIVATE_KEY",await exportPKCS8(privateKey));
  vi.stubEnv("CONVEX_SITE_URL","https://test.convex.site");
});
afterAll(()=>vi.unstubAllEnvs());
async function fixture() {
  const t = convexTest(schema, modules);
  registerUsername(t); registerPasswordProvider(t);
  const id = await t.run(ctx => ctx.db.insert("users", { name: "Legacy Person" }));
  await t.mutation(components.authUsername.public.setUsername, { userId: id, username: "Legacy Person" });
  await t.mutation(components.authPasswordProvider.public.setPassword, { userId: id, password: "Fixture-Passphrase-938!" });
  return { t, id };
}
test("legacy lookup and proof preserve the original application user ID", async () => {
  const { t, id } = await fixture();
  expect(await t.query(internal.authMigration.lookup, { username: "legacy person" })).toEqual({ current: false, legacyUserId: id });
  expect(await t.mutation(internal.authMigration.verifyLegacy, { username: "LEGACY PERSON", password: "Fixture-Passphrase-938!" })).toBe(id);
  expect(await t.mutation(internal.authMigration.verifyLegacy, { username: "legacy person", password: "Wrong-Password-123!" })).toBeNull();
});
test("current credentials disable old-password fallback", async () => {
  const { t, id } = await fixture();
  await t.run(ctx => ctx.db.insert("authAccounts", { userId: id, provider: "password", providerAccountId: "legacy person", secret: "synthetic-new-hash" }));
  expect(await t.mutation(internal.authMigration.verifyLegacy, { username: "legacy person", password: "Fixture-Passphrase-938!" })).toBeNull();
});
test("failed migration attempts commit rate limits", async () => {
  const { t } = await fixture();
  for (let i=0;i<5;i++) expect(await t.mutation(internal.authMigration.verifyLegacy, { username: "legacy person", password: "Wrong-Password-123!" })).toBeNull();
  expect(await t.mutation(internal.authMigration.verifyLegacy, { username: "legacy person", password: "Fixture-Passphrase-938!" })).toBeNull();
});
test("original Auth session-shaped identities retain owner isolation", async () => {
  const { t, id } = await fixture();
  const other = await t.run(ctx => ctx.db.insert("users", { name: "Other" }));
  const session = await t.run(ctx => ctx.db.insert("authSessions", { userId:id, expirationTime:Date.now()+60000 }));
  expect(await t.withIdentity({ subject: `${id}|${session}` }).query(api.users.current, {})).toEqual({ name:"Legacy Person" });
  expect(await t.withIdentity({ subject: `${other}|another-session` }).query(api.users.current, {})).toEqual({ name:"Other" });
  expect(await t.query(api.users.current, {})).toBeNull();
});
test("normalization retains legacy Unicode semantics and new password minimum", () => {
  expect(normalizeUsername("E\u0301MILIE")).toBe("émilie");
  expect(normalizeUsername("Ａ")).not.toBe(normalizeUsername("A"));
  expect(validatePassword("legacy-ten",false)).toBe("legacy-ten");
  expect(()=>validatePassword("short",true)).toThrow();
});
test("real V1 sign-in handler migrates only after proof and ignores forged profile IDs", async()=>{
  const {t,id}=await fixture();
  await expect(t.action(api.auth.signIn,{provider:"password",params:{username:"legacy person",password:"Wrong-Password-123!",flow:"signIn",legacyUserId:id}})).rejects.toThrow();
  const signedIn=await t.action(api.auth.signIn,{provider:"password",params:{username:"legacy person",password:"Fixture-Passphrase-938!",flow:"signIn"}});
  expect(signedIn.tokens?.token).toBeTruthy();
  const account=await t.run(ctx=>ctx.db.query("authAccounts").withIndex("providerAndAccountId",q=>q.eq("provider","password").eq("providerAccountId","legacy person")).unique());
  expect(account?.userId).toBe(id);
  await t.action(api.auth.signIn,{provider:"password",params:{username:"New Person",password:"New-Fixture-Password-398!",flow:"signUp",legacyUserId:id}});
  const fresh=await t.run(ctx=>ctx.db.query("authAccounts").withIndex("providerAndAccountId",q=>q.eq("provider","password").eq("providerAccountId","new person")).unique());
  expect(fresh?.userId).not.toBe(id);
});

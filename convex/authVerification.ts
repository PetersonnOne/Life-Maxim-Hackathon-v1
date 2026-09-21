import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { hashPassword, verifyPassword } from "argon2id-wasm";

// Operator-only runtime check, no application records or real credentials.
export const legacyCrypto = internalMutation({ args:{}, returns:v.object({correct:v.boolean(),wrongRejected:v.boolean()}), handler:async()=>{
  const sample=crypto.randomUUID()+"-verification-only";
  const hash=await hashPassword(sample);
  return {correct:await verifyPassword(sample,hash),wrongRejected:!await verifyPassword(sample+"wrong",hash)};
}});

// Only deletes freshly created, empty test accounts with a reserved random name.
// Never accepts a user ID and refuses accounts with any application profile.
export const cleanupSynthetic = internalMutation({
  args:{username:v.string()},returns:v.null(),handler:async(ctx,{username})=>{
    if(!/^auth-probe-[a-f0-9-]{36}$/.test(username))throw new Error("Not a synthetic account.");
    const account=await ctx.db.query("authAccounts").withIndex("providerAndAccountId",q=>q.eq("provider","password").eq("providerAccountId",username)).unique();
    if(!account)return null;
    const user=await ctx.db.get("users",account.userId);
    if(!user||user.name!==username||Date.now()-user._creationTime>3600000)throw new Error("Synthetic account guard failed.");
    if(await ctx.db.query("profiles").withIndex("by_ownerId",q=>q.eq("ownerId",user._id)).first())throw new Error("Account has application data.");
    const sessions=await ctx.db.query("authSessions").withIndex("userId",q=>q.eq("userId",user._id)).take(10);
    for(const session of sessions){
      const tokens=await ctx.db.query("authRefreshTokens").withIndex("sessionId",q=>q.eq("sessionId",session._id)).take(30);
      for(const token of tokens)await ctx.db.delete("authRefreshTokens",token._id);
      await ctx.db.delete("authSessions",session._id);
    }
    await ctx.db.delete("authAccounts",account._id);await ctx.db.delete("users",user._id);return null;
  },
});

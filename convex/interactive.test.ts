/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import agentTest from "@convex-dev/agent/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
const modules = import.meta.glob("./**/*.ts");
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
async function fixture() {
  const t = convexTest(schema, modules); agentTest.register(t); rateLimiterTest.register(t);
  const [one,two] = await t.run(async ctx => Promise.all([ctx.db.insert("users",{name:"One"}),ctx.db.insert("users",{name:"Two"})]));
  const owner = t.withIdentity({subject:one}); const other = t.withIdentity({subject:two});
  const profileId = await owner.mutation(api.profiles.create,{name:"Personal",description:"",role:"",industry:""});
  const p = await t.run(ctx=>ctx.db.get("profiles",profileId));
  const sessionId = await owner.mutation(api.interactive.create,{profileId,expectedUpdatedAt:p!.updatedAt});
  return {t,owner,other,profileId,sessionId};
}
test("interactive sessions isolate users and require a confirmed owned profile",async()=>{
  const {t,other,sessionId,profileId}=await fixture();
  await expect(t.query(api.interactive.get,{id:sessionId})).rejects.toThrow();
  await expect(other.query(api.interactive.get,{id:sessionId})).rejects.toThrow();
  await expect(other.mutation(api.interactive.create,{profileId,expectedUpdatedAt:0})).rejects.toThrow();
  await expect(other.mutation(api.interactive.stop,{sessionId})).rejects.toThrow();
  expect(await other.query(api.interactive.list,{})).toEqual([]);
});
test("voice reservation serializes starts, rejects replay and keeps uncertain cleanup locked",async()=>{
  const {t,owner,sessionId}=await fixture();
  const id=await owner.mutation(internal.interactive.reserve,{sessionId,requestId:"first"});
  await expect(owner.mutation(internal.interactive.reserve,{sessionId,requestId:"first"})).rejects.toThrow("already used");
  await expect(owner.mutation(internal.interactive.reserve,{sessionId,requestId:"second"})).rejects.toThrow("active");
  await t.mutation(internal.interactive.finish,{id,certain:false});
  await expect(owner.mutation(internal.interactive.reserve,{sessionId,requestId:"third"})).rejects.toThrow("cleanup");
});
test("a canceled in-flight creation cannot become active",async()=>{
  const {t,owner,sessionId}=await fixture(); const id=await owner.mutation(internal.interactive.reserve,{sessionId,requestId:"one"});
  await owner.mutation(api.interactive.stop,{sessionId});
  expect(await t.mutation(internal.interactive.attach,{id,providerId:"live_test"})).toBe(false);
  expect((await t.query(internal.interactive.connection,{id}))?.status).toBe("closing");
});
test("context contains only selected profile and rejects changed profile",async()=>{
  const {owner,t,profileId,sessionId}=await fixture();
  await owner.mutation(api.workspace.remember,{profileId,content:"Confirmed constraint",kind:"constraint"});
  const second=await owner.mutation(api.profiles.create,{name:"Separate",description:"Private",role:"",industry:""});
  await owner.mutation(api.workspace.remember,{profileId:second,content:"Do not include this",kind:"context"});
  const context=await owner.query(internal.interactive.context,{id:sessionId}); expect(context).toContain("Confirmed constraint");expect(context).not.toContain("Do not include this");
  await t.run(async ctx=>{const p=await ctx.db.get("profiles",profileId);await ctx.db.patch("profiles",profileId,{updatedAt:p!.updatedAt+1});});
  await expect(owner.query(internal.interactive.context,{id:sessionId})).rejects.toThrow("Profile changed");
});
test("confirmation atomically creates one entry and guidance request; cannot replay a changed brief",async()=>{
  const {owner,t,sessionId}=await fixture(); const brief={title:"Study",goal:"Learn",context:"Short sessions",questions:"How to start?"};
  const id=await owner.mutation(api.interactive.confirm,{id:sessionId,brief});
  expect(await owner.mutation(api.interactive.confirm,{id:sessionId,brief})).toBe(id);
  expect(await owner.query(api.intelligence.list,{objectiveId:id})).toHaveLength(1);
  await expect(owner.mutation(api.interactive.confirm,{id:sessionId,brief:{...brief,title:"Changed"}})).rejects.toThrow("already confirmed");
  expect(await t.run(ctx=>ctx.db.query("tasks").withIndex("by_objectiveId",q=>q.eq("objectiveId",id)).take(10))).toEqual([]);
});
test("hangup uses only the stored provider id and does not expose raw provider errors",async()=>{
  const {owner,t,sessionId}=await fixture(); const id=await owner.mutation(internal.interactive.reserve,{sessionId,requestId:"one"});
  await t.mutation(internal.interactive.attach,{id,providerId:"live_test"}); vi.stubEnv("OPENAI_API_KEY","test-key");
  const fetcher=vi.fn().mockResolvedValue(new Response(null,{status:200}));vi.stubGlobal("fetch",fetcher);
  await t.action(internal.liveActions.hangup,{id,attempt:0});
  expect(fetcher.mock.calls[0][0]).toBe("https://api.openai.com/v1/live/sessions/live_test/hangup");
  expect((await t.query(internal.interactive.connection,{id}))?.status).toBe("closed");
});
test("voice broker pins Live client delegation, disables recording, and returns no credential",async()=>{
  const {owner,sessionId}=await fixture(); vi.stubEnv("OPENAI_API_KEY","test-key");
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({session:{id:"live_test"},transport:{sdp:"v=0\r\nanswer"}}),{status:201}));vi.stubGlobal("fetch",fetcher);
  const result=await owner.action(api.liveActions.start,{sessionId,requestId:"start",sdp:"v=0\r\noffer"});
  expect(result).toEqual({sdp:"v=0\r\nanswer",seconds:300,expiresAt:expect.any(Number)});
  const body=JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.session.model).toBe("gpt-live-1");expect(body.session.store).toBe(false);expect(body.session.delegation).toEqual({type:"client"});
  expect(body.session.client.data_channel.allowed_client_events).not.toContain("session.update");
  expect(JSON.stringify(result)).not.toContain("test-key");
});
test("unknown creation errors fail closed without automatic paid retries",async()=>{
  const {owner,t,sessionId}=await fixture();vi.stubEnv("OPENAI_API_KEY","test-key");
  const fetcher=vi.fn().mockRejectedValue(new Error("private provider diagnostic"));vi.stubGlobal("fetch",fetcher);
  await expect(owner.action(api.liveActions.start,{sessionId,requestId:"start",sdp:"v=0\r\noffer"})).rejects.toThrow("No automatic paid retry");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect((await owner.query(api.interactive.voiceState,{sessionId}))?.status).toBe("uncertain");
  await expect(t.action(api.liveActions.start,{sessionId,requestId:"anonymous",sdp:"v=0\r\noffer"})).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test("quota rejection is explicit, redacted and never retried",async()=>{
  const {owner,sessionId}=await fixture();vi.stubEnv("OPENAI_API_KEY","test-key");
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{code:"insufficient_quota",message:"private provider text"}}),{status:429}));vi.stubGlobal("fetch",fetcher);
  await expect(owner.action(api.liveActions.start,{sessionId,requestId:"quota",sdp:"v=0\r\noffer"})).rejects.toThrow("insufficient API quota");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect((await owner.query(api.interactive.voiceState,{sessionId}))?.status).toBe("closed");
  await expect(owner.action(api.liveActions.start,{sessionId,requestId:"too-soon",sdp:"v=0\r\noffer"})).rejects.toThrow("cooldown");
  expect(fetcher).toHaveBeenCalledTimes(1);
});

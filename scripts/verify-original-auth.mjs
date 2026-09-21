import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { execFileSync } from "node:child_process";
const deployment="robust-lemur-250";
if(process.argv[2]!==`--confirm-dev=${deployment}`)throw new Error("Development confirmation required.");
const client=new ConvexHttpClient(`https://${deployment}.convex.cloud`);
const username=`auth-probe-${crypto.randomUUID()}`;
const password=crypto.randomUUID()+crypto.randomUUID();
const action=makeFunctionReference("auth:signIn");
const result={signup:false,authenticatedRead:false,signIn:false,wrongPasswordRejected:false,refresh:false,signOut:false,cleanup:false};
try{
  const created=await client.action(action,{provider:"password",params:{username,password,flow:"signUp"}});
  result.signup=!!created.tokens?.token;
  if(!created.tokens)throw new Error("No token");
  client.setAuth(created.tokens.token);
  result.authenticatedRead=(await client.query(makeFunctionReference("users:current"),{}))?.name===username;
  await client.action(makeFunctionReference("auth:signOut"),{});client.clearAuth();result.signOut=true;
  try{await client.action(action,{provider:"password",params:{username,password:password+"wrong",flow:"signIn"}});}catch{result.wrongPasswordRejected=true;}
  const entered=await client.action(action,{provider:"password",params:{username,password,flow:"signIn"}});
  result.signIn=!!entered.tokens?.token;
  const refreshed=await client.action(action,{refreshToken:entered.tokens.refreshToken});
  result.refresh=!!refreshed.tokens?.token;
  client.setAuth(refreshed.tokens.token);await client.action(makeFunctionReference("auth:signOut"),{});client.clearAuth();
}catch{
  // Do not log request payloads, passwords, returned JWTs or refresh tokens.
  console.error("Authentication verification did not complete; inspect the safe result flags.");
  process.exitCode=1;
}finally{
  try{
    execFileSync(process.execPath,["--use-system-ca","--dns-result-order=ipv4first","node_modules/convex/bin/main.js","run","authVerification:cleanupSynthetic",JSON.stringify({username}),"--deployment",deployment],{stdio:["ignore","pipe","pipe"]});
    result.cleanup=true;
  }catch{process.exitCode=1;}
  console.log(JSON.stringify(result));
}

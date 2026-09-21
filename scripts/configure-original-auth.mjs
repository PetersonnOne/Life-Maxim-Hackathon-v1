// Explicit dev-only setup. Never prints credential values or overwrites a keypair.
import { execFileSync } from "node:child_process";
import { generateKeyPair, exportPKCS8, exportJWK } from "jose";
const deployment = "robust-lemur-250";
if (process.argv[2] !== `--confirm-dev=${deployment}`) throw new Error("Explicit development confirmation required.");
if (process.env.CONVEX_DEPLOY_KEY) throw new Error("Unset deployment-key override before this dev-only operation.");
function cli(args) {
  try { return execFileSync(process.execPath, ["--use-system-ca", "--dns-result-order=ipv4first", "node_modules/convex/bin/main.js", ...args, "--deployment", deployment], { encoding:"utf8", stdio:["ignore","pipe","pipe"] }).trim(); }
  catch { throw new Error("Convex environment operation failed; no credential values were logged."); }
}
const privatePresent = !!cli(["env","get","JWT_PRIVATE_KEY"]);
const publicPresent = !!cli(["env","get","JWKS"]);
if (privatePresent !== publicPresent) throw new Error("Incomplete existing keypair; refusing to overwrite it.");
if (!privatePresent) {
  const keys = await generateKeyPair("RS256", {extractable:true});
  const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g," ");
  const jwks = JSON.stringify({keys:[{use:"sig",...await exportJWK(keys.publicKey)}]});
  cli(["env","set",`JWT_PRIVATE_KEY=${privateKey}`]);
  cli(["env","set",`JWKS=${jwks}`]);
}
console.log(JSON.stringify({deployment,JWT_PRIVATE_KEY:!!cli(["env","get","JWT_PRIVATE_KEY"]),JWKS:!!cli(["env","get","JWKS"]),existingKeysPreserved:privatePresent}));

// Use the Auth V2 initializer with portable CLI invocation on Windows.
// The upstream initializer spawns "npx" without a shell, which Windows cannot resolve.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createProgram, defaultDeps } from "../node_modules/@convex-dev/auth/dist/cli/program.js";
const cli=fileURLToPath(new URL("../node_modules/convex/bin/main.js",import.meta.url));
const deps=defaultDeps();
function run(args) {
  return spawnSync(process.execPath,["--use-system-ca",cli,...args],{encoding:"utf8",windowsHide:true});
}
deps.getEnv=(key)=>{
  const result=run(["env","get",key]);
  if(result.status!==0)throw new Error("Cannot read deployment environment for "+key+". Check the Convex connection.");
  return result.stdout.trim()||null;
};
deps.setEnv=(key,value)=>{
  const result=run(["env","set",key,value]);
  if(result.status!==0)throw new Error("Could not configure "+key+". No secret output was logged.");
};
await createProgram(deps).parseAsync(process.argv);

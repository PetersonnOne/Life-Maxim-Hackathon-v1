/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiContracts from "../aiContracts.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as dataExport from "../dataExport.js";
import type * as exportContracts from "../exportContracts.js";
import type * as intelligence from "../intelligence.js";
import type * as intelligenceActions from "../intelligenceActions.js";
import type * as interactive from "../interactive.js";
import type * as liveActions from "../liveActions.js";
import type * as liveContracts from "../liveContracts.js";
import type * as mail from "../mail.js";
import type * as mailActions from "../mailActions.js";
import type * as mailContracts from "../mailContracts.js";
import type * as mailPolling from "../mailPolling.js";
import type * as mailPollingActions from "../mailPollingActions.js";
import type * as modelProvider from "../modelProvider.js";
import type * as modelRouting from "../modelRouting.js";
import type * as objectives from "../objectives.js";
import type * as planning from "../planning.js";
import type * as planningActions from "../planningActions.js";
import type * as planningContracts from "../planningContracts.js";
import type * as profiles from "../profiles.js";
import type * as research from "../research.js";
import type * as researchActions from "../researchActions.js";
import type * as researchContracts from "../researchContracts.js";
import type * as users from "../users.js";
import type * as workspace from "../workspace.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiContracts: typeof aiContracts;
  auth: typeof auth;
  crons: typeof crons;
  dataExport: typeof dataExport;
  exportContracts: typeof exportContracts;
  intelligence: typeof intelligence;
  intelligenceActions: typeof intelligenceActions;
  interactive: typeof interactive;
  liveActions: typeof liveActions;
  liveContracts: typeof liveContracts;
  mail: typeof mail;
  mailActions: typeof mailActions;
  mailContracts: typeof mailContracts;
  mailPolling: typeof mailPolling;
  mailPollingActions: typeof mailPollingActions;
  modelProvider: typeof modelProvider;
  modelRouting: typeof modelRouting;
  objectives: typeof objectives;
  planning: typeof planning;
  planningActions: typeof planningActions;
  planningContracts: typeof planningContracts;
  profiles: typeof profiles;
  research: typeof research;
  researchActions: typeof researchActions;
  researchContracts: typeof researchContracts;
  users: typeof users;
  workspace: typeof workspace;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  auth: import("@convex-dev/auth/core/_generated/component.js").ComponentApi<"auth">;
  authPasswordProvider: import("@convex-dev/auth/providers/password/_generated/component.js").ComponentApi<"authPasswordProvider">;
  authUsername: import("@convex-dev/auth/username/_generated/component.js").ComponentApi<"authUsername">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};

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
import type * as authMigration from "../authMigration.js";
import type * as authPolicy from "../authPolicy.js";
import type * as authVerification from "../authVerification.js";
import type * as billing from "../billing.js";
import type * as billingActions from "../billingActions.js";
import type * as clientMail from "../clientMail.js";
import type * as clientMailActions from "../clientMailActions.js";
import type * as clientMailRules from "../clientMailRules.js";
import type * as crons from "../crons.js";
import type * as dataExport from "../dataExport.js";
import type * as entitlements from "../entitlements.js";
import type * as exportContracts from "../exportContracts.js";
import type * as http from "../http.js";
import type * as intelligence from "../intelligence.js";
import type * as intelligenceActions from "../intelligenceActions.js";
import type * as interactive from "../interactive.js";
import type * as liveActions from "../liveActions.js";
import type * as liveContracts from "../liveContracts.js";
import type * as liveVerification from "../liveVerification.js";
import type * as mail from "../mail.js";
import type * as mailActions from "../mailActions.js";
import type * as mailContracts from "../mailContracts.js";
import type * as mailPolling from "../mailPolling.js";
import type * as mailPollingActions from "../mailPollingActions.js";
import type * as mailWorkflow from "../mailWorkflow.js";
import type * as modelProvider from "../modelProvider.js";
import type * as modelRouting from "../modelRouting.js";
import type * as objectives from "../objectives.js";
import type * as paystackSetup from "../paystackSetup.js";
import type * as planning from "../planning.js";
import type * as planningActions from "../planningActions.js";
import type * as planningContracts from "../planningContracts.js";
import type * as profiles from "../profiles.js";
import type * as research from "../research.js";
import type * as researchActions from "../researchActions.js";
import type * as researchContracts from "../researchContracts.js";
import type * as tierPolicy from "../tierPolicy.js";
import type * as transformationActions from "../transformationActions.js";
import type * as transformationContracts from "../transformationContracts.js";
import type * as transformationWorkflow from "../transformationWorkflow.js";
import type * as transformations from "../transformations.js";
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
  authMigration: typeof authMigration;
  authPolicy: typeof authPolicy;
  authVerification: typeof authVerification;
  billing: typeof billing;
  billingActions: typeof billingActions;
  clientMail: typeof clientMail;
  clientMailActions: typeof clientMailActions;
  clientMailRules: typeof clientMailRules;
  crons: typeof crons;
  dataExport: typeof dataExport;
  entitlements: typeof entitlements;
  exportContracts: typeof exportContracts;
  http: typeof http;
  intelligence: typeof intelligence;
  intelligenceActions: typeof intelligenceActions;
  interactive: typeof interactive;
  liveActions: typeof liveActions;
  liveContracts: typeof liveContracts;
  liveVerification: typeof liveVerification;
  mail: typeof mail;
  mailActions: typeof mailActions;
  mailContracts: typeof mailContracts;
  mailPolling: typeof mailPolling;
  mailPollingActions: typeof mailPollingActions;
  mailWorkflow: typeof mailWorkflow;
  modelProvider: typeof modelProvider;
  modelRouting: typeof modelRouting;
  objectives: typeof objectives;
  paystackSetup: typeof paystackSetup;
  planning: typeof planning;
  planningActions: typeof planningActions;
  planningContracts: typeof planningContracts;
  profiles: typeof profiles;
  research: typeof research;
  researchActions: typeof researchActions;
  researchContracts: typeof researchContracts;
  tierPolicy: typeof tierPolicy;
  transformationActions: typeof transformationActions;
  transformationContracts: typeof transformationContracts;
  transformationWorkflow: typeof transformationWorkflow;
  transformations: typeof transformations;
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
  auth: import("@convex-dev/auth-v2/core/_generated/component.js").ComponentApi<"auth">;
  authPasswordProvider: import("@convex-dev/auth-v2/providers/password/_generated/component.js").ComponentApi<"authPasswordProvider">;
  authUsername: import("@convex-dev/auth-v2/username/_generated/component.js").ComponentApi<"authUsername">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
};

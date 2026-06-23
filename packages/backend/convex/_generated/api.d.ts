/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as contact from "../contact.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as media from "../media.js";
import type * as media_part_01 from "../media_part_01.js";
import type * as media_part_02 from "../media_part_02.js";
import type * as media_part_03 from "../media_part_03.js";
import type * as media_part_04 from "../media_part_04.js";
import type * as media_part_05 from "../media_part_05.js";
import type * as media_part_06 from "../media_part_06.js";
import type * as media_part_07 from "../media_part_07.js";
import type * as media_part_08 from "../media_part_08.js";
import type * as media_part_09 from "../media_part_09.js";
import type * as media_part_10 from "../media_part_10.js";
import type * as media_part_11 from "../media_part_11.js";
import type * as media_part_12 from "../media_part_12.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  contact: typeof contact;
  email: typeof email;
  http: typeof http;
  media: typeof media;
  media_part_01: typeof media_part_01;
  media_part_02: typeof media_part_02;
  media_part_03: typeof media_part_03;
  media_part_04: typeof media_part_04;
  media_part_05: typeof media_part_05;
  media_part_06: typeof media_part_06;
  media_part_07: typeof media_part_07;
  media_part_08: typeof media_part_08;
  media_part_09: typeof media_part_09;
  media_part_10: typeof media_part_10;
  media_part_11: typeof media_part_11;
  media_part_12: typeof media_part_12;
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
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};

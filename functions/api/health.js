import { ok, options, methodNotAllowed, counts, API_VERSION, API_BUILD } from "./_lib.js";

export const onRequestOptions = options;

// Status only. Deployment metadata, request geography and runtime details are
// deliberately not exposed here.
export function onRequestGet() {
  return ok({ status: "ok", version: API_VERSION, build: API_BUILD, counts: counts() }, { cmd: "health" });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

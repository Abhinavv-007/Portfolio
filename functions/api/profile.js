import { ok, options, methodNotAllowed, PORTFOLIO } from "./_lib.js";

export const onRequestOptions = options;

export function onRequestGet() {
  return ok(PORTFOLIO.profile, {
    cmd: "profile",
    fields: Object.keys(PORTFOLIO.profile)
  });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

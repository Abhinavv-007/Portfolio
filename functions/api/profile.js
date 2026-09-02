import { ok, options, methodNotAllowed, publicProfile } from "./_lib.js";

export const onRequestOptions = options;

export function onRequestGet() {
  const profile = publicProfile();
  return ok(profile, { cmd: "profile", fields: Object.keys(profile) });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

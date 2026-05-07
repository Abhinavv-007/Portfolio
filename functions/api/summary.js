import { ok, options, methodNotAllowed, summary } from "./_lib.js";

export const onRequestOptions = options;

export function onRequestGet({ request }) {
  return ok(summary(new URL(request.url).origin), { cmd: "summary" });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

import { ok, options, methodNotAllowed, PORTFOLIO } from "./_lib.js";

export const onRequestOptions = options;

export function onRequestGet() {
  return ok(PORTFOLIO.notes, {
    cmd: "notes",
    count: PORTFOLIO.notes.length
  });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

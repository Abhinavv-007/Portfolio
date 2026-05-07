import { ok, options, methodNotAllowed, tagIndex } from "./_lib.js";

export const onRequestOptions = options;

export function onRequestGet() {
  const tags = tagIndex();
  return ok(tags, { cmd: "tags", count: tags.all.length });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

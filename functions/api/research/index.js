import {
  ok,
  options,
  methodNotAllowed,
  researchWithSlugs
} from "../_lib.js";

export const onRequestOptions = options;

export function onRequestGet() {
  const list = researchWithSlugs();
  return ok(list, {
    cmd: "research",
    count: list.length
  });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

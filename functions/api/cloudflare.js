import {
  ok,
  options,
  methodNotAllowed,
  cloudflareInfo
} from "./_lib.js";

export const onRequestOptions = options;

export function onRequestGet({ request, env }) {
  return ok(cloudflareInfo(request, env), { cmd: "cloudflare" });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

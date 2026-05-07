import { ok, options, methodNotAllowed, assetManifest } from "./_lib.js";

export const onRequestOptions = options;

export function onRequestGet({ request }) {
  const assets = assetManifest(new URL(request.url).origin);
  return ok(assets, { cmd: "assets", count: assets.all.length });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

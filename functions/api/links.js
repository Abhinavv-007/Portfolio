import { ok, options, methodNotAllowed, publicLinks } from "./_lib.js";

export const onRequestOptions = options;

export function onRequestGet({ request }) {
  const links = publicLinks(new URL(request.url).origin);
  return ok(links, { cmd: "links", count: links.all.length });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

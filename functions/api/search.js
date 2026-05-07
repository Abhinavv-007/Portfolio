import { ok, options, methodNotAllowed, searchRecords } from "./_lib.js";

export const onRequestOptions = options;

export function onRequestGet({ request }) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || url.searchParams.get("query") || "";
  const type = url.searchParams.get("type") || "";
  const results = searchRecords(q, type);
  return ok(results, {
    cmd: "search",
    q,
    type: type || null,
    count: results.length,
    hint: q ? null : "Pass ?q=ai, ?q=cloudflare, or ?type=project to narrow results."
  });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

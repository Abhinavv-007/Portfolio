import { ok, options, methodNotAllowed, PORTFOLIO } from "./_lib.js";

export const onRequestOptions = options;

export function onRequestGet({ request }) {
  const url = new URL(request.url);
  const flat = url.searchParams.get("flat");

  if (flat === "1" || flat === "true") {
    const items = PORTFOLIO.skills.flatMap((g) => g.items || []);
    return ok(items, {
      cmd: "skills",
      shape: "flat",
      count: items.length
    });
  }

  return ok(PORTFOLIO.skills, {
    cmd: "skills",
    shape: "grouped",
    groups: PORTFOLIO.skills.length,
    count: PORTFOLIO.skills.reduce((s, g) => s + (g.items?.length || 0), 0)
  });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

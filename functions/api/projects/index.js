import {
  ok,
  options,
  methodNotAllowed,
  projectsWithSlugs
} from "../_lib.js";

export const onRequestOptions = options;

export function onRequestGet({ request }) {
  const url = new URL(request.url);
  const tag = (url.searchParams.get("tag") || "").trim().toLowerCase();
  let list = projectsWithSlugs();

  if (tag) {
    list = list.filter((p) =>
      (p.tags || []).some((t) => String(t).toLowerCase() === tag)
    );
  }

  return ok(list, {
    cmd: "projects",
    count: list.length,
    filter: tag ? { tag } : null
  });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

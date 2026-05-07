import {
  ok,
  fail,
  options,
  methodNotAllowed,
  findResearch,
  researchWithSlugs
} from "../_lib.js";

export const onRequestOptions = options;

export function onRequestGet({ params }) {
  const slug = String(params?.slug || "").trim().toLowerCase();
  if (!slug) {
    return fail(400, "Missing research slug.",
      "Use /api/research/<slug>, e.g. /api/research/the-glass-ballot.");
  }

  const paper = findResearch(slug);
  if (!paper) {
    const available = researchWithSlugs().map((r) => r.slug);
    return fail(404, `No research paper found for slug "${slug}".`,
      `Available slugs: ${available.join(", ")}.`,
      { availableSlugs: available });
  }

  return ok({
    ...paper,
    slug: paper.slug
  }, {
    cmd: "research",
    slug: paper.slug
  });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

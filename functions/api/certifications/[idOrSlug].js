import {
  ok,
  fail,
  options,
  methodNotAllowed,
  findCertification,
  certificationsWithIds
} from "../_lib.js";

export const onRequestOptions = options;

export function onRequestGet({ params }) {
  const key = String(params?.idOrSlug || "").trim();
  if (!key) {
    return fail(400, "Missing certification id or slug.",
      "Use /api/certifications/<id> or /api/certifications/<slug>.");
  }

  const cert = findCertification(key);
  if (!cert) {
    const sample = certificationsWithIds().slice(0, 5).map((c) => ({ id: c.id, slug: c.slug, title: c.title }));
    return fail(404, `No certification found for "${key}".`,
      "Try a numeric id (1-based) or the title slug. See /api/certifications.",
      { sample });
  }

  return ok(cert, {
    cmd: "certification",
    id: cert.id,
    slug: cert.slug
  });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

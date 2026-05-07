import {
  ok,
  fail,
  options,
  methodNotAllowed,
  findProject,
  projectsWithSlugs
} from "../_lib.js";

export const onRequestOptions = options;

export function onRequestGet({ params }) {
  const slug = String(params?.slug || "").trim().toLowerCase();
  if (!slug) {
    return fail(400, "Missing project slug.",
      "Use /api/projects/<slug>, e.g. /api/projects/clex-ai.");
  }

  const project = findProject(slug);
  if (!project) {
    const available = projectsWithSlugs().map((p) => p.slug);
    return fail(404, `No project found for slug "${slug}".`,
      `Available slugs: ${available.join(", ")}.`,
      { availableSlugs: available });
  }

  return ok({
    ...project,
    slug: project.slug
  }, {
    cmd: "project",
    slug: project.slug
  });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

// =============================================================================
// API helpers — JSON envelope, CORS, route metadata, finders.
// All API functions import from here for consistency.
// =============================================================================

import { PORTFOLIO, API_VERSION, API_BUILD } from "./_data.js";

export { PORTFOLIO, API_VERSION, API_BUILD };

// ---- CORS ------------------------------------------------------------------
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type, accept, authorization",
  "access-control-max-age": "86400",
  "vary": "origin"
};

// ---- Available commands ----------------------------------------------------
export const COMMANDS = [
  "profile",
  "skills",
  "projects",
  "certifications",
  "research",
  "socials",
  "notes",
  "marquee",
  "version",
  "endpoints",
  "help"
];

// ---- Endpoint catalog ------------------------------------------------------
export const ENDPOINTS = [
  { method: "GET", path: "/api",                        description: "API index, available commands, version" },
  { method: "GET", path: "/api/profile",                description: "Public profile and summary" },
  { method: "GET", path: "/api/skills",                 description: "Skills grouped by domain" },
  { method: "GET", path: "/api/projects",               description: "All shipped projects" },
  { method: "GET", path: "/api/projects/:slug",         description: "One project by slug" },
  { method: "GET", path: "/api/certifications",         description: "All credentials, grouped by issuer" },
  { method: "GET", path: "/api/certifications/:idOrSlug", description: "One credential by 1-based id or title slug" },
  { method: "GET", path: "/api/research",               description: "Research papers" },
  { method: "GET", path: "/api/research/:slug",         description: "One research paper by slug" },
  { method: "GET", path: "/api/socials",                description: "Social profile links" },
  { method: "GET", path: "/api/notes",                  description: "Notes from the bench" },
  { method: "GET", path: "/api/command?cmd=<name>",     description: "Command-style read endpoint" },
  { method: "POST", path: "/api/contact",               description: "Send a portfolio enquiry (existing endpoint)" }
];

// ---- Cache policy ----------------------------------------------------------
const CACHE_PUBLIC = "public, max-age=300, s-maxage=600, stale-while-revalidate=1200";
const CACHE_NONE = "no-store";

// ---- Response helpers ------------------------------------------------------
function nowIso() {
  return new Date().toISOString();
}

function metaBlock(extra = {}) {
  return {
    version: API_VERSION,
    build: API_BUILD,
    generatedAt: nowIso(),
    source: "abhnv.in/api",
    docs: "https://abhnv.in/api.html",
    ...extra
  };
}

export function json(body, init = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status: init.status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": init.cache || CACHE_PUBLIC,
      "x-api-version": API_VERSION,
      ...CORS_HEADERS,
      ...(init.headers || {})
    }
  });
}

export function ok(data, meta = {}, init = {}) {
  return json({
    ok: true,
    data,
    meta: metaBlock(meta)
  }, init);
}

export function fail(status, error, hint, extra = {}) {
  return json({
    ok: false,
    error,
    hint: hint || null,
    meta: metaBlock(extra)
  }, { status, cache: CACHE_NONE });
}

export function options() {
  return new Response(null, {
    status: 204,
    headers: { ...CORS_HEADERS, "cache-control": "public, max-age=86400" }
  });
}

// ---- Generic fallback for non-GET methods ----------------------------------
export function methodNotAllowed() {
  return fail(405, "Method not allowed.",
    "This endpoint accepts GET (and OPTIONS for CORS) only.");
}

// ---- Slug + finders --------------------------------------------------------
export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function findProject(needle) {
  if (!needle) return null;
  const target = String(needle).trim().toLowerCase();
  return PORTFOLIO.projects.find((p) =>
    p.slug === target || slugify(p.title) === target
  ) || null;
}

export function findResearch(needle) {
  if (!needle) return null;
  const target = String(needle).trim().toLowerCase();
  return PORTFOLIO.researchPapers.find((r) =>
    r.slug === target || slugify(r.title) === target
  ) || null;
}

export function findCertification(needle) {
  if (!needle) return null;
  const raw = String(needle).trim();
  const lower = raw.toLowerCase();
  const list = PORTFOLIO.certifications;
  for (let i = 0; i < list.length; i++) {
    const cert = list[i];
    if (String(i + 1) === raw) return { ...cert, id: i + 1, slug: slugify(cert.title) };
    if (slugify(cert.title) === lower) return { ...cert, id: i + 1, slug: slugify(cert.title) };
  }
  return null;
}

// ---- Decorators that add slugs/ids before sending --------------------------
export function projectsWithSlugs() {
  return PORTFOLIO.projects.map((p) => ({
    ...p,
    slug: p.slug || slugify(p.title)
  }));
}

export function researchWithSlugs() {
  return PORTFOLIO.researchPapers.map((r) => ({
    ...r,
    slug: r.slug || slugify(r.title)
  }));
}

export function certificationsWithIds() {
  return PORTFOLIO.certifications.map((c, i) => ({
    id: i + 1,
    slug: slugify(c.title),
    ...c
  }));
}

export function certificationsByIssuer() {
  const list = certificationsWithIds();
  const groups = new Map();
  for (const cert of list) {
    const issuer = cert.issuer || "Other";
    if (!groups.has(issuer)) groups.set(issuer, []);
    groups.get(issuer).push(cert);
  }
  return Array.from(groups, ([issuer, items]) => ({ issuer, count: items.length, items }));
}

// ---- Counts for index/meta -------------------------------------------------
export function counts() {
  return {
    projects: PORTFOLIO.projects.length,
    certifications: PORTFOLIO.certifications.length,
    research: PORTFOLIO.researchPapers.length,
    socials: PORTFOLIO.socials.length,
    notes: PORTFOLIO.notes.length,
    skillGroups: PORTFOLIO.skills.length,
    skills: PORTFOLIO.skills.reduce((sum, g) => sum + (g.items?.length || 0), 0)
  };
}

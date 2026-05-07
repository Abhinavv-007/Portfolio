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
  "stats",
  "summary",
  "links",
  "tags",
  "search",
  "assets",
  "health",
  "cloudflare",
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
  { method: "GET", path: "/api/summary",                description: "Compact profile, counts, featured links, and tag summary" },
  { method: "GET", path: "/api/links",                  description: "All public links grouped by socials, projects, research, credentials, repos, and case studies" },
  { method: "GET", path: "/api/tags",                   description: "All project, research, certification, and skill tags with counts" },
  { method: "GET", path: "/api/search?q=<query>",       description: "Search public portfolio records by text, tag, title, issuer, or URL" },
  { method: "GET", path: "/api/assets",                 description: "Image, logo, favicon, and social preview asset manifest" },
  { method: "GET", path: "/api/health",                 description: "API health, version, Cloudflare request metadata, and data counts" },
  { method: "GET", path: "/api/cloudflare",             description: "Cloudflare Pages Functions routes, headers, cache policy, and wrangler/curl commands" },
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
  const tags = tagIndex();
  const links = publicLinks();
  return {
    projects: PORTFOLIO.projects.length,
    certifications: PORTFOLIO.certifications.length,
    research: PORTFOLIO.researchPapers.length,
    socials: PORTFOLIO.socials.length,
    notes: PORTFOLIO.notes.length,
    skillGroups: PORTFOLIO.skills.length,
    skills: PORTFOLIO.skills.reduce((sum, g) => sum + (g.items?.length || 0), 0),
    commands: COMMANDS.length,
    endpoints: ENDPOINTS.length,
    tags: tags.all.length,
    publicLinks: links.all.length,
    assets: assetManifest().all.length
  };
}

function countValues(values) {
  const map = new Map();
  for (const value of values.filter(Boolean).map(String)) {
    map.set(value, (map.get(value) || 0) + 1);
  }
  return Array.from(map, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function absoluteUrl(value, origin = "https://abhnv.in") {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value, origin).toString();
}

export function tagIndex() {
  const projects = countValues(PORTFOLIO.projects.flatMap((p) => p.tags || []));
  const research = countValues(PORTFOLIO.researchPapers.flatMap((p) => p.tags || []));
  const certifications = countValues(PORTFOLIO.certifications.flatMap((c) => c.tags || []));
  const skills = PORTFOLIO.skills.map((group) => ({
    name: group.group,
    count: group.items?.length || 0,
    items: group.items || []
  }));
  const all = countValues([
    ...projects.flatMap((t) => Array(t.count).fill(t.name)),
    ...research.flatMap((t) => Array(t.count).fill(t.name)),
    ...certifications.flatMap((t) => Array(t.count).fill(t.name)),
    ...PORTFOLIO.skills.flatMap((g) => g.items || [])
  ]);
  return { all, projects, research, certifications, skills };
}

export function publicLinks(origin = "https://abhnv.in") {
  const profile = [
    { type: "profile", label: "Website", url: PORTFOLIO.profile.site },
    { type: "profile", label: "Email", url: `mailto:${PORTFOLIO.profile.email}` }
  ];
  const socials = PORTFOLIO.socials.map((item) => ({ type: "social", ...item }));
  const projectLive = projectsWithSlugs()
    .filter((p) => p.liveUrl)
    .map((p) => ({ type: "project-live", label: p.title, slug: p.slug, url: p.liveUrl }));
  const projectRepos = projectsWithSlugs()
    .filter((p) => p.repoUrl)
    .map((p) => ({ type: "project-repo", label: p.title, slug: p.slug, url: p.repoUrl }));
  const caseStudies = projectsWithSlugs()
    .filter((p) => p.caseStudyUrl || p.url)
    .map((p) => ({
      type: "case-study",
      label: p.title,
      slug: p.slug,
      url: absoluteUrl(p.caseStudyUrl || p.url, origin)
    }));
  const research = researchWithSlugs()
    .filter((p) => p.url)
    .map((p) => ({ type: "research", label: p.title, slug: p.slug, url: p.url }));
  const certifications = certificationsWithIds()
    .filter((c) => c.url)
    .map((c) => ({ type: "certification", label: c.title, issuer: c.issuer, slug: c.slug, id: c.id, url: c.url }));
  const api = ENDPOINTS
    .filter((e) => e.method === "GET")
    .map((e) => ({
      type: "api",
      label: e.path,
      url: absoluteUrl(e.path.replace(":slug", "clex-ai").replace(":idOrSlug", "1").replace("?cmd=<name>", "?cmd=help").replace("?q=<query>", "?q=ai"), origin)
    }));
  const all = [...profile, ...socials, ...projectLive, ...projectRepos, ...caseStudies, ...research, ...certifications, ...api];
  return {
    all,
    profile,
    socials,
    projects: { live: projectLive, repositories: projectRepos, caseStudies },
    research,
    certifications,
    api
  };
}

export function assetManifest(origin = "https://abhnv.in") {
  const projectAssets = projectsWithSlugs().map((p) => ({
    type: "project",
    slug: p.slug,
    title: p.title,
    shortImage: absoluteUrl(p.shortImage, origin),
    detailedImage: absoluteUrl(p.detailedImage, origin),
    logo: absoluteUrl(p.logo, origin)
  }));
  const researchAssets = researchWithSlugs().map((p) => ({
    type: "research",
    slug: p.slug,
    title: p.title,
    shortImage: absoluteUrl(p.shortImage, origin),
    detailedImage: absoluteUrl(p.detailedImage, origin),
    logo: absoluteUrl(p.logo, origin)
  }));
  const site = [
    { type: "site", label: "favicon", url: absoluteUrl("assets/favicon.png", origin) },
    { type: "site", label: "apple-touch-icon", url: absoluteUrl("assets/apple-touch-icon.png", origin) },
    { type: "site", label: "logo", url: absoluteUrl("assets/logo-transparent.png", origin) },
    { type: "site", label: "social-preview", url: absoluteUrl("assets/social-preview-2026-05-04.jpg", origin) }
  ];
  const all = [
    ...site,
    ...projectAssets.flatMap((p) => [
      { type: `${p.type}-short-image`, label: p.title, slug: p.slug, url: p.shortImage },
      { type: `${p.type}-detailed-image`, label: p.title, slug: p.slug, url: p.detailedImage },
      { type: `${p.type}-logo`, label: p.title, slug: p.slug, url: p.logo }
    ]),
    ...researchAssets.flatMap((p) => [
      { type: `${p.type}-short-image`, label: p.title, slug: p.slug, url: p.shortImage },
      { type: `${p.type}-detailed-image`, label: p.title, slug: p.slug, url: p.detailedImage },
      { type: `${p.type}-logo`, label: p.title, slug: p.slug, url: p.logo }
    ])
  ].filter((item) => item.url);
  return { all, site, projects: projectAssets, research: researchAssets };
}

function searchText(value) {
  if (Array.isArray(value)) return value.map(searchText).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(searchText).join(" ");
  return String(value || "");
}

export function searchRecords(query = "", type = "") {
  const records = [
    { type: "profile", title: PORTFOLIO.profile.name, url: PORTFOLIO.profile.site, data: PORTFOLIO.profile },
    ...projectsWithSlugs().map((p) => ({ type: "project", title: p.title, slug: p.slug, url: p.liveUrl || p.caseStudyUrl || p.url, tags: p.tags || [], data: p })),
    ...researchWithSlugs().map((p) => ({ type: "research", title: p.title, slug: p.slug, url: p.url, tags: p.tags || [], data: p })),
    ...certificationsWithIds().map((c) => ({ type: "certification", title: c.title, slug: c.slug, id: c.id, url: c.url, tags: c.tags || [], issuer: c.issuer, data: c })),
    ...PORTFOLIO.notes.map((n) => ({ type: "note", title: n.title, id: n.number, data: n })),
    ...PORTFOLIO.skills.map((g) => ({ type: "skill-group", title: g.group, data: g })),
    ...PORTFOLIO.socials.map((s) => ({ type: "social", title: s.label, url: s.url, data: s }))
  ];
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const normalizedType = String(type || "").trim().toLowerCase();
  return records
    .filter((record) => !normalizedType || record.type === normalizedType)
    .filter((record) => {
      if (!normalizedQuery) return true;
      return searchText(record).toLowerCase().includes(normalizedQuery);
    })
    .map(({ data, ...summary }) => ({
      ...summary,
      excerpt: searchText(data).replace(/\s+/g, " ").trim().slice(0, 220)
    }));
}

export function summary(origin = "https://abhnv.in") {
  const tags = tagIndex();
  const links = publicLinks(origin);
  return {
    profile: PORTFOLIO.profile,
    counts: counts(),
    featuredProjects: projectsWithSlugs().slice(0, 5),
    featuredResearch: researchWithSlugs(),
    topTags: tags.all.slice(0, 12),
    primaryLinks: [
      ...links.profile,
      ...links.socials,
      ...links.projects.live
    ],
    openTo: PORTFOLIO.profile.open_to,
    marquee: PORTFOLIO.marquee
  };
}

export function cloudflareInfo(request, env = {}) {
  const url = request ? new URL(request.url) : new URL("https://abhnv.in/api/cloudflare");
  const base = `${url.origin}/api`;
  return {
    platform: "Cloudflare Pages Functions",
    runtime: "Pages Functions using ES module onRequest handlers",
    branch: env.CF_PAGES_BRANCH || null,
    commit: env.CF_PAGES_COMMIT_SHA || null,
    deploymentUrl: env.CF_PAGES_URL || null,
    localDev: {
      command: "wrangler pages dev . --ip 127.0.0.1 --port 8788",
      url: "http://127.0.0.1:8788",
      note: "Use Wrangler for /api routes. A static Python server can show HTML but cannot execute Pages Functions."
    },
    commands: {
      smoke: `curl -s ${base}?format=json | jq`,
      profile: `curl -s ${base}/profile | jq`,
      command: `curl -s '${base}/command?cmd=summary' | jq`,
      search: `curl -s '${base}/search?q=ai' | jq`,
      health: `curl -s ${base}/health | jq`
    },
    headers: {
      cors: "access-control-allow-origin: *",
      methods: "GET, OPTIONS",
      cache: "public, max-age=300, s-maxage=600, stale-while-revalidate=1200",
      version: API_VERSION
    },
    importantRoutes: ENDPOINTS.filter((route) => route.method === "GET")
  };
}

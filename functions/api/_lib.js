// =============================================================================
// API helpers: JSON envelope, CORS, route catalogue, finders and indexes.
// Every function under /functions/api imports from here.
// =============================================================================

import { PORTFOLIO, API_VERSION, API_BUILD } from "./_data.js";

export { PORTFOLIO, API_VERSION, API_BUILD };

// ---- CORS ------------------------------------------------------------------
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type, accept",
  "access-control-max-age": "86400",
  "vary": "origin"
};

// ---- Commands accepted by /api/command?cmd= --------------------------------
export const COMMANDS = [
  "profile",
  "skills",
  "projects",
  "research",
  "security",
  "certifications",
  "socials",
  "notes",
  "timeline",
  "summary",
  "links",
  "tags",
  "search",
  "assets",
  "version",
  "endpoints",
  "stats",
  "health",
  "help"
];

// ---- Endpoint catalogue ----------------------------------------------------
export const ENDPOINTS = [
  { method: "GET", path: "/api",                            description: "Index: endpoints, commands, version and counts" },
  { method: "GET", path: "/api/profile",                    description: "Name, role, summary, Bugcrowd profile and what I am open to" },
  { method: "GET", path: "/api/skills",                     description: "Skills grouped by area; ?flat=1 for one list" },
  { method: "GET", path: "/api/projects",                   description: "The five products; ?tag=Cloudflare to filter" },
  { method: "GET", path: "/api/projects/:slug",             description: "One product: clex, clex-ai, driped, trgt, modih-mail" },
  { method: "GET", path: "/api/research",                   description: "Research papers" },
  { method: "GET", path: "/api/research/:slug",             description: "One paper by slug" },
  { method: "GET", path: "/api/security",                   description: "Research areas, methodology and report patterns from the Security page" },
  { method: "GET", path: "/api/certifications",             description: "Credentials; ?tag=Security, ?issuer=Harvard University, ?groupBy=issuer" },
  { method: "GET", path: "/api/certifications/:idOrSlug",   description: "One credential by 1-based id or title slug" },
  { method: "GET", path: "/api/socials",                    description: "Public profile links" },
  { method: "GET", path: "/api/notes",                      description: "Current focus notes from the homepage" },
  { method: "GET", path: "/api/summary",                    description: "Profile, counts, featured products, research and top tags in one call" },
  { method: "GET", path: "/api/links",                      description: "Every public URL on the site, grouped" },
  { method: "GET", path: "/api/tags",                       description: "Tags across products, research, credentials and skills, with counts" },
  { method: "GET", path: "/api/search?q=<query>",           description: "Search public records by text, tag, title or issuer" },
  { method: "GET", path: "/api/assets",                     description: "Image, logo and social-preview manifest" },
  { method: "GET", path: "/api/health",                     description: "Status, version and record counts" },
  { method: "GET", path: "/api/command?cmd=<name>",         description: "Command-style access to the same data" },
  { method: "POST", path: "/api/contact",                   description: "Send a message through the contact form (name, email, topic, message)" }
];

// ---- Cache policy ----------------------------------------------------------
const CACHE_PUBLIC = "public, max-age=300, s-maxage=600, stale-while-revalidate=1200";
const CACHE_NONE = "no-store";

// ---- Response helpers ------------------------------------------------------
function metaBlock(extra = {}) {
  return {
    version: API_VERSION,
    build: API_BUILD,
    generatedAt: new Date().toISOString(),
    source: "abhnv.in/api",
    docs: "https://abhnv.in/api",
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
      "x-content-type-options": "nosniff",
      ...CORS_HEADERS,
      ...(init.headers || {})
    }
  });
}

export function ok(data, meta = {}, init = {}) {
  return json({ ok: true, data, meta: metaBlock(meta) }, init);
}

export function fail(status, error, hint, extra = {}) {
  return json({ ok: false, error, hint: hint || null, meta: metaBlock(extra) }, { status, cache: CACHE_NONE });
}

export function options() {
  return new Response(null, {
    status: 204,
    headers: { ...CORS_HEADERS, "cache-control": "public, max-age=86400" }
  });
}

export function methodNotAllowed() {
  return fail(405, "Method not allowed.", "This endpoint accepts GET (and OPTIONS for CORS) only.");
}

// ---- Public profile shape --------------------------------------------------
export function publicProfile() {
  const p = PORTFOLIO.profile;
  return {
    name: p.name,
    role: p.role,
    publication: p.publication,
    summary: p.summary,
    site: p.site,
    email: p.email,
    location: p.location,
    researchSince: p.researchSince,
    bugcrowd: p.bugcrowd,
    openTo: p.openTo
  };
}

// ---- Slugs and finders -----------------------------------------------------
export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function projectsWithSlugs() {
  return PORTFOLIO.projects.map((p) => ({ ...p, slug: p.slug || slugify(p.title) }));
}

export function researchWithSlugs() {
  return PORTFOLIO.researchPapers.map((r) => ({ ...r, slug: r.slug || slugify(r.title) }));
}

export function certificationsWithIds() {
  return PORTFOLIO.certifications.map((c, i) => ({ id: i + 1, slug: slugify(c.title), ...c }));
}

export function findProject(needle) {
  const target = String(needle || "").trim().toLowerCase();
  if (!target) return null;
  return projectsWithSlugs().find((p) => p.slug === target || slugify(p.title) === target) || null;
}

export function findResearch(needle) {
  const target = String(needle || "").trim().toLowerCase();
  if (!target) return null;
  return researchWithSlugs().find((r) => r.slug === target || slugify(r.title) === target) || null;
}

export function findCertification(needle) {
  const raw = String(needle || "").trim();
  const lower = raw.toLowerCase();
  if (!raw) return null;
  return certificationsWithIds().find((c) => String(c.id) === raw || c.slug === lower) || null;
}

export function certificationsByIssuer() {
  const groups = new Map();
  for (const cert of certificationsWithIds()) {
    const issuer = cert.issuer || "Other";
    if (!groups.has(issuer)) groups.set(issuer, []);
    groups.get(issuer).push(cert);
  }
  return Array.from(groups, ([issuer, items]) => ({ issuer, count: items.length, items }));
}

// ---- Counts ----------------------------------------------------------------
export function counts() {
  return {
    projects: PORTFOLIO.projects.length,
    research: PORTFOLIO.researchPapers.length,
    certifications: PORTFOLIO.certifications.length,
    securityAreas: PORTFOLIO.security.areas.length,
    methodSteps: PORTFOLIO.security.method.length,
    socials: PORTFOLIO.socials.length,
    notes: PORTFOLIO.notes.length,
    skillGroups: PORTFOLIO.skills.length,
    skills: PORTFOLIO.skills.reduce((sum, g) => sum + (g.items?.length || 0), 0),
    commands: COMMANDS.length,
    endpoints: ENDPOINTS.length
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
    ...certifications.flatMap((t) => Array(t.count).fill(t.name))
  ]);
  return { all, projects, research, certifications, skills };
}

export function publicLinks(origin = "https://abhnv.in") {
  const p = PORTFOLIO.profile;
  const profile = [
    { type: "profile", label: "Website", url: p.site },
    { type: "profile", label: "Email", url: `mailto:${p.email}` },
    { type: "profile", label: "Bugcrowd", url: p.bugcrowd.url }
  ];
  const socials = PORTFOLIO.socials.map((item) => ({ type: "social", ...item }));
  const projects = projectsWithSlugs();
  const projectLive = projects.filter((x) => x.liveUrl).map((x) => ({ type: "project-live", label: x.title, slug: x.slug, url: x.liveUrl }));
  const projectRepos = projects.filter((x) => x.repoUrl).map((x) => ({ type: "project-repo", label: x.title, slug: x.slug, url: x.repoUrl }));
  const caseStudies = projects.map((x) => ({ type: "case-study", label: x.title, slug: x.slug, url: absoluteUrl(x.caseStudyUrl || x.url, origin) }));
  const research = researchWithSlugs().filter((x) => x.url).map((x) => ({ type: "research", label: x.title, slug: x.slug, url: x.url }));
  const certifications = certificationsWithIds().filter((c) => c.url).map((c) => ({ type: "certification", label: c.title, issuer: c.issuer, slug: c.slug, id: c.id, url: c.url }));
  const pages = [
    { type: "page", label: "Profile", url: absoluteUrl("/", origin) },
    { type: "page", label: "Security", url: absoluteUrl("/security", origin) },
    { type: "page", label: "Builds", url: absoluteUrl("/work", origin) },
    { type: "page", label: "Credentials", url: absoluteUrl("/credentials", origin) },
    { type: "page", label: "API", url: absoluteUrl("/api", origin) },
    { type: "page", label: "Command Desk", url: absoluteUrl("/terminal", origin) },
    { type: "page", label: "Contact", url: absoluteUrl("/contact", origin) },
    { type: "page", label: "security.txt", url: absoluteUrl("/.well-known/security.txt", origin) }
  ];
  const all = [...profile, ...socials, ...pages, ...projectLive, ...projectRepos, ...caseStudies, ...research, ...certifications];
  return { all, profile, socials, pages, projects: { live: projectLive, repositories: projectRepos, caseStudies }, research, certifications };
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
    { type: "site", label: "portrait", url: absoluteUrl("assets/portrait-abhinav.jpg", origin) },
    { type: "site", label: "social-preview", url: absoluteUrl("assets/social-preview-2026-09.jpg", origin) }
  ];
  const all = [
    ...site,
    ...projectAssets.flatMap((p) => [
      { type: "project-short-image", label: p.title, slug: p.slug, url: p.shortImage },
      { type: "project-detailed-image", label: p.title, slug: p.slug, url: p.detailedImage },
      { type: "project-logo", label: p.title, slug: p.slug, url: p.logo }
    ]),
    ...researchAssets.flatMap((p) => [
      { type: "research-short-image", label: p.title, slug: p.slug, url: p.shortImage },
      { type: "research-detailed-image", label: p.title, slug: p.slug, url: p.detailedImage },
      { type: "research-logo", label: p.title, slug: p.slug, url: p.logo }
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
  const sec = PORTFOLIO.security;
  const records = [
    { type: "profile", title: PORTFOLIO.profile.name, url: PORTFOLIO.profile.site, data: publicProfile() },
    ...projectsWithSlugs().map((p) => ({ type: "project", title: p.title, slug: p.slug, url: p.liveUrl || p.caseStudyUrl || p.url, tags: p.tags || [], data: p })),
    ...researchWithSlugs().map((p) => ({ type: "research", title: p.title, slug: p.slug, url: p.url, tags: p.tags || [], data: p })),
    ...sec.areas.map((a) => ({ type: "security-area", title: a.title, slug: a.id, url: `https://abhnv.in/security#${a.id}`, data: a })),
    ...sec.method.map((m, i) => ({ type: "security-method", title: m.title, id: i + 1, url: "https://abhnv.in/security#method", data: m })),
    ...certificationsWithIds().map((c) => ({ type: "certification", title: c.title, slug: c.slug, id: c.id, url: c.url, tags: c.tags || [], issuer: c.issuer, data: c })),
    ...PORTFOLIO.notes.map((n) => ({ type: "note", title: n.title, id: n.number, data: n })),
    ...PORTFOLIO.skills.map((g) => ({ type: "skill-group", title: g.group, data: g })),
    ...PORTFOLIO.socials.map((s) => ({ type: "social", title: s.label, url: s.url, data: s }))
  ];
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const normalizedType = String(type || "").trim().toLowerCase();
  return records
    .filter((record) => !normalizedType || record.type === normalizedType)
    .filter((record) => !normalizedQuery || searchText(record).toLowerCase().includes(normalizedQuery))
    .map(({ data, ...summary }) => ({
      ...summary,
      excerpt: searchText(data).replace(/\s+/g, " ").trim().slice(0, 220)
    }));
}

export function securityPublic() {
  const s = PORTFOLIO.security;
  return {
    since: s.since,
    bugcrowd: PORTFOLIO.profile.bugcrowd,
    intro: s.intro,
    areas: s.areas,
    method: s.method,
    patterns: s.patterns,
    disclosure: {
      securityTxt: "https://abhnv.in/.well-known/security.txt",
      contact: `mailto:${PORTFOLIO.profile.email}`
    }
  };
}

export function summary(origin = "https://abhnv.in") {
  const tags = tagIndex();
  const links = publicLinks(origin);
  return {
    profile: publicProfile(),
    counts: counts(),
    security: {
      since: PORTFOLIO.security.since,
      bugcrowd: PORTFOLIO.profile.bugcrowd,
      areas: PORTFOLIO.security.areas.map((a) => a.title)
    },
    products: projectsWithSlugs(),
    research: researchWithSlugs(),
    topTags: tags.all.slice(0, 12),
    primaryLinks: [...links.profile, ...links.socials, ...links.projects.live],
    openTo: PORTFOLIO.profile.openTo
  };
}

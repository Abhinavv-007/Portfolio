import {
  ok,
  options,
  methodNotAllowed,
  PORTFOLIO,
  ENDPOINTS,
  COMMANDS,
  counts,
  API_VERSION,
  API_BUILD
} from "./_lib.js";

export const onRequestOptions = options;

// /api supports content negotiation:
//   - Browsers (Accept: text/html ...) see the developer page (/api.html).
//   - JSON clients (fetch/curl/Accept application/json or */*) get JSON.
//   - Force JSON in any client with ?format=json.
async function maybeServeDeveloperPage(request, env) {
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") || "").toLowerCase();
  if (format === "json" || format === "raw") return null;

  const accept = (request.headers.get("accept") || "").toLowerCase();
  const wantsHtml =
    accept.includes("text/html") &&
    !accept.includes("application/json");
  if (!wantsHtml) return null;
  if (!env?.ASSETS?.fetch) return null;

  const assetUrl = new URL("/api.html", request.url);
  const assetReq = new Request(assetUrl.toString(), {
    method: "GET",
    headers: request.headers
  });
  const res = await env.ASSETS.fetch(assetReq);
  if (!res.ok) return null;

  const headers = new Headers(res.headers);
  headers.set("cache-control", "public, max-age=300, s-maxage=600, stale-while-revalidate=1200");
  headers.set("x-api-version", API_VERSION);
  headers.set("vary", "accept");
  return new Response(res.body, { status: 200, headers });
}

export async function onRequestGet({ request, env }) {
  const html = await maybeServeDeveloperPage(request, env);
  if (html) return html;

  const url = new URL(request.url);
  const base = `${url.origin}/api`;

  return ok({
    name: "The Build Journal API",
    description:
      "Public, read-only API surface for Abhinav Raj's portfolio. " +
      "Every public field on the site (profile, projects, credentials, research, " +
      "skills, socials, notes) is reachable here.",
    version: API_VERSION,
    build: API_BUILD,
    profile: {
      name: PORTFOLIO.profile.name,
      role: PORTFOLIO.profile.role,
      site: PORTFOLIO.profile.site,
      email: PORTFOLIO.profile.email
    },
    endpoints: ENDPOINTS.map((e) => ({
      ...e,
      url: e.path.includes(":")
        ? `${base.replace(/\/api$/, "")}${e.path.split("?")[0]}`
        : `${base.replace(/\/api$/, "")}${e.path}`
    })),
    commands: COMMANDS,
    examples: [
      `${base}/profile`,
      `${base}/projects`,
      `${base}/projects/clex-ai`,
      `${base}/certifications`,
      `${base}/research`,
      `${base}/summary`,
      `${base}/links`,
      `${base}/tags`,
      `${base}/search?q=ai`,
      `${base}/health`,
      `${base}/cloudflare`,
      `${base}/command?cmd=summary`,
      `${base}/command?cmd=help`
    ],
    poweredBy: "Cloudflare Pages Functions",
    consumers: [
      "lnch.in",
      "Other Abhinav projects that need a single source of portfolio truth"
    ]
  }, {
    counts: counts()
  });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

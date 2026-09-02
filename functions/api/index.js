import {
  ok,
  options,
  methodNotAllowed,
  publicProfile,
  ENDPOINTS,
  COMMANDS,
  counts,
  API_VERSION,
  API_BUILD
} from "./_lib.js";

export const onRequestOptions = options;

// /api negotiates content:
//   - Browsers asking for text/html get the documentation page (/api.html).
//   - fetch, curl and anything asking for JSON get the index below.
//   - ?format=json forces JSON in any client.
async function maybeServeDocs(request, env) {
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") || "").toLowerCase();
  if (format === "json" || format === "raw") return null;

  const accept = (request.headers.get("accept") || "").toLowerCase();
  const wantsHtml = accept.includes("text/html") && !accept.includes("application/json");
  if (!wantsHtml || !env?.ASSETS?.fetch) return null;

  // Pages applies clean URLs to assets, so ask for /api (served from api.html)
  // and fall back to the file name for environments that do not rewrite.
  let res = null;
  for (const path of ["/api", "/api.html"]) {
    const assetUrl = new URL(path, request.url);
    const attempt = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: "GET", headers: { accept: "text/html" }, redirect: "manual" }));
    if (attempt.status === 200) { res = attempt; break; }
  }
  if (!res) return null;

  const headers = new Headers(res.headers);
  headers.set("cache-control", "public, max-age=300, s-maxage=600, stale-while-revalidate=1200");
  headers.set("x-api-version", API_VERSION);
  headers.set("vary", "accept");
  return new Response(res.body, { status: 200, headers });
}

export async function onRequestGet({ request, env }) {
  const docs = await maybeServeDocs(request, env);
  if (docs) return docs;

  const origin = new URL(request.url).origin;
  const base = `${origin}/api`;

  return ok({
    name: "abhnv.in API",
    description: "Read-only JSON for everything published on abhnv.in: profile, security research areas and methodology, products, research papers, credentials, skills and links.",
    version: API_VERSION,
    build: API_BUILD,
    profile: publicProfile(),
    endpoints: ENDPOINTS.map((e) => ({ ...e, url: `${origin}${e.path.split("?")[0]}` })),
    commands: COMMANDS,
    examples: [
      `${base}/summary`,
      `${base}/security`,
      `${base}/projects/clex-ai`,
      `${base}/research`,
      `${base}/certifications?tag=Security`,
      `${base}/search?q=authorization`,
      `${base}/command?cmd=help`
    ]
  }, { counts: counts() });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

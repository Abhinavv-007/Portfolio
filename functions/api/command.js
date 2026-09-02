import {
  ok,
  fail,
  options,
  methodNotAllowed,
  PORTFOLIO,
  COMMANDS,
  ENDPOINTS,
  API_VERSION,
  API_BUILD,
  publicProfile,
  projectsWithSlugs,
  researchWithSlugs,
  certificationsWithIds,
  counts,
  summary,
  publicLinks,
  tagIndex,
  searchRecords,
  assetManifest,
  securityPublic
} from "./_lib.js";

export const onRequestOptions = options;

export function onRequestGet({ request }) {
  const url = new URL(request.url);
  const origin = url.origin;
  const cmd = (url.searchParams.get("cmd") || url.searchParams.get("command") || "").trim().toLowerCase();

  if (!cmd) {
    return fail(400, "Missing cmd query parameter.",
      `Try one of: ${COMMANDS.join(", ")}. Example: /api/command?cmd=security`,
      { commands: COMMANDS });
  }

  switch (cmd) {
    case "profile":
    case "me":
    case "whoami":
      return ok(publicProfile(), { cmd });

    case "skills":
    case "stack":
      return ok(PORTFOLIO.skills, { cmd, groups: PORTFOLIO.skills.length });

    case "projects":
    case "builds":
    case "products":
    case "work":
      return ok(projectsWithSlugs(), { cmd, count: PORTFOLIO.projects.length });

    case "research":
    case "papers":
      return ok(researchWithSlugs(), { cmd, count: PORTFOLIO.researchPapers.length });

    case "security":
    case "bugcrowd":
    case "method":
      return ok(securityPublic(), { cmd });

    case "certifications":
    case "certs":
    case "credentials":
      return ok(certificationsWithIds(), { cmd, count: PORTFOLIO.certifications.length });

    case "socials":
    case "social":
      return ok(PORTFOLIO.socials, { cmd, count: PORTFOLIO.socials.length });

    case "notes":
    case "focus":
      return ok(PORTFOLIO.notes, { cmd, count: PORTFOLIO.notes.length });

    case "timeline":
      return ok(PORTFOLIO.timeline, { cmd, count: PORTFOLIO.timeline.length });

    case "summary":
      return ok(summary(origin), { cmd });

    case "links":
    case "urls": {
      const links = publicLinks(origin);
      return ok(links, { cmd, count: links.all.length });
    }

    case "tags": {
      const tags = tagIndex();
      return ok(tags, { cmd, count: tags.all.length });
    }

    case "search": {
      const q = url.searchParams.get("q") || url.searchParams.get("query") || "";
      const type = url.searchParams.get("type") || "";
      const results = searchRecords(q, type);
      return ok(results, { cmd, q, type: type || null, count: results.length });
    }

    case "assets": {
      const assets = assetManifest(origin);
      return ok(assets, { cmd, count: assets.all.length });
    }

    case "version":
      return ok({ version: API_VERSION, build: API_BUILD, commands: COMMANDS }, { cmd });

    case "endpoints":
    case "routes":
      return ok(ENDPOINTS, { cmd, count: ENDPOINTS.length });

    case "stats":
      return ok(counts(), { cmd });

    case "health":
    case "status":
      return ok({ status: "ok", version: API_VERSION, build: API_BUILD, counts: counts() }, { cmd });

    case "help":
    case "?":
    case "ls":
      return ok({
        usage: "/api/command?cmd=<name>",
        commands: COMMANDS,
        endpoints: ENDPOINTS,
        examples: [
          "/api/command?cmd=summary",
          "/api/command?cmd=security",
          "/api/command?cmd=projects",
          "/api/command?cmd=search&q=oauth",
          "/api/command?cmd=certifications",
          "/api/command?cmd=links"
        ]
      }, { cmd });

    default:
      return fail(404, `Unknown command "${cmd}".`, `Available: ${COMMANDS.join(", ")}.`, { cmd, commands: COMMANDS });
  }
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

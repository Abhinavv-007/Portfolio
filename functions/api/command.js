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
  projectsWithSlugs,
  researchWithSlugs,
  certificationsWithIds,
  counts
} from "./_lib.js";

export const onRequestOptions = options;

export function onRequestGet({ request }) {
  const url = new URL(request.url);
  const cmd = (url.searchParams.get("cmd") || url.searchParams.get("command") || "").trim().toLowerCase();

  if (!cmd) {
    return fail(400, "Missing `cmd` query parameter.",
      `Try one of: ${COMMANDS.join(", ")}. Example: /api/command?cmd=profile.`,
      { commands: COMMANDS });
  }

  switch (cmd) {
    case "profile":
    case "me":
    case "about":
      return ok(PORTFOLIO.profile, { cmd });

    case "skills":
    case "stack":
      return ok(PORTFOLIO.skills, {
        cmd,
        groups: PORTFOLIO.skills.length
      });

    case "projects":
    case "builds":
    case "work":
      return ok(projectsWithSlugs(), {
        cmd,
        count: PORTFOLIO.projects.length
      });

    case "certifications":
    case "certs":
    case "credentials":
      return ok(certificationsWithIds(), {
        cmd,
        count: PORTFOLIO.certifications.length
      });

    case "research":
    case "papers":
      return ok(researchWithSlugs(), {
        cmd,
        count: PORTFOLIO.researchPapers.length
      });

    case "socials":
    case "links":
    case "social":
      return ok(PORTFOLIO.socials, {
        cmd,
        count: PORTFOLIO.socials.length
      });

    case "notes":
    case "scratch":
      return ok(PORTFOLIO.notes, {
        cmd,
        count: PORTFOLIO.notes.length
      });

    case "marquee":
      return ok(PORTFOLIO.marquee, { cmd });

    case "version":
      return ok({
        version: API_VERSION,
        build: API_BUILD,
        commands: COMMANDS
      }, { cmd });

    case "endpoints":
    case "routes":
      return ok(ENDPOINTS, { cmd, count: ENDPOINTS.length });

    case "stats":
    case "summary":
      return ok(counts(), { cmd });

    case "help":
    case "?":
    case "ls":
      return ok({
        usage: "/api/command?cmd=<name>",
        commands: COMMANDS,
        endpoints: ENDPOINTS,
        examples: [
          "/api/command?cmd=profile",
          "/api/command?cmd=projects",
          "/api/command?cmd=certifications",
          "/api/command?cmd=research",
          "/api/command?cmd=skills"
        ]
      }, { cmd });

    default:
      return fail(404, `Unknown command "${cmd}".`,
        `Available: ${COMMANDS.join(", ")}.`,
        { cmd, commands: COMMANDS });
  }
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

import {
  ok,
  options,
  methodNotAllowed,
  counts,
  API_VERSION,
  API_BUILD
} from "./_lib.js";

export const onRequestOptions = options;

export function onRequestGet({ request, env }) {
  return ok({
    status: "ok",
    version: API_VERSION,
    build: API_BUILD,
    counts: counts(),
    cloudflare: {
      colo: request.cf?.colo || null,
      country: request.cf?.country || null,
      city: request.cf?.city || null,
      timezone: request.cf?.timezone || null,
      pages: env?.CF_PAGES === "1",
      branch: env?.CF_PAGES_BRANCH || null,
      commit: env?.CF_PAGES_COMMIT_SHA || null,
      deploymentUrl: env?.CF_PAGES_URL || null
    }
  }, { cmd: "health" });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

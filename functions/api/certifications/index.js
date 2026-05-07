import {
  ok,
  options,
  methodNotAllowed,
  certificationsWithIds,
  certificationsByIssuer,
  PORTFOLIO
} from "../_lib.js";

export const onRequestOptions = options;

export function onRequestGet({ request }) {
  const url = new URL(request.url);
  const tag = (url.searchParams.get("tag") || "").trim().toLowerCase();
  const issuer = (url.searchParams.get("issuer") || "").trim().toLowerCase();
  const groupBy = (url.searchParams.get("groupBy") || "").trim().toLowerCase();

  let list = certificationsWithIds();

  if (tag) {
    list = list.filter((c) =>
      (c.tags || []).some((t) => String(t).toLowerCase() === tag)
    );
  }
  if (issuer) {
    list = list.filter((c) => String(c.issuer || "").toLowerCase() === issuer);
  }

  const allTags = Array.from(
    new Set(PORTFOLIO.certifications.flatMap((c) => c.tags || []).map(String))
  ).sort();
  const allIssuers = Array.from(
    new Set(PORTFOLIO.certifications.map((c) => c.issuer).filter(Boolean))
  ).sort();

  if (groupBy === "issuer") {
    return ok(certificationsByIssuer(), {
      cmd: "certifications",
      shape: "groupedByIssuer",
      count: PORTFOLIO.certifications.length,
      issuers: allIssuers,
      tags: allTags
    });
  }

  return ok(list, {
    cmd: "certifications",
    shape: "flat",
    count: list.length,
    total: PORTFOLIO.certifications.length,
    issuers: allIssuers,
    tags: allTags,
    filter: (tag || issuer) ? { tag: tag || null, issuer: issuer || null } : null
  });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

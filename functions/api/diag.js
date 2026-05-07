// Drift check: compares the server-side _data.js mirror against the client-side
// /data.js asset. Returns counts from both. If a field count differs the
// `inSync` flag flips to false so it's easy to spot in deploy logs.

import {
  ok,
  fail,
  options,
  methodNotAllowed,
  PORTFOLIO,
  counts,
  API_VERSION,
  API_BUILD
} from "./_lib.js";

const ARRAY_FIELDS = ["skills", "socials", "projects", "researchPapers", "certifications", "notes", "marquee"];

function tally(obj) {
  const out = {};
  for (const key of ARRAY_FIELDS) {
    out[key] = Array.isArray(obj?.[key]) ? obj[key].length : null;
  }
  return out;
}

export const onRequestOptions = options;

export async function onRequestGet({ request, env }) {
  const serverTally = tally(PORTFOLIO);

  let clientTally = null;
  let clientError = null;

  try {
    if (env?.ASSETS?.fetch) {
      const url = new URL("/data.js", request.url);
      url.search = "";
      const res = await env.ASSETS.fetch(new Request(url.toString()));
      if (res.ok) {
        const text = await res.text();
        clientTally = {};
        for (const key of ARRAY_FIELDS) {
          const re = new RegExp(`${key}\\s*:\\s*\\[`);
          const idx = text.search(re);
          if (idx === -1) {
            clientTally[key] = null;
            continue;
          }
          let depth = 0;
          let count = 0;
          let i = text.indexOf("[", idx);
          let inString = false;
          let stringChar = "";
          let isFirstItem = true;
          for (; i < text.length; i++) {
            const ch = text[i];
            if (inString) {
              if (ch === "\\") { i++; continue; }
              if (ch === stringChar) inString = false;
              continue;
            }
            if (ch === '"' || ch === "'") { inString = true; stringChar = ch; continue; }
            if (ch === "[" || ch === "{") {
              depth++;
              if (depth === 2 && isFirstItem) { count++; isFirstItem = false; }
              continue;
            }
            if (ch === "]" || ch === "}") {
              depth--;
              if (depth === 0) break;
              continue;
            }
            if (ch === "," && depth === 1) { count++; continue; }
          }
          // Marquee is a flat array of strings — first non-string char trick fails.
          // Recount strings for top-level [ ... ] of strings.
          if (key === "marquee") {
            const arrMatch = text.match(/marquee\s*:\s*\[([\s\S]*?)\]/);
            if (arrMatch) {
              const inner = arrMatch[1];
              const matches = inner.match(/"(?:[^"\\]|\\.)*"/g);
              count = matches ? matches.length : 0;
            }
          }
          clientTally[key] = count;
        }
      } else {
        clientError = `data.js fetch returned ${res.status}`;
      }
    } else {
      clientError = "ASSETS binding not available in this environment";
    }
  } catch (err) {
    clientError = String(err?.message || err);
  }

  const inSync = clientTally
    ? ARRAY_FIELDS.every((k) => clientTally[k] === serverTally[k])
    : null;

  return ok({
    inSync,
    serverTally,
    clientTally,
    clientError,
    counts: counts()
  }, {
    cmd: "diag",
    note: "Counts only — not a deep diff. Use this to catch obvious drift between /data.js (frontend) and functions/api/_data.js (server)."
  });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

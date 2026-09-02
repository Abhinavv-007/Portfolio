import { ok, options, methodNotAllowed, securityPublic } from "./_lib.js";

export const onRequestOptions = options;

// The public content of /security: research areas, methodology and report
// patterns. Nothing here references a program, a host or a report.
export function onRequestGet() {
  const data = securityPublic();
  return ok(data, { cmd: "security", areas: data.areas.length, steps: data.method.length });
}

export const onRequestPost = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

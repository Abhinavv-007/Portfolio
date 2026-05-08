// API page enhancements: live preview, deck cards, copy buttons, counters.
// Self-contained, no dependency on app.js internals beyond standard DOM.

(function () {
  "use strict";
  if (document.body.dataset.page !== "api") return;

  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

  const apiOrigin = window.location.origin;
  const baseApi = `${apiOrigin}/api`;

  const out = $("#apiOutput");
  const status = $("#apiStatus");
  const label = $("#apiConsoleLabel");
  const host = $("#apiHost");
  const deck = $("#apiDeck");

  if (host) host.textContent = apiOrigin.replace(/^https?:\/\//, "");

  const ENDPOINTS = [
    { method: "GET", path: "/api",                          tag: "Index",          group: "Index",       desc: "API index, available commands, version, counts." },
    { method: "GET", path: "/api/summary",                  tag: "Summary",        group: "Profile",     desc: "Compact profile, counts, featured links, and top tags." },
    { method: "GET", path: "/api/profile",                  tag: "Profile",        group: "Profile",     desc: "Public profile and short summary." },
    { method: "GET", path: "/api/skills",                   tag: "Skills",         group: "Profile",     desc: "Skills grouped by domain. Add ?flat=1 for a flat list." },
    { method: "GET", path: "/api/socials",                  tag: "Socials",        group: "Profile",     desc: "Social profile links." },
    { method: "GET", path: "/api/notes",                    tag: "Notes",          group: "Profile",     desc: "Notes from the bench." },
    { method: "GET", path: "/api/projects",                 tag: "Projects",       group: "Catalog",     desc: "All shipped projects. ?tag=AI to filter." },
    { method: "GET", path: "/api/projects/clex-ai",         tag: "Project",        group: "Catalog",     desc: "Single project by slug — clex-ai, clex, driped, trgt, modih-mail." },
    { method: "GET", path: "/api/certifications",           tag: "Credentials",    group: "Catalog",     desc: "All credentials. ?tag=AI or ?issuer=Google." },
    { method: "GET", path: "/api/certifications?groupBy=issuer", tag: "Credentials", group: "Catalog",   desc: "Credentials grouped by issuer." },
    { method: "GET", path: "/api/certifications/1",         tag: "Credential",     group: "Catalog",     desc: "One credential by id (1-based)." },
    { method: "GET", path: "/api/research",                 tag: "Research",       group: "Catalog",     desc: "Research papers." },
    { method: "GET", path: "/api/research/the-glass-ballot", tag: "Research",      group: "Catalog",     desc: "Single research paper by slug." },
    { method: "GET", path: "/api/links",                    tag: "Links",          group: "Discovery",   desc: "All public URLs: socials, project live sites, repos, case studies, research, certs." },
    { method: "GET", path: "/api/tags",                     tag: "Tags",           group: "Discovery",   desc: "Project, research, credential, and skill tags with counts." },
    { method: "GET", path: "/api/search?q=ai",              tag: "Search",         group: "Discovery",   desc: "Search public portfolio records by text, tag, title, issuer, or URL." },
    { method: "GET", path: "/api/assets",                   tag: "Assets",         group: "Discovery",   desc: "Images, logos, favicon, and social preview manifest." },
    { method: "GET", path: "/api/health",                   tag: "Health",         group: "Service",     desc: "API status, version, counts, and Cloudflare request metadata." },
    { method: "GET", path: "/api/cloudflare",               tag: "Cloudflare",     group: "Service",     desc: "Pages Functions routes, cache headers, wrangler commands, and curl smoke checks." },
    { method: "GET", path: "/api/command?cmd=help",         tag: "Command",        group: "Service",     desc: "Command-style read endpoint. Try cmd=summary, links, search, cloudflare." }
  ];

  const GROUP_ORDER = ["Index", "Profile", "Catalog", "Discovery", "Service"];
  const GROUP_BLURB = {
    Index:     "The root response — what's available, version, counts, examples.",
    Profile:   "Personal surface: identity, skills, socials, scratch notes.",
    Catalog:   "Everything shipped: projects (by slug), credentials (by id or issuer), research (by slug).",
    Discovery: "Cross-cutting indexes — links, tags, full-text search, asset manifest.",
    Service:   "Operational metadata — health, Cloudflare wiring, command surface."
  };

  function setStatus(text, tone) {
    if (!status) return;
    status.textContent = text;
    status.dataset.tone = tone || "idle";
  }

  function buildDeck() {
    if (!deck) return;
    deck.innerHTML = "";

    const grouped = new Map();
    GROUP_ORDER.forEach((g) => grouped.set(g, []));
    ENDPOINTS.forEach((ep) => {
      const g = ep.group || "Other";
      if (!grouped.has(g)) grouped.set(g, []);
      grouped.get(g).push(ep);
    });

    let cardIndex = 0;
    grouped.forEach((rows, group) => {
      if (!rows.length) return;
      const section = document.createElement("section");
      section.className = "api-deck-group";
      section.setAttribute("aria-label", `${group} endpoints`);

      const head = document.createElement("header");
      head.className = "api-deck-group-head";
      head.innerHTML = `
        <span class="api-deck-group-kicker">${group}</span>
        <span class="api-deck-group-count">${rows.length} endpoint${rows.length === 1 ? "" : "s"}</span>
        ${GROUP_BLURB[group] ? `<p class="api-deck-group-blurb">${GROUP_BLURB[group]}</p>` : ""}
      `;
      section.appendChild(head);

      const cards = document.createElement("div");
      cards.className = "api-deck";
      rows.forEach((ep) => {
        const card = document.createElement("article");
        card.className = "api-card reveal visible";
        card.style.setProperty("--delay", `${cardIndex * 22}ms`);
        cardIndex += 1;
        card.dataset.path = ep.path;
        card.innerHTML = `
          <header class="api-card-head">
            <span class="api-method">${ep.method}</span>
            <span class="api-card-tag">${ep.tag}</span>
          </header>
          <code class="api-card-path">${ep.path}</code>
          <p>${ep.desc}</p>
          <footer class="api-card-foot">
            <button type="button" class="api-card-run" data-api-path="${ep.path}">Run ↗</button>
            <a class="api-card-open" href="${ep.path === "/api" ? "/api?format=json" : ep.path}" target="_blank" rel="noopener" aria-label="Open ${ep.path} in a new tab">Raw</a>
          </footer>
        `;
        cards.appendChild(card);
      });
      section.appendChild(cards);
      deck.appendChild(section);
    });
  }

  function pretty(json) {
    try {
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return String(json);
    }
  }

  function syntaxColor(text) {
    // Lightweight JSON colorizer — no dependencies. Uses inline spans.
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/("(?:\\.|[^"\\])*")(\s*:)/g, '<span class="t-key">$1</span>$2')
      .replace(/:\s*("(?:\\.|[^"\\])*")/g, ': <span class="t-str">$1</span>')
      .replace(/\b(true|false|null)\b/g, '<span class="t-bool">$1</span>')
      .replace(/(?<![\w-])(-?\d+\.?\d*(?:e[+-]?\d+)?)(?!\w)/gi, '<span class="t-num">$1</span>');
  }

  let lastResponseText = "";

  async function runEndpoint(path) {
    const fullPath = path.startsWith("http") ? path : path;
    const target = path.startsWith("http") ? path : `${apiOrigin}${path.startsWith("/") ? "" : "/"}${path}`;
    if (label) label.textContent = `GET ${fullPath}`;
    if (out) out.querySelector("code").textContent = "Loading…";
    setStatus("loading", "loading");
    const t0 = performance.now();
    try {
      const res = await fetch(target, {
        method: "GET",
        headers: { accept: "application/json" }
      });
      const ms = Math.max(1, Math.round(performance.now() - t0));
      const text = await res.text();
      let formatted = text;
      try {
        const parsed = JSON.parse(text);
        formatted = pretty(parsed);
      } catch (e) {
        // leave as-is
      }
      lastResponseText = formatted;
      if (out) out.querySelector("code").innerHTML = syntaxColor(formatted);
      setStatus(`${res.status} ${res.ok ? "OK" : "ERROR"} · ${ms}ms`, res.ok ? "ok" : "error");
      $$(".api-card").forEach((c) => c.classList.toggle("is-active", c.dataset.path === path));
      if (history.replaceState) {
        const u = new URL(window.location.href);
        u.searchParams.set("try", path);
        history.replaceState(null, "", u.toString());
      }
    } catch (err) {
      const message = err?.message || "Request failed";
      if (out) out.querySelector("code").textContent = `// ${message}`;
      setStatus("network error", "error");
    }
  }

  function bindDeck() {
    if (!deck) return;
    deck.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-api-path]");
      if (!btn) return;
      event.preventDefault();
      runEndpoint(btn.dataset.apiPath);
      const target = $(".api-console");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function bindPills() {
    $$("[data-api-cmd]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cmd = btn.dataset.apiCmd;
        if (!cmd) return;
        runEndpoint(`/api/command?cmd=${encodeURIComponent(cmd)}`);
        const target = $(".api-console");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  function bindConsoleTools() {
    const open = $("[data-api-open]");
    const copy = $("[data-api-copy]");
    const rerun = $("[data-api-rerun]");
    if (open) {
      open.addEventListener("click", () => {
        const text = label?.textContent || "GET /api";
        const path = text.replace(/^GET\s+/, "").trim() || "/api";
        const url = path.startsWith("http") ? path : `${apiOrigin}${path}`;
        window.open(url, "_blank", "noopener");
      });
    }
    if (copy) {
      copy.addEventListener("click", async () => {
        if (!lastResponseText) return;
        try {
          await navigator.clipboard.writeText(lastResponseText);
          flashStatus(copy, "Copied");
        } catch (e) {
          flashStatus(copy, "Copy?");
        }
      });
    }
    if (rerun) {
      rerun.addEventListener("click", () => {
        const text = label?.textContent || "GET /api";
        const path = text.replace(/^GET\s+/, "").trim() || "/api";
        runEndpoint(path);
      });
    }
  }

  function flashStatus(btn, message) {
    const original = btn.textContent;
    btn.textContent = message;
    btn.classList.add("is-flash");
    window.setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove("is-flash");
    }, 1100);
  }

  function bindCopySnippets() {
    $$(".api-copy-btn[data-api-copy-target]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const target = document.getElementById(btn.dataset.apiCopyTarget);
        if (!target) return;
        const value = target.textContent || "";
        try {
          await navigator.clipboard.writeText(value);
          flashStatus(btn, "Copied");
        } catch (e) {
          // Fallback: select the code block
          const range = document.createRange();
          range.selectNodeContents(target);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          flashStatus(btn, "Selected");
        }
      });
    });
  }

  async function loadCounters() {
    const counters = $$("[data-api-counter]");
    if (!counters.length) return;
    try {
      const res = await fetch(`${baseApi}`, { headers: { accept: "application/json" } });
      const json = await res.json();
      const c = json?.meta?.counts || json?.data?.counts || {};
      const fallback = {
        endpoints: (json?.data?.endpoints || []).length,
        commands: (json?.data?.commands || []).length,
        projects: c.projects,
        certifications: c.certifications,
        research: c.research,
        socials: c.socials,
        notes: c.notes,
        version: json?.data?.version || json?.meta?.version
      };
      counters.forEach((el) => {
        const key = el.dataset.apiCounter;
        const v = fallback[key];
        if (v != null) {
          if (typeof v === "number") {
            animateNumber(el, v);
          } else {
            el.textContent = String(v).startsWith("v") ? v : `v${v}`;
          }
        }
      });
    } catch (e) {
      // Leave defaults silently
    }
  }

  function animateNumber(el, target) {
    el.textContent = String(target);
  }

  function init() {
    buildDeck();
    bindDeck();
    bindPills();
    bindConsoleTools();
    bindCopySnippets();
    loadCounters();

    // Initial run — honor ?try=/api/path or default to /api
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("try") || "/api";
    runEndpoint(initial);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

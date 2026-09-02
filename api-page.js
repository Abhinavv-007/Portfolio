// API documentation page: live console, endpoint index, copy buttons, counters.
// Self-contained; depends only on the DOM in api.html.
(function () {
  "use strict";
  if (document.body.dataset.page !== "api") return;

  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

  const apiOrigin = window.location.origin;
  const out = $("#apiOutput");
  const status = $("#apiStatus");
  const label = $("#apiConsoleLabel");
  const host = $("#apiHost");
  const deck = $("#apiDeck");
  if (host) host.textContent = apiOrigin.replace(/^https?:\/\//, "");

  const ENDPOINTS = [
    { method: "GET", path: "/api", tag: "Index", group: "Index", desc: "Endpoints, commands, version and record counts." },
    { method: "GET", path: "/api/summary", tag: "Summary", group: "Me", desc: "Profile, counts, security highlights, products, papers and top tags in one call." },
    { method: "GET", path: "/api/profile", tag: "Profile", group: "Me", desc: "Name, role, summary, Bugcrowd profile and what I am open to." },
    { method: "GET", path: "/api/security", tag: "Security", group: "Me", desc: "Research areas, the eight-step methodology and the report patterns." },
    { method: "GET", path: "/api/skills", tag: "Skills", group: "Me", desc: "Skills grouped by area. Add ?flat=1 for one list." },
    { method: "GET", path: "/api/notes", tag: "Focus", group: "Me", desc: "Current-focus notes from the homepage." },
    { method: "GET", path: "/api/socials", tag: "Socials", group: "Me", desc: "Public profile links." },
    { method: "GET", path: "/api/projects", tag: "Products", group: "Work", desc: "The five products. ?tag=Cloudflare to filter." },
    { method: "GET", path: "/api/projects/clex-ai", tag: "Product", group: "Work", desc: "One product by slug: clex, clex-ai, driped, trgt, modih-mail." },
    { method: "GET", path: "/api/research", tag: "Papers", group: "Work", desc: "The three research papers." },
    { method: "GET", path: "/api/research/glass-ballot-box", tag: "Paper", group: "Work", desc: "One paper by slug." },
    { method: "GET", path: "/api/certifications?tag=Security", tag: "Credentials", group: "Work", desc: "Credentials. ?tag=, ?issuer= and ?groupBy=issuer are supported." },
    { method: "GET", path: "/api/certifications/1", tag: "Credential", group: "Work", desc: "One credential by 1-based id or title slug." },
    { method: "GET", path: "/api/links", tag: "Links", group: "Meta", desc: "Every public URL on the site, grouped: pages, socials, products, papers, credentials." },
    { method: "GET", path: "/api/tags", tag: "Tags", group: "Meta", desc: "Tags across products, papers, credentials and skills, with counts." },
    { method: "GET", path: "/api/search?q=authorization", tag: "Search", group: "Meta", desc: "Search public records by text, tag, title or issuer. ?type= narrows to one record type." },
    { method: "GET", path: "/api/assets", tag: "Assets", group: "Meta", desc: "Image, logo and social-preview manifest." },
    { method: "GET", path: "/api/health", tag: "Health", group: "Meta", desc: "Status, version and record counts. Nothing about the deployment." },
    { method: "GET", path: "/api/command?cmd=help", tag: "Command", group: "Meta", desc: "The same data through one route. Try cmd=security, summary, links or search&q=oauth." },
    { method: "POST", path: "/api/contact", tag: "Contact", group: "Write", desc: "The contact form. JSON with name, email, topic and message. GET describes the fields." }
  ];

  const GROUP_ORDER = ["Index", "Me", "Work", "Meta", "Write"];
  const GROUP_BLURB = {
    Index: "Start here. The root response lists everything else.",
    Me: "Who I am and what I do: profile, security research, skills, focus.",
    Work: "The five products, the three papers and every credential.",
    Meta: "Cross-cutting indexes: links, tags, search, assets, health.",
    Write: "The only route that accepts input. Everything else is read-only."
  };

  function setStatus(text, tone) {
    if (!status) return;
    status.textContent = text;
    status.dataset.tone = tone || "idle";
  }

  function buildDeck() {
    if (!deck) return;
    deck.innerHTML = "";
    const grouped = new Map(GROUP_ORDER.map((g) => [g, []]));
    ENDPOINTS.forEach((ep) => grouped.get(ep.group).push(ep));
    let cardIndex = 0;
    grouped.forEach((rows, group) => {
      if (!rows.length) return;
      const section = document.createElement("section");
      section.className = "api-deck-group";
      section.setAttribute("aria-label", `${group} endpoints`);
      section.innerHTML = `
        <header class="api-deck-group-head">
          <span class="api-deck-group-kicker">${esc(group)}</span>
          <span class="api-deck-group-count">${rows.length} route${rows.length === 1 ? "" : "s"}</span>
          <p class="api-deck-group-blurb">${esc(GROUP_BLURB[group] || "")}</p>
        </header>
        <div class="api-deck"></div>
      `;
      const cards = $(".api-deck", section);
      rows.forEach((ep) => {
        const card = document.createElement("article");
        card.className = "api-card reveal visible";
        card.style.setProperty("--delay", `${cardIndex * 22}ms`);
        cardIndex += 1;
        card.dataset.path = ep.path;
        const runnable = ep.method === "GET";
        card.innerHTML = `
          <header class="api-card-head">
            <span class="api-method">${esc(ep.method)}</span>
            <span class="api-card-tag">${esc(ep.tag)}</span>
          </header>
          <code class="api-card-path">${esc(ep.path)}</code>
          <p>${esc(ep.desc)}</p>
          <footer class="api-card-foot">
            ${runnable ? `<button type="button" class="api-card-run" data-api-path="${esc(ep.path)}" aria-label="Run ${esc(ep.path)} in the console">Run</button>` : `<span class="api-card-note">Used by the contact form</span>`}
            <a class="api-card-open" href="${esc(ep.path === "/api" ? "/api?format=json" : ep.path)}" target="_blank" rel="noopener" aria-label="Open ${esc(ep.path)} in a new tab">Raw</a>
          </footer>
        `;
        cards.appendChild(card);
      });
      deck.appendChild(section);
    });
  }

  function pretty(json) {
    try { return JSON.stringify(json, null, 2); } catch (e) { return String(json); }
  }

  function syntaxColor(text) {
    return text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/("(?:\\.|[^"\\])*")(\s*:)/g, '<span class="t-key">$1</span>$2')
      .replace(/:\s*("(?:\\.|[^"\\])*")/g, ': <span class="t-str">$1</span>')
      .replace(/\b(true|false|null)\b/g, '<span class="t-bool">$1</span>')
      .replace(/(?<![\w-])(-?\d+\.?\d*(?:e[+-]?\d+)?)(?!\w)/gi, '<span class="t-num">$1</span>');
  }

  let lastResponseText = "";

  async function runEndpoint(path) {
    const target = `${apiOrigin}${path.startsWith("/") ? "" : "/"}${path}`;
    if (label) label.textContent = `GET ${path}`;
    if (out) out.querySelector("code").textContent = "Requesting …";
    setStatus("loading", "loading");
    const t0 = performance.now();
    try {
      const res = await fetch(target, { method: "GET", headers: { accept: "application/json" } });
      const ms = Math.max(1, Math.round(performance.now() - t0));
      const text = await res.text();
      let formatted = text;
      try { formatted = pretty(JSON.parse(text)); } catch (e) { /* keep raw */ }
      lastResponseText = formatted;
      if (out) out.querySelector("code").innerHTML = syntaxColor(formatted);
      setStatus(`${res.status} ${res.ok ? "OK" : "ERROR"} · ${ms} ms`, res.ok ? "ok" : "error");
      $$(".api-card").forEach((c) => c.classList.toggle("is-active", c.dataset.path === path));
      if (history.replaceState) {
        const u = new URL(window.location.href);
        u.searchParams.set("try", path);
        history.replaceState(null, "", u.toString());
      }
    } catch (err) {
      if (out) out.querySelector("code").textContent = "// The request did not complete. If you are running the static files without Pages Functions, the /api routes are not available.";
      setStatus("network error", "error");
    }
  }

  function scrollToConsole() {
    $(".api-console")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function bindDeck() {
    if (!deck) return;
    deck.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-api-path]");
      if (!btn) return;
      event.preventDefault();
      runEndpoint(btn.dataset.apiPath);
      scrollToConsole();
    });
  }

  function bindPills() {
    $$("[data-api-cmd]").forEach((btn) => btn.addEventListener("click", () => {
      const cmd = btn.dataset.apiCmd;
      const extra = cmd === "search" ? "&q=authorization" : "";
      runEndpoint(`/api/command?cmd=${encodeURIComponent(cmd)}${extra}`);
      scrollToConsole();
    }));
  }

  function flash(btn, message) {
    const original = btn.textContent;
    btn.textContent = message;
    btn.classList.add("is-flash");
    window.setTimeout(() => { btn.textContent = original; btn.classList.remove("is-flash"); }, 1100);
  }

  function bindConsoleTools() {
    const currentPath = () => (label?.textContent || "GET /api").replace(/^GET\s+/, "").trim() || "/api";
    $("[data-api-open]")?.addEventListener("click", () => {
      const path = currentPath();
      window.open(`${apiOrigin}${path === "/api" ? "/api?format=json" : path}`, "_blank", "noopener");
    });
    $("[data-api-copy]")?.addEventListener("click", async (event) => {
      if (!lastResponseText) return;
      try { await navigator.clipboard.writeText(lastResponseText); flash(event.currentTarget, "Copied"); }
      catch (e) { flash(event.currentTarget, "Select it"); }
    });
    $("[data-api-rerun]")?.addEventListener("click", () => runEndpoint(currentPath()));
  }

  function bindCopySnippets() {
    $$(".api-copy-btn[data-api-copy-target]").forEach((btn) => btn.addEventListener("click", async () => {
      const target = document.getElementById(btn.dataset.apiCopyTarget);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.textContent || "");
        flash(btn, "Copied");
      } catch (e) {
        const range = document.createRange();
        range.selectNodeContents(target);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        flash(btn, "Selected");
      }
    }));
  }

  async function loadCounters() {
    const counters = $$("[data-api-counter]");
    if (!counters.length) return;
    try {
      const res = await fetch(`${apiOrigin}/api?format=json`, { headers: { accept: "application/json" } });
      const json = await res.json();
      const c = json?.meta?.counts || {};
      const values = {
        endpoints: c.endpoints ?? (json?.data?.endpoints || []).length,
        commands: c.commands ?? (json?.data?.commands || []).length,
        projects: c.projects,
        research: c.research,
        certifications: c.certifications,
        version: json?.data?.version || json?.meta?.version
      };
      counters.forEach((el) => {
        const v = values[el.dataset.apiCounter];
        if (v == null) return;
        if (typeof v !== "number") { el.textContent = `v${String(v).split(".")[0]}`; return; }
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced || v <= 1) { el.textContent = String(v); return; }
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / 900);
          el.textContent = String(Math.round((1 - Math.pow(1 - t, 3)) * v));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    } catch (e) {
      // Static preview without functions: leave the defaults from the HTML.
    }
  }

  function init() {
    buildDeck();
    bindDeck();
    bindPills();
    bindConsoleTools();
    bindCopySnippets();
    loadCounters();
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("try") || "/api";
    runEndpoint(/^\/api(\/|\?|$)/.test(initial) ? initial : "/api");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();

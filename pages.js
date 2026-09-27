/*
  Page desks: what each inner page does beyond the shared press room.

    Security     Top 50 rosettes and the run from March to September,
                 area panels cut in like a new page, the methodology is
                 a checklist that ticks itself, report patterns unfold,
                 a FIXED stamp on the report, an envelope for disclosure
    Credentials  skills as paper luggage tags, certificates dealt onto
                 the desk with a verified rosette
    API          a live route map: every endpoint is a station, every
                 request is a train that runs there and back
    Contact      topics as paper tabs, a sent letter folds into a plane

  Runs after app.js, interactive.js and motion.js. Each block checks for
  its own markup and does nothing on other pages.
*/
(function () {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const page = document.body.dataset.page || "";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasIO = "IntersectionObserver" in window;
  const data = window.PORTFOLIO || {};
  const sound = (n) => { try { window.PRESS_SOUND && window.PRESS_SOUND.play(n); } catch (_) { /* optional */ } };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const pad = (n) => String(n).padStart(2, "0");
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const onView = (el, fn, opts = {}) => {
    if (!el) return;
    if (!hasIO || reducedMotion) { fn(); return; }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      fn();
    }, { threshold: opts.threshold ?? 0.35, rootMargin: opts.rootMargin || "0px" });
    io.observe(el);
  };

  const ROSETTE = (label, sub) => `
    <svg class="pg-rosette" viewBox="0 0 120 150" aria-hidden="true">
      <path class="tail" d="M38 88 L24 146 L42 134 L52 150 L60 96 Z"/>
      <path class="tail" d="M82 88 L96 146 L78 134 L68 150 L60 96 Z"/>
      <path class="scallop" d="${Array.from({ length: 33 }, (_, i) => {
        const a = (i / 32) * Math.PI * 2;
        const r = i % 2 ? 50 : 56;
        return `${i ? "L" : "M"}${(60 + Math.cos(a) * r).toFixed(1)} ${(58 + Math.sin(a) * r).toFixed(1)}`;
      }).join(" ")} Z"/>
      <circle class="ring" cx="60" cy="58" r="40"/>
      <text x="60" y="52" class="big">${label}</text>
      <text x="60" y="72" class="small">${sub}</text>
    </svg>`;

  /* ================================================================ */
  /* Security                                                          */
  /* ================================================================ */

  function security() {
    if (page !== "security") return;

    // --- The Top 50 band: rosettes and the run -----------------------
    const ranks = $(".bugcrowd-ranks");
    if (ranks) {
      const items = $$("li", ranks);
      items.forEach((li) => {
        const strong = $("strong", li)?.textContent || "";
        const span = $("span", li)?.textContent || "";
        if (/top\s*50/i.test(strong)) {
          const month = (span.match(/(June|July|August|September|October|November|December|January|February|March|April|May)/) || [])[1] || "";
          li.classList.add("pg-rank");
          li.insertAdjacentHTML("afterbegin", ROSETTE("TOP 50", month.slice(0, 3).toUpperCase() + " 2026"));
        } else {
          li.classList.add("pg-rank", "pg-rank--start");
        }
      });
      const tops = items.filter((li) => !li.classList.contains("pg-rank--start"));
      const count = document.createElement("div");
      count.className = "pg-rank-count";
      count.innerHTML = `<b data-pg-count>0</b><span>times in the global Top&nbsp;50<br>in the first seven months</span>`;
      ranks.insertAdjacentElement("beforebegin", count);
      // The run: March to September, one mark per month.
      const months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
      const topMonths = tops.map((li) => ($("span", li)?.textContent.match(/(Jun|Jul|Aug|Sep)/) || [])[1]).filter(Boolean);
      const run = document.createElement("div");
      run.className = "pg-run";
      run.setAttribute("aria-hidden", "true");
      run.innerHTML = `<span class="pg-run-line"><i></i></span>${months.map((m, i) => `<span class="pg-run-stop ${topMonths.includes(m) ? "is-top" : ""} ${i === 0 ? "is-first" : ""}" style="--i:${i}"><b></b><em>${m}</em></span>`).join("")}`;
      ranks.insertAdjacentElement("afterend", run);
      onView(ranks, () => {
        ranks.classList.add("is-in");
        run.classList.add("is-in");
        tops.forEach((li, i) => window.setTimeout(() => { li.classList.add("is-stamped"); sound("thump"); }, 250 + i * 380));
        const n = $("[data-pg-count]", count);
        let k = 0;
        const step = () => { n.textContent = String(k); if (k < tops.length) { k += 1; window.setTimeout(step, 380); } };
        window.setTimeout(step, 250);
      });
    }

    // --- Research areas: each panel is cut in like a new page ---------
    const panel = $("[data-area-panel]");
    if (panel && !reducedMotion) {
      const mo = new MutationObserver(() => {
        panel.classList.remove("pg-cutin");
        void panel.offsetWidth;
        panel.classList.add("pg-cutin");
        sound("snip");
      });
      mo.observe(panel, { childList: true });
    }

    // --- Methodology: a checklist that ticks itself --------------------
    const method = $("[data-method]");
    if (method) {
      const steps = $$(".method-step", method);
      steps.forEach((li) => {
        const num = $(".method-num", li);
        if (!num) return;
        num.classList.add("pg-check");
        num.innerHTML = `<small>${num.textContent}</small><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19.5 6.5"/></svg>`;
      });
      const meter = document.createElement("div");
      meter.className = "pg-checkmeter";
      meter.setAttribute("aria-hidden", "true");
      meter.innerHTML = `<span>Rules checked</span><b data-pg-checked>0 / ${steps.length}</b><i><em></em></i>`;
      method.insertAdjacentElement("beforebegin", meter);
      let checked = 0;
      const tick = (li) => {
        if (li.classList.contains("is-checked")) return;
        li.classList.add("is-checked");
        checked += 1;
        $("[data-pg-checked]", meter).textContent = `${checked} / ${steps.length}`;
        meter.style.setProperty("--p", String(checked / steps.length));
        if (checked === steps.length) meter.classList.add("is-done");
        sound("tick");
      };
      if (!hasIO || reducedMotion) steps.forEach(tick);
      else {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); tick(e.target); } });
        }, { rootMargin: "0px 0px -40% 0px", threshold: 0.2 });
        steps.forEach((s) => io.observe(s));
      }
    }

    // --- Report: stamped FIXED once the typewriter finishes -------------
    const report = $("[data-report]");
    const sheet = $(".report-sheet");
    if (report && sheet) {
      const stamp = document.createElement("div");
      stamp.className = "pg-fixed";
      stamp.setAttribute("aria-hidden", "true");
      stamp.innerHTML = "<b>Fixed</b><span>Retested &middot; closed</span>";
      sheet.appendChild(stamp);
      const fire = () => { stamp.classList.add("is-on"); sound("thump"); };
      if (report.classList.contains("is-done")) fire();
      else new MutationObserver((_, mo) => { if (report.classList.contains("is-done")) { mo.disconnect(); window.setTimeout(fire, 300); } }).observe(report, { attributes: true, attributeFilter: ["class"] });
    }

    // --- Patterns: the three lines unfold like a folded note ------------
    $$(".pattern-card").forEach((card) => {
      card.classList.add("pg-fold");
      onView(card, () => window.setTimeout(() => card.classList.add("is-open"), reducedMotion ? 0 : 700), { threshold: 0.3 });
    });

    // --- Disclosure: an envelope with security.txt inside -------------
    const disc = $(".sec-disclosure-inner");
    if (disc) {
      const art = document.createElement("div");
      art.className = "pg-envelope";
      art.setAttribute("aria-hidden", "true");
      art.innerHTML = `<span class="pg-env-back"></span><span class="pg-env-letter"><b>security.txt</b><i></i><i></i><i></i><em>Contact: ${esc((data.profile && data.profile.email) || "abhnv@abhnv.in")}</em></span><span class="pg-env-front"></span><span class="pg-env-flap"></span>`;
      disc.appendChild(art);
      onView(art, () => art.classList.add("is-open"), { threshold: 0.5 });
    }
  }

  /* ================================================================ */
  /* Credentials                                                       */
  /* ================================================================ */

  function credentials() {
    if (page !== "credentials") return;
    $$(".skill-group").forEach((group) => {
      $$(".skill-chip", group).forEach((chip, i) => {
        chip.classList.add("pg-tag");
        chip.style.setProperty("--i", String(i));
        chip.style.setProperty("--tilt", `${(i % 2 ? 1 : -1) * (1 + (i % 3))}deg`);
      });
      onView(group, () => group.classList.add("pg-tags-in"), { threshold: 0.2 });
    });

    // Certificates are dealt onto the desk, and dealt again on each filter.
    const grid = $("#certsGrid") || $$(".cert-card")[0]?.parentElement;
    if (!grid) return;
    const deal = () => {
      $$(".cert-card", grid).forEach((card, i) => {
        if (card.dataset.pgDealt) return;
        card.dataset.pgDealt = "1";
        card.style.setProperty("--deal", String(Math.min(i, 14)));
        card.style.setProperty("--deal-r", `${((i * 37) % 11) - 5}deg`);
        if (!$(".pg-seal", card)) card.insertAdjacentHTML("beforeend", `<span class="pg-seal" aria-hidden="true">${ROSETTE("✓", "VERIFIED")}</span>`);
        card.classList.add("pg-dealt");
      });
    };
    onView(grid, () => { grid.classList.add("pg-deal-in"); deal(); }, { threshold: 0.05 });
    new MutationObserver(() => { if (grid.classList.contains("pg-deal-in")) { deal(); sound("rustle"); } }).observe(grid, { childList: true });
  }

  /* ================================================================ */
  /* API: the route map                                                */
  /* ================================================================ */

  function api() {
    if (page !== "api") return;
    const console_ = $(".api-console");
    if (!console_) return;
    const LINES = [
      { name: "Me", color: "#d15a35", stops: ["/api/summary", "/api/profile", "/api/security", "/api/skills", "/api/notes", "/api/socials"] },
      { name: "Work", color: "#2f5670", stops: ["/api/projects", "/api/projects/clex-ai", "/api/research", "/api/certifications?tag=Security", "/api/certifications/1"] },
      { name: "Meta", color: "#4f6b3c", stops: ["/api/links", "/api/tags", "/api/search?q=authorization", "/api/assets", "/api/health", "/api/command?cmd=help"] }
    ];
    const wrap = document.createElement("figure");
    wrap.className = "pg-map";
    wrap.innerHTML = `
      <figcaption class="pg-map-head">
        <span class="pg-map-kicker"><i aria-hidden="true"></i>Live route map</span>
        <span class="pg-map-note">Every station is a real endpoint. Tap one and a request runs there and back from your browser.</span>
      </figcaption>
      <div class="pg-map-stage"><canvas class="pg-map-canvas" role="img" aria-label="Route map of the API. Three lines, Me, Work and Meta, leave the edge station; each station is an endpoint."></canvas></div>
      <div class="pg-map-legend" aria-hidden="true">${LINES.map((l) => `<span style="--c:${l.color}">${l.name}</span>`).join("")}<span class="pg-map-last" data-pg-last>No trains yet</span></div>
    `;
    // The map sits under the command pills, beside the console it feeds.
    const column = $(".api-quickstart-copy");
    if (column) column.appendChild(wrap); else console_.insertAdjacentElement("beforebegin", wrap);
    const canvas = $("canvas", wrap);
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, dpr = 1, portrait = false;
    let stations = [];
    const trains = [];
    let hover = -1;

    const layout = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      portrait = H > W * 0.9;
      stations = [];
      const origin = portrait ? [W * 0.5, H * 0.08] : [W * 0.06, H * 0.5];
      stations.push({ path: "/api", label: "EDGE", x: origin[0], y: origin[1], line: -1 });
      LINES.forEach((line, li) => {
        line.stops.forEach((path, si) => {
          const n = line.stops.length;
          let x, y;
          if (portrait) {
            const col = (li - 1) * W * 0.3;
            x = W * 0.5 + col;
            y = H * 0.2 + ((si + 1) / (n + 0.4)) * H * 0.76;
          } else {
            const row = (li - 1) * H * 0.3;
            x = W * 0.14 + ((si + 1) / (n + 0.5)) * W * 0.72;
            y = H * 0.5 + row;
          }
          stations.push({ path, label: path.replace(/^\/api\//, "").replace(/\?.*/, "").replace(/\//g, " / "), x, y, line: li });
        });
      });
    };

    const route = (st) => {
      // Edge → the line's junction → along the line to the station
      const edge = stations[0];
      if (st.line < 0) return [[edge.x, edge.y]];
      const first = stations.find((s) => s.line === st.line);
      const pts = [[edge.x, edge.y]];
      if (portrait) pts.push([first.x, edge.y + H * 0.06]);
      else pts.push([edge.x + W * 0.05, first.y]);
      const onLine = stations.filter((s) => s.line === st.line);
      for (const s of onLine) { pts.push([s.x, s.y]); if (s === st) break; }
      return pts;
    };

    const along = (pts, p) => {
      const segs = [];
      let total = 0;
      for (let i = 1; i < pts.length; i += 1) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); total += d; }
      let dist = p * total;
      for (let i = 0; i < segs.length; i += 1) {
        if (dist <= segs[i] || i === segs.length - 1) {
          const k = segs[i] ? clamp(dist / segs[i]) : 0;
          return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
        }
        dist -= segs[i];
      }
      return pts[pts.length - 1];
    };

    const draw = (now) => {
      if (!W) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#171612";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(234,223,206,0.05)";
      for (let x = 10; x < W; x += 18) for (let y = 10; y < H; y += 18) ctx.fillRect(x, y, 1.5, 1.5);
      // Lines
      LINES.forEach((line, li) => {
        const pts = route(stations.filter((s) => s.line === li).slice(-1)[0]);
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 6;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        // idle pulse travelling the line
        if (!reducedMotion) {
          const p = ((now / 1000) * 0.18 + li * 0.33) % 1;
          const [x, y] = along(pts, p);
          ctx.fillStyle = "rgba(251,246,236,0.5)";
          ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
        }
      });
      // Stations
      ctx.font = `700 ${portrait ? 9 : 10}px "Courier New", monospace`;
      ctx.textBaseline = "middle";
      stations.forEach((s, i) => {
        const isEdge = s.line < 0;
        const lit = trains.some((t) => t.st === s && t.p > 0.45 && t.p < 0.62);
        ctx.fillStyle = "#fbf6ec";
        ctx.strokeStyle = isEdge ? "#fbf6ec" : LINES[s.line].color;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(s.x, s.y, isEdge ? 11 : (i === hover || lit ? 8 : 6), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (isEdge) {
          ctx.fillStyle = "#171612";
          ctx.textAlign = "center";
          ctx.fillText("⌁", s.x, s.y + 1);
          ctx.fillStyle = "rgba(251,246,236,0.8)";
          ctx.fillText("EDGE · YOU", s.x, s.y + (portrait ? -20 : 22));
          return;
        }
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(portrait ? 0 : -0.5);
        ctx.textAlign = "left";
        ctx.fillStyle = i === hover || lit ? "#fbf6ec" : "rgba(251,246,236,0.55)";
        ctx.fillText(s.label.toUpperCase(), portrait ? 12 : 10, portrait ? 0 : -12);
        ctx.restore();
      });
      // Trains: a paper ticket running out and back
      for (let i = trains.length - 1; i >= 0; i -= 1) {
        const t = trains[i];
        t.p += (now - t.last) / t.dur;
        t.last = now;
        if (t.p >= 1) { trains.splice(i, 1); continue; }
        const pts = route(t.st);
        const q = t.p < 0.5 ? t.p * 2 : 2 - t.p * 2;
        const [x, y] = along(pts, q);
        ctx.fillStyle = t.ok === false ? "#d15a35" : "#fbf6ec";
        ctx.save();
        ctx.translate(x, y);
        ctx.fillRect(-9, -6, 18, 12);
        ctx.fillStyle = "#171612";
        ctx.fillRect(-6, -2, 12, 1.5);
        ctx.fillRect(-6, 1, 8, 1.5);
        ctx.restore();
        if (t.ms && t.p > 0.5) {
          ctx.font = `700 11px "Courier New", monospace`;
          ctx.textAlign = "center";
          ctx.fillStyle = "#e0845c";
          ctx.fillText(`${t.status || ""} · ${t.ms} ms`, t.st.x, t.st.y + (portrait ? -18 : 22));
          ctx.font = `700 ${portrait ? 9 : 10}px "Courier New", monospace`;
        }
      }
    };

    let raf = 0;
    let visible = false;
    const loop = (now) => {
      raf = 0;
      if (!visible || document.hidden) return;
      draw(now);
      raf = window.requestAnimationFrame(loop);
    };
    const wake = () => { if (!raf) raf = window.requestAnimationFrame(loop); };
    if (hasIO) new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) wake(); }).observe(canvas);
    else { visible = true; wake(); }
    if ("ResizeObserver" in window) new ResizeObserver(() => { layout(); draw(performance.now()); }).observe(canvas);
    layout();

    const last = $("[data-pg-last]", wrap);
    const dispatch = (st) => {
      document.dispatchEvent(new CustomEvent("api:run", { detail: { path: st.path } }));
      trains.push({ st, p: 0, last: performance.now(), dur: 1400, ok: null });
      sound("swish");
      wake();
    };
    document.addEventListener("api:response", (e) => {
      const d = e.detail || {};
      const base = (d.path || "").replace(/^(\/api)\/?$/, "/api");
      const st = stations.find((s) => s.path === d.path) || stations.find((s) => base.startsWith(s.path) && s.path !== "/api") || stations[0];
      const tr = trains.find((t) => t.st === st && !t.ms);
      if (tr) { tr.ms = d.ms; tr.status = d.status; tr.ok = d.ok; }
      else trains.push({ st, p: 0, last: performance.now(), dur: 1400, ms: d.ms, status: d.status, ok: d.ok });
      if (last) last.textContent = `Last train · ${d.path} · ${d.status || "no answer"} · ${d.ms} ms`;
      // The JSON prints out like a fresh page off the press.
      const body = $(".api-console-body");
      if (body && !reducedMotion) { body.classList.remove("pg-print"); void body.offsetWidth; body.classList.add("pg-print"); }
      wake();
    });
    const hit = (ev) => {
      const r = canvas.getBoundingClientRect();
      const x = ev.clientX - r.left, y = ev.clientY - r.top;
      let best = -1, bd = 26;
      stations.forEach((s, i) => { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = i; } });
      return best;
    };
    canvas.addEventListener("pointermove", (ev) => { hover = hit(ev); canvas.style.cursor = hover >= 0 ? "pointer" : "default"; });
    canvas.addEventListener("pointerleave", () => { hover = -1; });
    canvas.addEventListener("click", (ev) => { const i = hit(ev); if (i >= 0) dispatch(stations[i]); });
    // Keyboard: the legend chips double as a way in for keyboards.
    canvas.tabIndex = 0;
    canvas.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      ev.preventDefault();
      dispatch(stations[1 + Math.floor(Math.random() * (stations.length - 1))]);
    });
  }

  /* ================================================================ */
  /* API: the live wire under the headline                             */
  /* ================================================================ */

  // Telegraph wires strung between poles, carrying requests as glowing
  // packets. Ambient traffic runs all the time; every command run in the
  // console sends a red packet of its own down the middle wire.
  function apiWire() {
    if (page !== "api" || !window.HTMLCanvasElement) return;
    const stats = $(".api-stats-row");
    if (!stats) return;
    const band = document.createElement("figure");
    band.className = "pg-wire";
    band.innerHTML = `<canvas class="pg-wire-canvas" aria-hidden="true"></canvas><figcaption class="pg-wire-cap"><i aria-hidden="true"></i>On the wire &middot; live</figcaption>`;
    stats.insertAdjacentElement("afterend", band);
    const canvas = $("canvas", band);
    const ctx = canvas.getContext("2d");
    const PATHS = ["/api/summary", "/api/profile", "/api/security", "/api/projects", "/api/research", "/api/certifications", "/api/skills", "/api/links", "/api/search?q=oauth", "/api/health", "/api/tags", "/api/assets", "/api/command?cmd=help"];
    const COLORS = ["#d15a35", "#6fa3d8", "#8fb070"];
    let W = 0, H = 0, dpr = 1, visible = false, raf = 0, last = 0, spawnIn = 0;
    const packets = [];
    const size = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    const wireY = (i, x) => {
      const base = H * (0.3 + i * 0.22);
      const span = W / 4;
      const k = ((x % span) + span) % span / span;
      return base + Math.sin(k * Math.PI) * H * 0.07;
    };
    const spawn = (o = {}) => {
      packets.push({
        wire: o.wire != null ? o.wire : Math.floor(Math.random() * 3),
        x: -160,
        v: o.v || 120 + Math.random() * 160,
        label: o.label || PATHS[Math.floor(Math.random() * PATHS.length)],
        color: o.color || COLORS[Math.floor(Math.random() * COLORS.length)],
        hot: Boolean(o.hot)
      });
    };
    const draw = (now) => {
      raf = 0;
      if (!visible) return;
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      spawnIn -= dt;
      if (spawnIn <= 0 && !reducedMotion) { spawn(); spawnIn = 0.7 + Math.random() * 1.1; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // Poles and wires
      for (let p = 0; p <= 4; p += 1) {
        const x = (p / 4) * W;
        ctx.fillStyle = "rgba(241, 232, 216, 0.14)";
        ctx.fillRect(x - 1, H * 0.12, 2, H * 0.84);
        ctx.fillRect(x - 12, H * 0.2, 24, 2);
      }
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 6) { const y = wireY(i, x); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.strokeStyle = "rgba(241, 232, 216, 0.28)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        for (let p = 0; p <= 4; p += 1) { ctx.fillStyle = "rgba(241, 232, 216, 0.5)"; ctx.beginPath(); ctx.arc((p / 4) * W, wireY(i, (p / 4) * W), 2.4, 0, Math.PI * 2); ctx.fill(); }
      }
      // Packets
      ctx.font = `700 ${H < 100 ? 9 : 10}px "Courier New", Courier, monospace`;
      ctx.textBaseline = "middle";
      for (let k = packets.length - 1; k >= 0; k -= 1) {
        const q = packets[k];
        q.x += q.v * dt * (q.hot ? 1.6 : 1);
        if (q.x > W + 180) { packets.splice(k, 1); continue; }
        const y = wireY(q.wire, q.x);
        const tw = ctx.measureText(q.label).width + 16;
        const trail = ctx.createLinearGradient(q.x - 120, 0, q.x, 0);
        trail.addColorStop(0, "rgba(0,0,0,0)");
        trail.addColorStop(1, q.hot ? "rgba(255, 110, 70, 0.8)" : `${q.color}88`);
        ctx.strokeStyle = trail;
        ctx.lineWidth = q.hot ? 3 : 2;
        ctx.beginPath();
        for (let x = q.x - 120; x <= q.x; x += 6) { const yy = wireY(q.wire, x); if (x === q.x - 120) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
        ctx.stroke();
        ctx.save();
        ctx.shadowColor = q.hot ? "rgba(255, 110, 70, 0.9)" : q.color;
        ctx.shadowBlur = q.hot ? 18 : 8;
        ctx.fillStyle = q.hot ? "#e0492c" : "#1f1c18";
        ctx.strokeStyle = q.hot ? "#ffd9c9" : q.color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(q.x, y - 9, tw, 18, 9); else ctx.rect(q.x, y - 9, tw, 18);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = q.hot ? "#fff4e6" : "rgba(241, 232, 216, 0.9)";
        ctx.fillText(q.label, q.x + 8, y + 0.5);
      }
      if (!reducedMotion) raf = window.requestAnimationFrame(draw);
    };
    const wake = () => { if (!raf) raf = window.requestAnimationFrame(draw); };
    size();
    window.addEventListener("resize", size);
    if (hasIO) new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) { last = 0; wake(); } }).observe(band);
    else { visible = true; wake(); }
    // Real requests from the console ride the middle wire in red.
    const label = $("#apiConsoleLabel");
    if (label) {
      new MutationObserver(() => {
        const path = label.textContent.replace(/^\s*GET\s+/, "").trim();
        if (path) { spawn({ wire: 1, label: `GET ${path}`, hot: true, v: 260 }); wake(); }
      }).observe(label, { childList: true, characterData: true, subtree: true });
    }
    for (let i = 0; i < 4; i += 1) { spawn(); packets[packets.length - 1].x = Math.random() * (W || 900); }
  }

  /* ================================================================ */
  /* Contact                                                           */
  /* ================================================================ */

  function contact() {
    if (page !== "contact") return;
    const form = $("#contactForm");
    if (!form) return;
    $$(".contact-topic", form).forEach((label, i) => {
      label.classList.add("pg-tab");
      label.style.setProperty("--i", String(i));
      $("input", label)?.addEventListener("change", () => { sound("tick"); label.classList.remove("pg-tab-pop"); void label.offsetWidth; label.classList.add("pg-tab-pop"); });
    });
    const status = $("#contactFormStatus");
    const desk = $(".post-desk");
    if (!desk) return;

    // The postage is licked and pressed on as the pad comes into view, and
    // the postmark thunks down over it a beat later.
    onView(desk, () => { desk.classList.add("is-posted"); window.setTimeout(() => sound("thump"), 520); });

    // The title is typed out the first time the desk comes into view.
    const title = $("[data-pn-title]", desk);
    if (title && !reducedMotion) {
      const full = title.textContent.trim();
      title.setAttribute("aria-label", full);
      title.innerHTML = `<span aria-hidden="true" data-pn-typed></span><span class="pn-caret" aria-hidden="true"></span>`;
      const typed = $("[data-pn-typed]", title);
      onView(title, async () => {
        for (let i = 1; i <= full.length; i += 1) {
          typed.textContent = full.slice(0, i);
          if (full[i - 1] !== " ") sound("tick");
          await new Promise((r) => window.setTimeout(r, 55 + Math.random() * 60));
        }
      });
    }

    // Sent: the letter folds, goes into an envelope, is sealed and flies off.
    const envelope = $(".pn-envelope", desk);
    const letter = $("[data-letter]", desk);
    if (status && envelope && letter && !reducedMotion) {
      new MutationObserver(() => {
        if (status.dataset.state !== "success") return;
        const d = desk.getBoundingClientRect();
        const l = letter.getBoundingClientRect();
        envelope.style.left = `${l.left - d.left + l.width / 2}px`;
        envelope.style.top = `${l.top - d.top + l.height / 2}px`;
        desk.classList.remove("is-sending", "is-sealed", "is-flying");
        void desk.offsetWidth;
        desk.classList.add("is-sending");
        sound("rustle");
        window.setTimeout(() => desk.classList.add("is-sealed"), 420);
        window.setTimeout(() => sound("thump"), 1000);
        window.setTimeout(() => { desk.classList.add("is-flying"); sound("swish"); }, 1500);
        window.setTimeout(() => desk.classList.remove("is-sending", "is-sealed", "is-flying"), 3300);
        // A fresh postmark for the next letter.
        window.setTimeout(() => { desk.classList.remove("is-posted"); void desk.offsetWidth; desk.classList.add("is-posted"); }, 3400);
      }).observe(status, { attributes: true, attributeFilter: ["data-state"] });
    }
  }

  [security, credentials, api, apiWire, contact].forEach((fn) => {
    try { fn(); } catch (err) { if (window.console) console.warn(`[pages] ${fn.name} skipped`, err); }
  });
})();

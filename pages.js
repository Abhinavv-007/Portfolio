/*
  Page desks: what each inner page does beyond the shared press room.

    Security     Top 50 rosettes and the run from March to September,
                 area panels cut in like a new page, the lab fires a
                 request and stamps the answer, the methodology is a
                 checklist that ticks itself, report patterns unfold,
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

    // --- The lab: fire the request, stamp the answer -------------------
    const lab = $("[data-authlab]");
    if (lab) {
      const code = $("[data-lab-code]", lab);
      const resp = $(".lab-pane--response", lab);
      const runBtn = $("[data-lab-run]", lab);
      const stamp = document.createElement("div");
      stamp.className = "pg-lab-stamp";
      stamp.setAttribute("aria-hidden", "true");
      resp?.appendChild(stamp);
      const fly = () => {
        if (reducedMotion || !runBtn || !resp) return;
        const a = runBtn.getBoundingClientRect();
        const b = resp.getBoundingClientRect();
        const env = document.createElement("span");
        env.className = "pg-lab-envelope";
        env.style.left = `${a.left + a.width / 2}px`;
        env.style.top = `${a.top + a.height / 2}px`;
        env.style.setProperty("--dx", `${b.left + b.width / 2 - (a.left + a.width / 2)}px`);
        env.style.setProperty("--dy", `${b.top + 40 - (a.top + a.height / 2)}px`);
        document.body.appendChild(env);
        env.addEventListener("animationend", () => env.remove(), { once: true });
        sound("swish");
      };
      runBtn?.addEventListener("click", fly);
      if (code) {
        new MutationObserver(() => {
          const c = code.textContent.trim();
          if (!/^\d{3}$/.test(c)) return;
          const ok = c.startsWith("2");
          stamp.innerHTML = `<b>${c}</b><span>${ok ? "Served" : "Blocked"}</span>`;
          stamp.dataset.tone = ok ? "leak" : "safe";
          stamp.classList.remove("is-on");
          void stamp.offsetWidth;
          window.setTimeout(() => { stamp.classList.add("is-on"); sound("thump"); }, reducedMotion ? 0 : 420);
        }).observe(code, { childList: true, characterData: true, subtree: true });
      }
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
    const preview = $("[data-letter]") || form;
    if (status) {
      new MutationObserver(() => {
        if (status.dataset.state !== "success" || reducedMotion) return;
        const r = preview.getBoundingClientRect();
        const plane = document.createElement("span");
        plane.className = "pg-plane";
        plane.style.left = `${r.left + r.width / 2}px`;
        plane.style.top = `${r.top + r.height / 2}px`;
        plane.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M60 6 4 30l18 7 4 19 9-12 15 9z" fill="#fbf6ec" stroke="#171612" stroke-width="2" stroke-linejoin="round"/><path d="M22 37 60 6 26 56" fill="none" stroke="#171612" stroke-width="2"/></svg>`;
        document.body.appendChild(plane);
        sound("swish");
        plane.addEventListener("animationend", () => plane.remove(), { once: true });
      }).observe(status, { attributes: true, attributeFilter: ["data-state"] });
    }
  }

  [security, credentials, api, contact].forEach((fn) => {
    try { fn(); } catch (err) { if (window.console) console.warn(`[pages] ${fn.name} skipped`, err); }
  });
})();

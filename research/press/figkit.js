/* ==========================================================================
   Research Supplement · figure kit
   DOM/SVG builders, controls, HiDPI canvas, visibility-gated loops,
   the iPhone, line icons, generative art, draw-your-guess, crypto.
   ========================================================================== */
(function () {
  "use strict";
  const SVGNS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k]; if (v == null || v === false) continue;
      if (k === "class") n.className = v; else if (k === "html") n.innerHTML = v; else if (k === "text") n.textContent = v;
      else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    (kids || []).forEach((c) => c != null && n.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return n;
  }
  function svg(tag, attrs, kids) {
    const n = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) { const v = attrs[k]; if (v == null) continue; if (k === "text") n.textContent = v; else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); }
    (kids || []).forEach((c) => c && n.appendChild(c));
    return n;
  }

  /* ---------- Controls ---------- */
  function range(parent, o) {
    const id = "r" + Math.random().toString(36).slice(2, 8);
    const out = el("output", { for: id });
    const input = el("input", { type: "range", class: "range", id, min: o.min, max: o.max, step: o.step || 1, value: o.value, "aria-label": o.label });
    const wrap = el("label", { class: "ctl", for: id }, [el("span", { class: "ctl-label" }, [el("span", { text: o.label }), out]), input]);
    const fmt = o.fmt || ((v) => v);
    const paint = () => { const v = +input.value; input.style.setProperty("--fill", ((v - o.min) / (o.max - o.min)) * 100 + "%"); out.textContent = fmt(v); };
    input.addEventListener("input", () => { paint(); o.onInput && o.onInput(+input.value); });
    paint(); parent.appendChild(wrap);
    return { el: wrap, input, get value() { return +input.value; }, set(v, silent) { input.value = v; paint(); if (!silent && o.onInput) o.onInput(+input.value); } };
  }
  function tabs(parent, o) {
    let value = o.value;
    const g = el("div", { class: "tabs", role: "group", "aria-label": o.label || "Options" });
    const bs = o.options.map((opt) => { const b = el("button", { type: "button", "aria-pressed": String(opt.v === value), text: opt.t, "data-val": opt.v }); b.addEventListener("click", () => api.set(opt.v)); g.appendChild(b); return b; });
    const wrap = o.label ? el("div", { class: "ctl" }, [el("span", { class: "ctl-label", text: o.label }), g]) : g;
    parent.appendChild(wrap);
    const api = { el: wrap, get value() { return value; }, set(v, silent) { value = v; bs.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.val === String(v)))); if (!silent && o.onChange) o.onChange(v); } };
    return api;
  }
  function toggle(parent, o) {
    let on = !!o.value;
    const b = el("button", { type: "button", class: "switch", role: "switch", "aria-checked": String(on), html: `<i></i><span>${o.label}</span>` });
    b.addEventListener("click", () => api.set(!on));
    parent.appendChild(b);
    const api = { el: b, get value() { return on; }, set(v, silent) { on = !!v; b.setAttribute("aria-checked", String(on)); if (!silent && o.onChange) o.onChange(on); } };
    return api;
  }
  function button(parent, text, onClick, cls) {
    const b = el("button", { type: "button", class: "btn " + (cls || ""), html: text });
    b.addEventListener("click", onClick); parent.appendChild(b); return b;
  }

  /* ---------- Theme-aware colours ---------- */
  function css(name) { return getComputedStyle(document.body).getPropertyValue(name).trim() || "#000"; }
  function palette() {
    const p = {}; ["paper", "paper-2", "sheet", "ink", "ink-2", "grey", "hair", "hair-2", "spot", "spot-2", "spot-wash", "good", "bad", "warn", "f-sans", "f-head", "f-body", "f-code"].forEach((k) => (p[k.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = css("--" + k)));
    return p;
  }
  function onTheme(cb) { document.addEventListener("press:settings", cb); }

  /* ---------- HiDPI canvas that follows its container ---------- */
  function canvas(parent, o) {
    const c = el("canvas", { role: "img", "aria-label": o.label || "" }); parent.appendChild(c);
    const ctx = c.getContext("2d"); const api = { el: c, ctx, w: 0, h: 0, draw: o.draw || null };
    function size() {
      const w = parent.clientWidth || 300, h = typeof o.height === "function" ? o.height(w) : o.height || Math.round(w * (o.aspect || 0.56));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w === api.w && h === api.h) return;
      api.w = w; api.h = h; c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (o.onResize) o.onResize(api); if (api.draw) api.draw(api);
    }
    api.resize = size; api.redraw = () => api.draw && api.draw(api);
    if ("ResizeObserver" in window) new ResizeObserver(size).observe(parent); else window.addEventListener("resize", size);
    size(); onTheme(() => api.redraw());
    return api;
  }

  /* ---------- rAF loop that only runs while visible ---------- */
  function loop(host, fn) {
    let raf = 0, on = false, vis = false, last = 0;
    const tick = (t) => { const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016); last = t; if (fn(dt, t) === false) { api.stop(); return; } raf = requestAnimationFrame(tick); };
    const run = () => { if (on && vis && !document.hidden && !raf) { last = 0; raf = requestAnimationFrame(tick); } };
    const halt = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    if ("IntersectionObserver" in window) new IntersectionObserver((es) => { vis = es[0].isIntersecting; vis ? run() : halt(); }).observe(host); else vis = true;
    document.addEventListener("visibilitychange", () => (document.hidden ? halt() : run()));
    const api = { start() { on = true; run(); }, stop() { on = false; halt(); }, get running() { return on; } };
    return api;
  }
  function whenVisible(host, cb, threshold) {
    if (!("IntersectionObserver" in window)) { cb(); return; }
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); cb(); } }, { threshold: threshold == null ? 0.35 : threshold });
    io.observe(host);
  }

  /* ---------- Motion helpers ---------- */
  const ease = { out: (k) => 1 - Math.pow(1 - k, 3), inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2), back: (k) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2) };
  function tween(dur, onStep, e) {
    const calm = window.Press && Press.isCalm();
    return new Promise((res) => { if (calm || dur <= 0) { onStep(1); res(); return; } const t0 = performance.now(), f = e || ease.out; const s = (t) => { const k = Math.min(1, (t - t0) / dur); onStep(f(k)); k < 1 ? requestAnimationFrame(s) : res(); }; requestAnimationFrame(s); });
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, window.Press && Press.isCalm() ? 0 : ms));
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /* A critically damped spring for values that should feel physical */
  function spring(value, opts) {
    const o = Object.assign({ k: 170, d: 22 }, opts || {}); let x = value, v = 0, target = value;
    return { set(t) { target = t; }, get value() { return x; }, get target() { return target; }, jump(t) { x = target = t; v = 0; },
      step(dt) { const a = -o.k * (x - target) - o.d * v; v += a * dt; x += v * dt; return Math.abs(v) > 0.01 || Math.abs(x - target) > 0.01; } };
  }

  /* ---------- Numbers ---------- */
  const fmt = {
    int: (v) => Math.round(v).toLocaleString("en-US"),
    dec: (v, d = 2) => Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }),
    pct: (v, d = 0) => (v * 100).toFixed(d) + "%",
    usd: (v, d = 2) => (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }),
    compact: (v) => Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v),
    time: (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return h ? `${h}h ${String(m).padStart(2, "0")}m` : m ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`; }
  };

  /* ---------- Randomness ---------- */
  function rng(seed) { let a = seed >>> 0 || 1; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  /* ---------- Crypto ---------- */
  async function sha256(text) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join(""); }
  function randomHex(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a).map((x) => x.toString(16).padStart(2, "0")).join(""); }
  function tex(node, src, display) { if (window.katex) { try { katex.render(src, node, { displayMode: !!display, throwOnError: false, strict: "ignore" }); return; } catch (_) {} } node.textContent = src; }

  /* ---------- Line icons (24 x 24, 1.8 stroke) ---------- */
  const ICONS = {
    pin: '<path d="M12 21s-6.5-6.1-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.9-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/>',
    card: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 9.5h18M7 15h4"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    car: '<path d="M4 15.5V12l2-5h12l2 5v3.5"/><path d="M3 15.5h18v2.5H3z"/><circle cx="7.5" cy="18.5" r="1.5"/><circle cx="16.5" cy="18.5" r="1.5"/><path d="M6.2 12h11.6"/>',
    watch: '<rect x="6.5" y="6.5" width="11" height="11" rx="3"/><path d="M9 6.5 9.6 3h4.8l.6 3.5M9 17.5l.6 3.5h4.8l.6-3.5M12 9.5V12l1.6 1.2"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M10.5 5h3"/>',
    people: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M15.5 14.2c2.4-.2 4.4 1.3 5 4.3"/>',
    home: '<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
    cross: '<path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.5 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    flame: '<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-4 3.5-6 4-10 2.5 1.5 3.5 3.5 3.5 6 1-.6 1.6-1.8 1.8-3 1.6 1.7 3.7 4 3.7 7 0 3.4-2.5 6-6.5 6Z"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    church: '<path d="M12 3v4M10.3 4.7h3.4M6 21v-8l6-5 6 5v8z"/><path d="M10 21v-4h4v4"/>',
    office: '<rect x="5" y="3.5" width="14" height="17"/><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M9 15.5h2M13 15.5h2"/>'
  };
  function icon(name, size) { return `<svg class="ico" viewBox="0 0 24 24" width="${size || 20}" height="${size || 20}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`; }

  /* ---------- iPhone 17 Pro Max ---------- */
  const SB = '<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>' +
    '<svg viewBox="0 0 17 12"><path d="M8.5 2.3c2.6 0 5 1 6.8 2.7l1.2-1.3A11.3 11.3 0 0 0 8.5.5 11.3 11.3 0 0 0 .5 3.7L1.7 5a9.6 9.6 0 0 1 6.8-2.7Zm0 3.6c1.6 0 3.1.6 4.3 1.7L14 6.3a8 8 0 0 0-5.5-2.2A8 8 0 0 0 3 6.3l1.2 1.3c1.2-1.1 2.7-1.7 4.3-1.7Zm0 3.6c-.7 0-1.3.3-1.8.7l1.8 1.8 1.8-1.8c-.5-.4-1.1-.7-1.8-.7Z"/></svg>' +
    '<svg viewBox="0 0 28 13"><rect x="0.6" y="0.6" width="23.8" height="11.8" rx="3.6" fill="none" stroke="currentColor" stroke-opacity=".4" stroke-width="1.2"/><rect x="2.4" y="2.4" width="18.6" height="8.2" rx="2.1"/><path d="M26 4.4v4.2c.9-.3 1.5-1.2 1.5-2.1s-.6-1.8-1.5-2.1Z" fill-opacity=".45"/></svg>';
  function iphone(parent, o) {
    o = o || {};
    const time = o.time || "9:41";
    const d = el("div", { class: "iphone", "data-finish": o.finish || "silver", role: "group", "aria-label": o.label || "iPhone screen", style: o.width ? `--pw:${o.width}` : null, html:
      `<i class="hw hw-action"></i><i class="hw hw-up"></i><i class="hw hw-down"></i><i class="hw hw-side"></i><i class="hw hw-cam"></i>
       <div class="iphone-body"><div class="iphone-glass"><div class="iphone-screen ${o.dark ? "dark" : ""}">
         <div class="island"></div><div class="statusbar"><span>${time}</span><span class="sb-r">${SB}</span></div>
         <div class="screen-content"></div><div class="home-ind"></div></div></div></div>` });
    parent.appendChild(d);
    return { el: d, screen: d.querySelector(".iphone-screen"), content: d.querySelector(".screen-content"), island: d.querySelector(".island") };
  }

  /* ---------- Generative poster art (stands in for photos in feeds) ---------- */
  function genArt(c, seed, w, h) {
    const r = rng(seed), ctx = c.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = w * dpr; c.height = h * dpr; c.style.width = "100%"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const hue = Math.floor(r() * 360), hue2 = (hue + 30 + Math.floor(r() * 150)) % 360;
    const g = ctx.createLinearGradient(0, 0, w * r(), h);
    g.addColorStop(0, `hsl(${hue} ${50 + r() * 30}% ${55 + r() * 20}%)`); g.addColorStop(1, `hsl(${hue2} ${45 + r() * 30}% ${25 + r() * 25}%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const kind = Math.floor(r() * 4);
    for (let i = 0; i < 3 + Math.floor(r() * 5); i++) {
      ctx.globalAlpha = 0.35 + r() * 0.55; ctx.fillStyle = `hsl(${(hue + r() * 200) % 360} ${60 + r() * 30}% ${45 + r() * 40}%)`;
      ctx.save(); ctx.translate(r() * w, r() * h); ctx.rotate(r() * Math.PI);
      const s = (0.15 + r() * 0.45) * w;
      if (kind === 0 || (kind === 3 && r() > 0.5)) { ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, Math.PI * 2); ctx.fill(); }
      else if (kind === 1) ctx.fillRect(-s / 2, -s / 8, s, s / 4);
      else { ctx.beginPath(); ctx.moveTo(-s / 2, s / 2); ctx.lineTo(0, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    ctx.globalAlpha = 0.07; ctx.fillStyle = "#000";
    for (let i = 0; i < (w * h) / 60; i++) ctx.fillRect(r() * w, r() * h, 1, 1);
    ctx.globalAlpha = 1;
  }

  /* ---------- Draw your guess ---------- */
  function drawit(parent, o) {
    const W = 640, H = o.height || 300, m = { l: 52, r: 18, t: 18, b: 34 };
    const xs = o.data.map((d) => d.x), n = xs.length, reveal = o.reveal;
    const X = (i) => m.l + (i / (n - 1)) * (W - m.l - m.r), Y = (v) => H - m.b - (v / o.yMax) * (H - m.t - m.b);
    const inv = (py) => clamp(((H - m.b - py) / (H - m.t - m.b)) * o.yMax, 0, o.yMax);
    const wrap = el("div", { class: "drawit" }); parent.appendChild(wrap);
    const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": o.label || "Draw your guess" }); wrap.appendChild(s);
    (o.yTicks || []).forEach((v) => { s.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: "s-hair", "stroke-dasharray": "2 4" })); s.appendChild(svg("text", { x: m.l - 8, y: Y(v) + 4, "text-anchor": "end", "font-size": 12, text: o.yFmt(v) })); });
    xs.forEach((x, i) => { if (i % (o.xEvery || 1) === 0 || i === n - 1) s.appendChild(svg("text", { x: X(i), y: H - 10, "text-anchor": "middle", "font-size": 12, text: String(x) })); });
    s.appendChild(svg("rect", { x: X(reveal), y: m.t, width: X(n - 1) - X(reveal), height: H - m.t - m.b, class: "zone" }));
    const pts = (arr, from, to) => arr.slice(from, to + 1).map((v, k) => `${k ? "L" : "M"}${X(from + k)},${Y(v)}`).join("");
    const vals = o.data.map((d) => d.y);
    s.appendChild(svg("path", { d: pts(vals, 0, reveal), class: "known" }));
    s.appendChild(svg("circle", { cx: X(reveal), cy: Y(vals[reveal]), r: 5, class: "f-ink" }));
    const lastLbl = svg("text", { x: X(reveal) - 8, y: Y(vals[reveal]) - 10, "text-anchor": "end", "font-size": 12, "font-weight": 700, class: "t-ink", text: o.yFmt(vals[reveal]) }); s.appendChild(lastLbl);
    const guess = new Array(n).fill(null); guess[reveal] = vals[reveal];
    const gPath = svg("path", { class: "guess" }); s.appendChild(gPath);
    const tPath = svg("path", { class: "truth" }); s.appendChild(tPath);
    const labels = svg("g"); s.appendChild(labels);
    const hint = el("div", { class: "drawit-hint", text: o.hint || "Draw the rest of the line" }); wrap.appendChild(hint);
    const place = () => { const r = wrap.getBoundingClientRect(); const k = r.width / W; hint.style.left = (X(reveal) + 14) * k + "px"; hint.style.top = (Y(vals[reveal]) - 34) * k + "px"; };
    place(); new ResizeObserver(place).observe(wrap);
    let drawing = false, done = false;
    const toLocal = (e) => { const r = s.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
    const paint = () => { let d = "", started = false; for (let i = reveal; i < n; i++) { if (guess[i] == null) break; d += `${started ? "L" : "M"}${X(i)},${Y(guess[i])}`; started = true; } gPath.setAttribute("d", d); };
    const fill = (p) => { const i = Math.round(((p.x - m.l) / (W - m.l - m.r)) * (n - 1)); if (i <= reveal || i >= n) return; guess[i] = inv(p.y); for (let j = reveal + 1; j < i; j++) if (guess[j] == null) guess[j] = lerp(guess[reveal], guess[i], (j - reveal) / (i - reveal)); paint(); hint.style.display = "none"; if (o.onDraw) o.onDraw(guess.slice(reveal + 1).every((g) => g != null)); };
    s.addEventListener("pointerdown", (e) => { if (done) return; drawing = true; s.setPointerCapture(e.pointerId); fill(toLocal(e)); });
    s.addEventListener("pointermove", (e) => { if (drawing && !done) fill(toLocal(e)); });
    s.addEventListener("pointerup", () => (drawing = false)); s.addEventListener("pointercancel", () => (drawing = false));
    return {
      get complete() { return guess.slice(reveal + 1).every((g) => g != null); },
      async show() {
        done = true; hint.style.display = "none";
        for (let i = reveal + 1; i < n; i++) if (guess[i] == null) guess[i] = guess[i - 1];
        paint();
        const d = pts(vals, reveal, n - 1); tPath.setAttribute("d", d);
        const L = tPath.getTotalLength(); tPath.style.strokeDasharray = L; tPath.style.strokeDashoffset = L;
        await tween(1400, (k) => (tPath.style.strokeDashoffset = L * (1 - k)), ease.inOut);
        const i = n - 1;
        labels.appendChild(svg("text", { x: X(i) - 6, y: Y(vals[i]) - 10, "text-anchor": "end", "font-size": 13, "font-weight": 800, class: "t-spot", text: o.yFmt(vals[i]) }));
        labels.appendChild(svg("text", { x: X(i) - 6, y: Y(guess[i]) + (guess[i] > vals[i] ? -10 : 18), "text-anchor": "end", "font-size": 12, class: "t-grey", text: "your guess " + o.yFmt(guess[i]) }));
        const err = guess.slice(reveal + 1).reduce((a, g, k) => a + Math.abs(g - vals[reveal + 1 + k]) / vals[reveal + 1 + k], 0) / (n - reveal - 1);
        return { err, last: { guess: guess[i], truth: vals[i] } };
      },
      reset() { done = false; guess.fill(null); guess[reveal] = vals[reveal]; paint(); tPath.removeAttribute("d"); labels.innerHTML = ""; hint.style.display = ""; }
    };
  }

  window.FK = { el, svg, range, tabs, toggle, button, css, palette, onTheme, canvas, loop, whenVisible, tween, wait, ease, lerp, clamp, spring, fmt, rng, gauss, sha256, randomHex, tex, icon, iphone, genArt, drawit };
})();

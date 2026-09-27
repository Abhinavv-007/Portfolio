/*
  The opening titles: a newsreel of about six seconds that plays on every
  fresh load and every reload of the journal.

    1. Spin      the front page spins in out of the dark, the old-film way
    2. Crunch    it is balled up in mid-air, a crushed-paper mesh with
                 every facet lit on its own
    3. Drop      the ball thuds onto the desk and bounces once
    4. Expand    it springs open flat again, creases and all
    5. Scramble  the headline type shuffles on the press, then locks in
    6. Slam      the EXTRA stamp comes down on the columns
    7. Burn      the sheet catches at the corners and burns off the page

  The fire is burn.js, the same engine every page change uses.

  Loaded before app.js. If it decides to play, it sets window.PR_FILM and
  app.js hands the page reveal over to it: the usual burn intro is skipped
  and the page is marked "loaded" as the fire opens it up.

  It never plays for reduced motion, on back/forward, or on a page change
  inside the journal (the burn transition covers those). Tap, click,
  Escape or the skip button ends it at once.
*/
(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let handoff = false;
  try { handoff = sessionStorage.getItem("bj-handoff") === "1"; } catch (_) { /* storage blocked: a fresh visit */ }
  let navType = "navigate";
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav && nav.type) navType = nav.type;
  } catch (_) { /* old browser: treat as a fresh load */ }
  const forced = /[?&]intro=1\b/.test(location.search);
  // How the reader got here, for anything that greets them (the guide).
  window.PR_ARRIVAL = { fresh: !handoff && navType !== "back_forward", handoff, navType };
  if (!forced && (reducedMotion || handoff || navType === "back_forward")) return;
  if (!document.createElement("canvas").getContext) return;

  const FLY = [0.05, 0.75];
  const CRUNCH = [0.62, 1.12];
  const DROP = [1.12, 1.5];
  const OPEN = [1.5, 2.12];
  const LAND = OPEN[1];
  const LOCK = LAND + 0.05;
  const STAMP = LAND + 1.0;
  const BURN = STAMP + 0.45;
  const DUR = BURN + 2.4;
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ&#$%@!?*";
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const E = {
    out3: (t) => 1 - Math.pow(1 - t, 3),
    out4: (t) => 1 - Math.pow(1 - t, 4),
    io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inQuad: (t) => t * t
  };
  const C = { ink: "#171612", bg: "#110f0c", paper: "#f1e8d8", red: "#c0321f" };
  const disp = (s, w = 900, it = "") => `${it} ${w} ${Math.max(1, s).toFixed(1)}px "Playfair Display", Georgia, serif`;
  const mono = (s, w = 700) => `${w} ${Math.max(1, s).toFixed(1)}px "Courier New", Courier, monospace`;
  const body = (s) => `${Math.max(1, s).toFixed(1)}px Georgia, "Times New Roman", serif`;

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  }

  /* ---------------------------------------------------------------- */
  /* Overlay                                                           */
  /* ---------------------------------------------------------------- */

  const root = document.createElement("div");
  root.className = "pr-film";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Opening titles: The Build Journal, front page. Abhinav Raj, security researcher and product builder, Bugcrowd global Top 50 in June, July and September 2026");
  root.innerHTML = `
    <canvas class="pr-film-canvas" aria-hidden="true"></canvas>
    <button class="pr-film-skip" type="button">Skip <span aria-hidden="true">&rarr;</span></button>
    <div class="pr-film-bar" aria-hidden="true"><i></i></div>
  `;
  const style = document.createElement("style");
  style.textContent = `
    .pr-film { position: fixed; inset: 0; z-index: 6050; background: ${C.bg}; cursor: pointer; }
    .pr-film.is-burning { background: transparent; }
    .pr-film-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    .pr-film-skip { position: absolute; right: max(1.1rem, env(safe-area-inset-right)); bottom: max(1.1rem, env(safe-area-inset-bottom)); z-index: 2;
      min-height: 2.5rem; padding: 0 1.1rem; border: 1px solid rgba(241, 232, 216, 0.4); border-radius: 999px;
      font: 700 0.6rem/1 "Courier New", Courier, monospace; letter-spacing: 0.24em; text-transform: uppercase;
      color: #f1e8d8; background: rgba(17, 15, 12, 0.55); cursor: pointer;
      -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
      opacity: 0; animation: prFilmIn 400ms 500ms ease forwards; }
    .pr-film-skip:focus-visible { outline: 2px solid ${C.red}; outline-offset: 3px; }
    .pr-film.is-burning .pr-film-skip, .pr-film.is-burning .pr-film-bar { opacity: 0 !important; transition: opacity 200ms ease; }
    .pr-film-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: rgba(241, 232, 216, 0.1); }
    .pr-film-bar i { display: block; height: 100%; background: ${C.red}; transform-origin: 0 50%; transform: scaleX(var(--p, 0)); }
    @keyframes prFilmIn { to { opacity: 1; } }
  `;
  document.head.appendChild(style);
  document.body.appendChild(root);
  document.documentElement.classList.add("pr-film-on");

  const canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, u = 1, Pt = false, dpr = 1, cx = 0, cy = 0;
  let paper = null, pw = 0, ph = 0, stampImg = null, shadowImg = null, bgImg = null, vignette = null;
  let raw = null, mesh = null, creases = null;
  const type = { head: [], hs: 0, deck: [], ds: 0 };

  const portrait = new Image();
  const portraitReady = new Promise((res) => {
    portrait.onload = res;
    portrait.onerror = res;
    window.setTimeout(res, 900);
  });
  portrait.src = "/assets/portrait-abhinav.jpg";

  /* ---------------------------------------------------------------- */
  /* The front page, set once per size                                 */
  /* ---------------------------------------------------------------- */

  const COPY = "Since March 2026 he has spent most days reading how web applications decide who is allowed to do what, and reporting the places where they get it wrong. Most of what he reports sits in authorization, authentication and business logic: a server acting on an identifier without checking who owns it, a flow that can be reordered, a login that links identities too loosely. Every test runs between accounts created for it, with invented data, and stops at the smallest request that proves the problem. Before the research there were the products: a private file workspace, a model gateway, a subscription tracker, a race-weekend app and a disposable mailbox, all five still live at their own domains. The reading now runs backwards into what he builds. ";

  function wrap(c, text, x, y, width, lh, maxY, indentFirst = 0) {
    const words = text.split(" ");
    let line = "";
    let first = true;
    let yy = y;
    for (let i = 0; i < words.length && yy < maxY; i += 1) {
      const test = line ? `${line} ${words[i]}` : words[i];
      const avail = width - (first ? indentFirst : 0);
      if (c.measureText(test).width > avail && line) {
        c.fillText(line, x + (first ? indentFirst : 0), yy);
        line = words[i];
        yy += lh;
        first = false;
      } else {
        line = test;
      }
    }
    if (line && yy < maxY) c.fillText(line, x + (first ? indentFirst : 0), yy);
    return yy + lh;
  }

  function fitFont(c, str, font, maxW, maxSize) {
    c.font = font(100);
    return Math.min(maxSize, (100 * maxW) / c.measureText(str).width);
  }

  // The portrait, printed as a dot screen.
  function halftone(c, x, y, iw, ih) {
    c.save();
    c.fillStyle = "#e6dac6";
    c.fillRect(x, y, iw, ih);
    if (portrait.naturalWidth) {
      const cols = Math.round(Math.max(40, iw / 3.2));
      const cell = iw / cols;
      const rows = Math.round(ih / cell);
      const s = document.createElement("canvas");
      s.width = cols;
      s.height = rows;
      const sc = s.getContext("2d");
      const ar = portrait.naturalWidth / portrait.naturalHeight;
      const tr = cols / rows;
      let sw = portrait.naturalWidth, sh = portrait.naturalHeight, sx = 0, sy = 0;
      if (ar > tr) { sw = sh * tr; sx = (portrait.naturalWidth - sw) / 2; } else { sh = sw / tr; sy = (portrait.naturalHeight - sh) * 0.3; }
      sc.drawImage(portrait, sx, sy, sw, sh, 0, 0, cols, rows);
      const d = sc.getImageData(0, 0, cols, rows).data;
      c.fillStyle = C.ink;
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const k = (j * cols + i) * 4;
          const lum = (d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11) / 255;
          const r = Math.pow(1 - lum, 0.9) * cell * 0.62;
          if (r < 0.25) continue;
          c.beginPath();
          c.arc(x + (i + 0.5) * cell, y + (j + 0.5) * cell, r, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
    c.strokeStyle = C.ink;
    c.lineWidth = 1;
    c.strokeRect(x, y, iw, ih);
    c.restore();
  }

  function buildPaper() {
    // Landscape: the top half of a broadsheet. Portrait: a tabloid front.
    pw = Pt ? Math.min(w * 0.9, h * 0.66) : Math.min(w * 0.8, h * 0.84 * 1.42);
    ph = Pt ? pw * 1.36 : pw / 1.42;
    const c0 = document.createElement("canvas");
    c0.width = Math.round(pw * dpr);
    c0.height = Math.round(ph * dpr);
    const c = c0.getContext("2d");
    c.scale(dpr, dpr);
    const s = pw / 100;
    const m = s * 3.4;
    const r = rng(41);

    // Stock
    c.fillStyle = C.paper;
    c.fillRect(0, 0, pw, ph);
    const age = c.createRadialGradient(pw / 2, ph * 0.45, Math.min(pw, ph) * 0.3, pw / 2, ph / 2, Math.hypot(pw, ph) * 0.62);
    age.addColorStop(0, "rgba(227, 214, 191, 0)");
    age.addColorStop(1, "rgba(196, 176, 142, 0.55)");
    c.fillStyle = age;
    c.fillRect(0, 0, pw, ph);
    for (let i = 0; i < pw * ph * 0.004; i += 1) {
      c.fillStyle = `rgba(60, 48, 30, ${0.04 + r() * 0.08})`;
      c.fillRect(r() * pw, r() * ph, r() * 1.4, r() * 1.4);
    }

    c.fillStyle = C.ink;
    c.textBaseline = "alphabetic";
    const rule = (y, lw = 1) => { c.fillRect(m, y, pw - m * 2, lw); };

    // Folio line
    const date = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toUpperCase();
    const fs = Math.max(6, s * (Pt ? 1.9 : 1.05));
    c.font = mono(fs, 700);
    let y = m + fs;
    c.textAlign = "left"; c.fillText("VOL. 2 · NO. 01", m, y);
    c.textAlign = "right"; c.fillText(Pt ? "₹5" : "ABHNV.IN · PRICE ₹5", pw - m, y);
    c.textAlign = "center"; if (!Pt) c.fillText(date, pw / 2, y);
    y += fs * 0.7;
    rule(y, 0.8);

    // Masthead
    const mast = "The Build Journal";
    const ms = fitFont(c, mast, (z) => disp(z, 900), pw - m * 2, s * (Pt ? 13 : 8.4));
    c.font = disp(ms, 900);
    y += ms * 0.98;
    c.fillText(mast, pw / 2, y);
    y += ms * 0.26;
    rule(y, s * 0.45);
    rule(y + s * 0.75, s * 0.14);
    y += s * 0.75 + fs * 1.5;
    c.font = mono(fs, 700);
    c.textAlign = "left"; c.fillText("SECURITY EDITION", m, y);
    c.textAlign = "right"; c.fillText(Pt ? "EXTRA" : "FRONT PAGE", pw - m, y);
    c.textAlign = "center";
    if (!Pt) { c.fillStyle = C.red; c.fillText("★  LATE CITY EXTRA  ★", pw / 2, y); c.fillStyle = C.ink; }
    y += fs * 0.75;
    rule(y, 0.8);

    // Headline
    // The headline and deck are set live (they scramble): only their places are kept here.
    const lines = Pt ? ["ABHINAV", "RAJ"] : ["ABHINAV RAJ"];
    const hs = Math.min(...lines.map((l) => fitFont(c, l, (z) => disp(z, 900), pw - m * 2.2, s * (Pt ? 30 : 17))));
    type.hs = hs;
    type.head = lines.map((l) => { y += hs * 0.9; return { str: l, y }; });
    y += hs * 0.22;
    const deck = Pt
      ? ["Security researcher & product builder in", "Bugcrowd’s global Top 50, three months running"]
      : ["Security researcher & product builder named in Bugcrowd’s global Top 50, three months running"];
    const ds = Math.max(7, s * (Pt ? 2.9 : 1.9));
    type.ds = ds;
    type.deck = deck.map((l, i) => { y += ds * (i ? 1.2 : 1.05); return { str: l, y }; });
    y += ds * 0.6;
    rule(y, 0.8);
    y += s * 1.4;

    // Photo and columns
    const top = y;
    const bottom = ph - m * 0.4;
    const bs = Math.max(5.5, s * (Pt ? 1.85 : 1.02));
    const gut = s * 1.6;
    c.textAlign = "left";
    if (Pt) {
      const iw = pw * 0.44, ih = Math.min(bottom - top - bs * 3, iw * 1.1);
      halftone(c, m, top, iw, ih);
      c.font = mono(bs * 0.8, 400);
      c.fillText("A. RAJ, AT THE DESK", m, top + ih + bs * 1.3);
      const x2 = m + iw + gut;
      c.font = disp(bs * 1.5, 700);
      c.fillText("Top 50, three times", x2, top + bs * 1.2);
      c.font = body(bs);
      wrap(c, COPY + COPY, x2, top + bs * 3, pw - m - x2, bs * 1.28, bottom);
      wrap(c, COPY, m, top + ih + bs * 3.2, iw, bs * 1.28, bottom);
    } else {
      const iw = pw * 0.24, ih = Math.min(bottom - top - bs * 2, iw * 1.02);
      halftone(c, m, top, iw, ih);
      c.font = mono(bs * 0.85, 400);
      c.fillText("A. RAJ · AT THE DESK, SEPTEMBER 2026", m, top + ih + bs * 1.5);
      const x0 = m + iw + gut;
      const colW = (pw - m - x0 - gut * 2) / 3;
      for (let k = 0; k < 3; k += 1) {
        const x = x0 + k * (colW + gut);
        if (k) c.fillRect(x - gut / 2, top, 0.6, bottom - top);
        let yy = top + bs;
        if (k === 0) {
          c.font = disp(bs * 1.6, 700);
          c.fillText("Global Top 50,", x, yy + bs * 0.4);
          c.fillText("three times over", x, yy + bs * 2.1);
          yy += bs * 3.6;
          c.font = disp(bs * 3.3, 900);
          c.fillText("S", x, yy + bs * 1.7);
          c.font = body(bs);
          yy = wrap(c, COPY.slice(1), x, yy, colW, bs * 1.3, yy + bs * 2.6, bs * 2.4);
          wrap(c, COPY.slice(COPY.indexOf("Most")), x, yy, colW, bs * 1.3, bottom);
        } else if (k === 1) {
          c.font = mono(bs * 0.9, 700);
          c.fillStyle = C.red;
          c.fillText("THE FIVE PRODUCTS", x, yy + bs * 0.4);
          c.fillStyle = C.ink;
          c.font = disp(bs * 1.35, 700);
          ["Clex", "Clex AI", "Driped", "trgt", "Modih Mail"].forEach((p, i) => c.fillText(p, x, yy + bs * (2.2 + i * 1.6)));
          c.font = body(bs);
          wrap(c, COPY.slice(COPY.indexOf("Before")) + COPY, x, yy + bs * 10.4, colW, bs * 1.3, bottom);
        } else {
          c.font = body(bs);
          wrap(c, COPY.slice(COPY.indexOf("Every")) + COPY, x, yy + bs * 0.4, colW, bs * 1.3, bottom);
        }
      }
    }
    c.strokeStyle = "rgba(120, 96, 60, 0.35)";
    c.lineWidth = 1.2;
    c.strokeRect(0.6, 0.6, pw - 1.2, ph - 1.2);
    paper = c0;

    // The stamp, inked once with rubber-stamp gaps
    const ss = Math.min(pw, ph) * (Pt ? 0.32 : 0.29);
    const sw2 = ss * 1.7, sh2 = ss;
    const st = document.createElement("canvas");
    st.width = Math.round(sw2 * dpr);
    st.height = Math.round(sh2 * dpr);
    const sc = st.getContext("2d");
    sc.scale(dpr, dpr);
    sc.strokeStyle = C.red;
    sc.fillStyle = C.red;
    sc.lineWidth = ss * 0.045;
    sc.strokeRect(ss * 0.06, ss * 0.06, sw2 - ss * 0.12, sh2 - ss * 0.12);
    sc.lineWidth = ss * 0.015;
    sc.strokeRect(ss * 0.13, ss * 0.13, sw2 - ss * 0.26, sh2 - ss * 0.26);
    sc.textAlign = "center";
    sc.font = disp(ss * 0.46, 900);
    sc.fillText("EXTRA!", sw2 / 2, sh2 * 0.6);
    sc.font = mono(ss * 0.085, 700);
    sc.fillText("BUGCROWD GLOBAL TOP 50", sw2 / 2, sh2 * 0.79);
    sc.globalCompositeOperation = "destination-out";
    const r2 = rng(5);
    for (let i = 0; i < 520; i += 1) {
      sc.globalAlpha = 0.3 + r2() * 0.7;
      sc.fillRect(r2() * sw2, r2() * sh2, r2() * ss * 0.03, r2() * ss * 0.012);
    }
    stampImg = st;

    // A soft drop shadow for the sheet
    const pad = 60;
    const sh = document.createElement("canvas");
    sh.width = Math.round((pw + pad * 2) * 0.5);
    sh.height = Math.round((ph + pad * 2) * 0.5);
    const shc = sh.getContext("2d");
    shc.scale(0.5, 0.5);
    shc.shadowColor = "rgba(0,0,0,0.75)";
    shc.shadowBlur = 50;
    shc.fillStyle = "#000";
    shc.fillRect(pad, pad, pw, ph);
    shadowImg = { img: sh, pad };
  }

  function buildBackground() {
    // The press-room desk: warm dark, a lamp overhead, a faint dot screen.
    const b = document.createElement("canvas");
    b.width = Math.round(w * dpr);
    b.height = Math.round(h * dpr);
    const c = b.getContext("2d");
    c.scale(dpr, dpr);
    c.fillStyle = C.bg;
    c.fillRect(0, 0, w, h);
    const lamp = c.createRadialGradient(cx, cy * 0.8, 0, cx, cy, Math.hypot(w, h) * 0.6);
    lamp.addColorStop(0, "rgba(120, 88, 56, 0.55)");
    lamp.addColorStop(0.5, "rgba(60, 42, 28, 0.35)");
    lamp.addColorStop(1, "rgba(0, 0, 0, 0)");
    c.fillStyle = lamp;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(241, 232, 216, 0.035)";
    const step = Math.max(6, u * 1.4);
    for (let y = 0, row = 0; y < h; y += step, row += 1) for (let x = row % 2 ? step / 2 : 0; x < w; x += step) c.fillRect(x, y, 1.2, 1.2);
    bgImg = b;
    vignette = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.hypot(w, h) * 0.62);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  }

  function layout() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    if (w * h * dpr * dpr > 6.5e6) dpr = Math.sqrt(6.5e6 / (w * h));
    u = Math.min(w, h) / 100;
    Pt = h > w * 1.05;
    cx = w / 2;
    cy = h / 2;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    buildBackground();
    buildPaper();
    buildMesh();
  }

  let resolveDone;
  const done = new Promise((res) => { resolveDone = res; });
  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    if (window.PR_FILM && typeof window.PR_FILM.onReveal === "function") window.PR_FILM.onReveal();
  };
  window.PR_FILM = { done, onReveal: null };

  /* ---------------------------------------------------------------- */
  /* Frames                                                            */
  /* ---------------------------------------------------------------- */

  const dust = (() => {
    const r = rng(17);
    return Array.from({ length: 46 }, () => ({ side: Math.floor(r() * 4), p: r(), v: 0.5 + r(), s: 0.6 + r() * 1.8, drift: r() - 0.5 }));
  })();

  /* ---------------------------------------------------------------- */
  /* The crumple: the sheet as a mesh of paper facets, each lit alone   */
  /* ---------------------------------------------------------------- */

  const LIGHT = (() => { const l = [-0.35, -0.55, 0.76]; const m = Math.hypot(l[0], l[1], l[2]); return l.map((v) => v / m); })();
  const HIT = DROP[0] + (DROP[1] - DROP[0]) * 0.5;

  function buildMesh() {
    // The crushed sheet carries its type unset: the press locks it later.
    raw = document.createElement("canvas");
    raw.width = paper.width;
    raw.height = paper.height;
    const rc = raw.getContext("2d");
    rc.drawImage(paper, 0, 0);
    rc.setTransform(dpr, 0, 0, dpr, (pw / 2) * dpr, 0);
    setType(LOCK - 1, rc, 0);

    const cols = Pt ? 8 : 12, rows = Pt ? 12 : 8;
    const r = rng(77);
    const R = Math.min(pw, ph) * 0.23;
    const V = [];
    for (let j = 0; j <= rows; j += 1) {
      for (let i = 0; i <= cols; i += 1) {
        const uu = (i / cols) * pw, vv = (j / rows) * ph;
        const fx = uu - pw / 2, fy = vv - ph / 2;
        const nx = fx / (pw / 2), ny = fy / (ph / 2);
        const d = Math.min(1, Math.hypot(nx, ny) / Math.SQRT2);
        // Crushed: every point is wrapped round a lumpy ball, the edges
        // folded in over the middle with a twist.
        const th = Math.atan2(ny, nx) + (r() - 0.5) * 1.1 + d * 2.1;
        const rho = R * (0.3 + 0.7 * Math.sqrt(d)) * (0.84 + r() * 0.3);
        const bz = Math.sqrt(Math.max(0, R * R - rho * rho)) * (r() < 0.5 ? 1 : -1) * 0.8 + (r() - 0.5) * R * 0.5;
        V.push({ u: uu, v: vv, fx, fy, bx: Math.cos(th) * rho, by: Math.sin(th) * rho, bz, cz: (r() - 0.5) * Math.min(pw, ph) * 0.022, d, x: fx, y: fy, z: 0 });
      }
    }
    const T = [];
    for (let j = 0; j < rows; j += 1) {
      for (let i = 0; i < cols; i += 1) {
        const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 2, dd = a + cols + 1;
        if ((i + j) % 2) T.push([a, b, c], [a, c, dd]);
        else T.push([a, b, dd], [b, c, dd]);
      }
    }
    mesh = { V, T, R, order: T.map((_, i) => i), zs: new Float32Array(T.length) };

    // Once it has been opened out again the creases stay in the print.
    pose(0, 1);
    creases = document.createElement("canvas");
    creases.width = paper.width;
    creases.height = paper.height;
    const cc = creases.getContext("2d");
    cc.setTransform(dpr, 0, 0, dpr, (pw / 2) * dpr, (ph / 2) * dpr);
    T.forEach((tr) => {
      const [A, B, Cc] = tr.map((i) => V[i]);
      const f = facet(A, B, Cc);
      triPath(cc, A, B, Cc, 0);
      cc.fillStyle = shadeOf(f.lit * 1.25);
      cc.fill();
    });
  }

  // Crumple amount c (0 flat, 1 balled) and how much crease is left.
  function pose(c, crease) {
    mesh.V.forEach((p) => {
      const k = clamp(c * 1.3 - (1 - p.d) * 0.3);
      const e = k * k * (3 - 2 * k);
      p.x = lerp(p.fx, p.bx, e);
      p.y = lerp(p.fy, p.by, e);
      p.z = lerp(p.cz * crease, p.bz, e);
    });
  }

  function facet(A, B, Cc) {
    const ux = B.x - A.x, uy = B.y - A.y, uz = B.z - A.z;
    const vx = Cc.x - A.x, vy = Cc.y - A.y, vz = Cc.z - A.z;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const m = Math.hypot(nx, ny, nz) || 1;
    nx /= m; ny /= m; nz /= m;
    const back = nz < 0;
    if (back) { nx = -nx; ny = -ny; nz = -nz; }
    return { back, lit: nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2] - LIGHT[2] };
  }

  const shadeOf = (lit) => (lit < 0
    ? `rgba(24, 16, 8, ${Math.min(0.62, -lit * 1.3).toFixed(3)})`
    : `rgba(255, 250, 238, ${Math.min(0.34, lit * 1.1).toFixed(3)})`);

  function triPath(c, A, B, Cc, grow) {
    c.beginPath();
    if (!grow) {
      c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.lineTo(Cc.x, Cc.y);
    } else {
      // Pushed out a hair from the middle so neighbours overlap: no seams.
      const gx = (A.x + B.x + Cc.x) / 3, gy = (A.y + B.y + Cc.y) / 3;
      [A, B, Cc].forEach((p, i) => {
        const dx = p.x - gx, dy = p.y - gy, m = Math.hypot(dx, dy) || 1;
        const x = p.x + (dx / m) * grow, y = p.y + (dy / m) * grow;
        if (i) c.lineTo(x, y); else c.moveTo(x, y);
      });
    }
    c.closePath();
  }

  // One facet of the printed sheet: the texture mapped from its flat place.
  function texTri(A, B, Cc, grow) {
    const ux = B.u - A.u, uy = B.v - A.v, vx = Cc.u - A.u, vy = Cc.v - A.v;
    const det = ux * vy - uy * vx;
    if (!det) return;
    const Ux = B.x - A.x, Uy = B.y - A.y, Vx = Cc.x - A.x, Vy = Cc.y - A.y;
    const a = (Ux * vy - Vx * uy) / det, c = (Vx * ux - Ux * vx) / det;
    const b = (Uy * vy - Vy * uy) / det, d = (Vy * ux - Uy * vx) / det;
    ctx.save();
    triPath(ctx, A, B, Cc, grow);
    ctx.clip();
    ctx.transform(a, b, c, d, A.x - a * A.u - c * A.v, A.y - b * A.u - d * A.v);
    ctx.drawImage(raw, 0, 0, pw, ph);
    ctx.restore();
  }

  function drawCrumpled(S) {
    const { V, T, R, order, zs } = mesh;
    const c = S.c;
    // Shadow: the flat sheet's soft one fades into a ball's, which drifts
    // off and blurs as the ball is lifted.
    const scale = S.sc;
    ctx.save();
    ctx.rotate(S.ang);
    ctx.scale(scale, scale);
    if (c < 0.98) {
      const { img, pad } = shadowImg;
      ctx.globalAlpha = 0.9 * Math.pow(1 - c, 5);
      ctx.drawImage(img, -pw / 2 - pad + u * 0.6, -ph / 2 - pad + u * 1.2, pw + pad * 2, ph + pad * 2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (c > 0.02) {
      const off = u * (1 + S.lift * 30);
      const g = ctx.createRadialGradient(off, off * 1.6, 0, off, off * 1.6, R * scale * (1.25 + S.lift * 2));
      g.addColorStop(0, `rgba(0, 0, 0, ${(0.6 * c * (1 - S.lift * 2)).toFixed(3)})`);
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(-R * 3 * scale, -R * 3 * scale, R * 6 * scale, R * 6 * scale);
    }

    ctx.save();
    ctx.rotate(S.ang);
    ctx.scale(scale * S.sqx, scale * S.sqy);
    if (c < 0.001 && !S.crease) {
      ctx.drawImage(raw, -pw / 2, -ph / 2, pw, ph);
      ctx.restore();
      return;
    }
    pose(c, S.crease);
    T.forEach((tr, i) => { zs[i] = V[tr[0]].z + V[tr[1]].z + V[tr[2]].z; });
    order.sort((a, b) => zs[a] - zs[b]);
    const grow = 0.9 / Math.max(0.2, scale);
    for (let n = 0; n < order.length; n += 1) {
      const tr = T[order[n]];
      const A = V[tr[0]], B = V[tr[1]], Cc = V[tr[2]];
      const f = facet(A, B, Cc);
      if (f.back) {
        triPath(ctx, A, B, Cc, grow);
        ctx.fillStyle = "#ddd1bc";
        ctx.fill();
      } else {
        texTri(A, B, Cc, grow);
      }
      triPath(ctx, A, B, Cc, grow);
      ctx.fillStyle = shadeOf(f.lit * (1.25 - 0.25 * c));
      ctx.fill();
    }
    ctx.restore();
  }

  // Where the sheet is and how it sits, at time t.
  function sheet(t) {
    const push = 1 + 0.05 * E.io3(seg(t, LAND + 0.1, DUR));
    const k = t - LAND;
    const thump = k > 0 && k < 0.18 ? Math.sin((k / 0.18) * Math.PI) * 0.025 : 0;
    if (t >= LAND) return { flat: true, ang: -0.035, sc: push * (1 - thump), spinning: false };

    const pf = seg(t, FLY[0], FLY[1]);
    const pc = seg(t, CRUNCH[0], CRUNCH[1]);
    const pd = seg(t, DROP[0], DROP[1]);
    const po = seg(t, OPEN[0], OPEN[1]);
    // Balled up in the air, sprung open again on the desk
    const c = po > 0 ? 1 - E.out3(po) : E.io3(pc);
    // Spins in, tumbles as it is crushed, rolls on the bounce, squares up
    let ang = lerp(-Math.PI * 3.2, -0.25, E.out3(pf)) + 1.3 * E.io3(pc) + 0.5 * E.out3(pd);
    if (po > 0) ang = lerp(-0.25 + 1.8, -0.035, E.out3(po));
    // Height above the desk reads as scale: lifted to be crushed, dropped,
    // one bounce, then it opens out with a little spring.
    let sc = pf >= 1 ? 0.92 : lerp(0.04, 0.92, E.out4(pf));
    let lift = E.io3(pc) * 0.16;
    if (pd > 0) lift = pd < 0.5 ? 0.16 * (1 - Math.pow(pd / 0.5, 2)) : 0.05 * Math.sin(((pd - 0.5) / 0.5) * Math.PI);
    if (po > 0) { sc = lerp(0.92, 1, E.out3(po)) + Math.sin(po * Math.PI) * 0.035; lift = 0; }
    const kh = t - HIT;
    const imp = kh > 0 && kh < 0.16 ? Math.sin((kh / 0.16) * Math.PI) : 0;
    return { flat: false, ang, sc: sc * (1 + lift), c, lift, sqx: 1 + imp * 0.14, sqy: 1 - imp * 0.12, crease: t > DROP[0] ? 1 : 0, spinning: pf < 1 };
  }

  // The headline shuffles through random sorts on the press, then each
  // letter locks in with a small punch; the deck follows, faster.
  function scrambleLine(c, str, y, size, font, t, t0, per, color) {
    c.font = font(size);
    const widths = Array.from(str).map((ch) => c.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = -total / 2;
    const tick = Math.floor(t * 22);
    Array.from(str).forEach((ch, i) => {
      const cw = widths[i];
      if (ch !== " ") {
        const lock = t0 + i * per;
        const k = t - lock;
        let g = ch, col = color, sc = 1;
        if (k < 0) {
          g = GLYPHS[(tick * 7 + i * 13 + Math.floor(i * i * 0.7)) % GLYPHS.length];
          col = (tick + i) % 3 ? "rgba(23, 22, 18, 0.55)" : "rgba(192, 50, 31, 0.8)";
        } else if (k < 0.12) {
          sc = 1 + 0.18 * (1 - k / 0.12);
        }
        const gw = k < 0 ? c.measureText(g).width : cw;
        c.save();
        c.translate(x + cw / 2, y);
        c.scale(sc * (gw > cw ? cw / gw : 1), sc);
        c.fillStyle = col;
        c.textAlign = "center";
        c.fillText(g, 0, 0);
        c.restore();
      }
      x += cw;
    });
  }

  function setType(t, c = ctx, dy = -ph / 2) {
    c.save();
    c.translate(0, dy);
    c.textBaseline = "alphabetic";
    let n = 0;
    type.head.forEach((l) => {
      scrambleLine(c, l.str, l.y, type.hs, (z) => disp(z, 900), t, LOCK + n * 0.062, 0.062, C.ink);
      n += l.str.length;
    });
    let d = 0;
    type.deck.forEach((l) => {
      scrambleLine(c, l.str, l.y, type.ds, (z) => disp(z, 400, "italic"), t, LOCK + 0.35 + d * 0.009, 0.009, C.ink);
      d += l.str.length;
    });
    c.restore();
  }

  function drawScene(t, trails) {
    // Motion trails while it spins: the old frame is only partly covered.
    ctx.globalAlpha = trails ? 0.42 : 1;
    ctx.drawImage(bgImg, 0, 0, w, h);
    ctx.globalAlpha = 1;

    const S = sheet(t);
    const k = t - LAND;
    const shake = k > 0 && k < 0.3 ? (1 - k / 0.3) * u * 0.8 : 0;
    const k2 = t - STAMP;
    const shake2 = k2 > 0 && k2 < 0.22 ? (1 - k2 / 0.22) * u * 0.5 : 0;
    const kh = t - HIT;
    const shake3 = kh > 0 && kh < 0.26 ? (1 - kh / 0.26) * u * 0.7 : 0;
    const sh = shake + shake2 + shake3;
    ctx.save();
    ctx.translate(cx + Math.sin(t * 90) * sh, cy + Math.cos(t * 77) * sh);
    if (!S.flat) {
      drawCrumpled(S);
    } else {
      ctx.rotate(S.ang);
      ctx.scale(S.sc, S.sc);
      const { img, pad } = shadowImg;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(img, -pw / 2 - pad + u * 0.6, -ph / 2 - pad + u * 1.2, pw + pad * 2, ph + pad * 2);
      ctx.globalAlpha = 1;
      ctx.drawImage(paper, -pw / 2, -ph / 2, pw, ph);
      setType(t);
      if (creases) ctx.drawImage(creases, -pw / 2, -ph / 2, pw, ph);
    }

    // Light running across the print
    const sweep = seg(t, LAND + 0.55, LAND + 1.5);
    if (sweep > 0 && sweep < 1) {
      const x = lerp(-pw * 0.9, pw * 0.9, E.io3(sweep));
      const g = ctx.createLinearGradient(x - pw * 0.18, -ph / 2, x + pw * 0.18, ph / 2);
      g.addColorStop(0, "rgba(255, 250, 240, 0)");
      g.addColorStop(0.5, "rgba(255, 250, 240, 0.28)");
      g.addColorStop(1, "rgba(255, 250, 240, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    }

    // The stamp comes down
    const sp = seg(t, STAMP - 0.14, STAMP);
    const stx = pw * (Pt ? 0.2 : 0.3), sty = ph * (Pt ? 0.3 : 0.27);
    if (sp > 0) {
      const sw = stampImg.width / dpr, sh2 = stampImg.height / dpr;
      const s2 = lerp(2.6, 1, E.inQuad(sp));
      ctx.save();
      ctx.translate(stx, sty);
      ctx.rotate(-0.16);
      ctx.scale(s2, s2);
      ctx.globalAlpha = lerp(0.2, 0.9, sp);
      ctx.drawImage(stampImg, -sw / 2, -sh2 / 2, sw, sh2);
      ctx.restore();
      // Ink flecks thrown on impact
      const f = seg(t, STAMP, STAMP + 0.35);
      if (f > 0 && f < 1) {
        const r = rng(9);
        ctx.fillStyle = `rgba(192, 50, 31, ${0.8 * (1 - f)})`;
        for (let i = 0; i < 18; i += 1) {
          const a = r() * Math.PI * 2, d = (0.3 + r() * 0.5) * Math.min(pw, ph) * 0.35 * E.out3(f);
          ctx.beginPath();
          ctx.arc(stx + Math.cos(a) * d, sty + Math.sin(a) * d * 0.6, 0.6 + r() * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();

    // Paper dust off the landing
    const dk = seg(t, LAND, LAND + 0.8);
    if (dk > 0 && dk < 1) {
      dust.forEach((d) => {
        const edgeX = d.side === 0 ? -pw / 2 : d.side === 1 ? pw / 2 : lerp(-pw / 2, pw / 2, d.p);
        const edgeY = d.side === 2 ? -ph / 2 : d.side === 3 ? ph / 2 : lerp(-ph / 2, ph / 2, d.p);
        const nx = d.side === 0 ? -1 : d.side === 1 ? 1 : d.drift;
        const ny = d.side === 2 ? -1 : d.side === 3 ? 1 : d.drift;
        const dist = u * 9 * d.v * E.out3(dk);
        ctx.fillStyle = `rgba(241, 232, 216, ${0.55 * (1 - dk)})`;
        ctx.fillRect(cx + edgeX + nx * dist, cy + edgeY + ny * dist, d.s, d.s);
      });
    }

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    // Fade up from black
    const up = 1 - seg(t, 0, 0.25);
    if (up > 0) { ctx.fillStyle = `rgba(0,0,0,${up})`; ctx.fillRect(0, 0, w, h); }
  }

  // The sheet catches at two corners and burns off the page.
  let frozen = null, fire = null, lastT = 0;
  function burnAway(t) {
    if (!frozen) {
      if (Number.isFinite(held)) drawScene(BURN - 0.001, false);
      frozen = document.createElement("canvas");
      frozen.width = canvas.width;
      frozen.height = canvas.height;
      frozen.getContext("2d").drawImage(canvas, 0, 0);
      root.classList.add("is-burning");
      if (window.PR_BURN) {
        const r0 = Math.hypot(w, h);
        fire = window.PR_BURN.create({
          canvas, mode: "reveal", cover: frozen, seed: 23,
          origins: [
            { x: cx + pw * 0.44, y: cy + ph * 0.46, delay: 0 },
            { x: cx - pw * 0.46, y: cy + ph * 0.44, delay: r0 * 0.1 },
            { x: w * 0.97, y: h * 0.06, delay: r0 * 0.34 }
          ]
        });
        fire.size(w, h, dpr);
      }
      lastT = t;
    }
    const p = seg(t, BURN, DUR - 0.12);
    if (p > 0.12) reveal();
    if (!fire) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1 - p;
      ctx.drawImage(frozen, 0, 0);
      ctx.globalAlpha = 1;
      return;
    }
    fire.draw((1 - Math.pow(1 - p, 1.5)) * fire.END, t, Math.max(0, Math.min(0.05, t - lastT)));
    lastT = t;
  }

  /* ---------------------------------------------------------------- */
  /* Clock                                                             */
  /* ---------------------------------------------------------------- */

  let start = 0;
  let raf = 0;
  let finished = false;
  const bar = root.querySelector(".pr-film-bar");

  const finish = () => {
    if (finished) return;
    finished = true;
    window.cancelAnimationFrame(raf);
    reveal();
    root.style.transition = "opacity 260ms ease";
    root.style.opacity = "0";
    window.setTimeout(() => {
      root.remove();
      style.remove();
      document.documentElement.classList.remove("pr-film-on");
      window.removeEventListener("resize", layout);
      // Hand every full-screen buffer back: the film is over for this page,
      // and on a 2x screen these add up to tens of megabytes.
      [canvas, paper, raw, creases, bgImg, frozen, stampImg, shadowImg && shadowImg.img].forEach((c) => { if (c) { c.width = 0; c.height = 0; } });
      paper = raw = creases = bgImg = frozen = stampImg = shadowImg = mesh = fire = vignette = null;
      resolveDone();
    }, 280);
  };

  // ?intro=1&filmt=2 holds a single frame, for checking the cut.
  const held = parseFloat((location.search.match(/[?&]filmt=([\d.]+)/) || [])[1]);

  const frame = (now) => {
    if (!start) start = now;
    const t = Number.isFinite(held) ? held : (now - start) / 1000;
    if (t >= DUR) { finish(); return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bar.style.setProperty("--p", clamp(t / DUR).toFixed(3));
    if (t >= BURN) burnAway(t);
    else drawScene(t, !Number.isFinite(held) && sheet(t).spinning && t > 0.25);
    if (Number.isFinite(held)) return;
    raf = window.requestAnimationFrame(frame);
  };

  const skip = (e) => {
    if (e) e.preventDefault();
    finish();
  };
  root.querySelector(".pr-film-skip").addEventListener("click", skip);
  root.addEventListener("pointerdown", (e) => { if (!e.target.closest(".pr-film-skip")) skip(e); });
  const onKey = (e) => {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { document.removeEventListener("keydown", onKey); skip(); }
  };
  document.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", () => { if (document.hidden) finish(); });
  // Never hold the page longer than the film itself.
  if (!Number.isFinite(held)) window.setTimeout(finish, (DUR + 2.5) * 1000);

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const go = () => {
    layout();
    window.addEventListener("resize", layout);
    raf = window.requestAnimationFrame(frame);
  };
  // The front page is set in Playfair and carries the portrait: give both a moment.
  const fonts = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('900 60px "Playfair Display"'), document.fonts.load('italic 400 30px "Playfair Display"')])
    : Promise.resolve();
  Promise.race([Promise.all([fonts, portraitReady]), new Promise((r) => window.setTimeout(r, 900))]).then(go, go);
})();

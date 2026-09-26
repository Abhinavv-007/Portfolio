/*
  The opening titles: a six second paper-cut film that plays once per visit.

  Loaded before app.js. If it decides to play, it sets window.PR_FILM and
  app.js hands the page reveal over to it: the usual burn intro is skipped
  and the page is marked "loaded" as the last frame shreds away.

  It never plays for reduced motion, never on an internal page change (the
  burn transition covers those), and only once per browser tab session.
  Tap, click, Escape or the skip button ends it at once.
*/
(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let handoff = false;
  let seen = false;
  try {
    handoff = sessionStorage.getItem("bj-handoff") === "1";
    seen = sessionStorage.getItem("bj-film") === "1";
  } catch (_) { /* storage blocked: treat as a fresh visit */ }
  const forced = /[?&]intro=1\b/.test(location.search);
  if ((reducedMotion || handoff || seen) && !forced) return;
  const canvasOk = !!document.createElement("canvas").getContext;
  if (!canvasOk) return;
  try { sessionStorage.setItem("bj-film", "1"); } catch (_) { /* noop */ }

  const DUR = 5.8;
  const SHRED = 4.75;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const E = {
    out3: (t) => 1 - Math.pow(1 - t, 3),
    in3: (t) => t * t * t,
    io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outBack: (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  };
  const C = {
    ink: "#171612",
    paper: "#efe6d6",
    paper2: "#e2d6c1",
    warm: "#c7b8a4",
    red: "#d15a35",
    red2: "#a33128",
    deep: "#5e1a15",
    shadow: "rgba(10, 8, 6, 0.38)"
  };
  const disp = (s, w = 900) => `${w} ${Math.max(1, s).toFixed(1)}px "Playfair Display", Georgia, serif`;
  const mono = (s, w = 700) => `${w} ${Math.max(1, s).toFixed(1)}px "Courier New", Courier, monospace`;

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
  root.setAttribute("aria-label", "Opening titles: Abhinav Raj, security researcher and product builder, Bugcrowd global Top 50 in June, July and September 2026");
  root.innerHTML = `
    <canvas class="pr-film-canvas" aria-hidden="true"></canvas>
    <button class="pr-film-skip" type="button">Skip intro <span aria-hidden="true">&rarr;</span></button>
    <div class="pr-film-bar" aria-hidden="true"><i></i></div>
  `;
  const style = document.createElement("style");
  style.textContent = `
    .pr-film { position: fixed; inset: 0; z-index: 6050; background: ${C.ink}; }
    .pr-film.is-shredding { background: transparent; }
    .pr-film-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    .pr-film-skip { position: absolute; right: max(1rem, env(safe-area-inset-right)); bottom: max(1rem, env(safe-area-inset-bottom)); z-index: 2;
      min-height: 2.75rem; padding: 0 1rem; border: 1px solid rgba(239, 230, 214, 0.45); border-radius: 999px;
      font: 700 0.62rem/1 "Courier New", Courier, monospace; letter-spacing: 0.18em; text-transform: uppercase;
      color: #efe6d6; background: rgba(23, 22, 18, 0.55); cursor: pointer; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
      opacity: 0; animation: prFilmIn 400ms 600ms ease forwards; }
    .pr-film-skip:focus-visible { outline: 2px solid ${C.red}; outline-offset: 3px; }
    .pr-film.is-shredding .pr-film-skip, .pr-film.is-shredding .pr-film-bar { opacity: 0 !important; transition: opacity 200ms ease; }
    .pr-film-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: rgba(239, 230, 214, 0.12); }
    .pr-film-bar i { display: block; height: 100%; background: ${C.red}; transform-origin: 0 50%; transform: scaleX(var(--p, 0)); }
    @keyframes prFilmIn { to { opacity: 1; } }
  `;
  document.head.appendChild(style);
  document.body.appendChild(root);
  document.documentElement.classList.add("pr-film-on");

  const canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, u = 1, P = false, dpr = 1;
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    u = Math.min(w, h) / 100;
    P = h > w * 1.05;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    if (window.PR_FILM && typeof window.PR_FILM.onReveal === "function") window.PR_FILM.onReveal();
  };
  window.PR_FILM = { done, onReveal: null };

  /* ---------------------------------------------------------------- */
  /* Drawing                                                           */
  /* ---------------------------------------------------------------- */

  function blob(cx, cy, r, seed, wob, rot) {
    ctx.beginPath();
    const n = 72;
    for (let i = 0; i <= n; i += 1) {
      const a = (i / n) * TAU + rot;
      const k = 1 + wob * (Math.sin(a * 5 + seed) * 0.6 + Math.sin(a * 9 + seed * 2.3) * 0.4);
      const x = cx + Math.cos(a) * r * k;
      const y = cy + Math.sin(a) * r * k * (P ? 1.15 : 0.92);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  // The first cut: a hot line across the black sheet, then the halves part.
  function drawSlash(t) {
    const p = E.out3(seg(t, 0.08, 0.34));
    const part = E.outExpo(seg(t, 0.36, 0.95));
    const ax = -w * 0.1, ay = h * 0.18, bx = w * 1.1, by = h * 0.82;
    const nx = -(by - ay), ny = bx - ax;
    const nl = Math.hypot(nx, ny);
    const ox = (nx / nl) * part * Math.hypot(w, h) * 0.6;
    const oy = (ny / nl) * part * Math.hypot(w, h) * 0.6;
    [[1, -1], [-1, 1]].forEach(([sa]) => {
      ctx.save();
      ctx.translate(sa * ox, sa * oy);
      ctx.beginPath();
      if (sa > 0) { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(w * 2, h * 2); ctx.lineTo(-w, h * 2); ctx.lineTo(-w, ay); }
      else { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(w * 2, by); ctx.lineTo(w * 2, -h); ctx.lineTo(-w, -h); ctx.lineTo(-w, ay); }
      ctx.closePath();
      ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
      ctx.shadowBlur = u * 3;
      ctx.fillStyle = C.ink;
      ctx.fill();
      ctx.restore();
    });
    if (part < 0.05) {
      const x = lerp(ax, bx, p), y = lerp(ay, by, p);
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(209, 90, 53, 0.55)";
      ctx.lineWidth = u * 1.8;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(x, y); ctx.stroke();
      ctx.strokeStyle = "#fff1dc";
      ctx.lineWidth = u * 0.35;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(x, y); ctx.stroke();
      if (p < 1) {
        ctx.fillStyle = "#fff1dc";
        ctx.beginPath(); ctx.arc(x, y, u * 1.2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  // Flying through layers of cut paper.
  const TONES = [C.deep, C.red2, C.red, "#e0845c", C.warm, C.paper2, C.paper];
  function drawTunnel(t) {
    const lt = t - 0.3;
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = C.deep;
    ctx.fillRect(0, 0, w, h);
    const zoom = Math.pow(1.85, lt * 2.3);
    const maxR = Math.hypot(w, h) * 0.75;
    const layers = [];
    for (let i = 0; i < 14; i += 1) {
      const r = u * 3 * Math.pow(1.55, i) * zoom;
      if (r < u * 1.5 || r > maxR * 6) continue;
      layers.push({ i, r });
    }
    layers.sort((a, b) => b.r - a.r);
    layers.forEach(({ i, r }) => {
      const tone = TONES[i % TONES.length];
      const rot = i * 0.7 + lt * (i % 2 ? 0.35 : -0.25);
      ctx.save();
      blob(cx + u * 0.9, cy + u * 1.4, r, i * 1.7, 0.07, rot);
      ctx.fillStyle = C.shadow;
      ctx.fill();
      blob(cx, cy, r, i * 1.7, 0.07, rot);
      ctx.fillStyle = tone;
      ctx.fill();
      ctx.restore();
    });
    // The final sheet opens up to cover everything.
    const flood = seg(t, 1.95, 2.3);
    if (flood > 0) {
      ctx.save();
      blob(cx, cy, maxR * 1.4 * E.in3(flood), 3, 0.05, t);
      ctx.fillStyle = C.paper;
      ctx.fill();
      ctx.restore();
    }
  }

  function sticker(str, x, y, size, rot, fill, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.font = disp(size);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.fillStyle = C.shadow;
    ctx.fillText(str, size * 0.05, size * 0.08);
    ctx.strokeStyle = "#fbf6ec";
    ctx.lineWidth = size * 0.12;
    ctx.strokeText(str, 0, 0);
    ctx.fillStyle = fill;
    ctx.fillText(str, 0, 0);
    ctx.restore();
  }

  function ribbon(label, cy, fromLeft, t0, t, color, textColor, rot) {
    const p = E.outExpo(seg(t, t0, t0 + 0.55));
    if (p <= 0) return;
    ctx.save();
    ctx.font = mono(u * (P ? 2.6 : 2.3));
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${u * 0.6}px`;
    const tw = ctx.measureText(label).width;
    const bw = tw + u * 10, bh = u * (P ? 6.4 : 5.6);
    const x = fromLeft ? lerp(-bw, w / 2 - bw / 2, p) : lerp(w, w / 2 - bw / 2, p);
    ctx.translate(x + bw / 2, cy);
    ctx.rotate(rot);
    const notch = bh * 0.45;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(-bw / 2, -bh / 2);
      ctx.lineTo(bw / 2, -bh / 2);
      ctx.lineTo(bw / 2 - notch, 0);
      ctx.lineTo(bw / 2, bh / 2);
      ctx.lineTo(-bw / 2, bh / 2);
      ctx.lineTo(-bw / 2 + notch, 0);
      ctx.closePath();
    };
    ctx.save(); ctx.translate(u * 0.6, u * 0.9); path(); ctx.fillStyle = C.shadow; ctx.fill(); ctx.restore();
    path();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, u * 0.2);
    ctx.restore();
  }

  function seal(x, y, R, p, t) {
    if (p <= 0) return;
    const s = lerp(2.6, 1, E.outBack(clamp(p)));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.22 + t * 0.15);
    ctx.scale(s, s);
    ctx.globalAlpha = clamp(p * 3);
    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.arc(u * 0.6, u * 0.9, R, 0, TAU); ctx.fill();
    // Scalloped paper rosette
    ctx.beginPath();
    for (let i = 0; i <= 48; i += 1) {
      const a = (i / 48) * TAU;
      const r = R * (i % 2 ? 0.93 : 1);
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = C.red;
    ctx.fill();
    ctx.strokeStyle = "#fbf6ec";
    ctx.lineWidth = R * 0.03;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, TAU); ctx.stroke();
    ctx.fillStyle = "#fbf6ec";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = mono(R * 0.14);
    ctx.fillText("BUGCROWD", 0, -R * 0.42);
    ctx.font = disp(R * 0.5);
    ctx.fillText("TOP 50", 0, R * 0.02);
    ctx.font = mono(R * 0.12);
    ctx.fillText("JUN · JUL · SEP", 0, R * 0.4);
    ctx.restore();
  }

  const confetti = (() => {
    const r = rng(11);
    return Array.from({ length: 60 }, () => ({ a: r() * TAU, v: 20 + r() * 45, spin: 3 + r() * 9, c: r() }));
  })();

  // A torn strip of paper sliding in from the top or bottom edge.
  function tornBand(depth, color, fromTop, p, seed) {
    if (p <= 0) return;
    const r = rng(seed);
    const d = depth * E.outExpo(p);
    const edge = [];
    for (let x = -u * 2; x <= w + u * 4; x += u * (1.2 + r() * 2.2)) edge.push([x, d + (r() - 0.5) * u * 2.4]);
    const draw = (ox, oy) => {
      ctx.beginPath();
      if (fromTop) {
        ctx.moveTo(-u * 2 + ox, -u + oy);
        edge.forEach(([x, y]) => ctx.lineTo(x + ox, y + oy));
        ctx.lineTo(w + u * 4 + ox, -u + oy);
      } else {
        ctx.moveTo(-u * 2 + ox, h + u + oy);
        edge.forEach(([x, y]) => ctx.lineTo(x + ox, h - y + oy));
        ctx.lineTo(w + u * 4 + ox, h + u + oy);
      }
      ctx.closePath();
    };
    draw(u * 0.5, fromTop ? u * 0.9 : -u * 0.9);
    ctx.fillStyle = C.shadow;
    ctx.fill();
    draw(0, 0);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawTitle(t) {
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, w, h);
    // Soft paper grain dots
    ctx.fillStyle = "rgba(23, 22, 18, 0.05)";
    const step = u * 4;
    for (let x = (t * u * 3) % step; x < w; x += step) {
      for (let y = 0; y < h; y += step) ctx.fillRect(x, y, u * 0.3, u * 0.3);
    }
    // A cut-paper sun rising behind the name
    const sun = E.outBack(seg(t, 2.2, 2.9));
    if (sun > 0) {
      ctx.save();
      blob(w / 2 + u, h * 0.46 + u * 1.4, u * (P ? 34 : 30) * sun, 9, 0.04, t * 0.3);
      ctx.fillStyle = "rgba(10, 8, 6, 0.12)";
      ctx.fill();
      blob(w / 2, h * 0.46, u * (P ? 34 : 30) * sun, 9, 0.04, t * 0.3);
      ctx.fillStyle = C.paper2;
      ctx.fill();
      ctx.restore();
    }
    tornBand(u * (P ? 13 : 11), C.red, true, seg(t, 2.3, 2.8), 5);
    tornBand(u * (P ? 8 : 7), C.ink, true, seg(t, 2.4, 2.9), 8);
    tornBand(u * (P ? 12 : 10), C.ink, false, seg(t, 2.35, 2.85), 13);
    tornBand(u * (P ? 7 : 6), C.red2, false, seg(t, 2.45, 2.95), 21);
    const lines = P ? ["ABHINAV", "RAJ"] : ["ABHINAV RAJ"];
    ctx.font = disp(100);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const size = Math.min(u * (P ? 30 : 22), (100 * w * 0.82) / widest);
    const shake = u * 1.2 * (1 - seg(t, 3.55, 3.8)) * (t > 3.55 ? 1 : 0);
    ctx.save();
    ctx.translate(Math.sin(t * 90) * shake, Math.cos(t * 70) * shake);
    const baseY = P ? h * 0.42 : h * 0.55;
    let k = 0;
    lines.forEach((l, li) => {
      ctx.font = disp(size);
      const total = ctx.measureText(l).width;
      let x = w / 2 - total / 2;
      const y = baseY + (li - (lines.length - 1) / 2) * size * 0.95;
      Array.from(l).forEach((ch) => {
        const cw = ctx.measureText(ch).width;
        if (ch !== " ") {
          const t0 = 2.3 + k * 0.065;
          const p = seg(t, t0, t0 + 0.5);
          const r = rng(31 + k * 7);
          const fall = E.outBack(p);
          const yy = lerp(-h * 0.25 - r() * h * 0.3, y, fall);
          const rot = lerp((r() - 0.5) * 1.6, (r() - 0.5) * 0.06, E.out3(p));
          if (p > 0) sticker(ch, x + cw / 2, yy, size, rot, k % 5 === 2 ? C.red2 : C.ink);
          k += 1;
        }
        x += cw;
      });
    });
    ctx.restore();
    const under = baseY + (lines.length / 2) * size * 0.95 + u * (P ? 8 : 6);
    ribbon("SECURITY RESEARCHER", under, true, 2.95, t, C.red, "#fbf6ec", -0.035);
    ribbon("PRODUCT BUILDER", under + u * (P ? 9 : 7.5), false, 3.15, t, C.ink, "#fbf6ec", 0.025);
    const R = u * (P ? 16 : 12);
    const sx = P ? w * 0.7 : w * 0.86, sy = P ? h * 0.22 : h * 0.26;
    seal(sx, sy, R, seg(t, 3.5, 3.78), t);
    // Paper confetti off the seal
    const lt = t - 3.55;
    if (lt > 0 && lt < 1.4) {
      confetti.forEach((c, i) => {
        const x = sx + Math.cos(c.a) * u * c.v * lt;
        const y = sy + Math.sin(c.a) * u * c.v * lt + u * 60 * lt * lt;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(lt * c.spin);
        ctx.globalAlpha = 1 - seg(lt, 0.8, 1.4);
        ctx.fillStyle = c.c > 0.66 ? C.red : c.c > 0.33 ? C.ink : C.warm;
        ctx.fillRect(-u * 0.8, -u * 0.4, u * 1.6, u * 0.8);
        ctx.restore();
      });
    }
    // Folio line along the bottom
    const f = seg(t, 3.8, 4.4);
    if (f > 0) {
      ctx.save();
      ctx.font = mono(u * 1.9, 400);
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${u * 0.5}px`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(23, 22, 18, 0.6)";
      const str = "THE BUILD JOURNAL  ·  VOL. 2  ·  ABHNV.IN";
      ctx.fillStyle = "#fbf6ec";
      ctx.fillText(str.slice(0, Math.round(str.length * f)), w / 2, h - u * (P ? 4.5 : 3.6));
      ctx.restore();
    }
  }

  let frozen = null;
  function drawShred(t) {
    if (!frozen) {
      frozen = document.createElement("canvas");
      frozen.width = canvas.width;
      frozen.height = canvas.height;
      frozen.getContext("2d").drawImage(canvas, 0, 0);
      root.classList.add("is-shredding");
      reveal();
    }
    ctx.clearRect(0, 0, w, h);
    const n = P ? 11 : 9;
    const sh = h / n;
    for (let i = 0; i < n; i += 1) {
      const p = E.inExpo(seg(t, SHRED + i * 0.045, SHRED + 0.62 + i * 0.045));
      const dir = i % 2 ? 1 : -1;
      const dx = dir * p * (w * 1.2);
      ctx.save();
      ctx.translate(dx, 0);
      ctx.rotate(dir * p * 0.04);
      // Torn bottom edge on each strip
      ctx.beginPath();
      ctx.moveTo(0, i * sh);
      ctx.lineTo(w, i * sh);
      for (let x = w; x >= 0; x -= u * 3) ctx.lineTo(x, (i + 1) * sh + ((x / (u * 3)) % 2 ? u * 0.5 : -u * 0.3));
      ctx.closePath();
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
      ctx.shadowBlur = u * 2;
      ctx.fillStyle = C.paper;
      ctx.fill();
      ctx.restore();
      ctx.clip();
      ctx.drawImage(frozen, 0, 0, frozen.width, frozen.height, 0, 0, w, h);
      ctx.restore();
    }
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
      window.removeEventListener("resize", resize);
      resolveDone();
    }, 280);
  };

  // ?intro=1&filmt=2.5 holds a single frame, for checking the cut.
  const held = parseFloat((location.search.match(/[?&]filmt=([\d.]+)/) || [])[1]);
  const frame = (now) => {
    if (!start) start = now;
    const t = Number.isFinite(held) ? held : (now - start) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bar.style.setProperty("--p", clamp(t / DUR).toFixed(3));
    if (t < SHRED) {
      if (t < 2.3) {
        drawTunnel(t);
        if (t < 0.95) drawSlash(t);
      } else {
        drawTitle(t);
      }
      // Hand-off flash between the tunnel and the title card
      const flash = 1 - Math.abs(seg(t, 2.18, 2.42) * 2 - 1);
      if (flash > 0) { ctx.fillStyle = `rgba(255, 250, 238, ${flash * 0.6})`; ctx.fillRect(0, 0, w, h); }
    } else if (t < DUR) {
      drawShred(t);
    } else {
      finish();
      return;
    }
    if (Number.isFinite(held) && frozen === null && t >= SHRED) return;
    raf = window.requestAnimationFrame(frame);
  };

  const skip = (e) => {
    if (e) e.preventDefault();
    finish();
  };
  root.querySelector(".pr-film-skip").addEventListener("click", skip);
  root.addEventListener("pointerdown", (e) => { if (!e.target.closest(".pr-film-skip")) skip(e); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip(); }, { once: true });
  document.addEventListener("visibilitychange", () => { if (document.hidden) finish(); });
  // Never hold the page longer than the film itself.
  if (!Number.isFinite(held)) window.setTimeout(finish, (DUR + 2) * 1000);

  const go = () => { raf = window.requestAnimationFrame(frame); };
  // Give the display face a moment so the title is set in Playfair, not Georgia.
  if (document.fonts && document.fonts.load) {
    Promise.race([
      document.fonts.load('900 60px "Playfair Display"'),
      new Promise((r) => window.setTimeout(r, 450))
    ]).then(go, go);
  } else {
    go();
  }
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
})();

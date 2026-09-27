/*
  The reel: motion graphics for abhnv.in, drawn live.

  A tiny timeline engine and a player. Each film is a list of scenes; each
  scene is a pure function of time, so the player can loop, pause, scrub
  and seek to any frame. Nothing is pre-rendered: the films stay sharp on
  any screen, react to the pointer, and cost a few kilobytes instead of
  megabytes of video.

    1. Engine: easing, drawing helpers, palette
    2. Reel 01, the showreel (home page)
    3. Case films, one per product
    4. Player (transport, chapters, scrubbing, sound cues, autoplay)
*/
(function () {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const data = window.PORTFOLIO || {};
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EMAIL = (data.profile && data.profile.email) || "abhnv@abhnv.in";
  const sound = (name) => { try { window.PRESS_SOUND && window.PRESS_SOUND.play(name); } catch (_) { /* optional */ } };

  /* ------------------------------------------------------------------ */
  /* 1. Engine                                                           */
  /* ------------------------------------------------------------------ */

  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const E = {
    out2: (t) => 1 - (1 - t) * (1 - t),
    out3: (t) => 1 - Math.pow(1 - t, 3),
    in3: (t) => t * t * t,
    io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    outBack: (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1)
  };

  const C = {
    ink: "#171612",
    ink2: "#24211c",
    paper: "#eadfce",
    paper2: "#d9ceba",
    red: "#d15a35",
    red2: "#a33128",
    green: "#7c9a6a",
    dim: "rgba(234, 223, 206, 0.5)",
    faint: "rgba(234, 223, 206, 0.16)",
    inkDim: "rgba(23, 22, 18, 0.5)",
    inkFaint: "rgba(23, 22, 18, 0.12)",
    cyan: "rgba(0, 150, 214, 0.85)",
    mag: "rgba(214, 0, 112, 0.8)",
    yel: "rgba(242, 183, 5, 0.9)"
  };

  const F = {
    disp: (s, w = 900, style = "") => `${style} ${w} ${Math.max(1, s).toFixed(1)}px "Playfair Display", Georgia, serif`,
    mono: (s, w = 400) => `${w} ${Math.max(1, s).toFixed(1)}px "Courier New", Courier, monospace`,
    body: (s, style = "") => `${style} ${Math.max(1, s).toFixed(1)}px Georgia, serif`
  };

  function text(ctx, str, x, y, o = {}) {
    ctx.save();
    ctx.font = o.font || F.mono(12);
    ctx.textAlign = o.align || "center";
    ctx.textBaseline = o.base || "middle";
    if (o.ls != null && "letterSpacing" in ctx) ctx.letterSpacing = `${o.ls}px`;
    if (o.alpha != null) ctx.globalAlpha *= clamp(o.alpha);
    if (o.stroke) {
      ctx.strokeStyle = o.stroke;
      ctx.lineWidth = o.lw || 1;
      ctx.lineJoin = "round";
      ctx.strokeText(str, x, y);
    }
    if (o.color !== null && !(o.stroke && !o.color)) {
      ctx.fillStyle = o.color || C.paper;
      ctx.fillText(str, x, y);
    }
    ctx.restore();
  }

  function measure(ctx, str, font, ls = 0) {
    ctx.save();
    ctx.font = font;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${ls}px`;
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  }

  // Largest font size (from a font factory) that fits `str` in `maxW`.
  function fit(ctx, str, fontAt, maxW, maxSize) {
    const w = measure(ctx, str, fontAt(100));
    return Math.min(maxSize, (100 * maxW) / Math.max(1, w));
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, TAU);
  }

  function line(ctx, x1, y1, x2, y2, color, lw = 1, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  const qb = (a, c, b, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;
  const bez = (p0, c, p1, t) => [qb(p0[0], c[0], p1[0], t), qb(p0[1], c[1], p1[1], t)];

  function curve(ctx, p0, c, p1, color, lw, dash, upto = 1) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    const steps = 28;
    for (let i = 1; i <= steps * upto; i += 1) {
      const p = bez(p0, c, p1, i / steps);
      ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
    ctx.restore();
  }

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };
  }

  // A rubber stamp: rounded box, rotated, scaled in with overshoot.
  function stamp(ctx, label, x, y, size, p, o = {}) {
    if (p <= 0) return;
    const s = lerp(2.4, 1, E.outBack(clamp(p)));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot ?? -0.14);
    ctx.scale(s, s);
    ctx.globalAlpha *= clamp(p * 3) * (o.alpha ?? 0.95);
    ctx.font = F.disp(size, 900);
    const w = ctx.measureText(label).width + size * 0.9;
    const h = size * 1.45;
    ctx.strokeStyle = o.color || C.red;
    ctx.lineWidth = Math.max(2, size * 0.09);
    rrect(ctx, -w / 2, -h / 2, w, h, size * 0.18);
    ctx.stroke();
    text(ctx, label, 0, size * 0.04, { font: F.disp(size, 900), color: o.color || C.red });
    if (o.sub) text(ctx, o.sub, 0, h / 2 + size * 0.45, { font: F.mono(size * 0.32, 700), color: o.color || C.red, ls: size * 0.06 });
    ctx.restore();
  }

  // Everything below draws in "u": one hundredth of the short side.
  function frame(ctx, e, color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, e.w, e.h);
  }

  function dotGrid(ctx, e, color, step = 6) {
    ctx.save();
    ctx.fillStyle = color;
    const s = e.u * step;
    const ox = (e.px * e.u * 3) % s;
    const oy = (e.py * e.u * 3) % s;
    for (let x = ox; x < e.w; x += s) {
      for (let y = oy; y < e.h; y += s) ctx.fillRect(x, y, e.u * 0.28, e.u * 0.28);
    }
    ctx.restore();
  }

  // Clear of the player's HUD, which sits over the top edge.
  const TOP = (e) => (e.P ? e.u * 13 : e.u * 7.5);

  function label(ctx, str, x, y, e, o = {}) {
    text(ctx, str.toUpperCase(), x, y, { font: F.mono(o.size || e.u * 2.1, o.weight || 400), color: o.color || C.dim, ls: e.u * 0.35, align: o.align || "center", alpha: o.alpha });
  }

  function typed(str, p) {
    return str.slice(0, Math.round(str.length * clamp(p)));
  }

  function padlock(ctx, x, y, s, color, closed = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = s * 0.14;
    ctx.beginPath();
    ctx.arc(0, -s * 0.2 - (1 - closed) * s * 0.3, s * 0.3, Math.PI, 0);
    ctx.stroke();
    rrect(ctx, -s * 0.45, -s * 0.2, s * 0.9, s * 0.7, s * 0.1);
    ctx.fill();
    ctx.restore();
  }

  function envelope(ctx, x, y, w, color, flap = C.ink) {
    const h = w * 0.64;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    rrect(ctx, -w / 2, -h / 2, w, h, w * 0.05);
    ctx.fill();
    ctx.strokeStyle = flap;
    ctx.lineWidth = Math.max(1, w * 0.04);
    ctx.beginPath();
    ctx.moveTo(-w / 2 + w * 0.06, -h / 2 + h * 0.1);
    ctx.lineTo(0, h * 0.08);
    ctx.lineTo(w / 2 - w * 0.06, -h / 2 + h * 0.1);
    ctx.stroke();
    ctx.restore();
  }

  function fileIcon(ctx, x, y, s, color, fold = C.ink) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-s * 0.36, -s * 0.5);
    ctx.lineTo(s * 0.14, -s * 0.5);
    ctx.lineTo(s * 0.36, -s * 0.28);
    ctx.lineTo(s * 0.36, s * 0.5);
    ctx.lineTo(-s * 0.36, s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = fold;
    ctx.globalAlpha *= 0.35;
    ctx.fillRect(-s * 0.22, -s * 0.12, s * 0.44, s * 0.05);
    ctx.fillRect(-s * 0.22, s * 0.02, s * 0.44, s * 0.05);
    ctx.fillRect(-s * 0.22, s * 0.16, s * 0.3, s * 0.05);
    ctx.restore();
  }

  function check(ctx, x, y, s, color, p = 1) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.18;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const pts = [[-0.4, 0], [-0.1, 0.3], [0.45, -0.35]];
    ctx.moveTo(x + pts[0][0] * s, y + pts[0][1] * s);
    const k = clamp(p) * 2;
    if (k > 0) ctx.lineTo(x + lerp(pts[0][0], pts[1][0], clamp(k)) * s, y + lerp(pts[0][1], pts[1][1], clamp(k)) * s);
    if (k > 1) ctx.lineTo(x + lerp(pts[1][0], pts[2][0], k - 1) * s, y + lerp(pts[1][1], pts[2][1], k - 1) * s);
    ctx.stroke();
    ctx.restore();
  }

  function cross(ctx, x, y, s, color, p = 1) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.2;
    ctx.lineCap = "round";
    const a = clamp(p * 2), b = clamp(p * 2 - 1);
    ctx.beginPath();
    ctx.moveTo(x - s / 2, y - s / 2);
    ctx.lineTo(x - s / 2 + s * a, y - s / 2 + s * a);
    if (b > 0) {
      ctx.moveTo(x + s / 2, y - s / 2);
      ctx.lineTo(x + s / 2 - s * b, y - s / 2 + s * b);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Scene transitions: the incoming scene is clipped into view.
  const TRANSITIONS = {
    iris(ctx, e, p) {
      const r = Math.hypot(e.w, e.h) * 0.55 * E.io3(p);
      circle(ctx, e.w / 2, e.h / 2, r);
      ctx.clip();
    },
    wipe(ctx, e, p) {
      const x = lerp(-e.w * 0.3, e.w * 1.3, E.io3(p));
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      ctx.lineTo(x + e.h * 0.3, -10);
      ctx.lineTo(x - e.h * 0.3, e.h + 10);
      ctx.lineTo(-10, e.h + 10);
      ctx.closePath();
      ctx.clip();
    },
    slice(ctx, e, p) {
      const n = 7;
      const bh = e.h / n;
      ctx.beginPath();
      for (let i = 0; i < n; i += 1) {
        const q = E.out3(clamp(p * 1.6 - i * 0.08));
        const w = e.w * q;
        ctx.rect(i % 2 ? e.w - w : 0, i * bh, w, bh + 1);
      }
      ctx.clip();
    },
    blinds(ctx, e, p) {
      const n = 10;
      const bw = e.w / n;
      ctx.beginPath();
      for (let i = 0; i < n; i += 1) {
        const q = E.out3(clamp(p * 1.5 - i * 0.05));
        ctx.rect(i * bw, 0, bw * q + 1, e.h);
      }
      ctx.clip();
    }
  };

  /* ------------------------------------------------------------------ */
  /* 2. Reel 01: the showreel                                            */
  /* ------------------------------------------------------------------ */

  const products = (data.projects || []).map((p) => ({
    title: p.title,
    label: p.label || p.type || "",
    domain: String(p.liveUrl || "").replace(/^https?:\/\//, "").replace(/\/$/, "")
  }));

  const MANIFESTO = [
    ["Most", 0], ["bugs", 0], ["are a", 0], ["server", 1], ["trusting", 0],
    ["a number", 1], ["it should", 0], ["have", 0], ["checked", 1]
  ];

  function manifesto(ctx, t, e) {
    const { w, h, u } = e;
    frame(ctx, e, C.paper);
    dotGrid(ctx, e, C.inkFaint, 5);
    const D = 0.5;
    const k = clamp(Math.floor((t - 0.15) / D), 0, MANIFESTO.length - 1);
    const wl = t - 0.15 - k * D;
    const shake = u * 1.1 * (1 - seg(wl, 0, 0.26));
    const sx = Math.sin(wl * 90) * shake;
    const sy = Math.cos(wl * 77) * shake;
    ctx.save();
    ctx.translate(sx, sy);
    const cy = h * 0.52;
    // The line so far, set small above the hero word.
    const done = MANIFESTO.slice(0, k).map((x) => x[0]).join(" ");
    if (done) {
      const sz = fit(ctx, done, (s) => F.disp(s, 400, "italic"), w * 0.84, u * 5);
      text(ctx, done, w / 2, cy - u * (e.P ? 24 : 21), { font: F.disp(sz, 400, "italic"), color: C.inkDim });
    }
    const [word, hot] = MANIFESTO[k];
    const WORD = word.toUpperCase();
    const size = fit(ctx, WORD, (s) => F.disp(s), w * 0.86, u * (e.P ? 34 : 30));
    const s = lerp(1.9, 1, E.outExpo(seg(wl, 0, 0.22)));
    const color = hot ? C.red2 : C.ink;
    for (let g = 3; g >= 1; g -= 1) {
      const gs = s + g * 0.1 * (1 - seg(wl, 0, 0.3));
      ctx.save();
      ctx.translate(w / 2 + e.px * u * g * 2, cy + e.py * u * g * 2);
      ctx.scale(gs, gs);
      text(ctx, WORD, 0, 0, { font: F.disp(size), color, alpha: 0.08 });
      ctx.restore();
    }
    ctx.save();
    ctx.translate(w / 2, cy);
    ctx.scale(s, s);
    text(ctx, WORD, 0, 0, { font: F.disp(size), color });
    ctx.restore();
    if (k === MANIFESTO.length - 1) {
      const p = E.io3(seg(wl, 0.35, 0.9));
      const ww = measure(ctx, WORD, F.disp(size));
      ctx.save();
      ctx.strokeStyle = C.red;
      ctx.lineWidth = u * 1.1;
      ctx.lineCap = "round";
      ctx.beginPath();
      const x0 = w / 2 - ww / 2;
      const y0 = cy + size * 0.42;
      for (let i = 0; i <= 40 * p; i += 1) {
        const x = x0 + (ww * i) / 40;
        const y = y0 + Math.sin(i * 0.5) * u * 0.5;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    label(ctx, "Manifesto · from the front page", w / 2, TOP(e), e, { color: C.inkDim });
    label(ctx, `${String(k + 1).padStart(2, "0")} / ${String(MANIFESTO.length).padStart(2, "0")}`, w / 2, h - u * 7, e, { color: C.red2 });
  }

  function request(ctx, t, e) {
    const { w, h, u, P } = e;
    frame(ctx, e, C.ink);
    dotGrid(ctx, e, "rgba(234, 223, 206, 0.07)");
    const pos = P
      ? { ava: [0.27, 0.2], ben: [0.73, 0.2], srv: [0.5, 0.62] }
      : { ava: [0.18, 0.3], ben: [0.18, 0.7], srv: [0.68, 0.5] };
    const pt = (k) => [pos[k][0] * w + e.px * u * 3, pos[k][1] * h + e.py * u * 3];
    const ava = pt("ava"), ben = pt("ben"), srv = pt("srv");
    const sw = u * (P ? 44 : 34), sh = u * (P ? 30 : 38);
    const on = seg(t, 3.85, 4.15);
    const rewinding = t > 3.2 && t < 3.8;
    const leak = t > 2.1 && t < 3.25;

    // Accounts
    [["A", ava, "Ava · owns invoice 1041"], ["B", ben, "Ben · the other account"]].forEach(([letter, p, name], i) => {
      const sp = E.outBack(seg(t, 0.05 + i * 0.12, 0.5 + i * 0.12));
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.scale(sp, sp);
      ctx.fillStyle = letter === "B" && leak ? C.red2 : C.ink2;
      circle(ctx, 0, 0, u * 6.5);
      ctx.fill();
      ctx.strokeStyle = C.paper;
      ctx.lineWidth = u * 0.35;
      ctx.stroke();
      text(ctx, letter, 0, u * 0.4, { font: F.disp(u * 7), color: C.paper });
      ctx.restore();
      label(ctx, name, p[0], p[1] + u * 10.5, e, { size: u * 1.9, alpha: sp });
    });

    // Server
    const sp = E.out3(seg(t, 0.25, 0.7));
    ctx.save();
    ctx.globalAlpha = sp;
    ctx.fillStyle = leak ? "rgba(163, 49, 40, 0.28)" : C.ink2;
    rrect(ctx, srv[0] - sw / 2, srv[1] - sh / 2, sw, sh, u * 1.2);
    ctx.fill();
    ctx.strokeStyle = leak ? C.red : C.paper;
    ctx.lineWidth = u * 0.35;
    ctx.stroke();
    ctx.restore();
    label(ctx, "API server", srv[0], srv[1] - sh / 2 + u * 4, e, { alpha: sp, color: C.paper });
    text(ctx, "GET /invoices/:id", srv[0], srv[1] - sh / 2 + u * 9, { font: F.mono(u * 2.3), color: C.dim, alpha: sp });
    // The ownership switch
    const pw = u * 8, ph = u * 4;
    const px = srv[0] - pw / 2, py = srv[1] + sh / 2 - u * 9;
    ctx.save();
    ctx.globalAlpha = sp;
    ctx.fillStyle = on > 0.5 ? C.green : "rgba(234, 223, 206, 0.2)";
    rrect(ctx, px, py, pw, ph, ph / 2);
    ctx.fill();
    ctx.fillStyle = C.paper;
    circle(ctx, px + ph / 2 + (pw - ph) * E.outBack(on), py + ph / 2, ph * 0.38);
    ctx.fill();
    ctx.restore();
    label(ctx, on > 0.5 ? "Ownership check · on" : "Ownership check · off", srv[0], py + ph + u * 2.6, e, { size: u * 1.8, alpha: sp, color: on > 0.5 ? C.paper : C.dim });

    // The gate on the side facing the accounts
    const gate = P ? [srv[0] - sw * 0.3, srv[1] - sh / 2, srv[0] + sw * 0.3, srv[1] - sh / 2]
      : [srv[0] - sw / 2, srv[1] - sh * 0.3, srv[0] - sw / 2, srv[1] + sh * 0.3];
    if (on > 0) line(ctx, gate[0], gate[1], lerp(gate[0], gate[2], on), lerp(gate[1], gate[3], on), C.red, u * 1.1);

    // Packets
    const entry = P ? [srv[0], srv[1] - sh / 2] : [srv[0] - sw / 2, srv[1]];
    const ctrl = P ? [(ben[0] + entry[0]) / 2 + u * 14, (ben[1] + entry[1]) / 2] : [(ben[0] + entry[0]) / 2, ben[1] + u * 2];
    const chip = (p, str, color) => {
      const [x, y] = bez(ben, ctrl, entry, p);
      const f = F.mono(u * 1.9, 700);
      const tw = measure(ctx, str, f) + u * 3;
      ctx.save();
      ctx.fillStyle = color;
      rrect(ctx, x - tw / 2, y - u * 2.2, tw, u * 4.4, u * 0.8);
      ctx.fill();
      ctx.restore();
      text(ctx, str, x, y + u * 0.1, { font: f, color: C.ink });
    };
    const trail = (upto) => curve(ctx, ben, ctrl, entry, "rgba(234, 223, 206, 0.35)", u * 0.3, [u, u], upto);
    if (t > 0.7 && t < 2.2) { const p = E.io3(seg(t, 0.7, 1.8)); trail(p); chip(p, "GET /invoices/1041", C.paper); }
    if (t > 4.15 && t < 5.7) {
      const go = E.io3(seg(t, 4.15, 5.0));
      const back = E.outBack(seg(t, 5.0, 5.5));
      const p = t < 5.0 ? go : lerp(0.97, 0.72, back);
      trail(Math.min(go, 1));
      chip(p, "GET /invoices/1041", C.paper);
    }
    // The leaked invoice (and its rewind)
    if (leak || rewinding) {
      const q = leak ? E.out3(seg(t, 2.1, 2.8)) : 1 - E.io3(seg(t, 3.25, 3.75));
      const [x, y] = bez(entry, ctrl, ben, q);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((1 - q) * 0.4);
      ctx.fillStyle = C.paper;
      rrect(ctx, -u * 7, -u * 4.5, u * 14, u * 9, u * 0.6);
      ctx.fill();
      text(ctx, "INVOICE 1041", 0, -u * 2, { font: F.mono(u * 1.7, 700), color: C.ink });
      text(ctx, "Owner: Ava", 0, u * 1.2, { font: F.disp(u * 2.4, 400, "italic"), color: C.red2 });
      ctx.restore();
      if (leak && t > 2.6) {
        const blink = Math.floor(t * 8) % 2;
        text(ctx, "LEAKED", ben[0] + (P ? 0 : u * 22), ben[1] + (P ? u * 17 : 0), { font: F.disp(u * 5), color: blink ? C.red : C.paper });
      }
    }
    if (rewinding) {
      ctx.save();
      ctx.fillStyle = "rgba(234, 223, 206, 0.06)";
      for (let y = (t * 900) % (u * 3); y < h; y += u * 3) ctx.fillRect(0, y, w, u * 0.6);
      ctx.restore();
      text(ctx, "◀◀  REWIND", w / 2, h * 0.5, { font: F.mono(u * 4, 700), color: C.paper, ls: u });
    }
    // The fix, typed
    if (t > 3.85) {
      const code = P ? "owner_id === user.id || forbid()" : "if (invoice.owner_id !== session.user_id) return forbid()";
      const f = F.mono(u * (P ? 2.4 : 2.2));
      text(ctx, typed(code, seg(t, 3.9, 4.9)) + (t < 4.9 && Math.floor(t * 6) % 2 ? "▍" : ""), w / 2, h - u * (P ? 9 : 8), { font: f, color: C.green });
    }
    stamp(ctx, "403 FORBIDDEN", srv[0], srv[1] - u * 1, u * (P ? 5 : 4.6), seg(t, 5.3, 5.62), { sub: "blocked by one check" });
    if (t > 5.9) {
      const s = fit(ctx, "One line of code, and the bug does not exist", (z) => F.disp(z, 400, "italic"), w * 0.86, u * 4);
      text(ctx, "One line of code, and the bug does not exist", w / 2, TOP(e), { font: F.disp(s, 400, "italic"), color: C.paper, alpha: seg(t, 5.9, 6.3) });
    } else {
      label(ctx, "Case file · a cross-account read", w / 2, TOP(e), e);
    }
  }

  function leaderboard(ctx, t, e) {
    const { w, h, u, P } = e;
    frame(ctx, e, C.paper);
    const N = P ? 22 : 40;
    const bw = w / N;
    const grow = E.out3(seg(t, 0, 0.9));
    ctx.save();
    for (let i = 0; i < N; i += 1) {
      const wave = 0.5 + 0.5 * Math.sin(i * 0.62 + t * 3.2);
      const bh = (h * 0.12 + h * 0.2 * wave) * grow;
      ctx.fillStyle = i === Math.floor(N / 2) ? C.red2 : C.inkFaint;
      ctx.fillRect(i * bw + bw * 0.15, h - bh, bw * 0.7, bh);
    }
    ctx.restore();
    const cy = h * (P ? 0.4 : 0.46);
    label(ctx, "Bugcrowd · global leaderboard", w / 2, cy - u * (P ? 25 : 23), e, { color: C.inkDim });
    text(ctx, "GLOBAL TOP", w / 2, cy - u * (P ? 17 : 15), { font: F.disp(u * 6), color: C.ink, alpha: seg(t, 0.1, 0.4) });
    const v = Math.round(lerp(0, 50, E.out3(seg(t, 0.25, 1.5))));
    const big = u * (P ? 36 : 30);
    const blur = 1 - seg(t, 1.2, 1.5);
    for (let g = 2; g >= 1; g -= 1) text(ctx, String(v), w / 2, cy + u * 4 - g * u * 2.5 * blur, { font: F.disp(big), color: C.ink, alpha: 0.12 * blur });
    text(ctx, String(v), w / 2, cy + u * 4, { font: F.disp(big), color: C.ink });
    const b1 = P ? [w * 0.2, h * 0.73] : [w * 0.17, h * 0.42];
    const b2 = P ? [w * 0.5, h * 0.8] : [w * 0.83, h * 0.42];
    const b3 = P ? [w * 0.8, h * 0.73] : [w * 0.5, h * 0.84];
    const ss = u * (P ? 4.2 : 5);
    stamp(ctx, "JUNE", b1[0], b1[1], ss, seg(t, 1.7, 2.0), { rot: -0.2, sub: "2026 · top 50", color: C.red2 });
    stamp(ctx, "JULY", b2[0], b2[1], ss, seg(t, 2.2, 2.5), { rot: 0.16, sub: "2026 · top 50", color: C.red2 });
    stamp(ctx, "SEPT", b3[0], b3[1], ss, seg(t, 2.7, 3.0), { rot: -0.08, sub: "2026 · top 50", color: C.red2 });
    // Paper confetti off each stamp
    [[b1, 1.7], [b2, 2.2], [b3, 2.7]].forEach(([b, t0], j) => {
      const lt = t - t0;
      if (lt < 0 || lt > 1.6) return;
      const r = rng(7 + j * 13);
      for (let i = 0; i < 26; i += 1) {
        const a = r() * TAU;
        const sp = u * (18 + r() * 30);
        const x = b[0] + Math.cos(a) * sp * lt;
        const y = b[1] + Math.sin(a) * sp * lt + u * 40 * lt * lt;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(lt * (4 + r() * 8));
        ctx.globalAlpha = 1 - seg(lt, 0.8, 1.6);
        ctx.fillStyle = i % 3 ? C.ink : C.red;
        ctx.fillRect(-u * 0.6, -u * 0.3, u * 1.2, u * 0.6);
        ctx.restore();
      }
    });
    label(ctx, "Three times in 2026 · researching since March", w / 2, P ? h * 0.93 : h * 0.64, e, { color: C.ink, alpha: seg(t, 3.1, 3.5) });
  }

  function productsScene(ctx, t, e) {
    const { w, h, u } = e;
    frame(ctx, e, C.ink);
    const list = products.length ? products : [{ title: "Clex", label: "", domain: "" }];
    const n = list.length;
    const top = h * 0.12;
    const rowH = (h * 0.76) / n;
    const active = clamp(Math.floor(seg(t, 0.3, 5.2) * n), 0, n - 1);
    list.forEach((p, i) => {
      const y = top + rowH * (i + 0.5);
      const str = `${p.title.toUpperCase()} ✶ `;
      const size = rowH * 0.78;
      const f = F.disp(size);
      const unit = measure(ctx, str, f);
      const dir = i % 2 ? 1 : -1;
      const off = ((t * u * 14 * dir + e.px * u * 10 * dir) % unit + unit) % unit;
      const isOn = i === active;
      const reveal = E.out3(seg(t, i * 0.08, 0.5 + i * 0.08));
      ctx.save();
      ctx.globalAlpha = reveal;
      for (let x = -unit + off; x < w + unit; x += unit) {
        text(ctx, str, x, y + size * 0.06, { font: f, align: "left", color: isOn ? C.paper : null, stroke: isOn ? null : "rgba(234, 223, 206, 0.28)", lw: Math.max(1, u * 0.18) });
      }
      ctx.restore();
      if (isOn) {
        const lt = t - (0.3 + (active * 4.9) / n);
        const q = E.outBack(seg(lt, 0, 0.35));
        const chip = `${p.domain || p.title} · ${p.label}`;
        const cf = F.mono(u * 2, 700);
        const cw = measure(ctx, chip, cf) + u * 4;
        const cx = e.P ? w / 2 - cw / 2 : w - cw - u * 4;
        ctx.save();
        ctx.translate(cx + cw / 2, e.P ? y + rowH * 0.46 : y);
        ctx.scale(q, q);
        ctx.fillStyle = C.red;
        rrect(ctx, -cw / 2, -u * 2.6, cw, u * 5.2, u * 0.6);
        ctx.fill();
        text(ctx, chip.toUpperCase(), 0, u * 0.1, { font: cf, color: C.ink, ls: u * 0.15 });
        ctx.restore();
      }
    });
    label(ctx, `Five products · ${String(active + 1).padStart(2, "0")} live`, w / 2, TOP(e), e);
  }

  function endCard(ctx, t, e) {
    const { w, h, u, P } = e;
    frame(ctx, e, C.paper);
    dotGrid(ctx, e, C.inkFaint, 5);
    const d = u * 2.4 * (1 - E.out3(seg(t, 0, 1.3)));
    const lines = P ? ["ABHINAV", "RAJ"] : ["ABHINAV RAJ"];
    const size = Math.min(...lines.map((l) => fit(ctx, l, (s) => F.disp(s), w * 0.84, u * (P ? 26 : 17))));
    const cy = h * (P ? 0.4 : 0.42);
    lines.forEach((l, i) => {
      const y = cy + (i - (lines.length - 1) / 2) * size * 0.92;
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      text(ctx, l, w / 2 - d, y, { font: F.disp(size), color: C.cyan });
      text(ctx, l, w / 2 + d, y + d * 0.4, { font: F.disp(size), color: C.mag });
      text(ctx, l, w / 2 + d * 0.3, y - d * 0.7, { font: F.disp(size), color: C.yel });
      ctx.restore();
      text(ctx, l, w / 2, y, { font: F.disp(size), color: C.ink, alpha: seg(t, 0.6, 1.4) });
    });
    const below = cy + (lines.length / 2) * size * 0.92 + u * 5;
    label(ctx, typed("Security researcher & product builder", seg(t, 0.8, 1.8)), w / 2, below, e, { color: C.ink, size: u * 2.3 });
    text(ctx, EMAIL, w / 2, below + u * 8, { font: F.disp(u * (P ? 5.6 : 4.6), 400, "italic"), color: C.red2, alpha: seg(t, 1.4, 1.9) });
    // A rotating seal in the corner
    const sp = E.outBack(seg(t, 1.8, 2.2));
    if (sp > 0) {
      const R = u * (P ? 9 : 10);
      const sx = w - R - u * 5, sy = h - R - u * 5;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(sp, sp);
      ctx.rotate(t * 0.5);
      ctx.strokeStyle = C.red2;
      ctx.lineWidth = u * 0.4;
      circle(ctx, 0, 0, R);
      ctx.stroke();
      circle(ctx, 0, 0, R * 0.68);
      ctx.stroke();
      const ring = "THE BUILD JOURNAL ✶ REEL 01 ✶ ";
      ctx.font = F.mono(u * 1.7, 700);
      ctx.fillStyle = C.red2;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i < ring.length; i += 1) {
        ctx.save();
        ctx.rotate((i / ring.length) * TAU);
        ctx.fillText(ring[i], 0, -R * 0.84);
        ctx.restore();
      }
      ctx.restore();
      text(ctx, "FIN", sx, sy + u * 0.4, { font: F.disp(u * 4.4), color: C.red2 });
    }
    if (t > 3.5) {
      ctx.fillStyle = `rgba(28, 26, 22, ${seg(t, 3.5, 4)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  const SHOWREEL = {
    id: "showreel",
    name: "Reel 01",
    label: "Reel 01: a motion reel of the journal. The front-page line about servers trusting numbers is set word by word, an animated case file shows a cross-account invoice read being blocked by one ownership check with a 403 stamp, the Bugcrowd global Top 50 for June, July and September 2026 is stamped, the five products scroll past, and an end card shows the name and email.",
    poster: 1.2,
    scenes: [
      { label: "Manifesto", dur: 5.2, draw: manifesto, cues: MANIFESTO.map((_, i) => [0.16 + i * 0.5, i === MANIFESTO.length - 1 ? "thump" : "tick"]) },
      { label: "The request", dur: 6.8, draw: request, trans: "wipe", cues: [[0.7, "swish"], [2.1, "swish"], [3.9, "tick"], [4.15, "swish"], [5.32, "thump"]] },
      { label: "The leaderboard", dur: 4.4, draw: leaderboard, trans: "slice", cues: [[1.72, "thump"], [2.22, "thump"], [2.72, "thump"]] },
      { label: "Five products", dur: 5.4, draw: productsScene, trans: "blinds", cues: [0, 1, 2, 3, 4].map((i) => [0.3 + i * 0.98, "tick"]) },
      { label: "End card", dur: 4.0, draw: endCard, trans: "iris", cues: [[1.82, "thump"]] }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 3. Case films                                                       */
  /* ------------------------------------------------------------------ */

  function caseBg(ctx, e, title) {
    frame(ctx, e, C.ink);
    dotGrid(ctx, e, "rgba(234, 223, 206, 0.06)");
    label(ctx, title, e.w / 2, TOP(e), e);
  }

  // Clex: prepare, try the direct route, fall back to the relay, prove it.
  function clexFilm(ctx, t, e) {
    const { w, h, u, P } = e;
    caseBg(ctx, e, "Clex · how a file moves");
    const A = P ? [w * 0.5, h * 0.2] : [w * 0.13, h * 0.46];
    const B = P ? [w * 0.5, h * 0.72] : [w * 0.87, h * 0.46];
    const relay = P ? [w * 0.84, h * 0.46] : [w * 0.5, h * 0.8];
    const direct = P ? [w * 0.14, h * 0.46] : [w * 0.5, h * 0.12];
    [[A, "Your device"], [B, "Their device"]].forEach(([p, name]) => {
      ctx.save();
      ctx.strokeStyle = C.paper;
      ctx.lineWidth = u * 0.35;
      rrect(ctx, p[0] - u * 6, p[1] - u * 8, u * 12, u * 16, u * 1.5);
      ctx.stroke();
      ctx.restore();
      label(ctx, name, p[0], p[1] + u * 11.5, e, { size: u * 1.8 });
    });
    ctx.save();
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = u * 0.3;
    circle(ctx, relay[0], relay[1], u * 4.5);
    ctx.stroke();
    ctx.restore();
    padlock(ctx, relay[0], relay[1] + u * 0.6, u * 3, C.paper);
    label(ctx, "Encrypted relay", relay[0], relay[1] + (P ? u * 8 : u * 8), e, { size: u * 1.8 });
    const failed = t > 2.1;
    curve(ctx, A, direct, B, failed ? "rgba(209, 90, 53, 0.5)" : C.dim, u * 0.3, [u, u]);
    curve(ctx, A, relay, B, t > 2.4 ? C.paper : C.faint, u * 0.3, [u, u]);
    label(ctx, "WebRTC direct", direct[0], direct[1] + (P ? 0 : -u * 3), e, { size: u * 1.8, color: failed ? C.red : C.dim });
    // The file, prepared on the device
    const prep = seg(t, 0.2, 0.8);
    fileIcon(ctx, A[0], A[1], u * 7 * (1 - seg(t, 0.9, 1.1)), C.paper);
    if (t < 1.2) label(ctx, typed("compress · encrypt · split", prep), A[0], A[1] - u * 11, e, { color: C.paper, size: u * 1.8 });
    const chunks = 6;
    for (let i = 0; i < chunks; i += 1) {
      const d0 = 1.0 + i * 0.1;
      if (t > d0 && t < 2.3) {
        const p = seg(t, d0, d0 + 1.0) * 0.5;
        const [x, y] = bez(A, direct, B, p);
        ctx.fillStyle = C.paper;
        ctx.fillRect(x - u, y - u, u * 2, u * 2);
      }
      const r0 = 2.5 + i * 0.16;
      if (t > r0) {
        const p = E.io3(seg(t, r0, r0 + 1.3));
        if (p < 1) {
          const [x, y] = bez(A, relay, B, p);
          ctx.fillStyle = C.red;
          ctx.fillRect(x - u, y - u, u * 2, u * 2);
        }
      }
    }
    if (failed && t < 3.4) {
      const mid = bez(A, direct, B, 0.5);
      cross(ctx, mid[0], mid[1], u * 4, C.red, seg(t, 2.1, 2.35));
      label(ctx, "Blocked by the network", mid[0], mid[1] + u * 5.5, e, { color: C.red, size: u * 1.8, alpha: seg(t, 2.1, 2.4) });
    }
    if (t > 4.2) {
      const q = E.outBack(seg(t, 4.2, 4.6));
      ctx.save();
      ctx.translate(B[0], B[1]);
      ctx.scale(q, q);
      fileIcon(ctx, 0, 0, u * 7, C.paper);
      ctx.restore();
      check(ctx, B[0] + u * 4, B[1] - u * 5, u * 3, C.green, seg(t, 4.5, 4.8));
    }
    // Proof on the chain: hashes, never the file.
    if (t > 5.0) {
      const hashes = ["#a3f9", "#07c1", "#e41b", "#5d20"];
      const bw = u * (P ? 16 : 12), gap = u * 2;
      const total = hashes.length * bw + (hashes.length - 1) * gap;
      const y = P ? h * 0.86 : h * 0.93;
      hashes.forEach((hash, i) => {
        const q = E.outBack(seg(t, 5.0 + i * 0.18, 5.4 + i * 0.18));
        const x = w / 2 - total / 2 + i * (bw + gap);
        ctx.save();
        ctx.globalAlpha = clamp(q);
        ctx.strokeStyle = i === hashes.length - 1 ? C.red : C.dim;
        ctx.lineWidth = u * 0.3;
        rrect(ctx, x, y - u * 2.4 - (1 - q) * u * 3, bw, u * 4.8, u * 0.5);
        ctx.stroke();
        ctx.restore();
        text(ctx, hash, x + bw / 2, y, { font: F.mono(u * 1.9, 700), color: C.paper, alpha: q });
        if (i < hashes.length - 1) line(ctx, x + bw, y, x + bw + gap, y, C.dim, u * 0.3);
      });
      label(ctx, "The chain stores the hash, never the file", w / 2, y - u * 5.5, e, { color: C.paper, size: u * 1.8, alpha: seg(t, 5.8, 6.2) });
    }
  }

  // Clex AI: one request shape, routed by model, streamed back.
  function clexAiFilm(ctx, t, e) {
    const { w, h, u, P } = e;
    caseBg(ctx, e, "Clex AI · one request, any provider");
    const names = ["OpenAI", "Anthropic", "Gemini", "NVIDIA", "Open models"];
    const hub = P ? [w * 0.5, h * 0.42] : [w * 0.46, h * 0.5];
    const client = P ? [w * 0.5, h * 0.14] : [w * 0.12, h * 0.5];
    const nodes = names.map((_, i) => {
      if (P) return [w * (0.12 + i * 0.19), h * 0.7];
      return [w * 0.84, h * (0.18 + i * 0.16)];
    });
    const target = 1;
    // Request card
    const card = ["POST /v1/chat/completions", 'model: "claude-sonnet"'];
    const cf = F.mono(u * (P ? 2 : 1.8), 700);
    const cw = Math.max(...card.map((s) => measure(ctx, s, cf))) + u * 4;
    const cq = E.out3(seg(t, 0.1, 0.5));
    ctx.save();
    ctx.globalAlpha = cq;
    ctx.fillStyle = C.paper;
    rrect(ctx, client[0] - cw / 2, client[1] - u * 4, cw, u * 8, u * 0.8);
    ctx.fill();
    ctx.restore();
    text(ctx, card[0], client[0], client[1] - u * 1.4, { font: cf, color: C.ink, alpha: cq });
    text(ctx, card[1], client[0], client[1] + u * 1.8, { font: cf, color: C.red2, alpha: cq });
    // Hub
    const hq = E.outBack(seg(t, 0.3, 0.8));
    ctx.save();
    ctx.translate(hub[0], hub[1]);
    ctx.scale(hq, hq);
    ctx.fillStyle = C.red;
    circle(ctx, 0, 0, u * 8);
    ctx.fill();
    ctx.restore();
    text(ctx, "CLEX AI", hub[0], hub[1] + u * 0.3, { font: F.disp(u * 3.2), color: C.ink, alpha: hq });
    line(ctx, client[0] + (P ? 0 : cw / 2), client[1] + (P ? u * 4 : 0), hub[0] - (P ? 0 : u * 8), hub[1] - (P ? u * 8 : 0), C.dim, u * 0.3, [u, u]);
    if (t > 0.8 && t < 1.6) {
      const p = E.io3(seg(t, 0.8, 1.5));
      const x = lerp(client[0] + (P ? 0 : cw / 2), hub[0] - (P ? 0 : u * 8), p);
      const y = lerp(client[1] + (P ? u * 4 : 0), hub[1] - (P ? u * 8 : 0), p);
      ctx.fillStyle = C.paper;
      circle(ctx, x, y, u * 1.2);
      ctx.fill();
    }
    // Providers, with an availability ping each
    nodes.forEach((n, i) => {
      const q = E.out3(seg(t, 0.5 + i * 0.08, 0.9 + i * 0.08));
      const isTarget = i === target && t > 2.6;
      line(ctx, hub[0], hub[1], n[0], n[1], isTarget ? C.paper : "rgba(234, 223, 206, 0.14)", u * (isTarget ? 0.45 : 0.25));
      ctx.save();
      ctx.globalAlpha = q;
      ctx.fillStyle = isTarget ? C.paper : C.ink2;
      circle(ctx, n[0], n[1], u * 3.6);
      ctx.fill();
      ctx.strokeStyle = C.paper;
      ctx.lineWidth = u * 0.3;
      ctx.stroke();
      ctx.restore();
      const ping = seg(t, 1.6 + i * 0.12, 2.1 + i * 0.12);
      if (ping > 0 && ping < 1) {
        ctx.save();
        ctx.strokeStyle = `rgba(124, 154, 106, ${1 - ping})`;
        ctx.lineWidth = u * 0.4;
        circle(ctx, n[0], n[1], u * (3.6 + ping * 5));
        ctx.stroke();
        ctx.restore();
      }
      if (t > 2.1 + i * 0.12) check(ctx, n[0], n[1], u * 2.2, isTarget ? C.ink : C.green, seg(t, 2.1 + i * 0.12, 2.3 + i * 0.12));
      label(ctx, names[i], n[0] + (P ? 0 : -u * 6), n[1] + (P ? u * 6.5 : 0), e, { size: u * (P ? 1.5 : 1.8), align: P ? "center" : "right", color: isTarget ? C.paper : C.dim });
    });
    if (t > 2.6 && t < 3.6) label(ctx, "Routed by model and availability", hub[0], hub[1] + u * 12, e, { color: C.paper, size: u * 1.9, alpha: seg(t, 2.6, 2.9) });
    // Stream back: tokens ride the line home and land in the response.
    if (t > 3.2) {
      const n = nodes[target];
      for (let i = 0; i < 9; i += 1) {
        const p = ((t - 3.2) * 1.4 - i * 0.12) % 1.4;
        if (p < 0 || p > 1) continue;
        const x = p < 0.5 ? lerp(n[0], hub[0], p * 2) : lerp(hub[0], client[0], (p - 0.5) * 2);
        const y = p < 0.5 ? lerp(n[1], hub[1], p * 2) : lerp(hub[1], client[1], (p - 0.5) * 2);
        ctx.fillStyle = C.red;
        ctx.fillRect(x - u * 0.7, y - u * 0.7, u * 1.4, u * 1.4);
      }
      const reply = "data: Hello from any provider, same shape as before";
      const f = F.mono(u * (P ? 1.8 : 1.9));
      const y = P ? h * 0.88 : h * 0.86;
      text(ctx, typed(reply, seg(t, 3.6, 6.4)) + (Math.floor(t * 5) % 2 ? "▍" : ""), w / 2, y, { font: f, color: C.paper });
      label(ctx, "Streamed through untouched", w / 2, y - u * 4.5, e, { size: u * 1.8, alpha: seg(t, 3.6, 4) });
    }
    if (t > 6.6) {
      const s = fit(ctx, "Change the base URL, keep the SDK", (z) => F.disp(z, 400, "italic"), w * 0.8, u * 5);
      text(ctx, "Change the base URL, keep the SDK", w / 2, TOP(e) + u * 6, { font: F.disp(s, 400, "italic"), color: C.paper, alpha: seg(t, 6.6, 7) });
    }
  }

  // Driped: receipts in, parsed on the phone, the odd one to a model.
  function dripedFilm(ctx, t, e) {
    const { w, h, u, P } = e;
    caseBg(ctx, e, "Driped · subscriptions from receipts");
    const subs = [["Music", "₹119 / mo"], ["Cloud storage", "₹75 / mo"], ["Streaming", "₹199 / mo"], ["News", "₹99 / mo"], ["Design tool", "₹1,299 / yr"], ["Fitness", "₹299 / mo"]];
    const inboxX = P ? w * 0.5 : w * 0.16;
    const parser = P ? [w * 0.5, h * 0.38] : [w * 0.44, h * 0.5];
    const ai = P ? [w * 0.84, h * 0.38] : [w * 0.44, h * 0.8];
    // The scanner gate
    ctx.save();
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = u * 0.35;
    rrect(ctx, parser[0] - u * 9, parser[1] - u * 5, u * 18, u * 10, u);
    ctx.stroke();
    ctx.restore();
    label(ctx, "On-device parser", parser[0], parser[1] - u * 7.5, e, { size: u * 1.8, color: C.paper });
    const scan = parser[1] - u * 4 + ((t * 1.6) % 1) * u * 8;
    line(ctx, parser[0] - u * 8, scan, parser[0] + u * 8, scan, C.red, u * 0.4);
    ctx.save();
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = u * 0.3;
    ctx.setLineDash([u * 0.8, u * 0.8]);
    rrect(ctx, ai[0] - u * 7, ai[1] - u * 3.5, u * 14, u * 7, u);
    ctx.stroke();
    ctx.restore();
    text(ctx, "WORKERS AI", ai[0], ai[1] + u * 0.2, { font: F.mono(u * 1.8, 700), color: C.dim });
    label(ctx, "Only the hard ones", ai[0], ai[1] + u * 6, e, { size: u * 1.6 });
    label(ctx, "Inbox", inboxX, P ? h * 0.19 : h * 0.18, e, { color: C.paper });
    // Receipts travel inbox → parser → (maybe model) → cards
    const cardsX = P ? w * 0.5 : w * 0.76;
    subs.forEach((s, i) => {
      const t0 = 0.3 + i * 0.55;
      const hard = i === 3;
      const lt = t - t0;
      if (lt < 0) return;
      const start = P ? [inboxX, h * 0.23] : [inboxX, h * 0.24];
      if (lt < 0.7) {
        const p = E.io3(seg(lt, 0, 0.7));
        envelope(ctx, lerp(start[0], parser[0], p), lerp(start[1], parser[1], p), u * 6, C.paper);
      } else if (hard && lt < 2.0) {
        const p = E.io3(seg(lt, 0.7, 1.3));
        const q = E.io3(seg(lt, 1.4, 2.0));
        const x = lt < 1.4 ? lerp(parser[0], ai[0], p) : lerp(ai[0], parser[0], q);
        const y = lt < 1.4 ? lerp(parser[1], ai[1], p) : lerp(ai[1], parser[1], q);
        envelope(ctx, x, y, u * 6, C.red);
        if (lt < 1.4) text(ctx, "?", x, y - u * 5, { font: F.disp(u * 4), color: C.red });
      }
      // Card lands in the stack
      const landAt = hard ? 2.1 : 0.8;
      if (lt > landAt) {
        const q = E.outBack(seg(lt, landAt, landAt + 0.4));
        const slot = i;
        const cw = u * (P ? 50 : 38), ch = u * 5.4;
        const cy = P ? h * 0.52 + slot * (ch + u * 1.2) : h * 0.2 + slot * (ch + u * 1.4);
        ctx.save();
        ctx.translate(cardsX, cy);
        ctx.scale(q, q);
        ctx.fillStyle = C.paper;
        rrect(ctx, -cw / 2, -ch / 2, cw, ch, u * 0.6);
        ctx.fill();
        ctx.restore();
        if (q > 0.6) {
          text(ctx, s[0], cardsX - cw / 2 + u * 2, cy, { font: F.disp(u * 2.3, 700), color: C.ink, align: "left" });
          text(ctx, s[1], cardsX + cw / 2 - u * 2, cy, { font: F.mono(u * 1.8, 700), color: hard ? C.red2 : C.ink, align: "right" });
        }
      }
    });
    if (t > 5.6) {
      const p = seg(t, 5.6, 7.6);
      const R = u * 5;
      const rx = P ? w * 0.84 : w * 0.16, ry = P ? h * 0.2 : h * 0.72;
      ctx.save();
      ctx.strokeStyle = C.faint;
      ctx.lineWidth = u;
      circle(ctx, rx, ry, R);
      ctx.stroke();
      ctx.strokeStyle = C.red;
      ctx.beginPath();
      ctx.arc(rx, ry, R, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p));
      ctx.stroke();
      ctx.restore();
      text(ctx, `${Math.max(0, 3 - Math.floor(p * 3))}d`, rx, ry + u * 0.3, { font: F.disp(u * 3.4), color: C.paper });
      label(ctx, "Renewal reminder", rx, ry + R + u * 3.5, e, { size: u * 1.6, color: C.paper });
    }
  }

  // trgt: five lights, lights out, predictions locked by the server.
  function trgtFilm(ctx, t, e) {
    const { w, h, u, P } = e;
    caseBg(ctx, e, "trgt · the lockout lives on the server");
    const n = 5;
    const gw = Math.min(w * 0.86, u * (P ? 80 : 70));
    const x0 = w / 2 - gw / 2;
    const gy = h * (P ? 0.26 : 0.3);
    ctx.fillStyle = C.ink2;
    rrect(ctx, x0, gy - u * 7, gw, u * 14, u);
    ctx.fill();
    const out = t > 3.4;
    for (let i = 0; i < n; i += 1) {
      const cx = x0 + gw * ((i + 0.5) / n);
      const lit = !out && t > 0.4 + i * 0.55;
      [-1, 1].forEach((k) => {
        ctx.fillStyle = lit ? "#ff3b24" : "#2f2b25";
        circle(ctx, cx, gy + k * u * 3.2, u * 2.6);
        ctx.fill();
        if (lit) {
          ctx.fillStyle = "rgba(255, 90, 54, 0.18)";
          circle(ctx, cx, gy + k * u * 3.2, u * 4.4);
          ctx.fill();
        }
      });
    }
    if (out) {
      const s = fit(ctx, "LIGHTS OUT", (z) => F.disp(z), w * 0.8, u * 11);
      text(ctx, "LIGHTS OUT", w / 2, gy + u * (P ? 15 : 15), { font: F.disp(s), color: C.paper, alpha: seg(t, 3.4, 3.6) });
    } else {
      label(ctx, "Session starts at 14:00:00 server time", w / 2, gy + u * 12, e, { color: C.paper });
    }
    // The prediction panel
    const py = h * (P ? 0.66 : 0.72);
    const pw = Math.min(w * 0.86, u * 70);
    ctx.save();
    ctx.strokeStyle = t > 3.5 ? C.red : C.dim;
    ctx.lineWidth = u * 0.35;
    rrect(ctx, w / 2 - pw / 2, py - u * 10, pw, u * 20, u);
    ctx.stroke();
    ctx.restore();
    label(ctx, "Your podium", w / 2, py - u * 6.5, e, { color: C.paper });
    ["P1", "P2", "P3"].forEach((p, i) => {
      const cx = w / 2 + (i - 1) * pw * 0.3;
      const flip = seg(t, 5.4 + i * 0.2, 5.8 + i * 0.2);
      ctx.save();
      ctx.translate(cx, py + u * 2.5);
      ctx.scale(1, Math.abs(Math.cos(flip * Math.PI)) || 0.02);
      ctx.fillStyle = flip > 0.5 ? C.paper : C.ink2;
      rrect(ctx, -pw * 0.12, -u * 4, pw * 0.24, u * 8, u * 0.6);
      ctx.fill();
      ctx.restore();
      text(ctx, flip > 0.5 ? ["+25", "+18", "+15"][i] : p, cx, py + u * 2.8, { font: F.disp(u * 3.6), color: flip > 0.5 ? C.ink : C.paper });
    });
    if (t > 3.5) {
      const q = E.outBack(seg(t, 3.5, 3.85));
      ctx.save();
      ctx.translate(w / 2 + pw / 2 - u * 2, py - u * 10);
      ctx.scale(q, q);
      ctx.fillStyle = C.red;
      circle(ctx, 0, 0, u * 5);
      ctx.fill();
      ctx.restore();
      padlock(ctx, w / 2 + pw / 2 - u * 2, py - u * 9.4, u * 4.2 * q, C.ink, E.out3(seg(t, 3.7, 4.0)));
      stamp(ctx, "LOCKED", w / 2, py + u * 2.5, u * 5, seg(t, 3.6, 3.9), { sub: "enforced on the server" });
    }
    if (t > 5.4) label(ctx, "Scored when the session ends", w / 2, py + u * 13.5, e, { color: C.paper, alpha: seg(t, 5.4, 5.8) });
  }

  // Modih Mail: mail in, sanitised at the edge, OTP out, gone on time.
  function modihFilm(ctx, t, e) {
    const { w, h, u, P } = e;
    caseBg(ctx, e, "Modih Mail · untrusted HTML, handled");
    const band = h * (P ? 0.36 : 0.36);
    ctx.fillStyle = "rgba(234, 223, 206, 0.06)";
    ctx.fillRect(0, band - u * 5, w, u * 10);
    line(ctx, 0, band - u * 5, w, band - u * 5, C.faint, u * 0.3);
    line(ctx, 0, band + u * 5, w, band + u * 5, C.faint, u * 0.3);
    label(ctx, "Cloudflare Worker · parse + sanitise", u * 5, band - u * 7, e, { align: "left", size: u * 1.7 });
    const drop = E.io3(seg(t, 0.2, 1.3));
    const cx = w / 2;
    const cardW = Math.min(w * 0.8, u * 64);
    const cardY = lerp(h * 0.12, P ? h * 0.66 : h * 0.68, drop);
    const html = ['<p>Your code is</p>', '<script>steal()</script>', '<b>482913</b>'];
    const cut = seg(t, 1.3, 2.2);
    ctx.save();
    ctx.fillStyle = C.paper;
    rrect(ctx, cx - cardW / 2, cardY - u * 10, cardW, u * 20, u * 0.8);
    ctx.fill();
    ctx.restore();
    html.forEach((line2, i) => {
      const y = cardY - u * 5 + i * u * 5;
      const isScript = i === 1;
      const alpha = isScript ? 1 - seg(t, 2.0, 2.4) : 1;
      text(ctx, line2, cx, y, { font: F.mono(u * 2.2, 700), color: isScript ? C.red2 : C.ink, alpha });
      if (isScript && cut > 0) {
        const tw = measure(ctx, line2, F.mono(u * 2.2, 700));
        line(ctx, cx - tw / 2, y, cx - tw / 2 + tw * cut, y, C.red2, u * 0.5);
      }
      if (i === 2 && t > 3.0) {
        const tw = measure(ctx, line2, F.mono(u * 2.2, 700));
        ctx.save();
        ctx.strokeStyle = C.red;
        ctx.lineWidth = u * 0.4;
        rrect(ctx, cx - tw / 2 - u, y - u * 2, tw + u * 2, u * 4, u * 0.5);
        ctx.stroke();
        ctx.restore();
      }
    });
    if (t > 1.3 && t < 2.6) label(ctx, "Script removed before render", cx, band + u * 8, e, { color: C.red, alpha: seg(t, 1.3, 1.6) });
    // OTP flies out into a copy chip
    if (t > 3.3) {
      const p = E.io3(seg(t, 3.3, 4.1));
      const target = [cx, P ? h * 0.2 : h * 0.18];
      const x = lerp(cx, target[0], p), y = lerp(cardY + u * 5, target[1], p);
      const sz = lerp(u * 2.2, u * (P ? 7 : 6.5), p);
      text(ctx, p < 1 ? "482913" : "482 913", x, y, { font: F.disp(sz), color: C.paper });
      if (p >= 1) label(ctx, "OTP pulled out · tap to copy", cx, target[1] + u * 6, e, { color: C.paper });
    }
    // Expiry ring, then the mail is gone
    if (t > 4.6) {
      const p = seg(t, 4.6, 7.2);
      const R = u * 5;
      const rx = cx + cardW / 2 - u * 2, ry = cardY - u * 10;
      ctx.save();
      ctx.fillStyle = C.ink;
      circle(ctx, rx, ry, R + u);
      ctx.fill();
      ctx.strokeStyle = C.red;
      ctx.lineWidth = u * 0.9;
      ctx.beginPath();
      ctx.arc(rx, ry, R, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p));
      ctx.stroke();
      ctx.restore();
      text(ctx, `${Math.max(0, Math.ceil((1 - p) * 60))}m`, rx, ry + u * 0.3, { font: F.mono(u * 2.2, 700), color: C.paper });
      if (p >= 1) {
        const r = rng(3);
        const q = seg(t, 7.2, 7.8);
        ctx.save();
        ctx.fillStyle = C.ink;
        ctx.globalAlpha = q;
        rrect(ctx, cx - cardW / 2 - 2, cardY - u * 10 - 2, cardW + 4, u * 20 + 4, u * 0.8);
        ctx.fill();
        ctx.restore();
        for (let i = 0; i < 40; i += 1) {
          ctx.fillStyle = C.paper;
          ctx.globalAlpha = 1 - q;
          ctx.fillRect(cx + (r() - 0.5) * cardW, cardY + (r() - 0.5) * u * 20 - q * u * 12 * r(), u * 0.8, u * 0.8);
        }
        ctx.globalAlpha = 1;
        label(ctx, "Expired · deleted on the hour", cx, cardY, e, { color: C.dim, alpha: q });
      }
    }
  }

  const film = (id, name, draw, dur, chapters, cues, alt) => ({
    id, name, label: alt, poster: dur * 0.62,
    scenes: [{ label: chapters[0][1], dur, draw, chapters, cues }]
  });

  const FILMS = {
    showreel: SHOWREEL,
    clex: film("clex", "Clex", clexFilm, 7.6,
      [[0, "Prepare on the device"], [2.0, "Direct route blocked"], [2.5, "Encrypted relay"], [5.0, "Proof on the chain"]],
      [[1.0, "swish"], [2.12, "tick"], [2.5, "swish"], [4.45, "thump"]],
      "A file is compressed, encrypted and split on the sender's device. The direct WebRTC route is blocked by the network, so the pieces take the encrypted relay, arrive and reassemble. A chain of hashes records the transfer without the file."),
    "clex-ai": film("clex-ai", "Clex AI", clexAiFilm, 7.6,
      [[0, "One request shape"], [1.5, "Check availability"], [2.6, "Route by model"], [3.4, "Stream back"]],
      [[0.8, "swish"], [2.6, "tick"], [3.3, "swish"]],
      "One OpenAI-shaped request reaches the Clex AI gateway, which checks provider availability, routes by the requested model, and streams tokens back untouched."),
    driped: film("driped", "Driped", dripedFilm, 8,
      [[0, "Receipts in"], [0.9, "Parsed on the phone"], [2.3, "The hard one"], [5.6, "Remind before renewal"]],
      [[0.3, "swish"], [2.3, "tick"], [5.6, "tick"]],
      "Receipts drop from the inbox into an on-device parser. Most become subscription cards straight away; one low-confidence receipt goes to Workers AI first. A countdown ring reminds before a renewal."),
    trgt: film("trgt", "trgt", trgtFilm, 7.4,
      [[0, "Five lights"], [3.4, "Lights out, locked"], [5.4, "Scored"]],
      [0, 1, 2, 3, 4].map((i) => [0.4 + i * 0.55, "tick"]).concat([[3.6, "thump"], [5.4, "swish"]]),
      "Five start lights come on one by one. At lights out the prediction panel is locked by the server, then the podium cards flip to show the points scored."),
    "modih-mail": film("modih-mail", "Modih Mail", modihFilm, 8,
      [[0, "Mail in"], [1.3, "Sanitised at the edge"], [3.3, "OTP extracted"], [4.6, "Gone on time"]],
      [[0.2, "swish"], [1.35, "tick"], [3.3, "swish"], [7.2, "thump"]],
      "An email arrives at a Cloudflare Worker, its script tag is struck out before rendering, the one-time code is pulled out for copying, and an expiry ring runs down until the message is deleted.")
  };

  /* ------------------------------------------------------------------ */
  /* 4. Player                                                           */
  /* ------------------------------------------------------------------ */

  const TR = 0.7;
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const tc = (s) => `${fmt(s)}:${String(Math.floor((s % 1) * 24)).padStart(2, "0")}`;

  function timeline(film) {
    let at = 0;
    const scenes = film.scenes.map((s) => { const o = { ...s, start: at }; at += s.dur; return o; });
    const chapters = [];
    scenes.forEach((s) => {
      if (s.chapters) s.chapters.forEach(([t, l]) => chapters.push({ t: s.start + t, label: l }));
      else chapters.push({ t: s.start, label: s.label });
    });
    const cues = [];
    scenes.forEach((s) => (s.cues || []).forEach(([t, name]) => cues.push({ t: s.start + t, name })));
    return { scenes, chapters, cues, duration: at };
  }

  class Player {
    constructor(fig, film) {
      this.fig = fig;
      this.film = film;
      this.tl = timeline(film);
      this.t = film.poster || 0;
      this.playing = false;
      this.visible = false;
      this.userPaused = false;
      this.px = 0; this.py = 0; this.tx = 0; this.ty = 0;
      this.build();
      this.bind();
      this.resize();
    }

    build() {
      const f = this.fig;
      f.classList.add("reel", "is-paused");
      const chips = this.tl.chapters.map((c, i) => `<button type="button" data-seek="${c.t}"><b>${String(i + 1).padStart(2, "0")}</b>${c.label}</button>`).join("");
      const marks = this.tl.chapters.slice(1).map((c) => `<span class="reel-mark" style="left:${(c.t / this.tl.duration) * 100}%"></span>`).join("");
      f.innerHTML = `
        <div class="reel-frame" tabindex="0" role="button" aria-label="${this.film.name}. Play or pause">
          <canvas class="reel-canvas" role="img" aria-label="${this.film.label.replace(/"/g, "&quot;")}"></canvas>
          <div class="reel-vignette" aria-hidden="true"></div>
          <div class="reel-grain" aria-hidden="true"></div>
          <div class="reel-hud" aria-hidden="true"><span>${this.film.name}</span><span data-tc>00:00:00</span></div>
          <div class="reel-chapter" aria-hidden="true" data-chapter></div>
          <span class="reel-big-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg></span>
        </div>
        <div class="reel-bar">
          <button class="reel-btn" type="button" data-toggle aria-label="Play">
            <svg class="i-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4l14 8-14 8z"/></svg>
            <svg class="i-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
          </button>
          <div class="reel-scrub" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="${Math.round(this.tl.duration)}" aria-valuenow="0">
            <div class="reel-track"><i class="reel-fill"></i>${marks}</div>
            <span class="reel-knob" aria-hidden="true"></span>
          </div>
          <span class="reel-time" data-time>00:00 / ${fmt(this.tl.duration)}</span>
        </div>
        <div class="reel-chips" role="group" aria-label="Chapters">${chips}</div>
      `;
      this.frameEl = $(".reel-frame", f);
      this.canvas = $("canvas", f);
      this.ctx = this.canvas.getContext("2d");
      this.tcEl = $("[data-tc]", f);
      this.chapterEl = $("[data-chapter]", f);
      this.timeEl = $("[data-time]", f);
      this.scrub = $(".reel-scrub", f);
      this.toggleBtn = $("[data-toggle]", f);
      this.chipBtns = $$(".reel-chips button", f);
    }

    bind() {
      const toggle = () => { this.userPaused = this.playing; this.playing ? this.pause() : this.play(); };
      this.frameEl.addEventListener("click", toggle);
      this.frameEl.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); }
        if (e.key === "ArrowRight") { e.preventDefault(); this.seek(this.t + 2); }
        if (e.key === "ArrowLeft") { e.preventDefault(); this.seek(this.t - 2); }
      });
      this.toggleBtn.addEventListener("click", toggle);
      this.frameEl.addEventListener("pointermove", (e) => {
        const r = this.frameEl.getBoundingClientRect();
        this.tx = (e.clientX - r.left) / r.width - 0.5;
        this.ty = (e.clientY - r.top) / r.height - 0.5;
        if (!this.playing) this.requestDraw();
      });
      this.frameEl.addEventListener("pointerleave", () => { this.tx = 0; this.ty = 0; if (!this.playing) this.requestDraw(); });

      // Scrubbing
      let wasPlaying = false;
      const at = (e) => {
        const r = this.scrub.getBoundingClientRect();
        return clamp((e.clientX - r.left) / r.width) * this.tl.duration;
      };
      this.scrub.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        wasPlaying = this.playing;
        this.pause(true);
        this.fig.classList.add("is-scrubbing");
        try { this.scrub.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
        this.seek(at(e));
      });
      this.scrub.addEventListener("pointermove", (e) => {
        if (!this.fig.classList.contains("is-scrubbing")) return;
        this.seek(at(e));
      });
      const end = () => {
        if (!this.fig.classList.contains("is-scrubbing")) return;
        this.fig.classList.remove("is-scrubbing");
        if (wasPlaying) this.play();
      };
      this.scrub.addEventListener("pointerup", end);
      this.scrub.addEventListener("pointercancel", end);
      this.scrub.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        if (step) { e.preventDefault(); this.seek(this.t + step); }
        if (e.key === "Home") { e.preventDefault(); this.seek(0); }
        if (e.key === "End") { e.preventDefault(); this.seek(this.tl.duration - 0.05); }
      });
      this.chipBtns.forEach((b) => b.addEventListener("click", () => {
        this.seek(Number(b.dataset.seek) + 0.01);
        this.userPaused = false;
        this.play();
      }));

      if ("ResizeObserver" in window) new ResizeObserver(() => this.resize()).observe(this.frameEl);
      else window.addEventListener("resize", () => this.resize());

      if ("IntersectionObserver" in window) {
        new IntersectionObserver((entries) => {
          const e = entries[0];
          this.visible = e.isIntersecting;
          // Only roll once the reader is really at the film.
          if (e.intersectionRatio >= 0.7 && !this.userPaused && !reducedMotion) this.play();
          if (e.intersectionRatio < 0.35) this.pause(true);
        }, { threshold: [0, 0.35, 0.7] }).observe(this.frameEl);
      } else {
        this.visible = true;
      }
      document.addEventListener("visibilitychange", () => { if (document.hidden) this.pause(true); });
    }

    resize() {
      const r = this.frameEl.getBoundingClientRect();
      if (!r.width) return;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = r.width;
      this.h = r.height;
      this.canvas.width = Math.round(r.width * this.dpr);
      this.canvas.height = Math.round(r.height * this.dpr);
      // Offscreen sheets for the burn between scenes and the press kick
      const sheet = () => { const c = document.createElement("canvas"); c.width = this.canvas.width; c.height = this.canvas.height; return c; };
      this.coverC = sheet();
      this.fxC = sheet();
      this.burnC = sheet();
      this.burner = null;
      if (window.PR_BURN && !reducedMotion) {
        const d = Math.hypot(this.w, this.h);
        this.burner = window.PR_BURN.create({ canvas: this.burnC, mode: "reveal", seed: 5, origins: [{ x: this.w * 0.5, y: this.h * 1.04 }, { x: this.w * 0.06, y: this.h * 0.12, delay: d * 0.12 }, { x: this.w * 0.96, y: this.h * 0.3, delay: d * 0.2 }] });
        this.burner.size(this.w, this.h, this.dpr);
      }
      this.draw();
    }

    play() {
      if (this.playing) return;
      // The first play always starts at the top of the film.
      if (!this.started) { this.started = true; this.t = 0; }
      this.playing = true;
      this.visible = true;
      this.fig.classList.add("is-playing");
      this.fig.classList.remove("is-paused");
      this.toggleBtn.setAttribute("aria-label", "Pause");
      this.last = performance.now();
      this.raf = window.requestAnimationFrame((n) => this.loop(n));
    }

    pause(auto) {
      if (!auto) this.userPaused = true;
      this.playing = false;
      this.fig.classList.remove("is-playing");
      this.fig.classList.add("is-paused");
      this.toggleBtn.setAttribute("aria-label", "Play");
      window.cancelAnimationFrame(this.raf);
    }

    seek(t) {
      this.started = true;
      const d = this.tl.duration;
      this.t = ((t % d) + d) % d;
      this.draw();
    }

    requestDraw() {
      if (this.pending) return;
      this.pending = window.requestAnimationFrame(() => { this.pending = 0; this.draw(); });
    }

    loop(now) {
      if (!this.playing) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      const prev = this.t;
      let next = this.t + dt;
      const d = this.tl.duration;
      this.tl.cues.forEach((c) => { if ((c.t > prev && c.t <= next) || (next >= d && c.t <= next - d)) sound(c.name); });
      if (next >= d) next -= d;
      this.t = next;
      this.draw();
      this.raf = window.requestAnimationFrame((n) => this.loop(n));
    }

    // The print on film: a press misregistration kick as each scene lands,
    // a little flicker, dust and the odd scratch while it plays.
    filmLook(ctx, e, s, lt) {
      const kick = 1 - clamp(lt / 0.22);
      if (kick > 0 && this.fxC) {
        const fc = this.fxC.getContext("2d");
        fc.setTransform(1, 0, 0, 1, 0, 0);
        fc.clearRect(0, 0, this.fxC.width, this.fxC.height);
        fc.drawImage(this.canvas, 0, 0);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 0.28 * kick;
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(this.fxC, 5 * kick * this.dpr, -2 * kick * this.dpr);
        ctx.globalAlpha = 0.2 * kick;
        ctx.drawImage(this.fxC, -4 * kick * this.dpr, 2 * kick * this.dpr);
        ctx.restore();
      }
      if (!this.playing) return;
      ctx.save();
      const flick = 0.035 * (Math.sin(this.t * 53) * 0.5 + Math.sin(this.t * 17) * 0.5);
      ctx.fillStyle = flick > 0 ? `rgba(255, 244, 226, ${flick})` : `rgba(10, 8, 6, ${-flick})`;
      ctx.fillRect(0, 0, e.w, e.h);
      const seed = Math.floor(this.t * 24);
      const r = rng(seed + 7);
      ctx.fillStyle = "rgba(23, 22, 18, 0.35)";
      for (let k = 0; k < 5; k += 1) {
        const sz = 0.6 + r() * 1.8;
        ctx.fillRect(r() * e.w, r() * e.h, sz, sz * (r() < 0.3 ? 3 : 1));
      }
      if (r() < 0.12) {
        ctx.fillStyle = "rgba(255, 250, 240, 0.18)";
        ctx.fillRect(r() * e.w, 0, 1, e.h);
      }
      ctx.restore();
    }

    draw() {
      if (!this.w) return;
      const ctx = this.ctx;
      this.px += (this.tx - this.px) * 0.12;
      this.py += (this.ty - this.py) * 0.12;
      const e = { w: this.w, h: this.h, u: Math.min(this.w, this.h) / 100, P: this.h > this.w * 0.95, px: this.px, py: this.py };
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const scenes = this.tl.scenes;
      let i = scenes.findIndex((s) => this.t >= s.start && this.t < s.start + s.dur);
      if (i < 0) i = scenes.length - 1;
      const s = scenes[i];
      const lt = this.t - s.start;
      // Camera: a slow push through every scene and a projector's gate weave
      const now = performance.now() / 1000;
      const dt = Math.min(0.05, now - (this.lastDraw || now));
      this.lastDraw = now;
      const weave = this.playing && !reducedMotion ? [Math.sin(this.t * 37) * 0.35 + Math.sin(this.t * 91) * 0.2, Math.cos(this.t * 29) * 0.35] : [0, 0];
      const shoot = (c, sc, t) => {
        const push = reducedMotion ? 1 : 1 + 0.05 * E.io3(clamp(t / sc.dur));
        c.save();
        c.translate(e.w / 2 + weave[0], e.h / 2 + weave[1]);
        c.scale(push, push);
        c.translate(-e.w / 2, -e.h / 2);
        sc.draw(c, t, e);
        c.restore();
      };
      try {
        const burnIt = s.trans && lt < TR && i > 0 && this.burner && (s.trans === "iris" || s.trans === "blinds");
        if (burnIt) {
          // The last frame of the old scene burns away over the new one.
          const prev = scenes[i - 1];
          const cc = this.coverC.getContext("2d");
          cc.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
          shoot(cc, prev, prev.dur - 0.001);
          this.burner.setCover(this.coverC);
          shoot(ctx, s, lt);
          this.burner.draw(E.io3(lt / TR) * this.burner.END, now, dt);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.drawImage(this.burnC, 0, 0);
          ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        } else if (s.trans && lt < TR && i > 0) {
          const prev = scenes[i - 1];
          shoot(ctx, prev, prev.dur - 0.001);
          ctx.save();
          TRANSITIONS[s.trans](ctx, e, lt / TR);
          shoot(ctx, s, lt);
          ctx.restore();
        } else {
          shoot(ctx, s, lt);
        }
      } catch (err) {
        if (!this.warned && window.console) { console.warn("[reel]", err); this.warned = true; }
      }
      if (!reducedMotion) this.filmLook(ctx, e, s, lt);
      // Transport and labels
      const p = this.t / this.tl.duration;
      this.fig.style.setProperty("--p", p.toFixed(4));
      this.tcEl.textContent = tc(this.t);
      this.timeEl.textContent = `${fmt(this.t)} / ${fmt(this.tl.duration)}`;
      this.scrub.setAttribute("aria-valuenow", String(Math.round(this.t)));
      let ci = 0;
      this.tl.chapters.forEach((c, j) => { if (this.t >= c.t) ci = j; });
      if (ci !== this.chapter) {
        this.chapter = ci;
        this.chapterEl.textContent = `${String(ci + 1).padStart(2, "0")} · ${this.tl.chapters[ci].label}`;
        this.chapterEl.classList.remove("is-swapping");
        void this.chapterEl.offsetWidth;
        this.chapterEl.classList.add("is-swapping");
        this.chipBtns.forEach((b, j) => b.setAttribute("aria-current", j === ci ? "true" : "false"));
      }
      if (!this.playing && (Math.abs(this.tx - this.px) + Math.abs(this.ty - this.py) > 0.002)) this.requestDraw();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Mount                                                               */
  /* ------------------------------------------------------------------ */

  function mountCaseReel() {
    const slug = document.body.dataset.caseStudy;
    if (!slug || !FILMS[slug] || $("[data-reel]")) return;
    const hero = $(".case-hero");
    if (!hero) return;
    const section = document.createElement("section");
    section.className = "case-reel";
    section.setAttribute("aria-labelledby", "caseReelTitle");
    section.dataset.folio = "In motion";
    section.innerHTML = `
      <div class="reel-head">
        <div>
          <p class="reel-kicker"><i aria-hidden="true"></i>Motion desk &middot; ${FILMS[slug].name}</p>
          <h2 class="reel-title" id="caseReelTitle">The mechanism, <em>in motion</em></h2>
        </div>
        <p class="reel-note">A short film of how the product actually works. Tap to pause, drag the bar to scrub, pick a chapter to jump.</p>
      </div>
      <figure data-reel="${slug}"></figure>
    `;
    hero.insertAdjacentElement("afterend", section);
  }

  function mount() {
    mountCaseReel();
    $$("[data-reel]").forEach((fig) => {
      const film = FILMS[fig.dataset.reel];
      if (!film || fig._player) return;
      fig._player = new Player(fig, film);
    });
  }

  const start = () => {
    // Draw once fonts are in so the first frame is set in Playfair.
    const fonts = document.fonts && document.fonts.load
      ? Promise.all([document.fonts.load('900 40px "Playfair Display"'), document.fonts.load('italic 400 40px "Playfair Display"'), document.fonts.load('700 40px "Playfair Display"')]).catch(() => {})
      : Promise.resolve();
    mount();
    fonts.then(() => $$("[data-reel]").forEach((f) => f._player && f._player.draw()));
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

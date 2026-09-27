/*
  Fire, for the whole journal.

  One burn engine shared by the opening titles and every page change. A
  burn map is set once per screen size: each cell holds the moment the fire
  reaches it (distance from where it was lit, bent by fractal noise, so the
  front runs in fingers instead of circles). Each frame the threshold moves
  on and every cell near it is painted in bands:

      burnt through  |  ember edge  |  char  |  scorch  |  untouched

  plus embers thrown off the edge and a little smoke. The bands are painted
  at low resolution and scaled up, which gives the soft, glowing edge real
  paper has when it burns.

    PR_BURN.create(opts)   the renderer, for callers that own a canvas
    PR_BURN.consume(opts)  burn the page away from a point, into char
    PR_BURN.reveal(opts)   burn a cover (char by default) off the page
*/
(function () {
  "use strict";

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const EMBER = 0.016, CHAR = 0.05, SCORCH = 0.13;

  function makeNoise(seed) {
    let s = seed >>> 0 || 7;
    const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
    const perm = new Uint8Array(512);
    const vals = new Float32Array(256);
    for (let i = 0; i < 256; i += 1) { perm[i] = i; vals[i] = rnd(); }
    for (let i = 255; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    for (let i = 0; i < 256; i += 1) perm[i + 256] = perm[i];
    const sm = (t) => t * t * (3 - 2 * t);
    const v = (x, y) => vals[perm[(perm[x & 255] + y) & 511]];
    const n = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = sm(x - xi), yf = sm(y - yi);
      return lerp(lerp(v(xi, yi), v(xi + 1, yi), xf), lerp(v(xi, yi + 1), v(xi + 1, yi + 1), xf), yf);
    };
    n.fbm = (x, y) => (n(x, y) * 0.5 + n(x * 2.03, y * 2.03) * 0.25 + n(x * 4.1, y * 4.1) * 0.15 + n(x * 8.3, y * 8.3) * 0.1);
    n.rnd = rnd;
    return n;
  }

  function sprite(size, stops) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    x.fillStyle = g;
    x.fillRect(0, 0, size, size);
    return c;
  }
  const SMOKE = sprite(64, [[0, "rgba(58, 48, 42, 0.5)"], [0.5, "rgba(58, 48, 42, 0.18)"], [1, "rgba(58, 48, 42, 0)"]]);

  // The char: what is left when the paper is gone.
  function charSheet(w, h, dpr = 1, seed = 3) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    const x = c.getContext("2d");
    x.scale(dpr, dpr);
    x.fillStyle = "#130f0b";
    x.fillRect(0, 0, w, h);
    const g = x.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h / 2, Math.hypot(w, h) * 0.6);
    g.addColorStop(0, "rgba(58, 36, 22, 0.55)");
    g.addColorStop(1, "rgba(0, 0, 0, 0.4)");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    const n = makeNoise(seed);
    for (let i = 0; i < (w * h) / 900; i += 1) {
      const px = n.rnd() * w, py = n.rnd() * h;
      x.fillStyle = `rgba(${n.rnd() < 0.08 ? "255, 120, 40" : "90, 70, 55"}, ${0.08 + n.rnd() * 0.25})`;
      x.fillRect(px, py, 1 + n.rnd() * 1.5, 1 + n.rnd() * 1.5);
    }
    return c;
  }

  /*
    create({ canvas, mode: "reveal" | "consume", cover, origins, seed })
    origins: [{ x, y, delay }] in CSS px; delay is extra distance in px.
    Returns { draw(T, time, dt), size(w, h, dpr) } where T runs 0 -> END.
  */
  function create(opts) {
    const canvas = opts.canvas;
    const ctx = canvas.getContext("2d");
    const mode = opts.mode || "reveal";
    const noise = makeNoise(opts.seed || 11);
    let w = 0, h = 0, dpr = 1, cell = 5, gw = 0, gh = 0;
    let map = null, maskC = null, fxC = null, glowC = null, bloomC = null, maskD = null, fxD = null, glowD = null;
    let cover = opts.cover || null;
    let origins = opts.origins || [];
    const parts = [];
    const smoke = [];

    function size(W, H, DPR) {
      w = W; h = H; dpr = DPR;
      cell = Math.max(3, Math.round(Math.min(w, h) / 210));
      gw = Math.ceil(w / cell) + 1;
      gh = Math.ceil(h / cell) + 1;
      const mk = () => { const c = document.createElement("canvas"); c.width = gw; c.height = gh; return c; };
      maskC = mk(); fxC = mk(); glowC = mk();
      bloomC = document.createElement("canvas");
      bloomC.width = Math.max(1, Math.round(gw / 4));
      bloomC.height = Math.max(1, Math.round(gh / 4));
      maskD = maskC.getContext("2d").createImageData(gw, gh);
      fxD = fxC.getContext("2d").createImageData(gw, gh);
      glowD = glowC.getContext("2d").createImageData(gw, gh);
      build();
    }

    function build() {
      map = new Float32Array(gw * gh);
      const diag = Math.hypot(w, h);
      const f = 0.034 * (cell / 5) * Math.max(0.7, Math.min(1.4, 900 / Math.min(w, h)));
      let lo = Infinity, hi = -Infinity;
      for (let j = 0; j < gh; j += 1) {
        for (let i = 0; i < gw; i += 1) {
          const px = i * cell, py = j * cell;
          let d = Infinity;
          origins.forEach((o) => {
            // Fire climbs faster than it falls
            const rise = py < o.y ? -(o.y - py) * 0.16 : (py - o.y) * 0.1;
            d = Math.min(d, Math.hypot(px - o.x, py - o.y) + rise + (o.delay || 0));
          });
          const v = d + (noise.fbm(i * f, j * f) - 0.5) * diag * 0.4;
          map[j * gw + i] = v;
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
      const span = hi - lo || 1;
      for (let k = 0; k < map.length; k += 1) map[k] = (map[k] - lo) / span;
    }

    function spawn(dt, T) {
      const tries = Math.round(900 * dt * 60 / 60 * (w * h > 900000 ? 1.4 : 1));
      for (let n = 0; n < tries && parts.length < 420; n += 1) {
        const k = Math.floor(noise.rnd() * map.length);
        const d = map[k] - T;
        if (d < 0 || d > EMBER * 1.6) continue;
        const i = k % gw, j = Math.floor(k / gw);
        if (noise.rnd() < 0.55) {
          parts.push({ x: i * cell, y: j * cell, vx: (noise.rnd() - 0.5) * 60, vy: -40 - noise.rnd() * 150, life: 0.5 + noise.rnd() * 1.1, age: 0, s: 0.8 + noise.rnd() * 2.2, heat: noise.rnd() });
        } else if (smoke.length < 70 && noise.rnd() < 0.18) {
          smoke.push({ x: i * cell, y: j * cell, vx: (noise.rnd() - 0.5) * 20, vy: -25 - noise.rnd() * 35, life: 1 + noise.rnd() * 1.4, age: 0, r: 14 + noise.rnd() * 26 });
        }
      }
    }

    function bands(T, time) {
      const m = maskD.data, fx = fxD.data, gl = glowD.data;
      const flick = time * 1.7;
      for (let k = 0, p = 0; k < map.length; k += 1, p += 4) {
        let d = map[k] - T;
        if (d > SCORCH + 0.02) { m[p + 3] = 0; fx[p + 3] = 0; gl[p + 3] = 0; continue; }
        if (d < -EMBER * 1.2) { m[p + 3] = 255; fx[p + 3] = 0; gl[p + 3] = 0; continue; }
        const i = k % gw, j = (k - i) / gw;
        d += (noise(i * 0.35 + flick, j * 0.35 - flick) - 0.5) * 0.008;
        // Burnt through
        m[p + 3] = d < 0 ? Math.round(clamp(-d / 0.004) * 255) : 0;
        // Char and scorch on what is left
        const ch = d >= 0 ? clamp(1 - d / CHAR) : 1;
        const sc = d >= 0 ? clamp(1 - d / SCORCH) : 1;
        fx[p] = Math.round(lerp(128, 18, ch));
        fx[p + 1] = Math.round(lerp(78, 11, ch));
        fx[p + 2] = Math.round(lerp(34, 6, ch));
        fx[p + 3] = Math.round(Math.max(sc * sc * 150, ch * ch * 245));
        // The live edge
        let e = 0;
        if (d >= 0 && d < EMBER) e = 1 - d / EMBER;
        else if (d < 0 && d > -EMBER * 1.2) e = (1 + d / (EMBER * 1.2)) * 0.75;
        if (e > 0) {
          const hot = e * e;
          gl[p] = 255;
          gl[p + 1] = Math.round(lerp(70, 210, hot));
          gl[p + 2] = Math.round(lerp(10, 120, hot * hot));
          gl[p + 3] = Math.round(e * 255 * (0.8 + 0.2 * noise(i * 0.6 - flick * 3, j * 0.6)));
        } else gl[p + 3] = 0;
      }
      maskC.getContext("2d").putImageData(maskD, 0, 0);
      fxC.getContext("2d").putImageData(fxD, 0, 0);
      glowC.getContext("2d").putImageData(glowD, 0, 0);
      const b = bloomC.getContext("2d");
      b.clearRect(0, 0, bloomC.width, bloomC.height);
      b.drawImage(glowC, 0, 0, bloomC.width, bloomC.height);
    }

    function draw(T, time, dt) {
      if (!map) return;
      bands(T, time);
      if (dt > 0) spawn(dt, T);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      const W = gw * cell, H = gh * cell;
      if (mode === "reveal") {
        if (cover) ctx.drawImage(cover, 0, 0, w, h);
        ctx.globalCompositeOperation = "destination-out";
        ctx.drawImage(maskC, 0, 0, W, H);
        ctx.globalCompositeOperation = "source-atop";
        ctx.drawImage(fxC, 0, 0, W, H);
      } else {
        if (!cover) cover = charSheet(w, h, 1);
        ctx.drawImage(cover, 0, 0, w, h);
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(maskC, 0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(fxC, 0, 0, W, H);
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(glowC, 0, 0, W, H);
      ctx.globalAlpha = 0.85;
      ctx.drawImage(bloomC, -cell * 2, -cell * 2, W + cell * 4, H + cell * 4);
      ctx.globalAlpha = 1;
      // Embers
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const q = parts[i];
        q.age += dt;
        if (q.age > q.life) { parts.splice(i, 1); continue; }
        q.vx += (noise(q.x * 0.01, time * 2 + i) - 0.5) * 240 * dt;
        q.vy -= 30 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        const a = 1 - q.age / q.life;
        const g = Math.round(lerp(90, 220, q.heat * a));
        ctx.fillStyle = `rgba(255, ${g}, ${Math.round(g * 0.35)}, ${a * (0.7 + 0.3 * Math.sin(time * 30 + i))})`;
        ctx.fillRect(q.x, q.y, q.s, q.s);
      }
      ctx.globalCompositeOperation = "source-over";
      for (let i = smoke.length - 1; i >= 0; i -= 1) {
        const q = smoke[i];
        q.age += dt;
        if (q.age > q.life) { smoke.splice(i, 1); continue; }
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        const a = Math.sin((q.age / q.life) * Math.PI) * 0.55;
        const r = q.r * (1 + q.age * 0.8);
        ctx.globalAlpha = a;
        ctx.drawImage(SMOKE, q.x - r, q.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }

    return {
      size, draw,
      setCover: (c) => { cover = c; },
      setOrigins: (o) => { origins = o; if (map) build(); },
      END: 1 + SCORCH + 0.03
    };
  }

  /* ---------------------------------------------------------------- */
  /* Full-screen runs for page changes                                  */
  /* ---------------------------------------------------------------- */

  function overlay(z) {
    const c = document.createElement("canvas");
    c.className = "pr-burn";
    c.setAttribute("aria-hidden", "true");
    c.style.cssText = `position:fixed;inset:0;width:100%;height:100%;z-index:${z};pointer-events:none;display:block`;
    document.body.appendChild(c);
    return c;
  }

  function run(mode, opts = {}) {
    const z = opts.zIndex || 6100;
    const canvas = opts.canvas || overlay(z);
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const origins = opts.origins || [{ x: w / 2, y: h / 2 }];
    const b = create({ canvas, mode, cover: opts.cover || (mode === "reveal" ? charSheet(w, h, 1) : null), origins, seed: opts.seed || Math.floor(Math.random() * 1e6) });
    b.size(w, h, dpr);
    const dur = (opts.duration || 0.9) * 1000;
    return new Promise((resolve) => {
      let start = 0, last = 0;
      const frame = (now) => {
        if (!start) { start = now; last = now; }
        const p = clamp((now - start) / dur);
        const eased = mode === "consume" ? Math.pow(p, 1.25) : 1 - Math.pow(1 - p, 1.6);
        b.draw(eased * b.END, now / 1000, Math.min(0.05, (now - last) / 1000));
        last = now;
        if (opts.onFrame) opts.onFrame(p);
        if (p < 1) { window.requestAnimationFrame(frame); return; }
        if (mode === "reveal" && !opts.keep) canvas.remove();
        resolve(canvas);
      };
      window.requestAnimationFrame(frame);
    });
  }

  window.PR_BURN = {
    create,
    charSheet,
    consume: (opts) => run("consume", opts),
    reveal: (opts) => run("reveal", opts)
  };
})();

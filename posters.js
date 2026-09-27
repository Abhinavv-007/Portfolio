/*
  Motion posters: every product, paper and case-study image on the site,
  printed in and kept alive.

  The posters are the real illustrated prints. Each one is drawn on a
  canvas laid over its <img> (which keeps its place, size and alt text):

    print   the first time it scrolls into view an ink roller runs down
            the sheet and the art comes up through a halftone screen
    live    a slow cinematic push and drift, a light that sweeps across
            the print every few seconds, a little film grain
    hover   the sheet leans towards the pointer and a lamp follows it

  Posters only draw while they are on screen, at about 30 frames a second.
  With reduced motion the canvas is skipped and the plain image shows.
*/
(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !document.createElement("canvas").getContext) return;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const io3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const PAPER = "#ece2d0";
  const PRINT = 1.5;

  const isPoster = (src) => /assets\/(projects\/(short|detailed)|case-studies)\//.test(src);

  // One grain tile for every poster
  const grain = document.createElement("canvas");
  grain.width = grain.height = 128;
  (() => {
    const g = grain.getContext("2d");
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  })();

  const cache = new Map();
  function artFor(src) {
    if (cache.has(src)) return cache.get(src);
    const a = { img: new Image(), ready: false, dots: null, cols: 0, rows: 0 };
    a.img.decoding = "async";
    a.img.onload = () => {
      a.ready = true;
      // A luminance grid for the halftone print-in
      const cols = 64;
      const rows = Math.max(1, Math.round((cols * a.img.naturalHeight) / a.img.naturalWidth));
      const c = document.createElement("canvas");
      c.width = cols;
      c.height = rows;
      const x = c.getContext("2d");
      x.drawImage(a.img, 0, 0, cols, rows);
      try {
        const d = x.getImageData(0, 0, cols, rows).data;
        a.dots = new Float32Array(cols * rows);
        for (let i = 0; i < cols * rows; i += 1) a.dots[i] = 1 - (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
        a.cols = cols;
        a.rows = rows;
      } catch (_) { a.dots = null; }
      posters.forEach((p) => { if (p.art === a) { place(p); wake(); } });
    };
    a.img.src = src;
    cache.set(src, a);
    return a;
  }

  /* ---------------------------------------------------------------- */
  /* One poster                                                        */
  /* ---------------------------------------------------------------- */

  // Where the art sits inside the <img> box (object-fit: contain)
  function fitRect(p) {
    const { img } = p.art;
    const ar = img.naturalWidth / img.naturalHeight || 1;
    let w = p.w, h = p.w / ar;
    if (h > p.h) { h = p.h; w = h * ar; }
    return { x: (p.w - w) / 2, y: (p.h - h) / 2, w, h };
  }

  function draw(p, now) {
    const { ctx } = p;
    const t = now - p.seed * 10;
    ctx.setTransform(p.dpr, 0, 0, p.dpr, 0, 0);
    ctx.clearRect(0, 0, p.w, p.h);
    if (!p.art.ready) return;
    const R = fitRect(p);
    const age = p.printedAt ? (now - p.printedAt) : 0;
    const pr = p.printedAt ? seg(age, 0, PRINT) : 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(R.x, R.y, R.w, R.h);
    ctx.clip();
    ctx.fillStyle = PAPER;
    ctx.fillRect(R.x, R.y, R.w, R.h);

    // The roller's line: everything above it has been printed
    const roll = io3(seg(age, 0, PRINT * 0.62));
    const rollY = R.y + roll * (R.h + 12);

    // Halftone: the dot screen comes up first, the full print follows
    const a = p.art;
    if (a.dots && pr < 1) {
      const cell = R.w / a.cols;
      ctx.fillStyle = "#1c1a16";
      for (let j = 0; j < a.rows; j += 1) {
        const cy = R.y + (j + 0.5) * cell;
        if (cy > rollY) break;
        const grow = clamp((rollY - cy) / (R.h * 0.25));
        for (let i = 0; i < a.cols; i += 1) {
          const v = a.dots[j * a.cols + i];
          const r = Math.sqrt(v) * cell * 0.62 * grow;
          if (r < 0.3) continue;
          ctx.beginPath();
          ctx.arc(R.x + (i + 0.5) * cell, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // The print itself, pushed in slowly and leaning toward the pointer
    const show = pr >= 1 ? 1 : io3(seg(age, PRINT * 0.45, PRINT));
    if (show > 0) {
      const push = 1.035 + 0.035 * (0.5 + 0.5 * Math.sin(t * 0.32));
      const dx = Math.sin(t * 0.21) * R.w * 0.012 - p.px * R.w * 0.03;
      const dy = Math.cos(t * 0.17) * R.h * 0.012 - p.py * R.h * 0.03;
      ctx.globalAlpha = show;
      ctx.translate(R.x + R.w / 2 + dx, R.y + R.h / 2 + dy);
      ctx.scale(push, push);
      ctx.drawImage(a.img, -R.w / 2, -R.h / 2, R.w, R.h);
      ctx.setTransform(p.dpr, 0, 0, p.dpr, 0, 0);
      ctx.globalAlpha = 1;
    }

    // The ink roller running down the sheet
    if (roll > 0 && roll < 1) {
      const g = ctx.createLinearGradient(0, rollY - 14, 0, rollY + 10);
      g.addColorStop(0, "rgba(23, 22, 18, 0)");
      g.addColorStop(0.55, "rgba(23, 22, 18, 0.55)");
      g.addColorStop(0.7, "rgba(255, 250, 240, 0.7)");
      g.addColorStop(1, "rgba(23, 22, 18, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(R.x, rollY - 14, R.w, 24);
    }

    // A light that runs across the print every few seconds
    const cycle = (t % 7.5) / 7.5;
    const sw = seg(cycle, 0.08, 0.34);
    if (sw > 0 && sw < 1 && pr >= 1) {
      const x = lerp(R.x - R.w * 0.6, R.x + R.w * 1.6, io3(sw));
      const g = ctx.createLinearGradient(x - R.w * 0.25, R.y, x + R.w * 0.25, R.y + R.h * 0.4);
      g.addColorStop(0, "rgba(255, 252, 244, 0)");
      g.addColorStop(0.5, "rgba(255, 252, 244, 0.32)");
      g.addColorStop(1, "rgba(255, 252, 244, 0)");
      ctx.globalCompositeOperation = "soft-light";
      ctx.fillStyle = g;
      ctx.fillRect(R.x, R.y, R.w, R.h);
      ctx.globalCompositeOperation = "source-over";
    }

    // The lamp: brighter where the pointer is, darker at the edges
    const lx = R.x + R.w * (0.5 + p.px * 0.9), ly = R.y + R.h * (0.42 + p.py * 0.9);
    const lamp = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.max(R.w, R.h) * 0.85);
    lamp.addColorStop(0, `rgba(255, 246, 228, ${0.1 + p.hover * 0.14})`);
    lamp.addColorStop(0.55, "rgba(255, 246, 228, 0)");
    lamp.addColorStop(1, `rgba(28, 20, 12, ${0.2 + p.hover * 0.08})`);
    ctx.fillStyle = lamp;
    ctx.fillRect(R.x, R.y, R.w, R.h);

    // Grain
    ctx.globalAlpha = 0.05;
    ctx.globalCompositeOperation = "overlay";
    const ox = Math.floor(Math.random() * 128), oy = Math.floor(Math.random() * 128);
    ctx.translate(-ox, -oy);
    ctx.fillStyle = p.grain || (p.grain = ctx.createPattern(grain, "repeat"));
    ctx.fillRect(R.x + ox, R.y + oy, R.w, R.h);
    ctx.setTransform(p.dpr, 0, 0, p.dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ---------------------------------------------------------------- */
  /* Mounting and the clock                                            */
  /* ---------------------------------------------------------------- */

  const posters = [];

  function mountImage(img) {
    if (img.dataset.poster) return;
    const src = img.getAttribute("src") || "";
    if (!isPoster(src)) return;
    img.dataset.poster = "1";
    const canvas = document.createElement("canvas");
    canvas.className = "pr-poster";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;pointer-events:none;display:block;z-index:1";
    img.insertAdjacentElement("afterend", canvas);
    img.style.opacity = "0";
    const p = { img, canvas, ctx: canvas.getContext("2d"), art: artFor(img.currentSrc || img.src), visible: false, px: 0, py: 0, tx: 0, ty: 0, hover: 0, th: 0, seed: Math.random(), printedAt: 0, w: 0, h: 0, dpr: 1 };
    const host = img.closest("a, figure, article, .project-image") || img.parentElement;
    host.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      p.tx = clamp((e.clientX - r.left) / r.width, 0, 1) - 0.5;
      p.ty = clamp((e.clientY - r.top) / r.height, 0, 1) - 0.5;
      p.th = 1;
      wake();
    });
    host.addEventListener("pointerleave", () => { p.tx = 0; p.ty = 0; p.th = 0; });
    posters.push(p);
    place(p);
    if ("ResizeObserver" in window) new ResizeObserver(() => place(p)).observe(img);
    if (io) io.observe(img); else { p.visible = true; p.printedAt = performance.now() / 1000; }
  }

  function place(p) {
    const { img, canvas } = p;
    const w = img.offsetWidth, h = img.offsetHeight;
    if (!w || !h) return;
    canvas.style.left = `${img.offsetLeft}px`;
    canvas.style.top = `${img.offsetTop}px`;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.style.borderRadius = window.getComputedStyle(img).borderRadius;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    p.grain = null;
    p.w = w; p.h = h; p.dpr = dpr;
    draw(p, performance.now() / 1000);
  }

  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const p = posters.find((x) => x.img === e.target);
      if (!p) return;
      p.visible = e.isIntersecting;
      if (p.visible) {
        if (!p.printedAt && e.intersectionRatio > 0.2) p.printedAt = performance.now() / 1000;
        place(p);
        wake();
      }
    });
  }, { threshold: [0, 0.2, 0.5], rootMargin: "60px" }) : null;

  let raf = 0;
  let flip = false;
  let tick = 0;
  // Phones and low-power machines idle at about 15 frames a second once a
  // poster has printed; everything else at about 30.
  const lowPower = window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const loop = (ms) => {
    raf = 0;
    const live = posters.filter((p) => p.visible);
    if (!live.length || document.hidden) return;
    const now = ms / 1000;
    tick += 1;
    flip = lowPower ? tick % 4 === 0 : tick % 2 === 0;
    live.forEach((p) => {
      if (!p.printedAt) {
        const r = p.img.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.85 && r.bottom > 0) p.printedAt = now;
      }
      p.px += (p.tx - p.px) * 0.08;
      p.py += (p.ty - p.py) * 0.08;
      p.hover += (p.th - p.hover) * 0.08;
      // Full rate while printing, about 30 a second after that
      if (flip || (p.printedAt && now - p.printedAt < PRINT)) draw(p, now);
    });
    raf = window.requestAnimationFrame(loop);
  };
  const wake = () => { if (!raf) raf = window.requestAnimationFrame(loop); };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });

  const scan = (root = document) => {
    root.querySelectorAll("img").forEach(mountImage);
  };
  scan();
  // Parts of the page are rendered later (filters, case files): keep watching.
  new MutationObserver((records) => {
    records.forEach((r) => r.addedNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      if (n.tagName === "IMG") mountImage(n); else scan(n);
    }));
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", () => posters.forEach(place));
})();

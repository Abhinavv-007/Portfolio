/*
  Paper-cut scenery.

  Strips of cut paper between the journal's sections: four or five sheets
  cut into mountains, hills and waves, stacked with their own shadows, the
  front sheet in the page's own colour so the scene looks cut out of the
  page itself. A paper sun sits behind them, a few stars are pinned above,
  and a folded paper plane glides through when the strip arrives.

  As a strip comes into view its sheets pop up one after another like a
  pop-up book; while it is on screen the sheets slide past each other with
  the scroll, the nearest moving most. Decorative only: aria-hidden, no
  pointer events, nothing at all for reduced motion beyond the still scene.
*/
(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const NS = "http://www.w3.org/2000/svg";

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  }

  // Each sheet: a cut, a colour, how high it reaches and how far it drifts.
  const SHEETS = [
    { cut: "peaks", fill: "#1a1916", top: 0.12, low: 0.48, depth: 0.6 },
    { cut: "hills", fill: "#a33128", top: 0.3, low: 0.6, depth: 1.1 },
    { cut: "waves", fill: "#c7b8a4", top: 0.46, low: 0.7, depth: 1.7 },
    { cut: "hills", fill: "#eadfce", top: 0.6, low: 0.8, depth: 2.4 },
    { cut: "pinking", fill: "var(--paper, #d6ccbd)", top: 0.8, low: 0.88, depth: 3.2 }
  ];

  // A cut line across a 1200 x 100 sheet, filled down to the bottom edge.
  function cutPath(kind, top, low, r) {
    const H = 100, W = 1200;
    const yAt = () => (top + (low - top) * r()) * H;
    let d = `M-40,${H + 2} L-40,${yAt().toFixed(1)}`;
    if (kind === "peaks") {
      for (let x = -40; x < W + 40;) {
        const step = 70 + r() * 130;
        d += ` L${(x + step / 2).toFixed(1)},${yAt().toFixed(1)} L${(x + step).toFixed(1)},${(low * H + r() * 8).toFixed(1)}`;
        x += step;
      }
    } else if (kind === "pinking") {
      for (let x = -40; x < W + 40; x += 14) d += ` L${x + 7},${(top * H - 3).toFixed(1)} L${x + 14},${(top * H + 3).toFixed(1)}`;
    } else {
      const span = kind === "waves" ? 90 : 190;
      let x = -40, y = yAt();
      while (x < W + 40) {
        const nx = x + span * (0.7 + r() * 0.6);
        const ny = yAt();
        d += ` Q${((x + nx) / 2).toFixed(1)},${(Math.min(y, ny) - (kind === "waves" ? 10 : 18) * r()).toFixed(1)} ${nx.toFixed(1)},${ny.toFixed(1)}`;
        x = nx;
        y = ny;
      }
    }
    return `${d} L${W + 40},${H + 2} Z`;
  }

  const PLANE = `<svg viewBox="0 0 60 30" aria-hidden="true"><path d="M2 14 58 2 22 18Z" fill="#fbf6ec" stroke="#1a1916" stroke-width="1.4" stroke-linejoin="round"/><path d="M22 18 58 2 30 28Z" fill="#e6dac6" stroke="#1a1916" stroke-width="1.4" stroke-linejoin="round"/><path d="M22 18 26 26 30 28" fill="#c7b8a4" stroke="#1a1916" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
  const STAR = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1 12.6 7.2 19 7.6 14 11.8 15.6 18.4 10 14.8 4.4 18.4 6 11.8 1 7.6 7.4 7.2Z" fill="#f2b705" stroke="#1a1916" stroke-width="1.1" stroke-linejoin="round"/></svg>`;

  function scene(seed) {
    const r = rng(seed);
    const root = document.createElement("div");
    root.className = "pc-scene";
    root.setAttribute("aria-hidden", "true");
    const sun = document.createElement("span");
    sun.className = "pc-sun";
    sun.style.left = `${(12 + r() * 70).toFixed(1)}%`;
    root.appendChild(sun);
    for (let i = 0; i < 3; i += 1) {
      const st = document.createElement("span");
      st.className = "pc-star";
      st.style.left = `${(8 + r() * 84).toFixed(1)}%`;
      st.style.top = `${(4 + r() * 22).toFixed(1)}%`;
      st.style.setProperty("--d", `${(i * 0.7 + r()).toFixed(2)}s`);
      st.innerHTML = STAR;
      root.appendChild(st);
    }
    SHEETS.forEach((sheet, i) => {
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("class", `pc-sheet pc-sheet--${i}`);
      svg.setAttribute("viewBox", "0 0 1200 100");
      svg.setAttribute("preserveAspectRatio", "none");
      svg.style.setProperty("--i", String(i));
      svg.style.setProperty("--depth", String(sheet.depth));
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", cutPath(sheet.cut, sheet.top, sheet.low, r));
      path.setAttribute("fill", sheet.fill.startsWith("var") ? "#d6ccbd" : sheet.fill);
      if (sheet.fill.startsWith("var")) path.style.fill = sheet.fill;
      svg.appendChild(path);
      root.appendChild(svg);
    });
    const plane = document.createElement("span");
    plane.className = "pc-plane";
    plane.innerHTML = PLANE;
    if (r() < 0.5) plane.classList.add("is-rtl");
    root.appendChild(plane);
    return root;
  }

  /* ---------------------------------------------------------------- */
  /* Where the strips go                                               */
  /* ---------------------------------------------------------------- */

  const main = document.querySelector("main");
  if (!main) return;
  const spots = [];
  $$(".page-headline", main).forEach((el) => spots.push([el, "afterend"]));
  $$(".reel-section, .home-close, .sec-method, .sec-disclosure, #research, #certificates", main).forEach((el) => spots.push([el, "beforebegin"]));
  const footer = main.querySelector(":scope > .footer");
  if (footer) spots.push([footer, "beforebegin"]);

  const scenes = [];
  spots.forEach(([el, where], n) => {
    const prev = where === "afterend" ? el.nextElementSibling : el.previousElementSibling;
    if (prev && prev.classList.contains("pc-scene")) return;
    const s = scene(1301 + n * 97 + (document.body.dataset.page || "").length * 13);
    el.insertAdjacentElement(where, s);
    scenes.push(s);
  });
  if (!scenes.length) return;
  if (reduced || !("IntersectionObserver" in window)) { scenes.forEach((s) => s.classList.add("is-up", "is-still")); return; }

  // Pop up as they arrive; the plane only flies the first time.
  const live = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      e.target.classList.toggle("is-live", e.isIntersecting);
      if (e.isIntersecting) {
        live.add(e.target);
        if (!e.target.classList.contains("is-up")) window.setTimeout(() => e.target.classList.add("is-up"), 60);
      } else live.delete(e.target);
    });
    request();
  }, { threshold: 0.15 });
  scenes.forEach((s) => io.observe(s));

  let frame = 0;
  const drift = () => {
    frame = 0;
    const vh = window.innerHeight;
    live.forEach((s) => {
      const rect = s.getBoundingClientRect();
      const p = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - vh / 2) / (vh / 2)));
      s.style.setProperty("--p", p.toFixed(3));
    });
  };
  const request = () => { if (!frame) frame = window.requestAnimationFrame(drift); };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
})();

/*
  Miko, the journal's guide: the sleep dock.

  When you say no (or send him off), Miko no longer hangs off the page
  edge. He curls up small in a quiet bottom corner and naps there, 72 to
  96 pixels tall (60 to 78 on phones), until you tap him: then he rubs an
  eye, stretches, and grows back into his usual self on the same spot.

  The drawings are the v4 sleep-dock pack, played with its manifest timings:

    settling -> sleeping               curling up, then the nap (held)
    waking -> stretching -> idle       an eye opens, a big stretch, and the
                                       stage's own Miko takes over again

  While he naps the dock is all there is of him: no speech, tour bar or
  effects, and nothing that walks, glides, drags or follows the pointer.
  It keeps clear of the site's own controls (the press dock, toasts, the
  menu) and of anything worth reading or pressing: bottom-right first,
  bottom-left if that is taken, just above a bottom bar if both are. If
  there is nowhere clear, he fades out until there is.
*/
(function () {
  "use strict";

  const N = window.NAV;
  if (!N) return;
  const { rig, stage } = N;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wait = (ms) => new Promise((r) => window.setTimeout(r, ms));
  const frame = () => new Promise((r) => window.requestAnimationFrame(() => r()));

  /* ---------------------------------------------------------------- */
  /* The pack                                                          */
  /* ---------------------------------------------------------------- */

  // The embedded copy lets him nap before the manifest arrives; the
  // manifest then refreshes paths, timings, sizes and the label.
  const ROOT = "/mascot/assets/miko-sleepdock-v4/";
  const VERSION = "67";
  const PACK = {
    canvas: { width: 384, height: 512 },
    states: {
      settling: { src: "./web/01-settle-to-sleep.webp", durationMs: 420, next: "sleeping" },
      sleeping: { src: "./web/02-docked-sleep.webp", durationMs: null },
      waking: { src: "./web/03-tap-to-wake.webp", durationMs: 350, next: "stretching" },
      stretching: { src: "./web/04-awake-stretch.webp", durationMs: 450, next: "idle" }
    },
    display: { desktopHeightPx: [72, 96], mobileHeightPx: [60, 78], safeInsetPx: [12, 16], preferredCorner: "bottom-right", fallbackCorner: "bottom-left" }
  };
  const CORNERS = { "bottom-right": "right", "bottom-left": "left" };
  // Where each drawing's lowest painted pixel sits, as a share of the
  // canvas height, so every state rests on the same line as they swap.
  const FOOT = { settling: 423 / 512, sleeping: 429 / 512, waking: 483 / 512, stretching: 475 / 512 };
  // The button is the lower part of the canvas, where the curled-up
  // drawing is; the empty sky above it never takes a click.
  const HIT = 0.7;

  const within = (v, a, b) => typeof v === "number" && v >= a && v <= b;
  const pair = (v, a, b) => (Array.isArray(v) && v.length === 2 && v.every((n) => within(n, a, b)) ? [Math.min(v[0], v[1]), Math.max(v[0], v[1])] : null);
  const SAFE_SRC = /^(\.\/)?web\/[\w.-]+\.webp$/;

  // The manifest is data from the network: only known keys, sane values.
  function adopt(m) {
    if (!m || typeof m !== "object") return;
    const S = m.states && typeof m.states === "object" ? m.states : {};
    Object.keys(PACK.states).forEach((id) => {
      const s = S[id];
      const d = PACK.states[id];
      if (!s || typeof s !== "object") return;
      if (typeof s.src === "string" && SAFE_SRC.test(s.src) && !s.src.includes("..")) d.src = s.src;
      if (d.durationMs != null && within(s.durationMs, 0, 3000)) d.durationMs = s.durationMs;
      if (d.next && typeof s.next === "string" && (PACK.states[s.next] || s.next === "idle")) d.next = s.next;
    });
    const C = m.canvas || {};
    if (within(C.width, 16, 4096) && within(C.height, 16, 4096)) PACK.canvas = { width: C.width, height: C.height };
    const D = m.display || {};
    const P = PACK.display;
    P.desktopHeightPx = pair(D.desktopHeightPx, 32, 200) || P.desktopHeightPx;
    P.mobileHeightPx = pair(D.mobileHeightPx, 32, 200) || P.mobileHeightPx;
    P.safeInsetPx = pair(D.safeInsetPx, 0, 48) || P.safeInsetPx;
    if (CORNERS[D.preferredCorner]) P.preferredCorner = D.preferredCorner;
    if (CORNERS[D.fallbackCorner]) P.fallbackCorner = D.fallbackCorner;
    const label = m.accessibility && m.accessibility.ariaLabel;
    if (typeof label === "string" && label.trim()) dock.setAttribute("aria-label", label.trim().slice(0, 80));
  }

  let manifest = null;
  const loadManifest = () => manifest || (manifest = (window.fetch
    ? fetch(`${ROOT}manifest.json?v=${VERSION}`).then((res) => (res.ok ? res.json() : null)).catch(() => null)
    : Promise.resolve(null)).then(adopt));

  /* ---------------------------------------------------------------- */
  /* The dock: a real button, with the four drawings stacked inside     */
  /* ---------------------------------------------------------------- */

  const dock = document.createElement("button");
  dock.type = "button";
  dock.className = "nav-dock";
  dock.hidden = true;
  dock.setAttribute("aria-label", "Wake Miko");
  dock.style.setProperty("--dock-hit", HIT);
  dock.innerHTML = `<i class="nav-dock-shadow" aria-hidden="true"></i><span class="nav-dock-art" aria-hidden="true"></span>`;
  const art = dock.querySelector(".nav-dock-art");
  // One <img> per state, all decoded up front: a swap is a class change,
  // so no drawing can ever flash blank mid-sequence.
  const imgs = {};
  Object.keys(PACK.states).forEach((id) => {
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.draggable = false;
    img.dataset.state = id;
    img.style.translate = `0 ${((1 - FOOT[id]) * 100).toFixed(2)}%`;
    art.appendChild(img);
    imgs[id] = img;
  });
  stage.appendChild(dock);

  let preloaded = null;
  function preload() {
    if (preloaded) return preloaded;
    preloaded = loadManifest().then(() => Promise.all(Object.keys(imgs).map((id) => new Promise((resolve) => {
      const img = imgs[id];
      const ok = () => resolve(true);
      img.onload = () => (img.decode ? img.decode().then(ok, ok) : ok());
      img.onerror = () => resolve(false);
      img.src = `${ROOT}${PACK.states[id].src.replace(/^\.\//, "")}?v=${VERSION}`;
    }))));
    return preloaded;
  }

  /* ---------------------------------------------------------------- */
  /* Size and place                                                    */
  /* ---------------------------------------------------------------- */

  let H = 96, W = 72, inset = 16;
  let side = null;
  function size() {
    const phone = N.vw() <= 640;
    const D = PACK.display;
    const [lo, hi] = phone ? D.mobileHeightPx : D.desktopHeightPx;
    H = Math.round(clamp(N.vh() * 0.105, lo, hi));
    W = H * (PACK.canvas.width / PACK.canvas.height);
    inset = phone ? D.safeInsetPx[0] : D.safeInsetPx[1];
    dock.style.setProperty("--dock-h", `${H}px`);
    dock.style.setProperty("--dock-w", `${W.toFixed(1)}px`);
  }

  // Centre x and distance from the bottom edge; g scales the drawing
  // about its feet. With ms the move eases, without it snaps.
  function put(cx, bottom, g, ms) {
    const snap = !ms;
    dock.classList.toggle("is-snap", snap);
    if (!snap) dock.style.setProperty("--dock-t", `${Math.round(ms)}ms`);
    dock.style.left = `${cx.toFixed(1)}px`;
    dock.style.bottom = `${bottom.toFixed(1)}px`;
    dock.style.setProperty("--dock-grow", g.toFixed(3));
    if (snap) { void dock.offsetWidth; dock.classList.remove("is-snap"); }
  }

  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const pad = (b, p) => ({ left: b.left - p, right: b.right + p, top: b.top - p, bottom: b.bottom + p });

  // The site's own fixed furniture. Layers fixed straight onto <body> are
  // found by themselves; these are named in case one is nested deeper.
  const FURNITURE = "[data-miko-avoid], .press-dock, .press-index, .pr-toast, .pm-toast, .pm-sheet, .menu-curtain, .palette";
  function furniture() {
    const vw = N.vw(), vh = N.vh();
    const out = { rects: [], modal: false };
    new Set([...document.body.children, ...document.querySelectorAll(FURNITURE)]).forEach((el) => {
      if (el === stage || /^(SCRIPT|STYLE|LINK|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) return;
      const cs = window.getComputedStyle(el);
      if ((cs.position !== "fixed" && cs.position !== "sticky") || cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) return;
      let r = el.getBoundingClientRect();
      // The press dock slides away as you read on; its resting place stays
      // reserved, so he doesn't bob up and down with it.
      if (el.classList.contains("press-dock")) {
        const b = parseFloat(cs.bottom) || 0;
        r = { left: r.left, right: r.right, top: vh - b - el.offsetHeight, bottom: vh - b };
      }
      const w = r.right - r.left, h = r.bottom - r.top;
      if (w < 1 || h < 1 || r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return;
      const inert = cs.pointerEvents === "none";
      // Something covering most of the screen (the menu, the command desk)
      if (w * h > vw * vh * 0.5) { if (!inert) out.modal = true; return; }
      if (inert && !el.textContent.trim()) return; // grain, ink blots, paper planes
      out.rects.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
    });
    return out;
  }

  // Page content under him: anything pressable within an inset of his
  // box, or words or pictures under the box itself. The topmost thing at a
  // grid of points gives the blocks that reach his corner; each is then
  // searched, but only down the branches that overlap it, so a thin row of
  // links between two points is still found. Decoration (aria-hidden) and
  // anything unseen is looked through.
  const PRESSABLE = "a[href], button, input, select, textarea, label, summary, iframe, video[controls], audio[controls], [role='button'], [role='link'], [role='tab'], [role='menuitem'], [role='checkbox'], [role='switch'], [contenteditable=''], [contenteditable='true'], [tabindex]:not([tabindex='-1'])";
  const PICTURE = "img:not([alt='']), video, [role='img']";
  const range = document.createRange();
  const seen = (el) => !el.checkVisibility || el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  function busy(root, box, near) {
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (n.nodeType === 3) return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        if (n === stage || n.getAttribute("aria-hidden") === "true") return NodeFilter.FILTER_REJECT;
        const r = n.getBoundingClientRect();
        if (!r.width || !r.height) return NodeFilter.FILTER_SKIP; // display: contents and the like
        return overlaps(r, near) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    for (let n = root, i = 0; n && i < 600; n = walk.nextNode(), i += 1) {
      if (n.nodeType === 3) {
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) if (overlaps(r, box) && seen(n.parentElement)) return true;
      } else if (n.matches(PRESSABLE) || (n.matches(PICTURE) && overlaps(n.getBoundingClientRect(), box))) {
        if (seen(n)) return true;
      }
    }
    return false;
  }
  function contentUnder(box) {
    const vw = N.vw(), vh = N.vh();
    const near = pad(box, inset);
    const roots = new Set();
    for (let i = 0; i < 4; i += 1) {
      for (let j = 0; j < 4; j += 1) {
        const x = clamp(near.left + ((near.right - near.left) * i) / 3, 0, vw - 1);
        const y = clamp(near.top + ((near.bottom - near.top) * j) / 3, 0, vh - 1);
        for (const el of document.elementsFromPoint(x, y)) {
          if (stage.contains(el)) continue;
          if (el === document.body || el === document.documentElement) break;
          if (el.closest("[aria-hidden='true']")) continue;
          const up = el.closest(PRESSABLE);
          if (up && seen(up)) return true;
          roots.add(el);
          break;
        }
      }
    }
    for (const root of roots) if (busy(root, box, near)) return true;
    return false;
  }

  // Every place he could nap, best first: the preferred corner, the other
  // corner, then each lifted over a bar along the bottom edge. Once asleep
  // he stays on his side while it is clear, rather than hopping about.
  function plan(where, lift) {
    const vw = N.vw(), vh = N.vh();
    const h = H * HIT;
    const cx = where === "right" ? vw - inset - W / 2 : inset + W / 2;
    const bottom = inset + lift;
    return { where, lift, cx, bottom, box: { left: cx - W / 2, right: cx + W / 2, top: vh - bottom - h, bottom: vh - bottom } };
  }
  function choose(checkContent) {
    const vh = N.vh();
    const f = furniture();
    const sides = [CORNERS[PACK.display.preferredCorner], CORNERS[PACK.display.fallbackCorner]];
    if (sides[0] === sides[1]) sides[1] = sides[0] === "right" ? "left" : "right";
    if (checkContent && side && sides[1] === side) sides.reverse();
    const plans = sides.map((s) => plan(s, 0));
    sides.forEach((s) => {
      let lift = 0;
      for (let i = 0; i < 4; i += 1) {
        const near = pad(plan(s, lift).box, inset);
        const bar = f.rects.find((r) => overlaps(r, near) && r.bottom >= vh - 40 && r.bottom - r.top <= 96);
        if (!bar) break;
        lift = Math.max(lift + 1, vh - bar.top);
      }
      if (lift > 0 && lift < vh * 0.3) plans.push(plan(s, lift));
    });
    const free = plans.filter((p) => !f.rects.some((r) => overlaps(r, pad(p.box, inset))));
    if (!free.length) return { plan: plans[0], hide: true };
    if (f.modal) return { plan: free[0], hide: true };
    if (!checkContent) return { plan: free[0], hide: false };
    const open = free.find((p) => !contentUnder(p.box));
    return open ? { plan: open, hide: false } : { plan: free[0], hide: true };
  }

  let shiftTimer = 0;
  function apply(pick, soft) {
    const p = pick.plan;
    // Never slip away from under a finger or the keyboard focus.
    const hide = pick.hide && state === "sleeping" && document.activeElement !== dock && !dock.matches(":hover");
    const moved = p.where !== side;
    window.clearTimeout(shiftTimer);
    side = p.where;
    if (moved && soft && !dock.classList.contains("is-yielding")) {
      // Another corner: out of sight and back, never a slide across the page.
      dock.classList.add("is-yielding");
      shiftTimer = window.setTimeout(() => { put(p.cx, p.bottom, 1, 0); dock.classList.toggle("is-yielding", hide); }, 240);
      return;
    }
    if (moved || !soft) put(p.cx, p.bottom, 1, 0);
    else put(p.cx, p.bottom, 1, 320);
    dock.classList.toggle("is-yielding", hide);
  }

  let lastScroll = 0, scrollTimer = 0, ticker = 0;
  const relayout = () => { if (state === "sleeping") apply(choose(true), true); };
  // Checked when scrolling settles, and every so often for toasts, menus
  // and the like, but never while the page is moving under him.
  const watch = (on) => {
    window.clearInterval(ticker);
    ticker = on ? window.setInterval(() => { if (!document.hidden && performance.now() - lastScroll > 400) relayout(); }, 1200) : 0;
  };
  window.addEventListener("scroll", () => {
    lastScroll = performance.now();
    if (state !== "sleeping") return;
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(relayout, 180);
  }, { passive: true });
  window.addEventListener("resize", () => {
    if (state !== "sleeping") return;
    size();
    apply(choose(true), false);
  }, { passive: true });

  /* ---------------------------------------------------------------- */
  /* The states                                                        */
  /* ---------------------------------------------------------------- */

  let state = "off";
  let run = 0; // bumped by each new sequence, so an old one stops
  let wakeP = null;
  const press = new Set();

  function show(id) {
    state = id;
    dock.dataset.state = id;
    Object.keys(imgs).forEach((k) => imgs[k].classList.toggle("is-shown", k === id));
    dock.classList.toggle("is-sleeping", id === "sleeping");
    // A small snap on each waking drawing, like the stage's frame changes.
    art.classList.remove("is-popping");
    if (id === "waking" || id === "stretching") {
      void art.offsetWidth;
      art.classList.add("is-popping");
    }
  }

  // Plays a state and those after it (the manifest's next) until one holds
  // (the nap) or hands back to the stage (idle). False if cut short.
  async function play(id, my, onEnter) {
    for (let guard = 0; PACK.states[id] && guard < 6; guard += 1) {
      show(id);
      if (onEnter) onEnter(id);
      const ms = PACK.states[id].durationMs;
      if (ms == null) return true;
      await wait(ms);
      if (my !== run) return false;
      id = PACK.states[id].next;
    }
    return true;
  }

  const hideRig = (on) => {
    rig.el.tabIndex = on ? -1 : 0;
    if (on) rig.el.setAttribute("aria-hidden", "true"); else rig.el.removeAttribute("aria-hidden");
  };

  // Curl up in the corner. With from, the stage's Miko (as he stands right
  // now) shrinks into the dock while settling; without, he is simply found
  // asleep there (a page he was already napping on).
  async function sleep(o = {}) {
    if (state !== "off") return false;
    const my = ++run;
    await Promise.race([preload(), wait(1500)]);
    if (my !== run) return false;
    size();
    const from = o.from && N.visible ? { x: rig.x, y: rig.y, g: rig.size().h / H } : null;
    document.documentElement.classList.add("miko-asleep");
    N.hide();
    hideRig(true);
    if (!stage.isConnected) document.body.appendChild(stage);
    dock.hidden = false;
    if (!from) {
      show("sleeping");
      dock.classList.add("is-yielding");
      apply(choose(true), false);
      watch(true);
      return true;
    }
    const p = choose(true).plan;
    side = p.where;
    dock.classList.remove("is-yielding");
    if (N.reduced) put(p.cx, p.bottom, 1, 0);
    else {
      put(from.x, N.vh() - from.y, from.g, 0);
      put(p.cx, p.bottom, 1, (PACK.states.settling.durationMs || 420) * 0.9);
    }
    if (!(await play("settling", my))) return false;
    watch(true);
    relayout();
    return true;
  }

  // Tap to wake: an eye opens, a big stretch back up to full size, and the
  // stage's Miko takes over on the same spot. Runs once, however often or
  // however it is asked (a tap, a key, a tour restart, a miko:wake event).
  function wake() {
    if (wakeP) return wakeP;
    if (state === "off") { run += 1; return Promise.resolve(false); }
    const my = ++run;
    watch(false);
    window.clearTimeout(shiftTimer);
    dock.classList.remove("is-yielding");
    const vw = N.vw(), vh = N.vh();
    const kk = rig.k();
    const bottom = parseFloat(dock.style.bottom) || inset;
    const x = clamp(parseFloat(dock.style.left) || vw / 2, 88 * kk + 8, vw - 88 * kk - 8);
    const g = rig.size().h / H;
    wakeP = (async () => {
      const done = await play("waking", my, (id) => {
        if (id !== "stretching") return;
        if (N.reduced) put(x, bottom, 1, 0);
        else put(x, bottom, g, (PACK.states.stretching.durationMs || 450) * 0.85);
      });
      if (!done) return false;
      rig.facing = x > vw / 2 ? -1 : 1;
      rig.flip = rig.facing;
      N.place(x, vh - bottom);
      rig.do("idle", { restart: true });
      hideRig(false);
      // The stage draws him before the stretch drawing goes.
      await frame();
      await frame();
      if (my === run) off();
      return true;
    })();
    return wakeP;
  }

  // Gone at once, no sequence (a page taking him over for something else).
  function off() {
    run += 1;
    watch(false);
    window.clearTimeout(shiftTimer);
    wakeP = null;
    state = "off";
    side = null;
    dock.hidden = true;
    dock.dataset.state = "off";
    dock.classList.remove("is-sleeping", "is-yielding");
    Object.keys(imgs).forEach((k) => imgs[k].classList.remove("is-shown"));
    document.documentElement.classList.remove("miko-asleep");
    hideRig(false);
  }

  dock.addEventListener("click", () => {
    if (state === "sleeping" || state === "settling") press.forEach((fn) => fn());
  });

  window.NAV_DOCK = {
    el: dock,
    preload, sleep, wake, off,
    // Where his feet go before he settles: the dock's bottom centre.
    spot() {
      size();
      const p = choose(true).plan;
      return { x: p.cx, y: N.vh() - p.bottom };
    },
    onPress(fn) { press.add(fn); return () => press.delete(fn); },
    get state() { return state; },
    get asleep() { return state === "sleeping" || state === "settling"; }
  };
})();

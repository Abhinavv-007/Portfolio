/*
  The press room: motion, sound and touch for abhnv.in.

  Loaded last, after app.js and interactive.js have rendered the paper.
  This file only adds: every feature checks for its own markup and quietly
  does nothing when it is missing, when motion is reduced, or when an API
  (Web Audio, IntersectionObserver, vibration, clipboard) is unavailable.

    1. Helpers and one shared scroll clock
    2. Sound: a small synthesised press kit (off until the reader asks)
    3. Heading registration and word rise
    4. Paper-cut titles and scissor-cut cards
    5. Halftone develop
    6. EXTRA: the spinning front page
    7. The five products, fanned
    8. Hold-to-stamp email slip
    9. Press dock and "In this issue"
   10. Touch blots, marquee drift, small courtesies
*/
(function () {
  "use strict";

  const data = window.PORTFOLIO || {};
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const root = document.documentElement;
  const body = document.body;
  const page = body.dataset.page || "";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const EMAIL = (data.profile && data.profile.email) || "abhnv@abhnv.in";
  const hasIO = "IntersectionObserver" in window;

  if (!reducedMotion) root.classList.add("pr-motion");

  const buzz = (pattern) => {
    if (!coarsePointer || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (_) { /* optional */ }
  };

  const whenLoaded = (fn) => {
    let ran = false;
    const run = () => { if (ran) return; ran = true; mo.disconnect(); fn(); };
    const mo = new MutationObserver(() => { if (body.classList.contains("loaded")) run(); });
    if (body.classList.contains("loaded")) { run(); return; }
    mo.observe(body, { attributes: true, attributeFilter: ["class"] });
    // Never wait forever on the intro (or the opening titles).
    window.setTimeout(run, window.PR_FILM ? 9000 : 3000);
  };

  /* One scroll clock for everything that listens to scroll. It samples
     position once per frame and exposes a smoothed velocity (px/s). */
  const Scroll = (() => {
    const subs = new Set();
    let y = window.scrollY;
    let lastY = y;
    let lastT = performance.now();
    let velocity = 0;
    let frame = 0;
    let idleFrames = 0;
    const tick = (now) => {
      frame = 0;
      y = window.scrollY;
      const dt = Math.max(8, now - lastT);
      const instant = ((y - lastY) / dt) * 1000;
      velocity += (instant - velocity) * 0.25;
      lastY = y;
      lastT = now;
      subs.forEach((fn) => fn(y, velocity));
      if (Math.abs(velocity) > 4) { idleFrames = 0; request(); }
      else if (idleFrames < 6) { idleFrames += 1; request(); }
      else velocity = 0;
    };
    const request = () => { if (!frame) frame = window.requestAnimationFrame(tick); };
    window.addEventListener("scroll", () => { idleFrames = 0; request(); }, { passive: true });
    window.addEventListener("resize", request, { passive: true });
    return {
      on(fn) { subs.add(fn); request(); },
      get y() { return y; },
      get velocity() { return velocity; },
      kick: request
    };
  })();

  /* ------------------------------------------------------------------ */
  /* 2. Sound                                                            */
  /* ------------------------------------------------------------------ */

  const Sound = (() => {
    const KEY = "buildjournal.sound.v1";
    const read = () => { try { return window.localStorage.getItem(KEY) === "on"; } catch (_) { return false; } };
    const write = (on) => { try { window.localStorage.setItem(KEY, on ? "on" : "off"); } catch (_) { /* memory only */ } };
    const AC = window.AudioContext || window.webkitAudioContext;
    let enabled = Boolean(AC) && read();
    let ctx = null;
    let out = null;
    let noiseBuffer = null;
    let lastTick = 0;
    const listeners = new Set();

    const ensure = () => {
      if (!AC) return null;
      if (!ctx) {
        ctx = new AC();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.ratio.value = 4;
        out = ctx.createGain();
        out.gain.value = 0.6;
        out.connect(comp);
        comp.connect(ctx.destination);
        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const ch = noiseBuffer.getChannelData(0);
        for (let i = 0; i < ch.length; i += 1) ch[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return ctx;
    };

    const env = (gainNode, t, peak, attack, decay) => {
      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.exponentialRampToValueAtTime(peak, t + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    };

    const noise = (t, { dur = 0.2, type = "bandpass", freq = 2000, freqEnd, q = 1, peak = 0.2, attack = 0.004, offset } = {}) => {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.setValueAtTime(freq, t);
      if (freqEnd) filter.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
      filter.Q.value = q;
      const g = ctx.createGain();
      env(g, t, peak, attack, Math.max(0.01, dur - attack));
      src.connect(filter);
      filter.connect(g);
      g.connect(out);
      src.start(t, offset ?? Math.random() * 0.5, dur + 0.05);
    };

    const tone = (t, { freq = 440, freqEnd, type = "sine", dur = 0.2, peak = 0.2, attack = 0.005 } = {}) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
      const g = ctx.createGain();
      env(g, t, peak, attack, Math.max(0.01, dur - attack));
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    };

    const kit = {
      // A typewriter carriage bell: the "sound is on" receipt.
      bell(t) {
        tone(t, { freq: 2637, dur: 1.1, peak: 0.07, attack: 0.002 });
        tone(t, { freq: 3951, dur: 0.6, peak: 0.03, attack: 0.002 });
        tone(t, { freq: 1318, dur: 0.8, peak: 0.02, attack: 0.002 });
        noise(t, { dur: 0.03, type: "highpass", freq: 4000, peak: 0.08 });
      },
      // Paper handled: the menu, the index sheet.
      rustle(t) {
        for (let i = 0; i < 5; i += 1) {
          const at = t + i * 0.035 + Math.random() * 0.02;
          noise(at, { dur: 0.06 + Math.random() * 0.05, freq: 2400 + Math.random() * 2600, q: 0.7, peak: 0.05 + Math.random() * 0.05 });
        }
      },
      // The burn transition between pages.
      crackle(t) {
        noise(t, { dur: 0.55, type: "lowpass", freq: 700, freqEnd: 240, peak: 0.12, attack: 0.03 });
        for (let i = 0; i < 22; i += 1) {
          const at = t + Math.random() * 0.55;
          noise(at, { dur: 0.008 + Math.random() * 0.012, type: "highpass", freq: 1800 + Math.random() * 3000, peak: 0.08 + Math.random() * 0.14, attack: 0.001 });
        }
      },
      // A rubber stamp landing on a desk.
      thump(t) {
        tone(t, { freq: 150, freqEnd: 48, dur: 0.22, peak: 0.5, attack: 0.003 });
        noise(t, { dur: 0.06, type: "lowpass", freq: 1400, peak: 0.25, attack: 0.001 });
        noise(t + 0.01, { dur: 0.12, freq: 3000, q: 0.5, peak: 0.04 });
      },
      // A sheet sliding across another: the product rail settling.
      swish(t) {
        noise(t, { dur: 0.2, freq: 700, freqEnd: 3200, q: 0.9, peak: 0.07, attack: 0.03 });
      },
      // Scissors: two quick blade closes.
      snip(t) {
        [0, 0.07].forEach((d) => {
          noise(t + d, { dur: 0.035, type: "highpass", freq: 5200, peak: 0.07, attack: 0.001 });
          noise(t + d + 0.01, { dur: 0.05, freq: 2600, q: 2, peak: 0.04, attack: 0.002 });
        });
      },
      // A key settling: letters locking in.
      tick(t) {
        noise(t, { dur: 0.014, type: "highpass", freq: 3600, peak: 0.05, attack: 0.001 });
      }
    };

    const play = (name, ...args) => {
      if (!enabled || document.hidden || !kit[name]) return;
      if (name === "tick") {
        const now = performance.now();
        if (now - lastTick < 70) return;
        lastTick = now;
      }
      const c = ensure();
      if (!c) return;
      try { kit[name](c.currentTime + 0.005, ...args); } catch (_) { /* optional */ }
    };

    const set = (on) => {
      enabled = Boolean(AC) && on;
      write(enabled);
      if (enabled) { ensure(); play("bell"); }
      listeners.forEach((fn) => fn(enabled));
    };

    // Unlock the context on the first gesture of a page when sound is on,
    // so the first real sound is not swallowed by autoplay rules.
    const unlock = () => { if (enabled) ensure(); };
    window.addEventListener("pointerdown", unlock, { once: true, passive: true, capture: true });
    window.addEventListener("keydown", unlock, { once: true, capture: true });

    return {
      play,
      set,
      toggle() { set(!enabled); },
      on(fn) { listeners.add(fn); },
      get enabled() { return enabled; },
      get available() { return Boolean(AC); }
    };
  })();

  window.PRESS_SOUND = Sound;

  /* ------------------------------------------------------------------ */
  /* 3. Heading registration                                             */
  /* ------------------------------------------------------------------ */

  function splitWords(el) {
    let index = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = child.textContent.split(/([ \t\n\r]+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((part) => {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const word = document.createElement("span");
            word.className = "pr-w";
            const inner = document.createElement("span");
            inner.className = "pr-wi";
            inner.style.setProperty("--i", String(index));
            inner.textContent = part;
            word.appendChild(inner);
            frag.appendChild(word);
            index += 1;
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE && !/^(BR|SVG|IMG|svg)$/.test(child.tagName)) {
          walk(child);
        }
      });
    };
    walk(el);
    return index;
  }

  function setupHeadings() {
    const skip = ".clipping, .project-card, .menu-panel, .press-index, .palette, .extra-spin, .terminal-shell, .pm-sheet, [data-no-press]";
    const headings = $$("main h1, main h2").filter((h) => {
      if (h.closest(skip)) return false;
      const style = window.getComputedStyle(h);
      return parseFloat(style.fontSize) >= 26 && style.display !== "none";
    });
    if (!headings.length) return;

    const state = new Map();
    headings.forEach((h) => {
      h.classList.add("pr-reg");
      const splitByApp = h.dataset.split === "true";
      let words = 0;
      if (!reducedMotion && !splitByApp) {
        words = splitWords(h);
        h.classList.add("pr-set");
      }
      state.set(h, { kick: 0, reg: 0, inView: false, words });
    });

    if (reducedMotion || !hasIO) {
      headings.forEach((h) => h.classList.add("is-set", "is-done"));
      return;
    }

    let looping = false;
    const loop = () => {
      const v = Scroll.velocity;
      const smear = clamp(Math.abs(v) / 3200, 0, 0.7) * Math.sign(v || 1);
      let active = false;
      state.forEach((s, h) => {
        if (!s.inView && Math.abs(s.reg) < 0.003) return;
        s.kick *= 0.9;
        const target = s.kick + (s.inView ? smear : 0);
        s.reg += (target - s.reg) * 0.28;
        if (Math.abs(s.reg) < 0.003 && Math.abs(target) < 0.003) s.reg = 0;
        else active = true;
        h.style.setProperty("--reg", s.reg.toFixed(3));
      });
      if (active) window.requestAnimationFrame(loop);
      else looping = false;
    };
    const wake = () => { if (!looping) { looping = true; window.requestAnimationFrame(loop); } };
    Scroll.on((y, v) => { if (Math.abs(v) > 60) wake(); });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const h = entry.target;
        const s = state.get(h);
        s.inView = entry.isIntersecting;
        if (!entry.isIntersecting || h.classList.contains("is-set")) return;
        h.classList.add("is-set");
        s.kick = 1.25;
        wake();
        window.setTimeout(() => h.classList.add("is-done"), 950 + s.words * 55);
      });
    }, { threshold: 0, rootMargin: "0px 0px -12% 0px" });

    whenLoaded(() => headings.forEach((h) => io.observe(h)));
  }

  /* ------------------------------------------------------------------ */
  /* 4. Paper-cut titles                                                 */
  /* ------------------------------------------------------------------ */

  const SCISSORS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><g class="blade-a"><circle cx="6" cy="6" r="3"/><path d="M8.1 8.1 20 20"/></g><g class="blade-b"><circle cx="6" cy="18" r="3"/><path d="M8.1 15.9 20 4"/></g></svg>`;

  // Split titles (made by app.js) drop in letter by letter as cut paper.
  function setupPaperTitles() {
    if (reducedMotion) return;
    const titles = $$(".split-title").filter((h) => $$(".hero-letter", h).length);
    if (!titles.length) return;
    titles.forEach((h, hi) => {
      h.classList.add("pr-cut");
      const letters = $$(".hero-letter", h);
      const r = (n) => { const x = Math.sin(n * 91.7 + hi * 13.1) * 43758.5453; return x - Math.floor(x); };
      letters.forEach((l, k) => {
        l.style.setProperty("--k", String(k));
        l.style.setProperty("--rest", `${((r(k) - 0.5) * 5).toFixed(2)}deg`);
        l.style.setProperty("--fr", `${((r(k + 7) - 0.5) * 70).toFixed(1)}deg`);
        l.style.setProperty("--fx", `${((r(k + 3) - 0.5) * 0.8).toFixed(2)}em`);
      });
      const cut = () => {
        if (h.classList.contains("is-in")) return;
        h.classList.add("is-in");
        const total = 820 + letters.length * 62;
        // A pair of scissors runs the cut line under the title.
        const line = document.createElement("span");
        line.className = "pr-cutline";
        line.setAttribute("aria-hidden", "true");
        const snips = document.createElement("span");
        snips.className = "pr-scissors";
        snips.innerHTML = SCISSORS;
        if (getComputedStyle(h).position === "static") h.style.position = "relative";
        h.append(line, snips);
        const t0 = performance.now();
        const run = (now) => {
          const p = clamp((now - t0) / (total * 0.8));
          const e = 1 - Math.pow(1 - p, 2);
          h.style.setProperty("--cut", `${(e * 100).toFixed(1)}%`);
          if (p < 1) window.requestAnimationFrame(run);
          else {
            snips.remove();
            line.style.transition = "opacity 500ms ease";
            line.style.opacity = "0";
            window.setTimeout(() => line.remove(), 600);
          }
        };
        window.requestAnimationFrame(run);
        Sound.play("snip");
        // Touch or hover a letter and it peels up off the page.
        const lift = (l) => {
          if (!l || l.classList.contains("is-lifted")) return;
          l.classList.add("is-lifted");
          window.setTimeout(() => l.classList.remove("is-lifted"), 520);
        };
        h.addEventListener("pointerover", (e) => { if (e.pointerType === "mouse") lift(e.target instanceof Element && e.target.closest(".hero-letter")); });
        h.addEventListener("pointerdown", (e) => {
          const hit = e.target instanceof Element && e.target.closest(".hero-letter");
          if (!hit) return;
          const i = letters.indexOf(hit);
          [i - 1, i, i + 1].forEach((j, n) => window.setTimeout(() => lift(letters[j]), n * 50));
          Sound.play("tick");
          buzz(5);
        });
      };
      // Never leave a title hidden.
      window.setTimeout(cut, 16000);
      whenLoaded(() => {
        if (!hasIO) { cut(); return; }
        const io = new IntersectionObserver((entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io.disconnect();
          window.setTimeout(cut, 120);
        }, { threshold: 0.5 });
        io.observe(h);
      });
    });
  }

  // Cards are cut out of the sheet as they arrive: a dashed line is traced
  // around the edge by a pair of scissors, then the card lifts free.
  function setupCutouts() {
    if (reducedMotion || !hasIO) return;
    const selector = [
      ".hero-roles article", ".thought-list article", ".note-row", ".pattern-card", ".method-list li",
      ".sec-builds li", ".secbuild", ".api-card", ".api-stat", ".api-why-grid article",
      ".skill-group", ".certs-stat", ".contact-brief-grid article", ".case-lens-grid article",
      ".anatomy-grid article", ".blueprint-grid article", ".work-detail-card", ".research-card",
      ".profile-stats li", "[data-cutout]"
    ].join(", ");
    const cards = $$(selector).filter((el) => !el.closest(".menu-panel, .palette, .extra-spin, .reel, .press-index") && el.offsetParent !== null);
    if (!cards.length) return;
    cards.forEach((el, i) => {
      el.classList.add("pr-cutout");
      el.style.setProperty("--lift-r", `${(i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.4)}deg`);
    });
    let queue = 0;
    const cutOne = (el) => {
      const r = el.getBoundingClientRect();
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("class", "pr-cut-svg");
      svg.setAttribute("aria-hidden", "true");
      const W = r.width + 6, H = r.height + 6;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const len = 2 * (W + H);
      const mk = (cls) => {
        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("x", "1.5"); rect.setAttribute("y", "1.5");
        rect.setAttribute("width", String(W - 3)); rect.setAttribute("height", String(H - 3));
        if (cls) rect.setAttribute("class", cls);
        return rect;
      };
      svg.style.setProperty("--len", String(len));
      svg.append(mk(""), mk("pr-cut-trace"));
      const snips = document.createElement("span");
      snips.className = "pr-cut-snips";
      snips.setAttribute("aria-hidden", "true");
      snips.innerHTML = SCISSORS;
      el.append(svg, snips);
      window.setTimeout(() => {
        el.classList.add("is-cut");
        svg.classList.add("is-done");
        snips.remove();
        window.setTimeout(() => svg.remove(), 420);
      }, 480);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const el = entry.target;
        const delay = (queue % 4) * 110;
        queue += 1;
        window.setTimeout(() => { queue = Math.max(0, queue - 1); cutOne(el); }, delay);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    whenLoaded(() => cards.forEach((el) => io.observe(el)));
    // Anything the observer never reaches (hidden tabs, print) still shows.
    window.setTimeout(() => cards.forEach((el) => { if (!el.classList.contains("is-cut") && el.getBoundingClientRect().top < window.innerHeight) { el.classList.add("is-cut"); } }), 20000);
  }

  /* ------------------------------------------------------------------ */
  /* 5. Halftone develop                                                 */
  /* ------------------------------------------------------------------ */

  function setupHalftone() {
    if (reducedMotion || !hasIO) return;
    if (!(window.CSS && CSS.supports && (CSS.supports("mask-image", "none") || CSS.supports("-webkit-mask-image", "none")))) return;
    const images = $$(".clipping-body img, .project-image img, .case-hero-image img, .work-detail-card img, .research-card img, .case-file img, .paper-file img")
      .filter((img) => !img.closest(".extra-spin"));
    if (!images.length) return;
    const fix = (img) => img.classList.add("is-fixed");
    images.forEach((img) => {
      img.classList.add("pr-halftone");
      img.addEventListener("transitionend", (e) => { if (e.propertyName === "--pr-dot") fix(img); });
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        io.unobserve(img);
        const go = () => {
          img.classList.add("is-developed");
          window.setTimeout(() => fix(img), 1500);
        };
        if (img.complete) go();
        else { img.addEventListener("load", go, { once: true }); img.addEventListener("error", () => fix(img), { once: true }); }
      });
    }, { threshold: 0.15 });
    whenLoaded(() => images.forEach((img) => io.observe(img)));
  }

  /* ------------------------------------------------------------------ */
  /* 6. EXTRA: the spinning front page                                   */
  /* ------------------------------------------------------------------ */

  function setupExtra() {
    const section = $(".extra-spin");
    if (!section) return;
    const paper = $(".extra-paper", section);
    const stage = $(".extra-stage", section);
    const supportsClip = window.CSS && CSS.supports && CSS.supports("overflow", "clip");
    if (reducedMotion || !supportsClip || !paper || !stage) {
      section.classList.add("is-static");
      return;
    }
    let stamped = false;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    // Fit the sheet (and the stamp that overhangs it) into the stage.
    // Measured only when the size changes, never while scrolling.
    const fit = () => {
      const avail = stage.clientHeight * 0.9;
      const need = paper.offsetHeight + 24;
      const wide = stage.clientWidth * 0.96;
      const needW = paper.offsetWidth + 40;
      const k = Math.min(1, avail / Math.max(1, need), wide / Math.max(1, needW));
      paper.style.setProperty("--fit", k.toFixed(4));
    };
    fit();
    window.addEventListener("resize", fit, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    const update = () => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < -50 || rect.top > window.innerHeight + 50) return;
      const travel = Math.max(1, rect.height - window.innerHeight);
      const p = clamp(-rect.top / travel);
      const e = ease(clamp(p / 0.55));
      paper.style.setProperty("--spin", `${((1 - e) * -540).toFixed(2)}deg`);
      paper.style.setProperty("--grow", (0.04 + 0.96 * e).toFixed(4));
      stage.style.setProperty("--cue", clamp(1 - p / 0.3).toFixed(3));
      stage.style.setProperty("--rays", `${(p * 140).toFixed(2)}deg`);
      stage.style.setProperty("--glow", (0.35 + e * 0.65).toFixed(3));
      section.style.setProperty("--pr-fill", `${Math.round(clamp(p / 0.6) * 100)}%`);
      if (p > 0.6 && !stamped) {
        stamped = true;
        section.classList.add("is-stamped");
        Sound.play("thump");
        buzz([14, 50, 22]);
      } else if (p < 0.35 && stamped) {
        stamped = false;
        section.classList.remove("is-stamped");
      }
    };
    Scroll.on(update);
    update();
  }

  /* ------------------------------------------------------------------ */
  /* 7. The five products, fanned                                        */
  /* ------------------------------------------------------------------ */

  function setupRail() {
    const rail = $("#projectRail");
    if (!rail) return;
    const cards = $$(".project-card", rail);
    if (!cards.length) return;

    // Progress dashes under the rail, one per product.
    const dots = document.createElement("div");
    dots.className = "pr-rail-dots";
    dots.setAttribute("role", "group");
    dots.setAttribute("aria-label", "Jump to a product");
    const projects = data.projects || [];
    cards.forEach((card, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", `Show ${projects[i]?.title || `product ${i + 1}`}`);
      b.addEventListener("click", () => {
        const railRect = rail.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const left = rail.scrollLeft + cardRect.left - railRect.left - (rail.clientWidth - cardRect.width) / 2;
        rail.scrollTo({ left: Math.max(0, left), behavior: reducedMotion ? "auto" : "smooth" });
      });
      dots.appendChild(b);
    });
    rail.insertAdjacentElement("afterend", dots);

    const buttons = $$("button", dots);
    let current = -1;
    const markCurrent = (announce) => {
      const index = Math.max(0, cards.findIndex((c) => c.classList.contains("is-selected")));
      buttons.forEach((b, i) => b.setAttribute("aria-current", i === index ? "true" : "false"));
      if (announce && index !== current && current !== -1) {
        Sound.play("swish");
        buzz(6);
      }
      current = index;
    };
    markCurrent(false);
    const mo = new MutationObserver(() => markCurrent(true));
    cards.forEach((card) => mo.observe(card, { attributes: true, attributeFilter: ["class"] }));

    if (reducedMotion) return;
    let frame = 0;
    const fan = () => {
      frame = 0;
      const railRect = rail.getBoundingClientRect();
      if (railRect.bottom < 0 || railRect.top > window.innerHeight) return;
      const anchor = railRect.left + Math.min(railRect.width, cards[0].offsetWidth) / 2;
      cards.forEach((card) => {
        const r = card.getBoundingClientRect();
        const d = clamp(((r.left + r.width / 2) - anchor) / (r.width || 1), -1.6, 2.6);
        const a = Math.min(1.4, Math.abs(d));
        card.style.setProperty("--fan-ry", `${(clamp(-d * 11, -18, 18)).toFixed(2)}deg`);
        card.style.setProperty("--fan-s", (1 - a * 0.05).toFixed(4));
        card.style.setProperty("--fan-y", `${(a * 12).toFixed(1)}px`);
      });
    };
    const request = () => { if (!frame) frame = window.requestAnimationFrame(fan); };
    rail.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });
    Scroll.on(request);
    request();
  }

  /* ------------------------------------------------------------------ */
  /* 8. Hold-to-stamp email slip                                         */
  /* ------------------------------------------------------------------ */

  // Notices print out of a slot at the foot of the page like a desk
  // receipt: the paper feeds up a line at a time, sits for a moment, then
  // is torn off along the perforation and flutters away up the screen.
  let toastTimer = 0;
  let toastEnd = 0;
  function toast(title, detail = "", lines = null) {
    let el = $(".pr-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "pr-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.innerHTML = `
        <div class="pr-toast-feed">
          <div class="pr-toast-paper">
            <header class="pr-toast-head"><b>The Build Journal</b><small data-no></small></header>
            <small class="pr-toast-when" data-when></small>
            <b class="pr-toast-title" data-title></b>
            <span class="pr-toast-detail" data-detail></span>
            <dl class="pr-toast-lines" data-lines></dl>
            <span class="pr-toast-code" aria-hidden="true"></span>
            <small class="pr-toast-thanks">Thank you for writing &#10038;</small>
            <i class="pr-toast-filed" aria-hidden="true">&#10003; Filed</i>
          </div>
        </div>
        <span class="pr-toast-slot" aria-hidden="true"><i></i></span>
        <span class="pr-toast-bits" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>`;
      body.appendChild(el);
    }
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    $("[data-no]", el).textContent = `No. ${String(1000 + Math.floor(Math.random() * 9000))}`;
    $("[data-when]", el).textContent = `Desk receipt · ${hhmm}`;
    $("[data-title]", el).textContent = title;
    $("[data-detail]", el).textContent = detail;
    const dl = $("[data-lines]", el);
    dl.textContent = "";
    (lines || [["Desk", "Correspondence"], ["Filed", `${hhmm} IST`]]).forEach(([k, v]) => {
      const row = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = k;
      dd.textContent = v;
      row.append(dt, dd);
      dl.appendChild(row);
    });
    // A fresh barcode for every receipt.
    let x = 0;
    const bars = [];
    while (x < 100) {
      const w = 0.6 + Math.random() * 2.4;
      bars.push(`#171612 ${x.toFixed(1)}% ${(x + w).toFixed(1)}%`, `transparent ${(x + w).toFixed(1)}% ${(x + w + 0.8 + Math.random() * 1.8).toFixed(1)}%`);
      x += w + 1.4 + Math.random() * 1.4;
    }
    $(".pr-toast-code", el).style.backgroundImage = `linear-gradient(90deg, ${bars.join(", ")})`;

    window.clearTimeout(toastTimer);
    window.clearTimeout(toastEnd);
    el.classList.remove("is-in", "is-torn");
    void el.offsetWidth;
    el.classList.add("is-in");
    Sound.play("rustle");
    if (!reducedMotion) for (let i = 1; i < 8; i += 1) window.setTimeout(() => Sound.play("tick"), i * 95);
    toastTimer = window.setTimeout(() => {
      el.classList.add("is-torn");
      Sound.play("snip");
      window.setTimeout(() => Sound.play("swish"), 160);
      buzz(8);
      toastEnd = window.setTimeout(() => el.classList.remove("is-in", "is-torn"), reducedMotion ? 300 : 1900);
    }, reducedMotion ? 3600 : 4400);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) { /* fall through */ }
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
      body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }

  // The rubber stamp on the desk. Press and hold: the ring inks round, the
  // stamp rocks back and slams down on the slip, the impression lands with
  // a spray of ink, the address goes to the clipboard, and a receipt feeds
  // out of the slot at the foot of the page and is torn off up the screen.
  function setupStampCta() {
    $$("[data-stamp-cta]").forEach((host, n) => {
      const hintId = `stampHint${n}`;
      const slipNo = String(n + 1).padStart(4, "0");
      host.classList.add("stamp-cta");
      host.innerHTML = `
        <div class="stamp-cta-desk">
          <button class="stamp-cta-btn" type="button" aria-describedby="${hintId}">
            <span class="stamp-cta-ring" aria-hidden="true">
              <svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="46"/><circle class="fill" cx="50" cy="50" r="46"/></svg>
            </span>
            <span class="stamp-cta-tool" aria-hidden="true">
              <span class="stamp-cta-knob"></span><span class="stamp-cta-neck"></span><span class="stamp-cta-base"><i>AR</i></span>
            </span>
            <span class="stamp-cta-label" aria-hidden="true">Hold to stamp</span>
            <span class="stamp-cta-sr">Press and hold to copy my email address, ${EMAIL}</span>
          </button>
          <div class="stamp-cta-slip">
            <span class="stamp-cta-fold" aria-hidden="true"></span>
            <div class="stamp-cta-slip-note">
              <small>Correspondence slip &middot; No. ${slipNo}</small>
              <strong>Stamp here to take my address</strong>
              <em>Your reply goes straight to my desk</em>
            </div>
            <div class="stamp-cta-impression" aria-hidden="true">
              <small>Received by the desk</small>
              <b>${EMAIL}</b>
              <small>Address copied &#10003;</small>
            </div>
            <span class="stamp-cta-ink" aria-hidden="true"></span>
          </div>
        </div>
        <p class="stamp-cta-hint" id="${hintId}" aria-live="polite">Press and hold the stamp. Or just <a href="mailto:${EMAIL}">write to ${EMAIL}</a>.</p>
      `;
      const btn = $(".stamp-cta-btn", host);
      const hint = $(".stamp-cta-hint", host);
      const ink = $(".stamp-cta-ink", host);
      const HOLD_MS = reducedMotion ? 350 : 820;
      let holding = false;
      let start = 0;
      let value = 0;
      let raf = 0;
      let completed = false;
      let copied = false;
      let pressedAt = 0;

      const setHold = (v) => { value = v; host.style.setProperty("--hold", v.toFixed(3)); };

      // Ink thrown off the rubber as it lands.
      const splatter = () => {
        ink.textContent = "";
        if (reducedMotion) return;
        for (let i = 0; i < 16; i += 1) {
          const dot = document.createElement("i");
          // Thrown out past the rim of the impression, never over the address.
          const a = Math.random() * Math.PI * 2;
          const d = 1 + Math.random() * 0.35;
          dot.style.setProperty("--x", `${(Math.cos(a) * d * 150).toFixed(0)}px`);
          dot.style.setProperty("--y", `${(Math.sin(a) * d * 62).toFixed(0)}px`);
          dot.style.setProperty("--s", (0.4 + Math.random() * 1.1).toFixed(2));
          dot.style.animationDelay = `${(Math.random() * 60).toFixed(0)}ms`;
          ink.appendChild(dot);
        }
      };

      const complete = async () => {
        completed = true;
        holding = false;
        host.classList.remove("is-stamped");
        void host.offsetWidth;
        host.classList.add("is-stamped");
        splatter();
        Sound.play("thump");
        buzz([12, 40, 22]);
        copied = await copyText(EMAIL);
        hint.innerHTML = copied
          ? `Copied <strong>${EMAIL}</strong> to your clipboard. <a href="mailto:${EMAIL}">Open your mail app</a>.`
          : `The address is <strong>${EMAIL}</strong>. <a href="mailto:${EMAIL}">Open your mail app</a>.`;
        window.setTimeout(() => toast(copied ? "Address copied" : "Address ready", EMAIL, [
          ["Desk", "Correspondence"],
          ["Reply", "Within a day"],
          ["Slip", `No. ${slipNo}`]
        ]), reducedMotion ? 0 : 380);
        release(true);
      };

      const step = (now) => {
        if (!holding) return;
        const v = clamp((now - start) / HOLD_MS);
        setHold(v);
        if (v >= 1) { complete(); return; }
        raf = window.requestAnimationFrame(step);
      };

      const press = () => {
        if (holding) return;
        holding = true;
        completed = false;
        host.classList.add("is-holding");
        pressedAt = performance.now();
        start = pressedAt - value * HOLD_MS;
        window.cancelAnimationFrame(raf);
        raf = window.requestAnimationFrame(step);
        buzz(4);
      };

      const release = (fromComplete) => {
        const wasHolding = holding;
        holding = false;
        host.classList.remove("is-holding");
        window.cancelAnimationFrame(raf);
        if (!fromComplete && wasHolding && !completed && performance.now() - pressedAt < 220) {
          host.classList.remove("is-nudged");
          void host.offsetWidth;
          host.classList.add("is-nudged");
          hint.textContent = "Keep holding until the ring closes.";
        }
        // Spring the stamp back up.
        const from = value;
        const t0 = performance.now();
        const back = (now) => {
          if (holding) return;
          const t = clamp((now - t0) / 380);
          setHold(from * (1 - (1 - Math.pow(1 - t, 3))));
          if (t < 1) raf = window.requestAnimationFrame(back);
        };
        raf = window.requestAnimationFrame(back);
      };

      btn.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        try { btn.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
        press();
      });
      btn.addEventListener("pointerup", () => {
        // Safari only lets the clipboard be written inside a gesture: retry here.
        if (completed && !copied) copyText(EMAIL).then((ok) => { if (ok) { copied = true; toast("Address copied", EMAIL); } });
        release(false);
      });
      btn.addEventListener("pointercancel", () => release(false));
      btn.addEventListener("contextmenu", (e) => e.preventDefault());
      btn.addEventListener("keydown", (e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); press(); }
      });
      btn.addEventListener("keyup", (e) => {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); release(false); }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 9. Press dock                                                       */
  /* ------------------------------------------------------------------ */

  function sectionLabel(section) {
    if (section.dataset.folio) return section.dataset.folio;
    const kicker = $(".section-kicker, .eyebrow, .kicker", section);
    const kickerText = kicker && kicker.textContent.replace(/\s+/g, " ").trim();
    if (kickerText && kickerText.length <= 34 && !/·|&middot;/.test(kickerText)) return kickerText;
    const id = section.getAttribute("aria-labelledby");
    const heading = (id && document.getElementById(id)) || $("h1, h2", section);
    const text = (section.getAttribute("aria-label") || (heading && (heading.getAttribute("aria-label") || heading.textContent)) || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    const lower = text.toLowerCase();
    const cased = lower.charAt(0).toUpperCase() + lower.slice(1);
    return cased.length > 30 ? `${cased.slice(0, 28).replace(/\s+\S*$/, "")}…` : cased;
  }

  const pad = (n) => String(n).padStart(2, "0");

  function setupDock() {
    const main = $("main");
    if (!main) return;
    const sections = $$("main section").filter((s) => !s.parentElement.closest("main section") && s.offsetHeight > 120);
    const entries = sections.map((s, i) => {
      if (!s.id) s.id = `pr-sec-${i + 1}`;
      return { el: s, label: sectionLabel(s) || `Page ${i + 1}` };
    }).filter((e) => e.label);
    const footer = $(".footer");
    if (footer) {
      if (!footer.id) footer.id = "colophon";
      entries.push({ el: footer, label: "Colophon" });
    }
    if (entries.length < 2) return;

    const menuButton = $("#menuButton");
    const dock = document.createElement("nav");
    dock.className = "press-dock";
    dock.setAttribute("aria-label", "Reading progress and controls");
    dock.innerHTML = `
      <button class="press-dock-folio" type="button" aria-expanded="false" aria-controls="pressIndex">
        <span class="press-dock-kicker">p. <span data-dock-page>01</span> / ${pad(entries.length)} &middot; in this issue</span>
        <span class="press-dock-label" data-dock-label>${entries[0].label}</span>
        <span class="press-dock-bar" aria-hidden="true"><i></i></span>
      </button>
      ${Sound.available ? `
      <button class="press-dock-btn press-dock-sound" type="button" aria-pressed="false" aria-label="Press sounds">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" stroke="none"/>
          <path class="wave" d="M15.5 9.2a4 4 0 0 1 0 5.6"/>
          <path class="wave" d="M18.2 6.8a7.4 7.4 0 0 1 0 10.4"/>
          <path class="mute" d="M16 9.5l4.5 5M20.5 9.5l-4.5 5"/>
        </svg>
      </button>` : ""}
      ${menuButton ? `<button class="press-dock-btn press-dock-menu" type="button" aria-label="Open navigation"><span aria-hidden="true"><span></span><span></span><span></span></span></button>` : ""}
    `;
    const sheet = document.createElement("div");
    sheet.className = "press-index";
    sheet.id = "pressIndex";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-label", "In this issue");
    sheet.innerHTML = `
      <h2><span>In this issue</span><span>${pad(entries.length)} pages</span></h2>
      <ol>${entries.map((e, i) => `<li><a href="#${e.el.id}" data-index="${i}"><span>p. ${pad(i + 1)}</span><span>${e.label}</span><span aria-hidden="true">&rarr;</span></a></li>`).join("")}</ol>
      <p class="press-index-foot">Tap a page to turn to it.</p>
    `;
    body.appendChild(sheet);
    body.appendChild(dock);
    body.classList.add("has-dock");

    const folio = $(".press-dock-folio", dock);
    const labelEl = $("[data-dock-label]", dock);
    const pageEl = $("[data-dock-page]", dock);
    const soundBtn = $(".press-dock-sound", dock);
    const links = $$("a", sheet);

    const setOpen = (open) => {
      sheet.classList.toggle("is-open", open);
      folio.setAttribute("aria-expanded", String(open));
      if (open) {
        Sound.play("rustle");
        buzz(5);
        links[current]?.focus({ preventScroll: true });
      }
    };
    folio.addEventListener("click", () => setOpen(!sheet.classList.contains("is-open")));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sheet.classList.contains("is-open")) { setOpen(false); folio.focus(); }
    });
    document.addEventListener("pointerdown", (e) => {
      if (!sheet.classList.contains("is-open")) return;
      if (sheet.contains(e.target) || dock.contains(e.target)) return;
      setOpen(false);
    });
    links.forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const target = entries[Number(a.dataset.index)]?.el;
        setOpen(false);
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY - 12;
        window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
      });
    });

    if (soundBtn) {
      const reflect = (on) => {
        soundBtn.setAttribute("aria-pressed", String(on));
        soundBtn.setAttribute("aria-label", on ? "Press sounds on. Turn off" : "Press sounds off. Turn on");
        soundBtn.title = on ? "Sound on" : "Sound off";
      };
      reflect(Sound.enabled);
      Sound.on(reflect);
      soundBtn.addEventListener("click", () => { Sound.toggle(); buzz(8); });
    }

    $(".press-dock-menu", dock)?.addEventListener("click", () => {
      setOpen(false);
      menuButton.click();
    });

    let current = -1;
    let shown = false;
    let lastY = window.scrollY;
    let travel = 0;
    const setCurrent = (i) => {
      if (i === current) return;
      current = i;
      labelEl.textContent = entries[i].label;
      pageEl.textContent = pad(i + 1);
      labelEl.classList.remove("is-swapping");
      void labelEl.offsetWidth;
      labelEl.classList.add("is-swapping");
      links.forEach((a, j) => a.setAttribute("aria-current", j === i ? "true" : "false"));
    };
    const setShown = (on) => {
      if (on === shown) return;
      shown = on;
      dock.classList.toggle("is-shown", on);
    };
    Scroll.on((y) => {
      const vh = window.innerHeight;
      const max = Math.max(1, root.scrollHeight - vh);
      dock.style.setProperty("--progress", clamp(y / max).toFixed(4));
      let idx = 0;
      for (let i = 0; i < entries.length; i += 1) {
        if (entries[i].el.getBoundingClientRect().top <= vh * 0.42) idx = i;
      }
      setCurrent(idx);
      const dy = y - lastY;
      lastY = y;
      travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;
      const nearBottom = y > max - 40;
      if (y < vh * 0.55) setShown(false);
      else if (nearBottom || travel < -24) setShown(true);
      else if (travel > 90 && !sheet.classList.contains("is-open")) setShown(false);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 10. Blots, marquee, courtesies                                     */
  /* ------------------------------------------------------------------ */

  function setupBlots() {
    if (reducedMotion || !window.PointerEvent) return;
    const pool = Array.from({ length: 5 }, () => {
      const b = document.createElement("span");
      b.className = "ink-blot";
      b.setAttribute("aria-hidden", "true");
      body.appendChild(b);
      return b;
    });
    let next = 0;
    window.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
      if (e.target instanceof Element && e.target.closest("input, textarea, select")) return;
      const b = pool[next];
      next = (next + 1) % pool.length;
      b.classList.remove("is-on");
      b.style.left = `${e.clientX}px`;
      b.style.top = `${e.clientY}px`;
      b.style.setProperty("--r", `${Math.round(Math.random() * 360)}deg`);
      void b.offsetWidth;
      b.classList.add("is-on");
    }, { passive: true });
  }

  function setupMarqueeDrift() {
    if (reducedMotion) return;
    const tracks = $$(".marquee-track");
    if (!tracks.length || !tracks[0].getAnimations) return;
    let rate = 1;
    let looping = false;
    const anims = () => tracks.flatMap((t) => t.getAnimations());
    const loop = () => {
      const v = Scroll.velocity;
      const target = clamp(1 + v / 500, -3, 5);
      rate += (target - rate) * 0.1;
      if (Math.abs(rate - 1) < 0.01 && Math.abs(v) < 5) rate = 1;
      anims().forEach((a) => {
        try {
          if (a.updatePlaybackRate) a.updatePlaybackRate(rate);
          else a.playbackRate = rate;
        } catch (_) { /* noop */ }
      });
      if (rate !== 1) window.requestAnimationFrame(loop);
      else looping = false;
    };
    Scroll.on((y, v) => {
      if (looping || Math.abs(v) < 20) return;
      looping = true;
      window.requestAnimationFrame(loop);
    });
  }

  function setupSoundCues() {
    // The burn transition and the menu get their sounds from the same
    // clicks app.js already listens to; nothing here changes navigation.
    document.addEventListener("click", (e) => {
      const link = e.target instanceof Element && e.target.closest("a[href]");
      if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = link.getAttribute("href") || "";
      if (href.startsWith("#") || href.startsWith("mailto:") || /^https?:\/\//.test(href) || link.target === "_blank" || link.hasAttribute("download")) return;
      Sound.play("crackle");
    }, true);
    $("#menuButton")?.addEventListener("click", () => Sound.play("rustle"));
  }

  function setupDeskStatus() {
    const meta = $(".topline-meta");
    const first = meta && meta.firstChild;
    if (!first || first.nodeType !== Node.TEXT_NODE || !/Desk open/.test(first.textContent)) return;
    const update = () => {
      let hour = 12;
      try {
        hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
      } catch (_) { /* keep default */ }
      const open = hour >= 8 || hour < 1;
      first.textContent = first.textContent.replace(/Desk (open|asleep)/, open ? "Desk open" : "Desk asleep");
    };
    update();
    window.setInterval(update, 60000);
  }

  function setupTabTitle() {
    const original = document.title;
    document.addEventListener("visibilitychange", () => {
      document.title = document.hidden ? "The press is still running · Abhinav Raj" : original;
    });
  }

  /* ------------------------------------------------------------------ */
  /* 11. Live wire                                                       */
  /* ------------------------------------------------------------------ */

  function setupWire() {
    const anchor = $(".folio-strip") || $(".masthead");
    if (!anchor || $(".wire")) return;
    const p = data.profile || {};
    const ranks = (p.bugcrowd && p.bugcrowd.ranks) || [];
    const products = (data.projects || []).map((x) => x.title);
    const items = [
      ...ranks.map((r) => `<b>Bugcrowd</b> ${r.label} &middot; ${r.period}`),
      p.researchSince ? `<b>Security desk</b> Research since ${p.researchSince}` : "",
      products.length ? `<b>${products.length} products live</b> ${products.join(" &middot; ")}` : "",
      data.certifications ? `<b>${data.certifications.length}</b> verified credentials` : "",
      data.researchPapers ? `<b>${data.researchPapers.length}</b> research papers` : "",
      `<b>Now testing</b> authorization &middot; OAuth &middot; APIs &middot; business logic`,
      `<b>Desk line</b> ${EMAIL}`
    ].filter(Boolean);
    if (!items.length) return;
    const set = items.map((i) => `<span class="wire-item">${i}</span>`).join("");
    const wire = document.createElement("div");
    wire.className = "wire";
    wire.setAttribute("role", "marquee");
    wire.setAttribute("aria-label", "Live wire");
    wire.innerHTML = `
      <span class="wire-tag"><i aria-hidden="true"></i>Live wire</span>
      <div class="wire-viewport"><div class="wire-track"><span class="wire-set">${set}</span><span class="wire-set" aria-hidden="true">${set}</span></div></div>
    `;
    anchor.insertAdjacentElement("afterend", wire);
    // A tap holds the wire still so a line can be read.
    wire.addEventListener("click", () => wire.classList.toggle("is-paused"));
  }

  /* ------------------------------------------------------------------ */
  /* 12. Kinetic type bands                                              */
  /* ------------------------------------------------------------------ */

  function setupKinetic() {
    const bands = $$("[data-kinetic]");
    if (!bands.length) return;
    const rows = [];
    bands.forEach((band) => {
      band.classList.add("kinetic");
      band.setAttribute("aria-hidden", "true");
      const specs = [
        { text: band.dataset.kinetic, cls: "", dir: -1 },
        { text: band.dataset.kineticTwo, cls: "kinetic-row--outline", dir: 1 },
        { text: band.dataset.kineticThree, cls: "kinetic-row--small", dir: -1 }
      ].filter((x) => x.text);
      band.innerHTML = specs.map((spec) => {
        const words = spec.text.split("|").map((w) => `<span>${w.trim()}</span>`).join("");
        return `<div class="kinetic-row ${spec.cls}">${words}${words}${words}${words}</div>`;
      }).join("");
      $$(".kinetic-row", band).forEach((row, i) => rows.push({ band, row, dir: specs[i].dir, speed: i === 2 ? 0.55 : 1 }));
    });
    if (reducedMotion) return;
    const update = () => {
      const vh = window.innerHeight;
      rows.forEach((r) => {
        const rect = r.band.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > vh + 100) return;
        const p = (vh - rect.top) / (vh + rect.height); // 0 entering, 1 leaving
        const span = r.row.scrollWidth / 4;
        const x = r.dir < 0 ? -span * (0.15 + p * 0.6 * r.speed) : -span * (0.85 - p * 0.6 * r.speed);
        r.row.style.setProperty("--kx", `${x.toFixed(1)}px`);
      });
    };
    Scroll.on(update);
    update();
  }

  /* ------------------------------------------------------------------ */
  /* 13. Odometer numbers                                                */
  /* ------------------------------------------------------------------ */

  function setupOdometers() {
    const els = $$("[data-odometer]");
    if (!els.length) return;
    els.forEach((el) => {
      const text = el.textContent.trim();
      if (!/\d/.test(text)) return;
      el.textContent = "";
      const sr = document.createElement("span");
      sr.className = "odo-sr";
      sr.textContent = text;
      const wrap = document.createElement("span");
      wrap.className = "odo";
      wrap.setAttribute("aria-hidden", "true");
      const digits = [];
      Array.from(text).forEach((ch) => {
        if (!/\d/.test(ch)) { const s = document.createElement("span"); s.textContent = ch; wrap.appendChild(s); return; }
        const col = document.createElement("span");
        col.className = "odo-col";
        const strip = document.createElement("span");
        strip.className = "odo-strip";
        strip.innerHTML = Array.from({ length: 20 }, (_, i) => `<span>${i % 10}</span>`).join("");
        col.appendChild(strip);
        wrap.appendChild(col);
        digits.push({ strip, d: Number(ch) });
      });
      el.append(sr, wrap);
      const roll = () => {
        digits.forEach((x, i) => {
          x.strip.style.setProperty("--odo-delay", `${i * 110}ms`);
          x.strip.style.setProperty("--odo-ms", `${1500 + (digits.length - i) * 250}ms`);
          x.strip.style.transform = `translate3d(0, ${-(10 + x.d) * 1.16}em, 0)`;
        });
      };
      if (reducedMotion || !hasIO) {
        digits.forEach((x) => { x.strip.style.transform = `translate3d(0, ${-x.d * 1.16}em, 0)`; });
        return;
      }
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        roll();
      }, { threshold: 0.6 });
      whenLoaded(() => io.observe(el));
    });
  }

  /* ------------------------------------------------------------------ */
  /* 14. Typewriter kickers                                              */
  /* ------------------------------------------------------------------ */

  function setupTypedKickers() {
    if (reducedMotion || !hasIO) return;
    const kickers = $$(".section-kicker, .wire-desk-kicker").filter((k) =>
      !k.closest(".clipping, .extra-spin, .menu-panel") &&
      Array.from(k.childNodes).every((n) => n.nodeType === Node.TEXT_NODE) &&
      k.textContent.trim().length > 2 && k.textContent.trim().length < 90
    );
    kickers.forEach((k) => {
      const text = k.textContent.replace(/\s+/g, " ").trim();
      k.classList.add("pr-typed");
      k.innerHTML = "";
      const ghost = document.createElement("span");
      ghost.className = "pr-typed-ghost";
      ghost.textContent = text;
      const live = document.createElement("span");
      live.className = "pr-typed-live";
      live.setAttribute("aria-hidden", "true");
      k.append(ghost, live);
      k._typed = { text, live, ghost };
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const k = entry.target;
        const { text, live, ghost } = k._typed;
        const step = Math.max(12, Math.min(34, 700 / text.length));
        let i = 0;
        k.classList.add("is-typing");
        const t = window.setInterval(() => {
          i += 1;
          live.textContent = text.slice(0, i);
          if (i >= text.length) {
            window.clearInterval(t);
            window.setTimeout(() => {
              k.classList.remove("is-typing");
              // Hand the real text back so it is selectable and read aloud.
              ghost.style.visibility = "visible";
              live.remove();
            }, 500);
          }
        }, step);
      });
    }, { threshold: 0.8 });
    whenLoaded(() => kickers.forEach((k) => io.observe(k)));
  }

  /* ------------------------------------------------------------------ */
  /* 15. Stacking cards, spinning seals, the clipping tipping back       */
  /* ------------------------------------------------------------------ */

  function setupStacks() {
    const lists = $$(".thought-list, [data-stack]");
    if (!lists.length || reducedMotion) return;
    const small = window.matchMedia("(max-width: 760px)");
    const all = [];
    lists.forEach((list) => {
      const cards = $$(":scope > article", list);
      if (cards.length < 2) return;
      list.classList.add("pr-stack");
      cards.forEach((c, i) => {
        c.style.setProperty("--k", String(i));
        c.dataset.stackNo = `${pad(i + 1)} / ${pad(cards.length)}`;
        all.push({ c, next: cards[i + 1] || null });
      });
    });
    // As the next sheet slides over, the one underneath sinks a little.
    Scroll.on(() => {
      if (!small.matches) return;
      all.forEach(({ c, next }) => {
        if (!next) return;
        const a = c.getBoundingClientRect();
        const b = next.getBoundingClientRect();
        const cover = clamp((a.bottom - b.top) / Math.max(1, a.height));
        c.style.setProperty("--sink", (1 - cover * 0.06).toFixed(4));
        c.style.setProperty("--dim", (1 - cover * 0.12).toFixed(3));
      });
    });
  }

  function setupScrollSpin() {
    if (reducedMotion) return;
    const seals = $$(".bugcrowd-seal, [data-scroll-spin]");
    const clip = page === "index" ? $(".profile-portrait.clipping") : null;
    if (!seals.length && !clip) return;
    Scroll.on((y) => {
      seals.forEach((s) => { s.style.rotate = `${(y * 0.06).toFixed(2)}deg`; });
      if (clip) {
        const r = clip.getBoundingClientRect();
        const p = clamp(-r.top / Math.max(1, r.height));
        clip.style.transformOrigin = "50% 100%";
        clip.style.rotate = p > 0 ? `x ${(p * 16).toFixed(2)}deg` : "";
        clip.style.scale = p > 0 ? (1 - p * 0.06).toFixed(4) : "";
        clip.style.opacity = p > 0 ? (1 - p * 0.5).toFixed(3) : "";
      }
    });
  }

  function setupRailPeek() {
    const rail = $("#projectRail");
    if (!rail || reducedMotion || !coarsePointer || !hasIO) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      if (rail.scrollLeft > 4) return;
      window.setTimeout(() => {
        rail.scrollBy({ left: Math.min(90, rail.clientWidth * 0.22), behavior: "smooth" });
        window.setTimeout(() => rail.scrollTo({ left: 0, behavior: "smooth" }), 520);
      }, 400);
    }, { threshold: 0.7 });
    io.observe(rail);
  }

  /* ------------------------------------------------------------------ */
  /* 16. Footer signature                                                */
  /* ------------------------------------------------------------------ */

  function setupSignature() {
    const footer = $(".footer");
    if (!footer || $(".pr-sign", footer)) return;
    const sign = document.createElement("div");
    sign.className = "pr-sign";
    sign.setAttribute("aria-hidden", "true");
    sign.innerHTML = Array.from("ABHNV").map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join("");
    const colophon = $(".footer-colophon", footer);
    if (colophon) footer.insertBefore(sign, colophon);
    else footer.appendChild(sign);
    const hop = (letter) => {
      if (!letter || letter.classList.contains("is-hop")) return;
      letter.classList.add("is-hop");
      letter.addEventListener("animationend", () => letter.classList.remove("is-hop"), { once: true });
    };
    sign.addEventListener("pointerover", (e) => hop(e.target instanceof Element && e.target.closest("span")));
    sign.addEventListener("pointerdown", (e) => { hop(e.target instanceof Element && e.target.closest("span")); Sound.play("tick"); });
    if (reducedMotion || !hasIO) { sign.classList.add("is-in"); return; }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      sign.classList.add("is-in");
    }, { threshold: 0.35 });
    io.observe(sign);
  }

  /* ------------------------------------------------------------------ */
  /* 17. Sound hint, once                                                */
  /* ------------------------------------------------------------------ */

  function setupSoundHint() {
    const dock = $(".press-dock");
    const btn = $(".press-dock-sound", dock || undefined);
    if (!dock || !btn || Sound.enabled) return;
    const KEY = "buildjournal.soundhint.v1";
    try { if (window.localStorage.getItem(KEY)) return; } catch (_) { return; }
    const hint = document.createElement("div");
    hint.className = "pr-sound-hint";
    hint.setAttribute("aria-hidden", "true");
    hint.innerHTML = `<span class="pr-eq"><i></i><i></i><i></i><i></i></span>Tap for press sounds`;
    dock.appendChild(hint);
    let shownOnce = false;
    const dismiss = () => {
      hint.classList.remove("is-in");
      try { window.localStorage.setItem(KEY, "1"); } catch (_) { /* noop */ }
      window.setTimeout(() => hint.remove(), 500);
    };
    btn.addEventListener("click", dismiss, { once: true });
    const mo = new MutationObserver(() => {
      if (shownOnce || !dock.classList.contains("is-shown")) return;
      shownOnce = true;
      mo.disconnect();
      window.setTimeout(() => hint.classList.add("is-in"), 700);
      window.setTimeout(dismiss, 7000);
    });
    mo.observe(dock, { attributes: true, attributeFilter: ["class"] });
  }

  /* ------------------------------------------------------------------ */
  /* 18. Nothing off screen keeps moving                                 */
  /* ------------------------------------------------------------------ */

  // Every loop on the page (the wire, the marquee, twinkling stars, a
  // slowly turning seal, blinking carets) is paused while its section is
  // out of view, and picks up again just before it scrolls back in.
  function setupOffscreenPause() {
    if (!hasIO) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle("pr-off", !e.isIntersecting));
    }, { rootMargin: "160px 0px" });
    const watch = () => $$("main > section, main > footer, main > .footer, main > .pc-scene, main > div, .wire").forEach((el) => {
      if (el.dataset.prWatched) return;
      el.dataset.prWatched = "1";
      io.observe(el);
    });
    // Scenery and late sections are added after this runs: look again.
    window.setTimeout(watch, 0);
    window.addEventListener("load", watch, { once: true });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  const boot = [setupOffscreenPause, setupWire, setupOdometers, setupKinetic, setupPaperTitles, setupHeadings, setupHalftone, setupExtra, setupRail, setupStampCta, setupDock, setupBlots, setupMarqueeDrift, setupSoundCues, setupDeskStatus, setupTabTitle, setupTypedKickers, setupStacks, setupScrollSpin, setupRailPeek, setupSignature, setupSoundHint, setupCutouts];
  boot.forEach((fn) => {
    try { fn(); } catch (err) { if (window.console) console.warn(`[press room] ${fn.name} skipped`, err); }
  });
})();

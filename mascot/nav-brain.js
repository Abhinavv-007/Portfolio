/*
  Miko, the journal's guide: their brain.

  Decides what he does when a page opens:

    fresh landing  he runs in after the opening titles and asks whether
                   you would like a tour. Yes: a victory hop and off he
                   goes. No: a wobbly lip, real tears, and a sniffly glide
                   to a quiet corner, where he curls up for a nap.
    mid-tour       he carries on with this page's part of the tour
    companion      he lives in the corner: looks at your pointer, naps,
                   hops, and talks when you poke him
    away           asleep, small, in a safe bottom corner (the sleep dock,
                   nav-dock.js) until you tap him awake

  The tour scripts themselves are in nav-tour.js; this file runs them,
  carries the tour across pages (sessionStorage) and draws the controls.
*/
(function () {
  "use strict";

  const N = window.NAV;
  if (!N) return;
  const { rig } = N;
  const DOCK = window.NAV_DOCK || null;
  const $ = (s, el = document) => el.querySelector(s);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(`miko.${k}`)); } catch (_) { return null; } },
    set(k, v) { try { sessionStorage.setItem(`miko.${k}`, JSON.stringify(v)); } catch (_) { /* memory only */ } }
  };
  const ORDER = ["index", "security", "work", "credentials", "api", "contact"];
  const ROUTE = { index: "/", security: "/security", work: "/work", credentials: "/credentials", api: "/api", contact: "/contact" };
  const TITLE = { index: "the front page", security: "the security desk", work: "the builds", credentials: "the credentials", api: "the API", contact: "the post desk" };
  const page = (() => {
    const p = document.body.dataset.page || "";
    if (p === "work" && /^\/work\/./.test(location.pathname)) return "case";
    return p;
  })();

  let mode = store.get("mode") || "away";
  let acting = false;
  const setMode = (m) => { mode = m; store.set("mode", m); };
  const home = () => ({ x: Math.max(70, N.vw() * 0.06), y: N.ground() });

  /* ---------------------------------------------------------------- */
  /* Little flourishes                                                 */
  /* ---------------------------------------------------------------- */

  function confetti(x, y, n = 36) {
    if (N.reduced) return;
    const colors = ["#d15a35", "#ffd569", "#7a8f4f", "#5a62a0", "#f7a092", "#171612"];
    // Cut paper, not glitter: stars, triangles, discs and snipped strips.
    const shapes = ["polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)", "polygon(50% 0, 100% 100%, 0 100%)", "circle(50%)", "none"];
    for (let i = 0; i < n; i += 1) {
      const c = document.createElement("span");
      c.className = "nav-confetti";
      c.style.clipPath = shapes[i % shapes.length];
      if (i % 4 < 3) { c.style.width = "12px"; c.style.height = "12px"; }
      const a = Math.random() * Math.PI * 2;
      const d = 80 + Math.random() * 180;
      c.style.left = `${x}px`;
      c.style.top = `${y}px`;
      c.style.background = colors[i % colors.length];
      c.style.setProperty("--x", `${Math.cos(a) * d}px`);
      c.style.setProperty("--y", `${Math.sin(a) * d * 0.6 + 160 + Math.random() * 120}px`);
      c.style.setProperty("--r", `${Math.random() * 720 - 360}deg`);
      c.style.setProperty("--d", `${1.1 + Math.random() * 0.8}s`);
      document.body.appendChild(c);
      window.setTimeout(() => c.remove(), 2100);
    }
  }

  // The tour controls: where you are, and a way out.
  const hud = document.createElement("div");
  hud.className = "nav-hud";
  hud.setAttribute("role", "status");
  hud.innerHTML = `<i aria-hidden="true"></i><span data-hud-text><span data-hud-label>Tour with Miko · </span><span class="nav-hud-step" data-hud-step></span></span><button type="button" data-hud-end>End tour</button>`;
  const step = () => {
    const t = store.get("tour");
    return Math.min(ORDER.length, ((t && t.seen) || []).length + 1);
  };
  const hudOn = (on) => {
    if (on && !hud.isConnected) document.body.appendChild(hud);
    $("[data-hud-step]", hud).textContent = `${step()} / ${ORDER.length}`;
    hud.classList.toggle("is-on", on);
    // No gags on the tour: every move there is precise.
    N.gags(!on);
  };
  const CINE = window.NAV_CINE || { letterbox() {}, letterboxOff() {}, chapter: () => Promise.resolve() };
  const CHAPTER = { index: "The Front Page", security: "The Security Desk", work: "The Builds", credentials: "The Records Office", api: "The Wire", contact: "The Post Desk" };
  const CHAPTER_SUB = {
    index: "In which Miko meets the researcher",
    security: "In which bugs are hunted, politely",
    work: "In which five products are unboxed",
    credentials: "In which the paperwork is admired",
    api: "In which the journal talks JSON",
    contact: "In which you write a letter"
  };
  $("[data-hud-end]", hud).addEventListener("click", () => endTour());
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && store.get("tour")?.on) endTour(); });

  /* ---------------------------------------------------------------- */
  /* The menu, for getting between pages                                */
  /* ---------------------------------------------------------------- */

  const menuOpen = () => $("#menuCurtain")?.classList.contains("active");
  async function openMenu() {
    const btn = $("#menuButton");
    if (!btn) return false;
    if (btn.getBoundingClientRect().top < 0 || btn.getBoundingClientRect().bottom > N.vh()) {
      rig.setFace("determined");
      await N.say(pick(["Back to the top, hold on!", "Up we go!", "Wheee, to the top!"]), { hold: 700 });
      await N.scrollTo(0, { fast: true });
    }
    const spot = N.beside(btn, -1);
    await N.flyTo(spot.x, spot.y);
    await N.click(btn);
    await N.pause(750);
    return menuOpen();
  }
  async function closeMenu() {
    if (!menuOpen()) return;
    const x = $(".menu-close") || $("#menuButton");
    const spot = N.beside(x, -1);
    await N.flyTo(spot.x, spot.y, { airborne: true });
    await N.click(x);
    await N.pause(500);
  }

  /* ---------------------------------------------------------------- */
  /* The tour                                                          */
  /* ---------------------------------------------------------------- */

  const T = {
    N, rig, $, pick, confetti, openMenu, closeMenu, page,
    // Fly or walk to a thing, point at it, and talk about it.
    async show(target, text, o = {}) {
      const el = typeof target === "string" ? $(target) : target;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (o.scroll !== false && (r.top < 60 || r.bottom > N.vh() - 40 || o.scroll)) await N.scrollTo(el, { offset: o.offset });
      const spot = N.beside(el, o.side);
      await N.go(spot.x, spot.y, { fly: o.fly });
      N.pointAt(el, { spot: o.spot });
      if (o.emote) rig.emote(o.emote, 1800);
      await N.say(text, { face: o.face || "smile", hold: o.hold });
      N.spotOff();
      rig.aim = null;
      rig.do(Math.abs(rig.y - N.ground()) < 4 ? "idle" : "hover");
    },
    // On to the next page of the tour, or the end of it.
    async onward() {
      const t = store.get("tour") || { seen: [] };
      const seen = Array.from(new Set([...(t.seen || []), page]));
      const next = ORDER.find((p, i) => !seen.includes(p) && i > ORDER.indexOf(page)) || ORDER.find((p) => !seen.includes(p));
      if (!next) return finishTour();
      store.set("tour", { on: true, seen, next });
      hudOn(true);
      rig.setFace("excited");
      await N.say(`Next stop: ${TITLE[next]}!`, { hold: 1100 });
      N.hush();
      const opened = await openMenu();
      const link = $(`.menu-panel a[href="${ROUTE[next]}"]`);
      if (opened && link) {
        rig.setFace("happy");
        const spot = N.beside(link, N.rectOf(link).cx > N.vw() / 2 ? -1 : 1);
        await N.flyTo(spot.x, spot.y, { airborne: true });
        await N.click(link);
      } else {
        window.location.href = ROUTE[next];
      }
    }
  };

  async function runTour() {
    const script = (window.NAV_TOURS || {})[page];
    N.busy(true);
    hudOn(true);
    acting = true;
    try {
      if (script && CHAPTER[page]) {
        const e = N.epoch;
        await CINE.chapter(`Chapter ${ORDER.indexOf(page) + 1} of ${ORDER.length}`, CHAPTER[page], CHAPTER_SUB[page]);
        N.check(e);
      }
      if (!script) {
        await N.say("Let's begin at the front page!", { face: "excited", hold: 1200 });
        const t = store.get("tour") || { seen: [] };
        store.set("tour", { on: true, seen: t.seen || [], next: "index" });
        await T.openMenu();
        const link = $('.menu-panel a[href="/"]');
        if (link) await N.click(link); else window.location.href = "/";
        return;
      }
      await script(T);
    } catch (err) {
      if (err !== N.CANCEL && window.console) console.warn("[miko]", err);
    }
  }

  async function startTour() {
    if (DOCK && DOCK.state !== "off") await DOCK.wake();
    store.set("tour", { on: true, seen: [], next: page });
    setMode("companion");
    await runTour();
  }

  async function finishTour() {
    store.set("tour", { on: false, seen: [], next: null });
    hudOn(false);
    CINE.letterbox(true);
    CINE.chapter("Epilogue", "The End", "Thank you for reading the whole journal", 2600);
    rig.do("celebrate");
    rig.setFace("excited");
    rig.emote("sparkles", 2600);
    const hs = rig.topScreen();
    confetti(hs.x, hs.y, 44);
    try {
      await N.say("That's the whole journal! Thank you for touring with me!", { hold: 2200 });
      rig.do("bow", { restart: true });
      rig.setFace("proud");
      await N.say("I'll be down in the corner if you need me. Poke me any time!", { hold: 2000, close: true });
    } finally {
      CINE.letterbox(false);
    }
    N.busy(false);
    acting = false;
    await goHome();
  }

  async function endTour() {
    const t = store.get("tour");
    if (!t || !t.on) return;
    N.interrupt();
    store.set("tour", { on: false, seen: [], next: null });
    hudOn(false);
    if (menuOpen()) $("#menuButton")?.click();
    N.busy(false);
    acting = true;
    try {
      rig.setFace("smile");
      rig.do("wave");
      await N.say("Okay! Tour's over. I'll be in the corner!", { hold: 1400, close: true });
      await goHome();
    } catch (_) { /* interrupted again */ }
    acting = false;
  }

  /* ---------------------------------------------------------------- */
  /* Hello, and the two answers                                        */
  /* ---------------------------------------------------------------- */

  async function greet() {
    N.interrupt();
    N.busy(true);
    acting = true;
    try {
      if (DOCK && DOCK.state !== "off") await DOCK.wake();
      const g = N.ground();
      rig.facing = 1;
      rig.setFace("happy");
      if (!N.visible) N.place(-80, g);
      await N.walkTo(Math.max(150, N.vw() * 0.14), { run: true });
      rig.squash(0.16);
      rig.do("wave");
      rig.emote("note", 1400);
      await N.say("Hi there! I'm Miko, your tiny guide for big ideas.", { face: "happy", hold: 1700 });
      rig.do("idle");
      CINE.letterbox(true);
      let answer = -1;
      try {
        answer = await N.ask("Want me to give you a tour of Abhinav's journal?", ["Yes! Show me around", "No thanks"], { face: "excited" });
      } finally {
        if (answer !== 1) CINE.letterbox(false);
      }
      if (answer === 0) {
        rig.do("celebrate", { restart: true });
        rig.setFace("excited");
        rig.emote("sparkles", 1800);
        const hs = rig.topScreen();
        confetti(hs.x, hs.y);
        await N.say("Yay! Follow me!", { hold: 900 });
        await startTour();
      } else if (answer === 1) {
        await sadExit();
      }
    } catch (err) {
      if (err !== N.CANCEL && window.console) console.warn("[miko]", err);
    }
  }

  async function sadExit() {
    N.busy(true);
    try {
      rig.do("sad");
      rig.setFace("sad");
      await N.say("Oh... okay.", { hold: 1100 });
      rig.setFace("sob");
      await N.pause(700);
      // The dam breaks: a full, unmistakable sob.
      rig.do("cry", { restart: true });
      rig.setFace("cry");
      rig.squash(0.12);
      await N.say("I-it's fine! I'm not crying! The adventure breeze got in my eyes.", { hold: 1900 });
      rig.do("sad");
      rig.setFace("sad");
      rig.emote("q", 900);
      await N.say("I'll just nap in the corner. Poke me if you change your mind!", { hold: 1700, close: true });
      // A slow, sniffly glide to a quiet corner, and a nap
      rig.setFace("sob");
      await nap({ sad: true });
    } finally {
      CINE.letterbox(false);
    }
    N.busy(false);
    acting = false;
  }

  /* ---------------------------------------------------------------- */
  /* Away: napping in the corner                                       */
  /* ---------------------------------------------------------------- */

  // Off to a safe corner to curl up small. From there the sleep dock has
  // him: no speech, tour bar or wandering until he is woken.
  async function nap(o = {}) {
    const e = N.epoch;
    hudOn(false);
    N.hush();
    N.spotOff();
    CINE.letterboxOff();
    if (!DOCK) {
      await N.leave({ sad: o.sad, run: !o.sad });
      setMode("away");
      return;
    }
    const spot = DOCK.spot();
    const kk = N.k();
    await N.walkTo(Math.min(N.vw() - 88 * kk - 8, Math.max(88 * kk + 8, spot.x)), { y: spot.y, sad: o.sad, careful: true });
    N.check(e);
    setMode("away");
    await DOCK.sleep({ from: true });
  }

  // Sent to sleep from outside (or found asleep on arrival).
  function sleep() {
    if (!DOCK) return;
    setMode("away");
    if (!N.visible) { DOCK.sleep(); return; }
    N.interrupt();
    N.busy(false);
    acting = true;
    nap().catch(() => {}).then(() => { acting = false; });
  }

  // Woken by a tap, a key or a miko:wake event: an eye opens, a big
  // stretch, and he is all ears again, right where he napped.
  async function comeBack() {
    if (!DOCK || !DOCK.asleep) return;
    N.interrupt();
    acting = true;
    try {
      await DOCK.wake();
      setMode("companion");
      rig.setFace("excited");
      rig.emote("bang", 700);
      rig.squash(0.14);
      await menu(true);
    } catch (_) { /* interrupted */ }
    acting = false;
  }
  if (DOCK) DOCK.onPress(comeBack);
  window.addEventListener("miko:wake", () => { comeBack(); });

  /* ---------------------------------------------------------------- */
  /* Companion: living in the corner                                   */
  /* ---------------------------------------------------------------- */

  async function goHome() {
    const h = home();
    await N.walkTo(h.x, { y: h.y });
    rig.do("idle");
    rig.setFace("neutral");
  }

  const FACTS = [
    "Psst! Six press marks are hidden across the journal. Can you find them all?",
    "Press / anywhere and the command desk opens. Very hacker-y.",
    "Every poster on the builds page is drawn live in your browser. No pictures at all!",
    "Abhinav made Bugcrowd's global Top 50 three months running. I cheered every time.",
    "Turn on press sounds down at the bottom and you can hear me talk!",
    "You can pick me up and drop me. Gently, please. I'm mostly liquid."
  ];

  async function menu(back) {
    acting = true;
    rig.do("wave");
    const choice = await N.ask(back ? "You called? Yay! What shall we do?" : pick(["Hi hi! What's up?", "You poked me! What shall we do?", "Oh! Hello again!"]), ["Give me the tour", "Tell me something fun", "Bye for now, Miko"], { face: "happy" });
    if (choice === 0) {
      rig.do("celebrate", { restart: true });
      rig.setFace("excited");
      await N.say("Yay! Let's go!", { hold: 800 });
      await startTour();
    } else if (choice === 1) {
      rig.do("star");
      await N.say(pick(FACTS), { face: "mischief", hold: 3000, close: true });
      rig.do("idle");
      // Woken in the nap corner: back to his usual spot afterwards.
      if (back) await goHome();
      acting = false;
    } else if (choice === 2) {
      rig.do("wave");
      await N.say("Okay! Bye bye!", { face: "smile", hold: 900, close: true });
      await nap();
      acting = false;
    } else acting = false;
  }

  function companion(enter) {
    if (DOCK) DOCK.off();
    setMode("companion");
    N.interrupt();
    const h = home();
    rig.setFace("neutral");
    if (enter) {
      rig.facing = 1;
      N.place(-70, h.y);
      N.walkTo(h.x).catch(() => {});
    } else N.place(h.x, h.y);
  }

  // The idle brain: small things every few seconds, a nap if left alone.
  let idleIn = 6;
  let quiet = 0;
  let asleep = false;
  const IDLES = [
    async () => { rig.look = { x: rig.x + (Math.random() < 0.5 ? -400 : 400), y: rig.y - 200 }; rig.setFace("curious"); await N.wait(1300); rig.look = N.pointer; rig.setFace("neutral"); },
    async () => { rig.do("stretch", { restart: true }); rig.setFace("yawn"); await N.wait(1400); rig.do("idle"); rig.setFace("neutral"); },
    async () => { rig.emote("note", 1300); await N.hopTo(rig.x, rig.y, { height: 34, dur: 0.36 }); await N.wait(200); await N.hopTo(rig.x, rig.y, { height: 24, dur: 0.3 }); },
    async () => { rig.do("sit"); rig.setFace("smile"); await N.wait(5200); rig.do("idle"); rig.setFace("neutral"); },
    async () => { rig.do("star"); rig.setFace("proud"); await N.wait(2200); rig.do("idle"); rig.setFace("neutral"); },
    async () => { rig.do("think"); rig.setFace("thinking"); rig.emote("q", 1600); await N.wait(1900); rig.emote("idea", 900); rig.setFace("happy"); await N.wait(900); rig.do("idle"); rig.setFace("neutral"); },
    // A little patrol along the floor and back. Long runs are where the
    // rare trip lives (about one in ten, with a long cooldown).
    async () => {
      const h = home();
      rig.setFace("determined");
      await N.walkTo(Math.min(N.vw() - 90, h.x + N.vw() * (0.24 + Math.random() * 0.16)), { y: h.y, run: true });
      rig.look = { x: rig.x + 300, y: rig.y - 120 };
      rig.setFace("curious");
      await N.pause(900);
      rig.look = N.pointer;
      rig.setFace("happy");
      await N.walkTo(h.x, { y: h.y, run: true });
      rig.do("idle");
      rig.setFace("neutral");
    }
  ];

  N.on(async (dt, evt) => {
    if (evt === "poke") {
      if (N.stage.classList.contains("is-busy") || store.get("tour")?.on) return;
      if (mode === "away") { comeBack(); return; }
      if (asleep) { asleep = false; rig.clearEmotes(); rig.do("idle"); rig.setFace("shocked"); rig.emote("bang", 600); await N.wait(600); }
      N.interrupt();
      rig.squash(0.14);
      menu(false).catch(() => { acting = false; });
      return;
    }
    if (evt === "lift") {
      N.interrupt();
      acting = true;
      asleep = false;
      N.say(pick(["Wheee!", "Hey! Put me down!", "Whoa, I'm flying!", "Careful with my cape!"]), { hold: 900, close: true }).catch(() => {});
      return;
    }
    if (evt === "drop") {
      try {
        // Splat, stars, and up again: the drawings keep their own time.
        const e = N.epoch;
        rig.do("splat", { restart: true });
        await rig.until();
        N.check(e);
        rig.do("rub");
        rig.setFace("embarrassed");
        await N.say(pick(["Oof... that was a big splat.", "Ow ow ow... my hair curl!", "Warn me next time!"]), { hold: 1400, close: true });
        if (mode === "companion" && !store.get("tour")?.on) await goHome();
        else if (mode === "away") await nap();
      } catch (_) { /* interrupted */ }
      acting = false;
      return;
    }
    if (evt === "hover" && mode === "companion" && !acting && !asleep) {
      rig.setFace("smile");
      if (Math.random() < 0.35) rig.emote("heart", 1100);
      window.setTimeout(() => { if (!acting && !asleep) rig.setFace("neutral"); }, 1400);
      return;
    }
    if (!dt || mode !== "companion" || acting || N.dragging || store.get("tour")?.on || !N.visible) return;
    quiet += dt;
    if (!asleep && quiet > 40) {
      asleep = true;
      rig.do("sleep");
      rig.setFace("sleepy");
      rig.emote("zzz", 1e6);
      return;
    }
    if (asleep) return;
    idleIn -= dt;
    if (idleIn <= 0) {
      idleIn = 7 + Math.random() * 8;
      acting = true;
      try { await pick(IDLES)(); } catch (_) { /* interrupted */ }
      acting = false;
    }
  });
  window.addEventListener("pointermove", (e) => {
    quiet = 0;
    if (asleep && Math.hypot(e.clientX - rig.x, e.clientY - rig.y) < 160) {
      asleep = false;
      rig.clearEmotes();
      rig.do("idle");
      rig.setFace("shocked");
      rig.emote("bang", 600);
      window.setTimeout(() => { if (!acting) rig.setFace("smile"); }, 700);
    }
  }, { passive: true });
  window.addEventListener("resize", () => {
    if (mode === "companion" && !acting && N.visible && !store.get("tour")?.on) { const h = home(); rig.x = h.x; rig.y = h.y; }
  });

  /* ---------------------------------------------------------------- */
  /* Boot                                                              */
  /* ---------------------------------------------------------------- */

  const arrived = () => new Promise((resolve) => {
    const b = document.body;
    if (b.classList.contains("intro-complete")) { resolve(); return; }
    const mo = new MutationObserver(() => { if (b.classList.contains("intro-complete")) { mo.disconnect(); resolve(); } });
    mo.observe(b, { attributes: true, attributeFilter: ["class"] });
    window.setTimeout(() => { mo.disconnect(); resolve(); }, 4000);
  });

  (async () => {
    const film = window.PR_FILM;
    const arrival = window.PR_ARRIVAL || { fresh: true };
    const tour = store.get("tour");
    // Every drawing is decoded before the first sequence plays, so no frame
    // ever pops in blank. A slow network never holds him back for long.
    const sprites = Promise.race([Promise.all([rig.preload ? rig.preload() : null, DOCK ? DOCK.preload() : null]), N.wait(3500)]);
    if (film && film.done) {
      await film.done;
      await N.wait(400);
    } else {
      await arrived();
      await N.wait(250);
    }
    await sprites;
    if (tour && tour.on && tour.next === page && !arrival.fresh) { runTour(); return; }
    if (tour && tour.on && arrival.fresh) store.set("tour", { on: false, seen: [], next: null });
    if (arrival.fresh && page !== "terminal") { greet(); return; }
    if (mode === "companion") { companion(true); return; }
    sleep();
  })();

  // peek is the old name for sending him away, kept for older page scripts.
  window.MIKO = { greet, startTour, endTour, sleep, wake: comeBack, peek: sleep, companion };
  window.INKY = window.MIKO; // Backward-compatible alias for older page scripts.
})();

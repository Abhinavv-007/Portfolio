/*
  Miko, the journal's guide: the cinematography.

  Everything here is cut paper laid over the stage, never over the page's
  own controls, and nothing here decides what Miko does:

    NAV_FX     effects keyed to his drawings: boot sparkles on a glide
               takeoff, stars and paper strips streaming off the cape in
               cruise, a tear trail on the sad glide, a skid puff on the
               brake, dust and a comic burst on a splat, streaks under a
               leap, a spray of tears while he sobs, a sweat drop after

  Particles are plain composited spans that remove themselves. On phones
  and low-power machines they spawn less often.
    NAV_CINE   the story-mode frame: letterbox bars for the big beats and
               a chapter card as the tour arrives on each page

  Reduced motion gets none of the flourishes; the chapter card still shows
  (without moving) so the tour keeps its place markers.
*/
(function () {
  "use strict";

  const N = window.NAV;
  if (!N) return;
  const { rig, stage } = N;
  const reduced = N.reduced;
  const rand = (a, b) => a + Math.random() * (b - a);
  const PAPER = ["#fbf6ec", "#eadfce", "#d6ccbd", "#c7b8a4"];
  const lowPower = window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const every = (ms) => (lowPower ? ms * 1.7 : ms);
  const GOLD = ["#ffd569", "#ffe9a8", "#f2b705", "#fff6d8"];
  const INK = "#171612";
  const RED = "#d75a2e";

  function spawn(cls, x, y, ms, setup, behind) {
    const node = document.createElement("span");
    node.className = `nav-fx ${cls}`;
    node.setAttribute("aria-hidden", "true");
    node.style.left = `${x.toFixed(1)}px`;
    node.style.top = `${y.toFixed(1)}px`;
    if (setup) setup(node);
    if (behind) stage.insertBefore(node, rig.el); else stage.appendChild(node);
    window.setTimeout(() => node.remove(), ms);
    return node;
  }

  /* ---------------------------------------------------------------- */
  /* Effects                                                           */
  /* ---------------------------------------------------------------- */

  // Scraps of paper kicked up where he lands.
  function dust(x, y, n = 10, spread = 1) {
    if (reduced) return;
    for (let i = 0; i < n; i += 1) {
      const side = i % 2 ? 1 : -1;
      spawn("nav-fx-scrap", x + rand(-14, 14), y - rand(2, 10), 900, (s) => {
        s.style.setProperty("--dx", `${(side * rand(30, 110) * spread).toFixed(0)}px`);
        s.style.setProperty("--dy", `${(-rand(18, 70) * spread).toFixed(0)}px`);
        s.style.setProperty("--r", `${rand(-260, 260).toFixed(0)}deg`);
        s.style.setProperty("--s", rand(0.6, 1.3).toFixed(2));
        s.style.background = PAPER[i % PAPER.length];
        s.style.animationDuration = `${rand(560, 860).toFixed(0)}ms`;
      });
    }
  }

  const BONKS = ["BONK!", "OOF!", "THUD!", "SPLAT!"];
  function impact(r = rig) {
    if (reduced) return;
    const kk = r.k();
    const x = r.x, y = r.y;
    // The star goes behind him, the word pops up over his head.
    spawn("nav-fx-burst", x - r.facing * 10 * kk, y - 58 * kk, 760, (b) => {
      b.style.setProperty("--k", (kk * 1.35).toFixed(3));
      b.innerHTML = "<i></i><i></i>";
    }, true);
    const wx = Math.min(N.vw() - 70, Math.max(70, x + r.facing * 60 * kk));
    spawn("nav-fx-word", wx, Math.max(N.safeBand().top + 24, y - 150 * kk), 900, (w) => {
      w.style.setProperty("--k", kk.toFixed(3));
      w.textContent = BONKS[Math.floor(Math.random() * BONKS.length)];
    });
    spawn("nav-fx-ring", x, y - 4, 620, (o) => o.style.setProperty("--k", kk.toFixed(3)), true);
    dust(x, y, 12, kk * 1.1);
    shake();
  }

  // A camera-free shake: only Miko's own layer jolts, never the page.
  function shake() {
    if (reduced) return;
    const node = rig.el;
    node.classList.remove("is-jolted");
    void node.offsetWidth;
    node.classList.add("is-jolted");
  }

  function leap(r = rig) {
    if (reduced) return;
    const kk = r.k();
    for (let i = 0; i < 5; i += 1) {
      spawn("nav-fx-streak is-up", r.x + rand(-34, 34) * kk, r.y - rand(0, 30) * kk, 520, (s) => {
        s.style.setProperty("--len", `${rand(30, 64) * kk}px`);
        s.style.animationDelay = `${i * 30}ms`;
      });
    }
    dust(r.x, r.y, 6, kk * 0.7);
  }

  let lastStreak = 0;
  function streaks(r = rig, now = performance.now(), gap = 55) {
    if (reduced || now - lastStreak < every(gap)) return;
    lastStreak = now;
    const kk = r.k();
    const dir = r.vx > 0 ? 1 : -1;
    spawn("nav-fx-streak", r.x - dir * rand(40, 70) * kk, r.y - rand(30, 170) * kk, 480, (s) => {
      s.style.setProperty("--len", `${rand(26, 70) * kk}px`);
      s.style.setProperty("--dir", String(-dir));
      s.style.background = Math.random() < 0.25 ? RED : Math.random() < 0.5 ? INK : PAPER[0];
    }, true);
  }

  // Stars shaken off the cape: behind him, drifting back and fading.
  let lastStar = 0;
  function stars(r = rig, now = performance.now(), sad = false) {
    if (reduced || now - lastStar < every(sad ? 210 : 70)) return;
    lastStar = now;
    const kk = r.k();
    const dir = r.facing;
    spawn(`nav-fx-star${sad ? " is-sad" : ""}`, r.x - dir * rand(34, 66) * kk, r.y - rand(40, 120) * kk, 760, (s) => {
      s.style.setProperty("--dx", `${(-dir * rand(40, 110) * kk).toFixed(0)}px`);
      s.style.setProperty("--dy", `${(rand(-26, 34) * kk).toFixed(0)}px`);
      s.style.setProperty("--s", rand(0.55, 1.15).toFixed(2));
      s.style.setProperty("--r", `${rand(90, 280).toFixed(0)}deg`);
      if (!sad) s.style.background = GOLD[Math.floor(Math.random() * GOLD.length)];
    }, true);
  }

  // Takeoff: sparkles kicked off the boots and a puff of paper dust.
  function launch(r = rig) {
    if (reduced) return;
    const kk = r.k();
    const n = lowPower ? 5 : 8;
    for (let i = 0; i < n; i += 1) {
      spawn("nav-fx-star is-burst", r.x - r.facing * rand(0, 30) * kk, r.y - rand(4, 26) * kk, 700, (s) => {
        const a = Math.PI * (0.55 + Math.random() * 0.9) * (r.facing > 0 ? 1 : -1);
        s.style.setProperty("--dx", `${(Math.cos(a) * -rand(30, 70) * kk).toFixed(0)}px`);
        s.style.setProperty("--dy", `${(Math.sin(Math.abs(a)) * -rand(10, 46) * kk).toFixed(0)}px`);
        s.style.setProperty("--s", rand(0.5, 1).toFixed(2));
        s.style.setProperty("--r", `${rand(-180, 180).toFixed(0)}deg`);
        s.style.background = GOLD[i % GOLD.length];
      }, true);
    }
    dust(r.x - r.facing * 10 * kk, r.y, lowPower ? 4 : 6, kk * 0.6);
  }

  // Brake: the boots skid, a puff ahead of him and a last twinkle.
  function skid(r = rig) {
    if (reduced) return;
    const kk = r.k();
    dust(r.x + r.facing * 22 * kk, r.y, lowPower ? 4 : 7, kk * 0.75);
    for (let i = 0; i < (lowPower ? 2 : 4); i += 1) {
      spawn("nav-fx-star is-burst", r.x + r.facing * rand(10, 40) * kk, r.y - rand(6, 30) * kk, 600, (s) => {
        s.style.setProperty("--dx", `${(r.facing * rand(10, 40) * kk).toFixed(0)}px`);
        s.style.setProperty("--dy", `${(-rand(14, 40) * kk).toFixed(0)}px`);
        s.style.setProperty("--s", rand(0.4, 0.8).toFixed(2));
        s.style.setProperty("--r", `${rand(-160, 160).toFixed(0)}deg`);
        s.style.background = GOLD[i % GOLD.length];
      }, true);
    }
  }

  let lastTear = 0;
  function tears(r = rig, now = performance.now(), walking = false) {
    if (reduced || now - lastTear < every(walking ? 240 : 120)) return;
    lastTear = now;
    const kk = r.k();
    const head = r.toScreen(0, -120);
    const side = Math.random() < 0.5 ? -1 : 1;
    spawn("nav-fx-tear", head.x + side * rand(26, 40) * kk, head.y + rand(-6, 10) * kk, 900, (t) => {
      t.style.setProperty("--dx", `${(side * (walking ? rand(8, 20) : rand(28, 70)) * kk).toFixed(0)}px`);
      t.style.setProperty("--dy", `${(rand(50, 110) * kk).toFixed(0)}px`);
      t.style.setProperty("--s", rand(0.7, 1.2).toFixed(2));
    });
  }

  function sweat(r = rig) {
    if (reduced) return;
    const kk = r.k();
    const p = r.toScreen(46, -168);
    spawn("nav-fx-sweat", p.x, p.y, 1200, (s) => s.style.setProperty("--k", kk.toFixed(3)));
  }

  // The drawings drive the effects, in time with the manifest.
  rig.onFrame = (id) => {
    if (id === "trip-stumble") rig.emote("bang", 650);
    else if (id === "trip-impact") impact(rig);
    else if (id === "trip-dizzy") { rig.emote("dizzy", (rig.frameMs("trip-dizzy") || 850) + 250); rig.setFace("dizzy"); }
    else if (id === "recover-getup") { sweat(rig); rig.setFace("embarrassed"); }
    else if (id === "climb-reach") rig.emote("q", 500);
    else if (id === "climb-slip") rig.emote("bang", 600);
    else if (id === "glide-takeoff") launch(rig);
    else if (id === "glide-brake") skid(rig);
  };

  N.on((dt) => {
    if (!dt || !N.visible) return;
    const a = rig.action;
    const f = rig.frame;
    const fast = Math.abs(rig.vx) > 60;
    if (f === "glide-cruise" && fast) {
      stars(rig);
      if (Math.abs(rig.vx) > 200) streaks(rig, performance.now(), 110);
    } else if (f === "glide-sad" && fast) {
      tears(rig, performance.now(), true);
      stars(rig, performance.now(), true);
    } else if (a === "fly" && Math.abs(rig.vx) > 230) streaks(rig);
    if (a === "cry" || a === "sob") tears(rig);
    else if (a === "sadwalk") tears(rig, performance.now(), true);
  });

  /* ---------------------------------------------------------------- */
  /* Story mode: letterbox bars and chapter cards                      */
  /* ---------------------------------------------------------------- */

  const bars = document.createElement("div");
  bars.className = "nav-cine-bars";
  bars.setAttribute("aria-hidden", "true");
  bars.innerHTML = "<i></i><i></i>";
  stage.insertBefore(bars, stage.firstChild);
  let barsHold = 0;
  function letterbox(on) {
    barsHold = Math.max(0, barsHold + (on ? 1 : -1));
    bars.classList.toggle("is-on", barsHold > 0);
  }
  function letterboxOff() { barsHold = 0; bars.classList.remove("is-on"); }

  const card = document.createElement("div");
  card.className = "nav-chapter";
  card.setAttribute("role", "status");
  card.setAttribute("aria-live", "polite");
  card.innerHTML = `
    <span class="nav-chapter-back" aria-hidden="true"></span>
    <span class="nav-chapter-mid" aria-hidden="true"></span>
    <div class="nav-chapter-face">
      <small data-chapter-num></small>
      <strong data-chapter-title></strong>
      <em data-chapter-sub></em>
    </div>
    <span class="nav-chapter-snip" aria-hidden="true"></span>`;
  let cardTimer = 0;

  // Shows a chapter card; resolves once it has been read, while it leaves.
  function chapter(label, title, sub = "", ms = 2300) {
    if (!card.isConnected) document.body.appendChild(card);
    card.querySelector("[data-chapter-num]").textContent = label;
    card.querySelector("[data-chapter-title]").textContent = title;
    card.querySelector("[data-chapter-sub]").textContent = sub;
    card.classList.remove("is-on", "is-off");
    void card.offsetWidth;
    card.classList.add("is-on");
    window.clearTimeout(cardTimer);
    cardTimer = window.setTimeout(() => {
      card.classList.add("is-off");
      cardTimer = window.setTimeout(() => card.classList.remove("is-on", "is-off"), 700);
    }, ms);
    return new Promise((resolve) => window.setTimeout(resolve, reduced ? 400 : Math.min(ms - 300, 1500)));
  }

  window.NAV_FX = { dust, impact, shake, leap, streaks, stars, launch, skid, tears, sweat };
  window.NAV_CINE = { letterbox, letterboxOff, chapter };
})();

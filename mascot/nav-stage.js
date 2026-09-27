/*
  Miko, the journal's guide: the stage.

  Puts Miko on the page and gives the tour its verbs: walk, run, hop, fly,
  say, ask, point, spot, click, scroll, feel, leave. Every verb returns a
  promise; interrupt() cancels whatever is running, so a tour can be ended
  at any moment without leaving him stuck mid-air.

  Also owns the bits of him that are always on: looking at the pointer,
  blinking, being picked up by the scruff and dropped, and his voice (a
  soft blip per letter, only when the journal's sound is switched on).
*/
(function () {
  "use strict";

  if (!window.NavRig) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = {
    io: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    out3: (t) => 1 - Math.pow(1 - t, 3)
  };
  const CANCEL = { cancelled: true };
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;

  /* ---------------------------------------------------------------- */
  /* The layer                                                         */
  /* ---------------------------------------------------------------- */

  const stage = document.createElement("div");
  stage.className = "nav-stage";
  const rig = window.NavRig.create();
  rig.el.setAttribute("role", "button");
  rig.el.setAttribute("tabindex", "0");
  rig.el.setAttribute("aria-label", "Miko, the journal's guide. Press to talk to them.");
  stage.appendChild(rig.el);

  const bubble = document.createElement("div");
  bubble.className = "nav-bubble";
  bubble.setAttribute("role", "dialog");
  bubble.setAttribute("aria-live", "polite");
  bubble.setAttribute("aria-label", "Miko says");
  bubble.innerHTML = `
    <span class="nav-bubble-name">Miko</span>
    <p class="nav-bubble-text"><span class="nav-bubble-ghost" aria-hidden="true"></span><span class="nav-bubble-typed"></span></p>
    <div class="nav-bubble-choices" role="group"></div>
    <span class="nav-bubble-more" aria-hidden="true"></span>
    <i class="nav-bubble-timer" aria-hidden="true"></i>
    <i class="nav-bubble-tail" aria-hidden="true"></i>`;
  stage.appendChild(bubble);
  const textEl = bubble.querySelector(".nav-bubble-typed");
  const ghostEl = bubble.querySelector(".nav-bubble-ghost");
  const choicesEl = bubble.querySelector(".nav-bubble-choices");
  const timerEl = bubble.querySelector(".nav-bubble-timer");
  const tailEl = bubble.querySelector(".nav-bubble-tail");

  const spot = document.createElement("div");
  spot.className = "nav-spot";
  spot.setAttribute("aria-hidden", "true");
  // Under Miko and his bubble, so its dashed edge never cuts through a line.
  stage.insertBefore(spot, rig.el);

  const mount = () => { if (!stage.isConnected) document.body.appendChild(stage); };

  /* ---------------------------------------------------------------- */
  /* Voice: a soft blip per letter, only with the journal's sound on   */
  /* ---------------------------------------------------------------- */

  let actx = null;
  function blip(ch, i) {
    const S = window.PRESS_SOUND;
    if (!S || !S.enabled || i % 2 || !/[a-z0-9]/i.test(ch)) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!actx) actx = new AC();
      if (actx.state === "suspended") actx.resume();
      const t = actx.currentTime;
      const o = actx.createOscillator();
      const gn = actx.createGain();
      o.type = "triangle";
      const base = 520 + ((ch.toLowerCase().charCodeAt(0) * 37) % 260);
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(base * 1.25, t + 0.05);
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(0.05, t + 0.008);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(gn);
      gn.connect(actx.destination);
      o.start(t);
      o.stop(t + 0.08);
    } catch (_) { /* no voice today */ }
  }

  /* ---------------------------------------------------------------- */
  /* Clock and motion                                                  */
  /* ---------------------------------------------------------------- */

  let epoch = 0;
  let motion = null;
  let spotTarget = null;
  let drag = null;
  let visible = false;
  const listeners = new Set();

  const k = () => rig.k();
  const ground = () => vh() - Math.max(10, vh() * 0.018);

  function check(e) { if (e !== epoch) throw CANCEL; }

  function move(path, dur, opts = {}) {
    return new Promise((resolve) => {
      if (motion) motion.resolve();
      motion = { path, dur: Math.max(0.05, reduced ? Math.min(dur, 0.25) : dur), t: 0, ease: opts.ease || ease.io, resolve, air: opts.air || null, step: opts.step || null };
    });
  }

  // The band a speech bubble (or Miko) may use: never under the tour HUD.
  // On short screens the HUD sits at the bottom, so it reserves that edge.
  function safeBand() {
    let top = 10, bottom = vh() - 10;
    const hud = document.querySelector(".nav-hud.is-on");
    if (hud) {
      const r = hud.getBoundingClientRect();
      if (r.height && r.bottom > 0 && r.top < vh()) {
        if (r.top + r.height / 2 < vh() / 2) top = Math.max(top, r.bottom + 12);
        else bottom = Math.min(bottom, r.top - 12);
      }
    }
    return { top, bottom };
  }

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (visible) {
      if (motion) {
        motion.t += dt;
        const u = clamp(motion.t / motion.dur);
        const [x, y] = motion.path(motion.ease(u), u);
        rig.vx = dt > 0 ? (x - rig.x) / dt : 0;
        rig.vy = dt > 0 ? (y - rig.y) / dt : 0;
        rig.x = x;
        rig.y = y;
        rig.air = motion.air ? motion.air(u) : 0;
        if (motion.step) motion.step(u);
        if (u >= 1) { const m = motion; motion = null; rig.vx = 0; rig.vy = 0; rig.air = 0; m.resolve(); }
      } else if (drag && drag.falling) {
        drag.vy += 2600 * dt;
        rig.y = Math.min(drag.floor, rig.y + drag.vy * dt);
        rig.vy = drag.vy;
        if (rig.y >= drag.floor) { const f = drag.falling; drag = null; f(); }
      } else if (!drag) {
        rig.vx *= 0.8;
      }
      rig.update(dt);
      placeBubble();
      placeSpot();
      listeners.forEach((fn) => fn(dt));
    }
    window.requestAnimationFrame(tick);
  }
  window.requestAnimationFrame(tick);

  /* ---------------------------------------------------------------- */
  /* Getting about                                                     */
  /* ---------------------------------------------------------------- */

  function place(x, y) {
    mount();
    rig.x = x;
    rig.y = y;
    visible = true;
    stage.classList.add("is-on");
  }

  // Gags (the comic trip) are for Miko's own wanderings, never the tour.
  let gags = true;
  let lastTrip = -1e9;
  const forceTrip = /[?&]miko=trip\b/.test(location.search);
  const canTrip = (dist, o) => gags && !reduced && !o.careful && !o.sad && dist > 240 * clamp(k() * 1.2, 0.5, 1) &&
    (forceTrip || (performance.now() - lastTrip > 45000 && Math.random() < 0.1));

  // A comic trip mid-run: stumble, tumble, splat, stars, and up again.
  // The drawings run on the rig's clock (manifest timings); this moves him.
  async function trip(dir) {
    const e = epoch;
    lastTrip = performance.now();
    rig.do("trip", { restart: true });
    const kk = k();
    const x0 = rig.x, y0 = rig.y;
    await move((p) => [x0 + dir * 26 * kk * p, y0], rig.frameMs("trip-stumble") / 1000, { ease: ease.out3 });
    check(e);
    const x1 = rig.x, hgt = 44 * kk;
    await move((p, u) => [x1 + dir * 74 * kk * u, y0 - 4 * hgt * u * (1 - u)], rig.frameMs("trip-tumble") / 1000, { ease: (t) => t, air: (u) => Math.sin(u * Math.PI) * hgt });
    check(e);
    await rig.until();
    check(e);
  }

  // Horizontal travel is a glide (the v3 pack): takeoff, then cruise (or
  // the sad glide when he is sad, crying or sobbing), then brake, then the
  // destination pose. The whole of Miko is translated on one smooth
  // velocity curve: speeding up through the takeoff drawing, a steady
  // cruise, slowing through the brake. No legs cycle. Trips under about
  // 120px skip the cruise. The trip gag can only follow a landing.
  async function walkTo(x, o = {}) {
    const e = epoch;
    const y = o.y != null ? o.y : rig.y;
    const dist = Math.hypot(x - rig.x, y - rig.y);
    if (dist < 3) return;
    const dir = x >= rig.x ? 1 : -1;
    rig.facing = dir;
    const sad = Boolean(o.sad) || rig.isSad();
    const kk = clamp(k() * 2.4, 0.7, 1.3);
    const cruiseV = (o.speed || (sad ? 115 : o.run ? 420 : 330)) * kk;
    const tk = (rig.frameMs("glide-takeoff") || 220) / 1000;
    const tb = (rig.frameMs("glide-brake") || 260) / 1000;
    const short = dist < 120 * kk;
    // Distance covered speeding up and slowing down is half of top speed
    // times each phase; the cruise covers the rest at top speed.
    let tc = short ? 0 : dist / cruiseV - (tk + tb) / 2;
    if (tc < 0) tc = 0;
    const v = dist / (tc + (tk + tb) / 2);
    const T = tk + tc + tb;
    const along = (t) => {
      if (t <= tk) return (v / tk) * t * t * 0.5;
      if (t <= tk + tc) return v * tk * 0.5 + v * (t - tk);
      const b = Math.min(tb, t - tk - tc);
      return v * tk * 0.5 + v * tc + v * b - (v / tb) * b * b * 0.5;
    };
    rig.do(sad ? "glideSad" : "glide", { restart: true, short, speed: v / 170 });
    const x0 = rig.x, y0 = rig.y;
    let braking = short;
    await move((p) => [lerp(x0, x, p), lerp(y0, y, p)], T, {
      ease: (u) => clamp(along(u * T) / dist),
      step: (u) => { if (!braking && u * T >= tk + tc) { braking = true; rig.release(); } }
    });
    check(e);
    rig.squash(0.1);
    // Now, and only now, the rare comic trip: he lands, and his boots don't.
    if (!sad && canTrip(dist, o)) {
      await trip(dir);
      check(e);
    }
    rig.do(o.then || "idle");
  }

  // The failed climb: up the page edge by hand, a slip, a splat, a recovery.
  // Always ends back on the floor, so whatever comes next (flying) can run.
  async function climbFail(o = {}) {
    const e = epoch;
    const kk = k();
    const g = ground();
    const x = o.x != null ? o.x : vw() - 64 * kk;
    await walkTo(x, { y: g, careful: true });
    check(e);
    rig.facing = o.face || 1;
    rig.look = null;
    rig.do("reach", { restart: true });
    await move((p) => [x, g - 8 * kk * p], rig.frameMs("climb-reach") / 1000, { ease: ease.out3 });
    check(e);
    rig.do("struggle", { restart: true });
    const rise = Math.min(vh() * 0.3, 190 * kk);
    for (let i = 0; i < 3; i += 1) {
      const y0 = rig.y;
      const y1 = g - 8 * kk - rise * ((i + 1) / 3);
      await move((p) => [x + Math.sin(p * Math.PI) * 3, lerp(y0, y1, p)], 0.3, { ease: ease.out3, air: () => g - rig.y });
      check(e);
      await move((p) => [x, y1 + 7 * kk * Math.sin(p * Math.PI)], 0.26, { ease: ease.io, air: () => g - rig.y });
      check(e);
    }
    rig.do("slip", { restart: true });
    await pause(rig.frameMs("climb-slip"));
    const yTop = rig.y;
    await move((p) => [x - 6 * kk * p, lerp(yTop, g, p)], clamp(Math.sqrt((g - yTop) / 1400), 0.22, 0.5), { ease: (t) => t * t, air: () => g - rig.y });
    check(e);
    rig.do("splat", { restart: true });
    await rig.until();
    check(e);
    rig.do("idle");
  }

  async function hopTo(x, y, o = {}) {
    const e = epoch;
    rig.facing = x >= rig.x ? 1 : rig.x - x > 3 ? -1 : rig.facing;
    rig.do("jump", { restart: true });
    await wait(reduced ? 0 : 140);
    check(e);
    const x0 = rig.x, y0 = rig.y;
    const hgt = o.height != null ? o.height : 70 + Math.abs(y - y0) * 0.35;
    const dur = o.dur || clamp(Math.hypot(x - x0, y - y0) / 700, 0.38, 0.8);
    await move((p, u) => [lerp(x0, x, u), lerp(y0, y, u) - 4 * hgt * u * (1 - u)], dur, { ease: (t) => t, air: (u) => Math.sin(u * Math.PI) * hgt });
    check(e);
    rig.squash(0.2);
    rig.do(o.then || "idle");
  }

  async function flyTo(x, y, o = {}) {
    const e = epoch;
    const x0 = rig.x, y0 = rig.y;
    const dist = Math.hypot(x - x0, y - y0);
    if (dist < 3) return;
    rig.facing = x >= x0 ? 1 : -1;
    // A target well above him starts with the leap drawing, then the cape.
    const up = !o.airborne && y0 - y > 90 * k();
    if (!o.airborne) {
      rig.do(up ? "leap" : "jump", { restart: true });
      await wait(reduced ? 0 : up ? 110 : 130);
      check(e);
      if (up && window.NAV_FX) window.NAV_FX.leap(rig);
    }
    if (!up) rig.do("fly");
    const cx = (x0 + x) / 2, cy = Math.min(y0, y) - Math.min(160, dist * 0.35);
    await move((p) => [
      (1 - p) * (1 - p) * x0 + 2 * (1 - p) * p * cx + p * p * x,
      (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * cy + p * p * y
    ], o.dur || clamp(dist / 620, 0.55, 1.5), {
      ease: ease.io,
      air: (u) => Math.sin(u * Math.PI) * 120,
      step: up ? (u) => { if (u > 0.3 && rig.action === "leap") rig.do("fly"); } : null
    });
    check(e);
    if (o.land) { rig.squash(0.18); rig.do("idle"); } else rig.do("hover");
  }

  // Go wherever the point is: walk along the floor, fly anywhere else.
  async function go(x, y, o = {}) {
    if (Math.abs(y - rig.y) < 24 && !o.fly) return walkTo(x, { y, run: o.run, then: o.then });
    return flyTo(x, y, o);
  }

  const wait = (ms) => new Promise((r) => window.setTimeout(r, ms));
  async function pause(ms) { const e = epoch; await wait(ms); check(e); }

  /* ---------------------------------------------------------------- */
  /* Looking at things                                                 */
  /* ---------------------------------------------------------------- */

  const rectOf = (t) => {
    if (!t) return null;
    const r = t.getBoundingClientRect ? t.getBoundingClientRect() : t;
    return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.left + r.width, bottom: r.top + r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  };

  // A spot beside a thing where his hand can reach it: his shoulder level
  // with its middle, one arm's length from its edge.
  function beside(target, side) {
    const r = rectOf(target);
    const s = side || (r.cx > vw() / 2 ? -1 : 1);
    const kk = k();
    const [sx, sy] = rig.geom.shoulder;
    const gap = (sx + rig.geom.reach) * kk;
    const x = s < 0 ? r.left - gap : r.right + gap;
    const y = r.cy - sy * kk;
    // His head stays clear of the tour HUD, whatever he is pointing at.
    const top = safeBand().top - rig.B.top * kk;
    return { x: clamp(x, 88 * kk + 8, vw() - 88 * kk - 8), y: clamp(y, Math.min(top, ground()), ground()), face: s < 0 ? 1 : -1 };
  }

  function pointAt(target, o = {}) {
    const r = rectOf(target);
    if (!r) return;
    rig.facing = r.cx >= rig.x ? 1 : -1;
    rig.aim = { x: r.cx, y: r.cy };
    rig.look = rig.aim;
    rig.do("point");
    if (o.spot !== false && target.getBoundingClientRect) spotOn(target);
  }

  function spotOn(target) { spotTarget = target; spot.classList.add("is-on"); placeSpot(); }
  function spotOff() { spotTarget = null; spot.classList.remove("is-on"); }
  function placeSpot() {
    if (!spotTarget) return;
    const r = rectOf(spotTarget);
    spot.style.transform = `translate(${(r.left - 8).toFixed(1)}px, ${(r.top - 8).toFixed(1)}px)`;
    spot.style.width = `${Math.max(0, r.width + 16)}px`;
    spot.style.height = `${Math.max(0, r.height + 16)}px`;
  }

  function ripple(x, y, miss) {
    const d = document.createElement("span");
    d.className = `nav-ripple${miss ? " is-miss" : ""}`;
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    stage.appendChild(d);
    window.setTimeout(() => d.remove(), 700);
  }

  // Reach out and press something. With miss, he pokes the air beside it.
  async function click(target, o = {}) {
    const e = epoch;
    const r = rectOf(target);
    const pt = o.miss ? { x: r.cx + (rig.x < r.cx ? -1 : 1) * Math.max(30, r.width * 0.9), y: r.cy + 26 } : { x: r.cx, y: r.cy };
    rig.facing = pt.x >= rig.x ? 1 : -1;
    rig.aim = pt;
    rig.look = pt;
    rig.do("tap", { restart: true });
    await wait(reduced ? 60 : 190);
    check(e);
    ripple(pt.x, pt.y, o.miss);
    if (!o.miss && !o.fake && target.click) target.click();
    await wait(260);
    check(e);
    rig.do(o.then || "idle");
  }

  /* ---------------------------------------------------------------- */
  /* Scrolling like a person: flicks, a pause to read, a small overshoot */
  /* ---------------------------------------------------------------- */

  let userScrolled = false;
  ["wheel", "touchstart"].forEach((type) => window.addEventListener(type, () => { userScrolled = true; }, { passive: true }));
  window.addEventListener("keydown", (ev) => { if (["PageDown", "PageUp", "ArrowDown", "ArrowUp", " ", "Home", "End"].includes(ev.key) && !ev.target.closest?.("input, textarea")) userScrolled = true; });

  function scrollAnim(to, ms, e, fn = ease.out3) {
    return new Promise((resolve) => {
      const from = window.scrollY;
      const t0 = performance.now();
      const step = (now) => {
        if (e !== epoch || userScrolled) { resolve(); return; }
        const p = clamp((now - t0) / ms);
        window.scrollTo({ top: from + (to - from) * fn(p), behavior: "instant" });
        if (p < 1) window.requestAnimationFrame(step); else resolve();
      };
      window.requestAnimationFrame(step);
    });
  }

  async function scrollTo(target, o = {}) {
    const e = epoch;
    const max = document.documentElement.scrollHeight - vh();
    let goal = typeof target === "number" ? target : rectOf(target).top + window.scrollY - (o.offset != null ? o.offset : vh() * 0.22);
    goal = clamp(goal, 0, max);
    userScrolled = false;
    if (reduced) { window.scrollTo({ top: goal, behavior: "instant" }); return; }
    if (o.fast) {
      // Riding the page a long way: one smooth sweep, wings out.
      rig.do("swipe");
      await scrollAnim(goal, clamp(Math.abs(goal - window.scrollY) * 0.35, 450, 1300), e, ease.io);
      check(e);
      rig.do("hover");
      return;
    }
    if (o.gesture !== false) rig.do("swipe");
    let guard = 0;
    while (Math.abs(goal - window.scrollY) > 3 && !userScrolled && guard < 14) {
      guard += 1;
      const left = goal - window.scrollY;
      const dir = Math.sign(left);
      let chunk = Math.min(Math.abs(left), vh() * (0.5 + Math.random() * 0.45));
      if (Math.abs(left) - chunk < vh() * 0.22) chunk = Math.abs(left);
      const final = chunk === Math.abs(left);
      const over = final && chunk > 240 && Math.random() < 0.65 ? 14 + Math.random() * 30 : 0;
      await scrollAnim(window.scrollY + dir * (chunk + over), 300 + chunk * 0.42, e);
      check(e);
      if (over) { await wait(150); await scrollAnim(goal, 280, e, ease.io); }
      await wait(90 + Math.random() * 220);
      check(e);
    }
    if (o.gesture !== false) rig.do("idle");
  }

  /* ---------------------------------------------------------------- */
  /* Talking                                                           */
  /* ---------------------------------------------------------------- */

  let bubbleOn = false;
  let skipTyping = null;
  let advance = null;
  let chooser = null;

  function placeBubble() {
    if (!bubbleOn) return;
    const kk = k();
    const head = rig.topScreen();
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    // The documented fix: reserve the active HUD's edge before clamping, so
    // the bubble is moved out of its rectangle rather than hidden under it.
    const { top: safeTop, bottom: safeBottom } = safeBand();
    let x = head.x - bw * 0.35;
    let y = head.y - bh - 14;
    let below = false;
    if (y < safeTop) { y = rig.y + 14; below = true; }
    if (below && y + bh > safeBottom) { y = Math.max(safeTop, rig.toScreen(0, -80).y - bh / 2); x = rig.x + (rig.x < vw() / 2 ? 80 * kk : -bw - 80 * kk); }
    x = clamp(x, 10, vw() - bw - 10);
    y = clamp(y, safeTop, Math.max(safeTop, safeBottom - bh));
    bubble.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    bubble.classList.toggle("is-below", below);
    tailEl.style.left = `${clamp(head.x - x, 18, bw - 18).toFixed(1)}px`;
  }

  function hush() {
    bubbleOn = false;
    rig.talk = false;
    bubble.classList.remove("is-on", "has-choices");
    choicesEl.innerHTML = "";
    chooser = null;
  }

  async function type(text, e) {
    // The ghost holds the whole line, so the bubble is sized before typing starts.
    ghostEl.textContent = text;
    textEl.textContent = "";
    placeBubble();
    rig.talk = true;
    let skip = false;
    skipTyping = () => { skip = true; };
    const chars = Array.from(text);
    for (let i = 0; i < chars.length; i += 1) {
      if (skip || reduced) { textEl.textContent = text; break; }
      textEl.textContent += chars[i];
      blip(chars[i], i);
      const ch = chars[i];
      await wait(/[.!?]/.test(ch) ? 190 : /[,;:]/.test(ch) ? 110 : 24);
      check(e);
    }
    skipTyping = null;
    rig.talk = false;
  }

  // Say a line. It moves on by itself after a reading pause, or on a click.
  async function say(text, o = {}) {
    const e = epoch;
    mount();
    if (o.face) rig.setFace(o.face);
    bubbleOn = true;
    bubble.classList.remove("has-choices");
    choicesEl.innerHTML = "";
    bubble.classList.add("is-on");
    bubble.classList.remove("is-waiting");
    placeBubble();
    await type(text, e);
    if (o.keep) return;
    const hold = o.hold != null ? o.hold : 1000 + text.length * 30;
    bubble.classList.add("is-waiting");
    timerEl.style.animationDuration = `${hold}ms`;
    timerEl.classList.remove("is-running");
    void timerEl.offsetWidth;
    timerEl.classList.add("is-running");
    await new Promise((resolve) => {
      const id = window.setTimeout(resolve, hold);
      advance = () => { window.clearTimeout(id); resolve(); };
    });
    advance = null;
    bubble.classList.remove("is-waiting");
    check(e);
    if (o.close) hush();
  }

  // Ask with choices; resolves with the index of the one picked.
  async function ask(text, choices, o = {}) {
    const e = epoch;
    await say(text, Object.assign({}, o, { keep: true }));
    bubble.classList.add("has-choices");
    choicesEl.innerHTML = "";
    const buttons = choices.map((label, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "nav-choice";
      b.style.setProperty("--i", i);
      b.innerHTML = `<span class="nav-choice-key">${i + 1}</span><span>${label}</span>`;
      choicesEl.appendChild(b);
      return b;
    });
    placeBubble();
    if (o.focus !== false) buttons[0].focus({ preventScroll: true });
    const pick = await new Promise((resolve) => {
      chooser = (i) => resolve(i);
      buttons.forEach((b, i) => b.addEventListener("click", () => resolve(i)));
    });
    chooser = null;
    buttons.forEach((b, i) => b.classList.toggle("is-picked", i === pick));
    await wait(220);
    check(e);
    hush();
    return pick;
  }

  bubble.addEventListener("click", (ev) => {
    if (ev.target.closest(".nav-choice")) return;
    if (skipTyping) skipTyping(); else if (advance) advance();
  });
  document.addEventListener("keydown", (ev) => {
    if (!bubbleOn || ev.target.closest?.("input, textarea, select")) return;
    if (chooser) {
      const n = parseInt(ev.key, 10);
      const buttons = Array.from(choicesEl.querySelectorAll(".nav-choice"));
      if (n >= 1 && n <= buttons.length) { ev.preventDefault(); chooser(n - 1); return; }
      const idx = buttons.indexOf(document.activeElement);
      if (ev.key === "ArrowDown" || ev.key === "ArrowRight") { ev.preventDefault(); buttons[(idx + 1) % buttons.length].focus(); }
      if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") { ev.preventDefault(); buttons[(idx - 1 + buttons.length) % buttons.length].focus(); }
      return;
    }
    if (ev.key === "Enter" || ev.key === " ") {
      if (skipTyping) { ev.preventDefault(); skipTyping(); } else if (advance) { ev.preventDefault(); advance(); }
    }
  });

  /* ---------------------------------------------------------------- */
  /* Feelings and exits                                                */
  /* ---------------------------------------------------------------- */

  function feel(face, emote, ms) {
    if (face) rig.setFace(face);
    if (emote) rig.emote(emote, ms || 1600);
  }

  async function leave(o = {}) {
    const e = epoch;
    const side = o.side || (rig.x < vw() / 2 ? -1 : 1);
    const x = side < 0 ? -90 : vw() + 90;
    await walkTo(x, { sad: o.sad, run: o.run, y: rig.y, careful: true });
    check(e);
    visible = false;
    stage.classList.remove("is-on");
    hush();
    spotOff();
  }

  function interrupt() {
    epoch += 1;
    if (motion) { const m = motion; motion = null; m.resolve(); }
    if (advance) advance();
    if (chooser) chooser(-1);
    hush();
    spotOff();
    rig.aim = null;
    rig.clearEmotes();
    return epoch;
  }

  /* ---------------------------------------------------------------- */
  /* Hands on: look at the pointer, pick him up by the scruff          */
  /* ---------------------------------------------------------------- */

  let pointer = null;
  window.addEventListener("pointermove", (ev) => {
    pointer = { x: ev.clientX, y: ev.clientY };
    if (!drag && !rig.aim) rig.look = pointer;
    if (drag && !drag.falling) {
      const dx = ev.clientX - drag.lastX;
      drag.lastX = ev.clientX;
      if (!drag.lifted && Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) > 7) {
        drag.lifted = true;
        rig.do("dangle");
        feel("shocked", "bang", 700);
        window.setTimeout(() => { if (drag && drag.lifted) rig.setFace("happy"); }, 700);
        listeners.forEach((fn) => fn(0, "lift"));
      }
      if (drag.lifted) {
        rig.x = ev.clientX;
        rig.y = ev.clientY + rig.el.offsetHeight * 0.62;
        rig.vx = dx * 60;
        rig.swing = clamp(lerp(rig.swing, -dx * 2.2, 0.3), -35, 35);
      }
    }
  }, { passive: true });

  rig.el.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0 || stage.classList.contains("is-busy")) return;
    ev.preventDefault();
    try { rig.el.setPointerCapture(ev.pointerId); } catch (_) { /* noop */ }
    drag = { sx: ev.clientX, sy: ev.clientY, lastX: ev.clientX, lifted: false, falling: null, vy: 0, floor: 0 };
  });
  const release = () => {
    if (!drag || drag.falling) return;
    if (!drag.lifted) { drag = null; listeners.forEach((fn) => fn(0, "poke")); return; }
    drag.floor = ground();
    drag.vy = 0;
    rig.swing = 0;
    rig.do("tumble", { restart: true });
    drag.falling = () => {
      rig.squash(0.26);
      listeners.forEach((fn) => fn(0, "drop"));
    };
  };
  rig.el.addEventListener("pointerup", release);
  rig.el.addEventListener("pointercancel", release);
  rig.el.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); listeners.forEach((fn) => fn(0, "poke")); }
  });
  rig.el.addEventListener("pointerenter", () => listeners.forEach((fn) => fn(0, "hover")));

  window.NAV = {
    rig, stage, bubble,
    place, walkTo, hopTo, flyTo, go, pause, wait, trip, climbFail, safeBand,
    gags(on) { gags = Boolean(on); },
    rectOf, beside, pointAt, spotOn, spotOff, click, ripple,
    scrollTo, say, ask, hush, feel, leave, interrupt,
    get epoch() { return epoch; },
    get visible() { return visible; },
    get pointer() { return pointer; },
    get dragging() { return Boolean(drag && drag.lifted); },
    check, k, ground, vw, vh, reduced, CANCEL,
    busy(on) { stage.classList.toggle("is-busy", on); },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    hide() { visible = false; stage.classList.remove("is-on"); hush(); spotOff(); }
  };
})();

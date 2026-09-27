/*
  Miko, the journal's guide: their rig.

  Every frame an action (idle, glide, fly, point, cry...) proposes a pose,
  the pose eases towards it, and the drawing on screen is moved to match.
  Faces are separate from actions, so he can drift off sobbing or point
  while grinning. Squash and stretch keep the motion soft and lively.

  The drawings are painted sprites from three packs (the v1 poses, the v2
  motion pack, the v3 glide pack), played as frame sequences with their
  manifest timings. Rendering is kept cheap on purpose: the sprite is an
  <img> in a composited wrapper moved with CSS transforms only, sizes are
  cached rather than measured each frame, and nothing that cannot be seen
  is touched. Small screens get half-size sprites, so phones decode a
  third of the pixels.
*/
(function () {
  "use strict";

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const deg = 180 / Math.PI;

  const FACES = {
    neutral: { blush: 0.55 }, happy: { blush: 0.8 }, excited: { blush: 0.85 }, smile: { blush: 0.65 },
    curious: { blush: 0.5 }, thinking: { blush: 0.4 }, shocked: { blush: 0.3 }, sad: { blush: 0.7 },
    cry: { blush: 0.9 }, sob: { blush: 0.8 }, mischief: { blush: 0.7 }, proud: { blush: 0.7 },
    sleepy: { blush: 0.45 }, dizzy: { blush: 0.4 }, embarrassed: { blush: 1 }, determined: { blush: 0.5 },
    yawn: { blush: 0.5 }
  };
  const SAD_FACES = new Set(["sad", "cry", "sob"]);

  /* ---------------------------------------------------------------- */
  /* The drawings                                                      */
  /* ---------------------------------------------------------------- */

  const V1_ROOT = "/mascot/assets/miko/";
  const SM_ROOT = "/mascot/assets/sm/";
  const VERSION = "66";
  const FACE_SPRITES = {
    neutral: "idle", happy: "wave", excited: "star", smile: "wave", curious: "thinking", thinking: "thinking",
    shocked: "shocked", sad: "sad", cry: "sad", sob: "sad", mischief: "peek", proud: "star", sleepy: "sleep",
    dizzy: "shocked", embarrassed: "shocked", determined: "idle", yawn: "sleep"
  };
  const ACTION_SPRITES = {
    walk: "walk", run: "walk", fly: "wave", hover: "wave", wave: "wave", point: "point", tap: "point",
    think: "thinking", sad: "sad", sadwalk: "sad", cry: "sad", celebrate: "star", jump: "star", fall: "shocked",
    getup: "shocked", dizzy: "shocked", rub: "sad", sit: "sleep", sleep: "sleep", peek: "peek", dangle: "wave",
    swipe: "wave", stretch: "wave", star: "star", bow: "idle", glide: "wave", glideSad: "sad"
  };
  const V1_NAMES = ["idle", "wave", "thinking", "sad", "shocked", "peek", "point", "walk", "sleep", "star"];

  // The motion (v2) and glide (v3) packs. The embedded copies let Miko move
  // before the manifests arrive; the manifests then refresh timings, paths
  // and sequences.
  const PACKS = [
    {
      root: "/mascot/assets/miko-motion-v2/",
      frames: {
        "travel-run": ["web/01-travel-run.webp", 180], "travel-leap-up": ["web/02-travel-leap-up.webp", 260],
        "trip-stumble": ["web/03-trip-stumble.webp", 170], "trip-tumble": ["web/04-trip-tumble.webp", 220],
        "trip-impact": ["web/05-trip-impact.webp", 220], "trip-dizzy": ["web/06-trip-dizzy.webp", 850],
        "recover-getup": ["web/07-recover-getup.webp", 420], "cry-full-sob": ["web/08-cry-full-sob.webp", 700],
        "climb-reach": ["web/09-climb-reach.webp", 360], "climb-struggle": ["web/10-climb-struggle.webp", 700],
        "climb-slip": ["web/11-climb-slip.webp", 240], "cry-walk": ["web/12-cry-walk.webp", 260]
      },
      sequences: {
        travel: ["travel-run"], travelUp: ["travel-leap-up"],
        tripAndRecover: ["trip-stumble", "trip-tumble", "trip-impact", "trip-dizzy", "recover-getup"],
        climbFail: ["climb-reach", "climb-struggle", "climb-slip", "trip-impact", "trip-dizzy", "recover-getup"],
        bigCry: ["cry-full-sob"], sadTravel: ["cry-walk"]
      }
    },
    {
      root: "/mascot/assets/miko-glide-v3/",
      frames: {
        "glide-takeoff": ["web/01-glide-takeoff.webp", 220], "glide-cruise": ["web/02-glide-cruise.webp", 0],
        "glide-brake": ["web/03-glide-brake.webp", 260], "glide-sad": ["web/04-glide-sad.webp", 0]
      },
      sequences: {
        horizontalTravel: ["glide-takeoff", "glide-cruise", "glide-brake"],
        sadHorizontalTravel: ["glide-takeoff", "glide-sad", "glide-brake"]
      }
    }
  ];
  const FRAMES = {};
  const SEQUENCES = {};
  const loadPack = (pack) => {
    Object.entries(pack.frames).forEach(([id, [web, holdMs]]) => { FRAMES[id] = { url: pack.root + web, holdMs }; });
    Object.assign(SEQUENCES, pack.sequences);
  };
  PACKS.forEach(loadPack);
  const manifests = Promise.all(PACKS.map((pack) => (window.fetch
    ? fetch(`${pack.root}manifest.json?v=${VERSION}`).then((res) => (res.ok ? res.json() : null)).catch(() => null)
    : Promise.resolve(null)).then((m) => {
    if (!m || !Array.isArray(m.frames)) return;
    m.frames.forEach((f) => { if (f && f.id && f.web) FRAMES[f.id] = { url: pack.root + f.web, holdMs: Math.max(0, Number(f.holdMs) || 0) }; });
    if (m.sequences) Object.assign(SEQUENCES, m.sequences);
  })));

  // How each drawing sits in the frame. Poses meet the floor at different
  // heights (sitting, tiptoe, mid-air) and the glide takeoff is drawn small:
  // dy moves a drawing down (view units), s scales it about (px, py).
  const FIT = {
    "travel-run": { dy: 6 }, "trip-stumble": { dy: 8 }, "trip-tumble": { dy: 10 }, "trip-impact": { dy: 23 },
    "trip-dizzy": { dy: 12.5 }, "recover-getup": { dy: 4.5 }, "cry-full-sob": { dy: -5 }, "climb-reach": { dy: -6.5 },
    "cry-walk": { dy: 5 }, "glide-takeoff": { s: 1.28, px: -5, py: -100 }, "glide-brake": { dy: -6 }
  };

  // Which frames an action plays. seq names a manifest sequence, frames
  // lists ids. A frame whose manifest hold is 0 (glide cruise, sad glide)
  // holds until release(); loop replays from loopFrom; otherwise the last
  // frame holds until the next action.
  const ACTION_FRAMES = {
    glide: { seq: "horizontalTravel" },
    glideSad: { seq: "sadHorizontalTravel" },
    run: { seq: "travel", loop: true },
    jump: { seq: "travelUp" },
    leap: { seq: "travelUp" },
    trip: { seq: "tripAndRecover" },
    climbFail: { seq: "climbFail" },
    reach: { frames: ["climb-reach"] },
    struggle: { frames: ["climb-struggle"], loop: true },
    slip: { frames: ["climb-slip"] },
    cry: { seq: "bigCry", loop: true },
    sob: { seq: "bigCry", loop: true },
    sadwalk: { seq: "sadTravel", loop: true },
    fall: { frames: ["trip-stumble", "trip-tumble", "trip-impact", "trip-dizzy"] },
    tumble: { frames: ["trip-tumble"] },
    splat: { frames: ["trip-impact", "trip-dizzy", "recover-getup"] },
    dizzy: { frames: ["trip-dizzy"], loop: true },
    getup: { frames: ["recover-getup"] }
  };
  const framesOf = (spec, skipHold) => (spec.frames || SEQUENCES[spec.seq] || [])
    .filter((id) => FRAMES[id] && !(skipHold && FRAMES[id].holdMs <= 0));

  const failed = new Set();
  let small = null;
  const srcOf = (key, isFrame) => (small ? `${SM_ROOT}${key}.webp?v=${VERSION}` : isFrame ? `${FRAMES[key].url}?v=${VERSION}` : `${V1_ROOT}${key}.webp?v=${VERSION}`);
  // Decoded once, kept by these references, so frame swaps never flash.
  const decoded = [];
  let preloaded = null;
  function preloadAll() {
    const load = (src, key) => new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      const ok = () => { decoded.push(img); resolve(true); };
      img.onload = () => (img.decode ? img.decode().then(ok, ok) : ok());
      img.onerror = () => { failed.add(key); resolve(false); };
      img.src = src;
    });
    return manifests.then(() => Promise.all([
      ...V1_NAMES.map((n) => load(srcOf(n, false), n)),
      ...Object.keys(FRAMES).map((id) => load(srcOf(id, true), id))
    ]));
  }

  function create() {
    const B = window.NavBody.create();
    const VIEW = B.view;
    const SH = B.armF.shoulder;
    const PIVOT_Y = -105; // body centre, for rolls
    const el = document.createElement("div");
    el.className = "nav-char";

    // The painted Miko: a shadow, then the sprite in a pose wrapper, then
    // the emote layer (the vector body underneath is geometry only).
    const shadow = document.createElement("i");
    shadow.className = "nav-shadow";
    const poseEl = document.createElement("span");
    poseEl.className = "nav-pose";
    const img = document.createElement("img");
    img.className = "nav-sprite";
    img.alt = "";
    img.decoding = "async";
    img.draggable = false;
    poseEl.appendChild(img);
    // The vector body stays as invisible geometry; its old <image> goes, so
    // it is never fetched or painted.
    if (B.sprite) B.sprite.remove();
    B.flip.setAttribute("display", "none");
    B.shadow.setAttribute("display", "none");
    el.append(shadow, poseEl, B.svg);

    // Size, cached: read once, refreshed only when the box really changes.
    let W = 0, H = 0;
    const measure = () => { W = el.offsetWidth; H = el.offsetHeight; };
    const unit = () => { if (!H) measure(); return H / VIEW.h; };
    const pickSize = () => {
      const want = unit() * VIEW.h * (window.devicePixelRatio || 1) <= 340;
      if (small !== want) { small = want; activeSprite = ""; }
    };
    if ("ResizeObserver" in window) new ResizeObserver(() => { measure(); if (H) pickSize(); }).observe(el);
    window.addEventListener("resize", () => { H = 0; }, { passive: true });

    const r = {
      el, B,
      x: 0, y: 0, air: 0,
      facing: 1, flip: 1,
      action: "idle", actionT: 0, speed: 1,
      face: "neutral", faceT: 0,
      aim: null, look: null,
      vx: 0, vy: 0, swing: 0,
      phase: 0, t: 0,
      talk: false,
      emotes: {},
      pose: { bx: 0, by: 0, lean: 0, roll: 0, sq: 0, tilt: 0, lookX: 0, lookY: 0, aB: 22, eB: 0, aF: -22, eF: 0, lB: 0, lF: 0, wing: 0, hatR: 0, hatY: 0 },
      jel: 0, jelV: 0
    };

    let activeSprite = "";
    if (!preloaded) {
      preloaded = new Promise((resolve) => {
        // Wait for the first real size, so the right sprite set is fetched.
        const go = () => { if (small === null) small = window.matchMedia("(max-width: 640px)").matches; preloadAll().then(resolve); };
        window.requestAnimationFrame(() => { if (el.isConnected) pickSize(); go(); });
      });
    }
    r.preload = () => preloaded;

    const applySprite = () => {
      const id = r.seq ? r.seq.ids[r.seq.i] : null;
      const framed = id && !failed.has(id);
      const name = framed ? id : ACTION_SPRITES[r.action] || FACE_SPRITES[r.face] || "idle";
      if (name === activeSprite || small === null) return;
      activeSprite = name;
      img.src = srcOf(name, Boolean(framed));
      const f = (framed && FIT[id]) || {};
      const s = f.s || 1, px = f.px || 0, py = f.py || 0;
      img.style.transformOrigin = `${(((px - VIEW.x) / VIEW.w) * 100).toFixed(2)}% ${(((py - VIEW.y) / VIEW.h) * 100).toFixed(2)}%`;
      fitDy = f.dy || 0;
      fitS = s;
      img.dataset.state = name;
    };
    let fitDy = 0, fitS = 1, lastFit = "";

    /* -------------------------------------------------------------- */
    /* The frame player                                                */
    /* -------------------------------------------------------------- */

    r.seq = null;
    r.frame = null;
    r.onFrame = null;
    const settle = (ok) => {
      if (!r.seq) return;
      const waiters = r.seq.waiters;
      r.seq.waiters = [];
      waiters.forEach((fn) => fn(ok));
    };
    const enterFrame = () => {
      r.frame = r.seq ? r.seq.ids[r.seq.i] : null;
      if (r.frame && r.seq.i > 0) r.jel += 0.035; // a small snap on every new drawing
      if (r.frame && typeof r.onFrame === "function") r.onFrame(r.frame, r);
    };
    const startFrames = (spec, speed = 1, skipHold = false) => {
      settle(false);
      const ids = framesOf(spec, skipHold);
      r.seq = ids.length ? { ids, i: 0, t: 0, loop: Boolean(spec.loop), loopFrom: spec.loopFrom || 0, done: false, released: false, speed, waiters: [] } : null;
      enterFrame();
    };
    r.until = () => new Promise((resolve) => {
      if (!r.seq || r.seq.done || r.seq.loop) { resolve(true); return; }
      r.seq.waiters.push(resolve);
    });
    // Lets a held frame (glide cruise) move on to the next one.
    r.release = () => { if (r.seq) r.seq.released = true; };
    r.frameMs = (id) => (FRAMES[id] ? FRAMES[id].holdMs : 0);
    r.seqMs = (action) => framesOf(ACTION_FRAMES[action] || {}).reduce((sum, id) => sum + r.frameMs(id), 0);

    r.do = (action, opts = {}) => {
      const changed = r.action !== action || opts.restart;
      if (changed) r.actionT = 0;
      r.action = action;
      if (opts.speed != null) r.speed = opts.speed;
      if (changed) {
        if (ACTION_FRAMES[action]) startFrames(ACTION_FRAMES[action], opts.frameSpeed || 1, Boolean(opts.short));
        else if (r.seq) { settle(false); r.seq = null; enterFrame(); }
      }
      return r;
    };
    r.setFace = (name) => { if (FACES[name]) { r.face = name; r.faceT = 0; } return r; };
    r.isSad = () => SAD_FACES.has(r.face);
    r.emote = (name, ms = 1600) => { r.emotes[name] = ms / 1000; return r; };
    r.clearEmotes = () => { r.emotes = {}; };
    // A landing, a poke, a squeeze: the jelly spring takes it from here.
    r.squash = (v = 0.18) => { r.jel = v; r.jelV = 0; };
    r.size = () => { if (!H) measure(); return { w: W, h: H }; };
    r.k = unit;
    r.toScreen = (lx, ly) => {
      const k = unit();
      return { x: r.x + lx * k * r.flip, y: r.y + ly * k };
    };
    r.headScreen = () => r.toScreen(0, -80 + r.pose.by);
    r.topScreen = () => r.toScreen(0, B.top + r.pose.by);
    r.geom = { shoulder: SH, reach: B.armF.reach + 6 };
    r.handScreen = () => {
      const p = r.pose;
      const a = (p.aF + p.lean) / deg, e = (p.aF + p.eF + p.lean) / deg;
      const sx = SH[0], sy = SH[1] + p.by;
      const ex = sx - Math.sin(a) * B.armF.elbow, ey = sy + Math.cos(a) * B.armF.elbow;
      const k2 = B.armF.reach - B.armF.elbow;
      return r.toScreen(ex - Math.sin(e) * k2, ey + Math.cos(e) * k2);
    };
    const aimAngle = () => {
      if (!r.aim) return -70;
      const sh = r.toScreen(SH[0], SH[1] + r.pose.by);
      const dx = (r.aim.x - sh.x) * r.flip, dy = r.aim.y - sh.y;
      return Math.atan2(-dx, dy) * deg - r.pose.lean;
    };
    // A bob given in screen pixels, whatever size Miko is drawn at.
    const px = (n) => n / Math.max(0.2, unit());

    /* -------------------------------------------------------------- */
    /* Actions: each returns the pose it wants right now               */
    /* -------------------------------------------------------------- */

    const ACTIONS = {
      idle(t) {
        const b = Math.sin(t * 2.4);
        return { by: b * 1.2, sq: b * 0.018 };
      },
      // The glide: the whole of Miko travels, no legs cycling. Takeoff
      // springs up off the floor, cruise floats with a 2 to 4 pixel bob and
      // a slight clockwise roll that flattens the diagonal drawing, the sad
      // glide droops and drifts, and the brake rears back as he comes down.
      glide(t) {
        const f = r.frame;
        if (f === "glide-takeoff") return { by: -9, sq: -0.07, roll: 3 };
        if (f === "glide-brake") return { by: -2, sq: 0.06, roll: -7 };
        if (f === "glide-sad") {
          const b = Math.sin(t * 3);
          return { by: -9 + b * px(2.5), roll: 3 + Math.sin(t * 1.7) * 1.2, sq: 0.02 + b * 0.008 };
        }
        const b = Math.sin(t * 5.2);
        return { by: -13 + b * px(3), roll: 7 + Math.sin(t * 2.6) * 1.5, sq: b * 0.012 };
      },
      glideSad(t) { return ACTIONS.glide(t); },
      walk() {
        const s = Math.sin(r.phase), c = Math.cos(r.phase);
        const k = clamp(r.speed, 0.6, 1.6);
        return { by: -Math.abs(c) * 6 * k, sq: 0.03 - Math.abs(c) * 0.06, lean: 5 * k, tilt: s * 7 };
      },
      run() {
        const s = Math.sin(r.phase), c = Math.cos(r.phase);
        return { by: -Math.abs(s) * 11, sq: 0.07 - Math.abs(s) * 0.13, lean: 2 + c * 2.5, bx: c * 1.5 };
      },
      leap(t) { return t < 0.09 ? { sq: 0.16, by: 4 } : { sq: -0.12, by: -4, lean: -3 }; },
      trip(t) {
        const f = r.frame;
        if (f === "trip-stumble") return { lean: 10, bx: 6, sq: -0.04 };
        if (f === "trip-tumble") return { lean: 8 + Math.sin(t * 18) * 6, by: -10, sq: -0.08 };
        if (f === "trip-impact") return { sq: 0.2, by: 1, bx: Math.sin(t * 60) * 1.5 };
        if (f === "trip-dizzy") return { bx: Math.sin(t * 7) * 3, lean: Math.sin(t * 7) * 4, sq: 0.04 };
        return { sq: 0.05, lean: -2 };
      },
      climbFail(t) {
        const f = r.frame;
        if (f === "climb-reach") return { sq: -0.1, by: -3 };
        if (f === "climb-struggle") return { bx: Math.sin(t * 46) * 1.4, by: Math.sin(t * 23) * 1.5, sq: -0.05 + Math.abs(Math.sin(t * 12)) * 0.04 };
        if (f === "climb-slip") return { sq: -0.1, lean: -6 };
        return ACTIONS.trip(t);
      },
      reach(t) { return { sq: -0.1 - Math.sin(t * 8) * 0.02, by: -3 }; },
      struggle(t) { return ACTIONS.climbFail(t); },
      slip() { return { sq: -0.1, lean: -6 }; },
      tumble(t) { return { lean: Math.sin(t * 7) * 14, sq: -0.06 }; },
      splat(t) { return ACTIONS.trip(t); },
      fall(t) { return ACTIONS.trip(t); },
      fly(t) {
        const b = Math.sin(t * 3);
        return { lean: 14, by: b * 2, sq: -0.05, wing: 1 };
      },
      hover(t) {
        const b = Math.sin(t * 2.6);
        return { by: b * 4, sq: b * 0.02, lean: Math.sin(t * 1.1) * 2, wing: 1 };
      },
      wave(t) { return { lean: -2, by: Math.sin(t * 2.4) * 1.2, sq: Math.sin(t * 5.5) * 0.02 }; },
      point(t) { return { aF: aimAngle(), eF: 0, lean: 4, by: Math.sin(t * 2.4) * 1.2 }; },
      tap(t) {
        const push = Math.max(0, Math.sin(Math.min(1, t / 0.35) * Math.PI));
        return { aF: aimAngle(), eF: -push * 16, lean: 6 + push * 8, sq: -push * 0.05 };
      },
      think(t) { return { by: Math.sin(t * 2) * 1, lean: Math.sin(t * 1.5) * 1.5 }; },
      sad(t) {
        const b = Math.sin(t * 1.5);
        return { lean: -3, by: 2 + b * 0.6, sq: 0.06 };
      },
      sadwalk() { return { by: 2 - Math.abs(Math.cos(r.phase)) * 2, sq: 0.06, lean: -1 }; },
      cry(t) {
        // Big heaving sobs: a gulp every beat, a shiver in between.
        const sob = Math.pow(Math.abs(Math.sin(t * 4.6)), 3);
        return { bx: Math.sin(t * 40) * 0.9, by: -sob * 5, sq: 0.03 - sob * 0.07 };
      },
      sob(t) { return ACTIONS.cry(t); },
      celebrate(t) {
        const j = Math.abs(Math.sin(t * 6.5));
        return { by: -j * 22, sq: j > 0.15 ? -0.08 * j : 0.1, lean: Math.sin(t * 6.5) * 3 };
      },
      jump(t) { return t < 0.14 ? { sq: 0.2, by: 4, lean: 6 } : { sq: -0.12, lean: 4 }; },
      getup(t) {
        const p = clamp(t / 0.42);
        const e = 1 - Math.pow(1 - p, 3);
        return { sq: p > 0.85 ? 0.08 : lerp(0.14, 0, e), by: lerp(2, 0, e), lean: lerp(-4, 0, e) };
      },
      dizzy(t) { return { lean: Math.sin(t * 2.5) * 6, bx: Math.sin(t * 2.5) * 2, by: Math.abs(Math.sin(t * 5)) * 1.5, sq: 0.05 }; },
      rub(t) { return { by: Math.sin(t * 2.4) * 1, lean: Math.sin(t * 14) * 0.8 }; },
      sit(t) { return { by: 8, sq: 0.08 + Math.sin(t * 2.2) * 0.012 }; },
      sleep(t) {
        const b = Math.sin(t * 1.3);
        return { by: 8, sq: 0.1 + b * 0.025 };
      },
      peek(t) { return { lean: -8, by: Math.sin(t * 2.4) * 1.2 }; },
      dangle(t) { return { lean: r.swing, sq: -0.14, bx: Math.sin(t * 15) * 1.2 }; },
      swipe(t) { return { lean: -2, by: Math.sin(t * 2.4) * 1, wing: 1 }; },
      stretch(t) {
        const p = clamp(t / 0.5);
        return { sq: -0.12 * p, lean: -3 * p };
      },
      star(t) { return { by: Math.sin(t * 2.4) * 1.2 }; },
      bow(t) {
        const p = clamp(t / 0.4);
        return { lean: 26 * Math.sin(Math.min(1, p) * Math.PI / 2) };
      }
    };

    /* -------------------------------------------------------------- */
    /* Emotes: only touched while one is showing                       */
    /* -------------------------------------------------------------- */

    const shown = new Set();
    const f2 = (n) => n.toFixed(2);
    function applyEmotes(dt) {
      const E = B.emote;
      Object.keys(E).forEach((k) => {
        const left = r.emotes[k] || 0;
        const node = E[k];
        if (left <= 0) {
          if (shown.has(k)) { node.setAttribute("opacity", 0); shown.delete(k); }
          return;
        }
        r.emotes[k] = left - dt;
        shown.add(k);
        node.setAttribute("opacity", f2(Math.min(1, left * 4)));
        const bob = Math.sin(r.t * 6) * 2.5;
        if (k === "dizzy") {
          B.dizzyStars.forEach((s, i) => {
            const a = r.t * 5 + (i * Math.PI * 2) / 3;
            s.setAttribute("transform", `translate(${f2(Math.cos(a) * 48)},${f2(-150 + r.pose.by + Math.sin(a) * 10)}) rotate(${f2(r.t * 200)})`);
          });
        } else if (k === "sparkles") {
          node.setAttribute("transform", `translate(0,${f2(r.pose.by)}) scale(${f2(1 + Math.sin(r.t * 8) * 0.06)})`);
        } else {
          node.setAttribute("transform", `translate(${f2(r.flip < 0 ? -98 : 0)},${f2(bob + r.pose.by)})`);
        }
      });
    }

    /* -------------------------------------------------------------- */
    /* The frame                                                       */
    /* -------------------------------------------------------------- */

    const DEFAULT = { bx: 0, by: 0, lean: 0, roll: 0, sq: 0, tilt: 0, aB: 22, eB: 0, aF: -22, eF: 0, lB: 0, lF: 0, wing: 0, hatR: 0, hatY: 0 };
    let lastEl = "", lastPose = "", lastShadow = "";

    r.update = (dt) => {
      r.t += dt;
      r.actionT += dt;
      r.faceT += dt;
      if (r.action === "walk" || r.action === "sadwalk") r.phase += dt * (r.action === "sadwalk" ? 5.5 : 9 * clamp(r.speed, 0.6, 1.6));
      if (r.action === "run") r.phase += dt * 13;

      const S = r.seq;
      if (S && !S.done) {
        S.t += dt * 1000 * S.speed;
        for (let guard = 0; guard < 8; guard += 1) {
          const hold = r.frameMs(S.ids[S.i]);
          if (hold <= 0) {
            if (!S.released) break;
            S.released = false;
            S.t = 0;
          } else {
            if (S.t < hold) break;
            if (S.loop && S.ids.length === 1) { S.t %= hold; break; }
            S.t -= hold;
          }
          if (S.i < S.ids.length - 1) S.i += 1;
          else if (S.loop) S.i = S.loopFrom;
          else { S.done = true; S.t = 0; settle(true); break; }
          enterFrame();
        }
      }

      const fn = ACTIONS[r.action] || ACTIONS.idle;
      const want = Object.assign({}, DEFAULT, fn(r.actionT));
      // A little bounce while he talks, on any standing pose.
      if (r.talk && !r.seq) want.sq += Math.sin(r.t * 22) * 0.012;
      let lx = 0;
      if (r.look) {
        const hd = r.headScreen();
        lx = clamp(((r.look.x - hd.x) / 240) * r.flip, -1, 1);
      }
      want.lookX = lx;
      want.lookY = want.lookY || 0;
      const p = r.pose;
      const glide = r.action === "glide" || r.action === "glideSad";
      const snappy = r.action === "tap" || (r.seq && !glide && r.action !== "run" && r.action !== "sadwalk");
      const k = 1 - Math.exp(-dt * (snappy ? 26 : glide ? 10 : 13));
      Object.keys(want).forEach((key) => { p[key] = lerp(p[key] == null ? 0 : p[key], want[key], k); });
      r.flip = lerp(r.flip, r.facing, 1 - Math.exp(-dt * 16));

      // Jelly spring, kicked by landings and new drawings
      r.jelV += (-260 * r.jel - 9 * r.jelV) * dt;
      r.jel += r.jelV * dt;

      applySprite();
      applyEmotes(dt);

      const u = unit();
      if (!u) return;
      const sq = p.sq + r.jel;
      const flip = Math.abs(r.flip) < 0.08 ? 0.08 * Math.sign(r.flip || 1) : r.flip;
      // The whole pose is one composited transform, pivoting at the feet.
      const pose = `scale(${f2(flip)},1) translate(${f2(p.bx * u)}px,${f2(p.by * u)}px) rotate(${f2(p.lean)}deg) translate(0,${f2(PIVOT_Y * u)}px) rotate(${f2(p.roll)}deg) translate(0,${f2(-PIVOT_Y * u)}px) scale(${f2(1 + sq)},${f2(1 - sq)})`;
      if (pose !== lastPose) { poseEl.style.transform = pose; lastPose = pose; }
      const fit = `translate(0,${f2(fitDy * u)}px) scale(${f2(fitS)})`;
      if (fit !== lastFit) { img.style.transform = fit; lastFit = fit; }

      const sit = r.action === "sit" || r.action === "sleep";
      const air = r.air + (p.by < 0 ? -p.by * 0.6 : 0);
      const sh = `translate(${f2(p.lean * 0.3 * u)}px,${sit ? f2(-2 * u) : 0}px) scale(${f2(clamp(1 - air / 220, 0.45, 1) * (1 + sq * 0.6))},1)`;
      const so = f2(clamp(1 - air / 160, 0.2, 1));
      if (sh + so !== lastShadow) { shadow.style.transform = sh; shadow.style.opacity = so; lastShadow = sh + so; }

      const { w, h } = r.size();
      const tr = `translate3d(${(r.x - w / 2).toFixed(1)}px,${(r.y - (h * -VIEW.y) / VIEW.h).toFixed(1)}px,0)`;
      if (tr !== lastEl) { el.style.transform = tr; lastEl = tr; }
    };

    return r;
  }

  window.NavRig = { create, FACES };
})();

/* The Outsourced Reality · fake-versus-check race, eight defences, outsourcing spectrum, risk dial */
(function () {
  "use strict";
  const { el, svg, range, toggle, tabs, button, fmt, clamp, rng, spring, loop, palette, onTheme, canvas, tween } = FK;

  /* ====================================================================
     The fake spreads, the check catches up
     ==================================================================== */
  Press.fig("fig-race", (root) => {
    const body = root.querySelector(".fig-body");
    body.innerHTML = `<div class="race-wrap"><div><div class="race-clock"><span>Time since the fake was posted</span><b data-t>0h 00m</b></div><div data-cv></div><div class="legend"><span><i style="background:var(--spot)"></i>Saw the fake, no check yet</span><span><i style="background:var(--ink)"></i>Saw the check first</span><span><i style="background:var(--grey)"></i>Corrected after believing it</span></div></div><div><div class="controls" data-c></div><div class="btnrow" style="margin-top:1rem" data-b></div><div class="stats" data-st></div><p class="say" data-say>Press start. Each dot is a person; lines are who follows whom.</p></div></div>`;
    const N = 420, r = rng(11), P = [];
    for (let i = 0; i < N; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); P.push({ x: 0.5 + Math.cos(a) * d * 0.47, y: 0.5 + Math.sin(a) * d * 0.47, nb: [] }); }
    P.forEach((p, i) => { const near = P.map((q, j) => [j, (q.x - p.x) ** 2 + (q.y - p.y) ** 2]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 4); near.forEach(([j]) => { if (!p.nb.includes(j)) { p.nb.push(j); P[j].nb.push(i); } }); });
    for (let k = 0; k < 30; k++) { const a = Math.floor(r() * N), b = Math.floor(r() * N); if (a !== b) { P[a].nb.push(b); P[b].nb.push(a); } }
    const seed = P.reduce((best, p, i) => (Math.hypot(p.x - 0.5, p.y - 0.5) < Math.hypot(P[best].x - 0.5, P[best].y - 0.5) ? i : best), 0);
    const opt = { pause: false, delay: 6, context: false };
    const c = body.querySelector("[data-c]");
    toggle(c, { label: "Ask people to pause before sharing", value: false, onChange: (v) => { opt.pause = v; reset(); } });
    toggle(c, { label: "Show the check under the post itself", value: false, onChange: (v) => { opt.context = v; reset(); } });
    range(c, { label: "Time for fact-checkers to publish", min: 1, max: 12, value: 6, fmt: (v) => v + (v === 1 ? " hour" : " hours"), onInput: (v) => { opt.delay = v; reset(); } });
    let state, fakeAt, tick, running = false, rr;
    function reset() { state = new Uint8Array(N); fakeAt = new Int32Array(N).fill(-1); state[seed] = 1; fakeAt[seed] = 0; tick = 0; rr = rng(5); running = false; startBtn.textContent = "Start the race"; draw(); read(); }
    const cv = canvas(body.querySelector("[data-cv]"), { aspect: 1, label: "Network of 420 people", draw: () => draw() });
    function draw() {
      if (!state) return;
      const { ctx, w, h } = cv, pal = palette(), col = [pal.hair2, pal.spot, pal.ink, pal.grey];
      ctx.clearRect(0, 0, w, h); ctx.lineWidth = 0.6; ctx.strokeStyle = pal.hair;
      ctx.beginPath(); P.forEach((p, i) => p.nb.forEach((j) => { if (j > i) { ctx.moveTo(p.x * w, p.y * h); ctx.lineTo(P[j].x * w, P[j].y * h); } })); ctx.stroke();
      P.forEach((p, i) => { ctx.fillStyle = col[state[i]]; ctx.beginPath(); ctx.arc(p.x * w, p.y * h, state[i] ? 3.6 : 2.6, 0, Math.PI * 2); ctx.fill(); });
    }
    // 1 tick = 10 minutes. State: 0 unseen, 1 believes the fake, 2 saw the check first, 3 corrected later.
    function step() {
      const pf = opt.pause ? 0.022 : 0.045, pc = opt.context ? 0.06 : 0.035, start = opt.delay * 6, next = state.slice();
      for (let i = 0; i < N; i++) {
        if (state[i] === 1) P[i].nb.forEach((j) => { if (state[j] === 0 && next[j] === 0 && rr() < pf) { next[j] = 1; fakeAt[j] = tick; } });
        if ((state[i] === 2 || state[i] === 3) && tick >= start) P[i].nb.forEach((j) => { if ((state[j] === 0 || state[j] === 1) && rr() < pc) next[j] = state[j] === 1 ? 3 : 2; });
      }
      if (tick === start) next[seed] = 3;
      if (opt.context && tick >= start) for (let i = 0; i < N; i++) if (state[i] === 1 && rr() < 0.015) next[i] = 3;
      state = next; tick++;
    }
    function read() {
      const n = [0, 0, 0, 0]; state.forEach((v) => n[v]++);
      body.querySelector("[data-t]").textContent = fmt.time(tick * 600);
      body.querySelector("[data-st]").innerHTML = `<div><small>Reached by the fake</small><b class="spot">${n[1] + n[3]}</b></div><div><small>Saw the check first</small><b>${n[2]}</b></div><div><small>Still believe the fake</small><b>${n[1]}</b></div>`;
      return n;
    }
    let acc = 0;
    const lp = loop(root, (dt) => {
      if (!running) return false;
      acc += dt; if (acc < 0.045) return true; acc = 0;
      step(); draw(); const n = read();
      if (tick >= 6 * 24 || (n[1] === 0 && tick > opt.delay * 6)) { running = false; startBtn.textContent = "Run it again"; verdict(n); return false; }
      return true;
    });
    function verdict(n) {
      const reached = n[1] + n[3];
      body.querySelector("[data-say]").innerHTML = `<b>After ${fmt.time(tick * 600)}, ${reached} of ${N} people had met the fake, ${n[2]} saw the check first, and ${n[1]} still believe it.</b> ${opt.pause || opt.context ? "Friction and context change the race far more than a faster fact-check alone." : "Try a pause before sharing, or put the check under the post, then race again."}`;
    }
    const b = body.querySelector("[data-b]");
    const startBtn = button(b, "Start the race", () => { if (running) return; if (tick > 0) reset(); running = true; startBtn.textContent = "Racing"; lp.start(); }, "spot");
    reset();
    root.addEventListener("fig:reset", reset);
  });

  /* ====================================================================
     Eight defences, and the holes between them (Swiss-cheese model)
     ==================================================================== */
  Press.fig("fig-fail", (root) => {
    const body = root.querySelector(".fig-body");
    const L = [["Origin", "Fabrication"], ["Integrity", "Manipulation"], ["Context", "Miscontextualisation"], ["Grounded answers", "Hallucination"], ["Platform restraint", "Amplification failure"], ["Checking", "Verification failure"], ["Scrutiny of machines", "Deference failure"], ["Faith in checking", "Cynicism failure"]];
    const narrow = body.clientWidth < 560, VW = narrow ? 360 : 640;
    body.innerHTML = `<div class="cheese"><svg viewBox="0 0 ${VW} ${narrow ? 262 : 250}" role="img" aria-label="Eight slices standing in a row. Dots travel left to right and are stopped by slices unless they pass through holes."></svg></div><div class="fail-grid" data-c></div><div class="stats" data-st></div><p class="say" data-say></p>`;
    const s = body.querySelector("svg"), on = new Array(8).fill(false), slices = [];
    const SX = (i) => (narrow ? 34 + i * 40 : 70 + i * 66), top = narrow ? 44 : 30, H = 170, FS = narrow ? 15 : 11.5;
    if (narrow) {
      s.appendChild(svg("text", { x: 0, y: 20, "font-size": 15, "font-weight": 700, class: "t-ink", text: "Claims enter" }));
      s.appendChild(svg("text", { x: VW, y: 20, "font-size": 15, "font-weight": 700, "text-anchor": "end", class: "t-spot", text: "Believed" }));
    } else {
      s.appendChild(svg("text", { x: 10, y: 120, "font-size": 12, "font-weight": 700, class: "t-ink", text: "Claims" }));
      s.appendChild(svg("text", { x: 630, y: 120, "font-size": 12, "font-weight": 700, "text-anchor": "end", class: "t-spot", text: "Believed" }));
    }
    L.forEach((l, i) => {
      const g = svg("g", { class: "slice" });
      g.appendChild(svg("rect", { x: SX(i), y: top, width: 16, height: H, rx: 3, class: "body" }));
      const holes = [0.22, 0.55, 0.8].map((f) => { const hEl = svg("rect", { x: SX(i) + 3, y: top + f * H - 4, width: 10, height: 8, rx: 4, class: "hole" }); g.appendChild(hEl); return [hEl, f]; });
      g.appendChild(svg("text", { x: SX(i) + 8, y: top + H + 22, "text-anchor": "middle", "font-size": FS, text: String(i + 1) }));
      s.appendChild(g); slices.push({ g, holes });
    });
    const dots = svg("g"); s.appendChild(dots);
    const c = body.querySelector("[data-c]");
    L.forEach((l, i) => toggle(c, { label: `${i + 1}. ${l[1]}`, value: false, onChange: (v) => { on[i] = v; paint(); } }));
    const stopP = (i) => (on[i] ? 0.05 : 0.55);
    function paint() {
      slices.forEach((sl, i) => { sl.g.classList.toggle("open", on[i]); sl.holes.forEach(([hEl, f]) => { const hh = on[i] ? 42 : 8; hEl.setAttribute("height", hh); hEl.setAttribute("y", top + f * H - hh / 2); }); });
      const pass = on.reduce((p, o, i) => p * (1 - stopP(i)), 1), k = on.filter(Boolean).length;
      body.querySelector("[data-st]").innerHTML = `<div><small>Defences punctured</small><b>${k} of 8</b></div><div><small>Chance a false claim gets through</small><b class="spot">${pass < 0.01 ? (pass * 100).toFixed(2) : (pass * 100).toFixed(1)}%</b></div><div><small>Out of 10,000 false claims</small><b>${fmt.int(pass * 10000)}</b></div>`;
      body.querySelector("[data-say]").innerHTML = k === 0 ? "<b>With every defence working,</b> each slice still misses almost half of what reaches it, yet together they let through fewer than 1 in 200. Layers, not perfection, do the work." : k < 4 ? `<b>${k} hole${k > 1 ? "s" : ""} punched.</b> Each failure looks small on its own. Watch the count multiply, because the slices behind no longer get a second chance.` : k < 8 ? `<b>${k} failures together.</b> This is the compound failure the paper describes: no single hole is decisive, but each one hands the next slice more to stop.` : "<b>Every defence punctured.</b> Most claims now pass straight through. No single slice failed catastrophically; they failed together.";
    }
    // Animated dots: each one rolls the dice at every slice it meets.
    const flying = [];
    let acc = 0;
    const lp = loop(root, (dt) => {
      acc += dt; if (acc > 0.22) { acc = 0; const y = top + 12 + Math.random() * (H - 24); const d = svg("circle", { cx: 8, cy: y, r: narrow ? 5 : 4, class: "f-spot" }); dots.appendChild(d); flying.push({ d, x: 8, y, next: 0, dead: 0 }); }
      for (let i = flying.length - 1; i >= 0; i--) {
        const f = flying[i];
        if (f.dead) { f.dead -= dt; f.d.setAttribute("opacity", Math.max(0, f.dead / 0.5)); if (f.dead <= 0) { f.d.remove(); flying.splice(i, 1); } continue; }
        f.x += dt * (narrow ? 95 : 150);
        if (f.next < 8 && f.x >= SX(f.next) - 3) { if (Math.random() < stopP(f.next)) { f.dead = 0.5; f.x = SX(f.next) - 4; f.d.setAttribute("class", "f-ink"); } else f.next++; }
        f.d.setAttribute("cx", f.x);
        if (f.x > VW) { f.d.remove(); flying.splice(i, 1); }
      }
      return true;
    });
    paint(); lp.start();
  });

  /* ====================================================================
     From notebook to decision-maker
     ==================================================================== */
  Press.fig("fig-spectrum", (root) => {
    const body = root.querySelector(".fig-body");
    const ORIG = "The council said the bridge will stay open while engineers review new reports of cracks, but warned that it may close at short notice if inspectors find damage to the main supports.";
    const LV = [
      ["Storage", "Notes, bookmarks, calendars", "Information gathering", 5, "Saved to your reading list.", `<p>${ORIG}</p>`, "Light. You still read it."],
      ["Retrieval", "Search engines, databases", "Information gathering", 15, "Top search result for “bridge closure”.", `<p>${ORIG}</p>`, "Know how results are ranked."],
      ["Transformation", "Translation, transcription, formatting", "Information analysis", 30, "Reformatted into short lines.", `<p>The council: bridge stays open.<br>Engineers reviewing crack reports.<br>May close at short notice if supports damaged.</p>`, "Spot-check against the original."],
      ["Synthesis", "Summaries, comparisons, explanations", "Information analysis", 55, "AI summary.", `<p>The bridge will stay open while engineers review reports of cracks. <del>It may close at short notice if inspectors find damage to the main supports.</del></p>`, "Sources linked; the original one tap away."],
      ["Evaluation", "Credibility scores, risk ratings, rankings", "Decision selection", 78, "AI assessment.", `<p>The bridge will stay open.</p><span class="stamp">Credibility: high. Safe to travel</span>`, "Human review, stated uncertainty, an audit trail."],
      ["Delegated decision", "Systems that act with little review", "Action", 95, "Automated action.", `<p><mark>Route planner: no detour needed. Bridge open.</mark></p><span class="stamp">Sent to 4,000 commuters</span>`, "Mandatory human sign-off and clear accountability."]
    ];
    body.innerHTML = `<div class="spec-steps" role="group" aria-label="Level of outsourcing"></div><div data-r></div><div class="spec-doc" aria-live="polite"></div><div class="stats" data-st></div>`;
    const steps = body.querySelector(".spec-steps"), btns = LV.map((l, i) => { const bt = el("button", { type: "button", text: l[0] }); bt.addEventListener("click", () => sl.set(i)); steps.appendChild(bt); return bt; });
    const sl = range(body.querySelector("[data-r]"), { label: "Slide towards more outsourcing", min: 0, max: 5, value: 0, fmt: (v) => `Level ${v + 1} of 6`, onInput: show });
    function show(i) {
      const l = LV[i];
      btns.forEach((bt, k) => { bt.classList.toggle("on", k <= i); bt.style.background = k <= i ? `color-mix(in srgb, var(--spot) ${30 + k * 14}%, var(--ink))` : ""; });
      const doc = body.querySelector(".spec-doc");
      doc.innerHTML = `<small>${l[4]}</small>${l[5]}`; doc.classList.remove("swap"); void doc.offsetWidth; doc.classList.add("swap");
      body.querySelector("[data-st]").innerHTML = `<div><small>Examples</small><b style="font-size:1rem;font-weight:700">${l[1]}</b></div><div><small>Stage automated</small><b style="font-size:1rem;font-weight:700">${l[2]}</b></div><div><small>Judgment handed over</small><b class="spot">${l[3]}%</b></div><div><small>Governance it needs</small><b style="font-size:1rem;font-weight:700">${l[6]}</b></div>`;
    }
    show(0);
  });

  /* ====================================================================
     The epistemic risk dial
     ==================================================================== */
  Press.fig("fig-dial", (root) => {
    const body = root.querySelector(".fig-body");
    const F = [["plaus", "Plausibility of the artefact"], ["trace", "Untraceable origin"], ["opac", "Opacity of the mediation"], ["stake", "Stakes of relying on it"], ["cap", "Weak verification by the user"]];
    const PRE = {
      art: ["AI art, labelled as fiction", [60, 10, 30, 5, 30]],
      vote: ["Unlabelled audio before an election", [90, 90, 85, 95, 80]],
      legal1: ["Legal summary, checked by lawyers", [70, 20, 50, 90, 15]],
      legal2: ["Legal summary, relied on unread", [70, 70, 80, 90, 85]]
    };
    body.innerHTML = `<div data-t></div><div class="dial-wrap"><div class="dial"><svg viewBox="-44 0 388 190" role="img" aria-label="Risk dial"></svg></div><div class="controls" data-c></div></div><p class="say" data-say></p>`;
    const s = body.querySelector("svg"), cx = 150, cy = 160, R = 120;
    const arc = (a0, a1, rr) => { const p = (a) => [cx + rr * Math.cos(Math.PI * (1 - a)), cy - rr * Math.sin(Math.PI * (1 - a))]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0},${y0}A${rr},${rr} 0 0 1 ${x1},${y1}`; };
    [[0, 0.33, "var(--hair-2)"], [0.33, 0.66, "color-mix(in srgb, var(--spot) 45%, var(--paper))"], [0.66, 1, "var(--spot)"]].forEach(([a, b, col]) => s.appendChild(svg("path", { d: arc(a + 0.004, b - 0.004, R), stroke: col, "stroke-width": 22, fill: "none" })));
    [["Low", cx - R - 18, cy + 4, "end"], ["Watch", cx, cy - R - 20, "middle"], ["High", cx + R + 18, cy + 4, "start"]].forEach(([t, x, y, a]) => s.appendChild(svg("text", { x, y, "text-anchor": a, "font-size": 12, "font-weight": 700, text: t })));
    const needle = svg("line", { x1: cx, y1: cy, x2: cx - R + 26, y2: cy, class: "needle" }); s.appendChild(needle);
    s.appendChild(svg("circle", { cx, cy, r: 8, class: "f-ink" }));
    const read = svg("text", { x: cx, y: cy - 34, "text-anchor": "middle", class: "read", text: "0" }); s.appendChild(read);
    const m = { plaus: 90, trace: 90, opac: 85, stake: 95, cap: 80 }, sliders = {};
    const c = body.querySelector("[data-c]");
    F.forEach(([k, t]) => (sliders[k] = range(c, { label: t, min: 5, max: 100, value: m[k], fmt: (v) => v + "%", onInput: (v) => { m[k] = v; tb.set("", true); calc(); } })));
    const tb = tabs(body.querySelector("[data-t]"), { label: "A case from the paper", value: "vote", options: Object.entries(PRE).map(([v, p]) => ({ v, t: p[0] })), onChange: (v) => { if (!PRE[v]) return; PRE[v][1].forEach((x, i) => { m[F[i][0]] = x; sliders[F[i][0]].set(x, true); }); calc(); } });
    const sp = spring(0, { k: 120, d: 14 });
    const lp = loop(root, (dt) => { const moving = sp.step(dt); const a = Math.PI * (1 - clamp(sp.value, -0.02, 1.02)); needle.setAttribute("x2", cx + (R - 26) * Math.cos(a)); needle.setAttribute("y2", cy - (R - 26) * Math.sin(a)); read.textContent = Math.round(clamp(sp.value, 0, 1) * 100); return moving; });
    function calc() {
      const v = Math.pow(F.reduce((p, [k]) => p * (m[k] / 100), 1), 1 / 5);
      sp.set(v); lp.start();
      const low = F.reduce((a, b) => (m[b[0]] < m[a[0]] ? b : a));
      body.querySelector("[data-say]").innerHTML = v > 0.66 ? `<b>High risk.</b> Every factor points the same way, so no single safeguard is holding the line. Bringing down <em>${low[1].toLowerCase()}</em>, the weakest of them at ${m[low[0]]}%, is the place to start.` : v > 0.33 ? `<b>Worth watching.</b> What holds the risk down is low <em>${low[1].toLowerCase()}</em>, at ${m[low[0]]}%. That one factor is doing most of the work.` : `<b>Low risk.</b> At least one factor, <em>${low[1].toLowerCase()}</em>, is low enough to pull the whole picture down. That is what a working safeguard looks like.`;
    }
    calc();
  });
})();

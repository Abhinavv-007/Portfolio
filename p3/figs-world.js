/* Risk · die ear, exam morning, H x E x V, history, Ellsberg, lenses, expected-loss sentence */
(function () {
  "use strict";
  const { el, svg, button, range, toggle, tabs, fmt, clamp, lerp, rng, gauss, wait, tween } = FK;

  /* ---------- Ear: roll the die, watch the average settle ---------- */
  (function die() {
    const b = document.getElementById("die"), out = document.getElementById("dieAvg"); if (!b) return;
    const PIPS = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]] };
    let n = 0, sum = 0;
    const show = (v) => { b.innerHTML = PIPS[v].map(([x, y]) => `<i style="left:${x}%;top:${y}%"></i>`).join(""); b.setAttribute("aria-label", "Die showing " + v + ". Roll again"); };
    show(5);
    b.addEventListener("click", () => {
      for (let k = 0; k < 10; k++) { const v = 1 + Math.floor(Math.random() * 6); n++; sum += v; if (k === 9) show(v); }
      b.classList.remove("roll"); void b.offsetWidth; b.classList.add("roll");
      out.textContent = `Average of ${fmt.int(n)} rolls: ${(sum / n).toFixed(2)} (expected 3.50)`;
    });
  })();

  /* ---------- The exam-morning model ---------- */
  function morning(o, N, seed) {
    const r = rng(seed || 7), out = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const rain = r() < o.rain;
      let t = 8 + r() * 10 + 25 + Math.max(0, rain ? 12 + 6 * gauss(r) : 3 + 3 * gauss(r));
      if (r() < o.breakdown) t += o.backup ? 12 : 35;
      out[i] = t - o.leave;
    }
    return out;
  }
  const stats = (a) => { const s = Array.from(a).sort((x, y) => x - y); return { late: a.reduce((k, v) => k + (v > 0), 0) / a.length, med: s[Math.floor(s.length / 2)], p95: s[Math.floor(s.length * 0.95)], p99: s[Math.floor(s.length * 0.99)] }; };
  const clock = (offset) => { const m = Math.round(8 * 60 + 30 + offset); return Math.floor(m / 60) + ":" + String(((m % 60) + 60) % 60).padStart(2, "0"); };
  function histo(s, data, o) {
    const W = 600, H = o.h || 250, m = { l: 14, r: 14, t: 26, b: 34 }, lo = -40, hi = 60, bw = 2;
    const bins = new Array((hi - lo) / bw).fill(0); data.forEach((v) => { const k = Math.floor((clamp(v, lo, hi - 0.01) - lo) / bw); bins[k]++; });
    const max = o.max || Math.max(...bins) * 1.1, X = (v) => m.l + ((v - lo) / (hi - lo)) * (W - m.l - m.r), Y = (c) => H - m.b - (c / max) * (H - m.t - m.b);
    const g = svg("g");
    bins.forEach((c, k) => { if (!c) return; const x0 = lo + k * bw; g.appendChild(svg("rect", { x: X(x0) + 0.5, y: Y(c), width: X(x0 + bw) - X(x0) - 1, height: H - m.b - Y(c), class: x0 >= 0 ? "f-spot" : "f-ink", opacity: o.faint ? 0.18 : x0 >= 0 ? 1 : 0.72 })); });
    if (!o.noAxis) {
      g.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: "s-ink" }));
      [-30, -15, 0, 15, 30, 45].forEach((v) => g.appendChild(svg("text", { x: X(v), y: H - m.b + 18, "text-anchor": "middle", "font-size": 12, "font-weight": v === 0 ? 800 : 500, class: v === 0 ? "t-spot" : null, text: clock(v) })));
      g.appendChild(svg("line", { x1: X(0), x2: X(0), y1: m.t - 8, y2: H - m.b, class: "s-spot", "stroke-width": 2, "stroke-dasharray": "4 3" }));
      g.appendChild(svg("text", { x: X(0) + 6, y: m.t - 10, "font-size": 12, "font-weight": 700, class: "t-spot", text: "Doors close 8:30" }));
    }
    s.appendChild(g);
    return { X, Y, max, H, m };
  }

  /* ====================================================================
     Exam morning (scroll story)
     ==================================================================== */
  Press.fig("story-exam", (root) => {
    const host = root.querySelector(".exam");
    host.innerHTML = `<svg viewBox="0 0 600 250" role="img" aria-label="Arrival times over 2,000 simulated mornings"></svg><div class="exam-read"><div><small>Chance of being late</small><b class="spot" data-a>–</b></div><div><small>Typical arrival</small><b data-b>–</b></div><div><small>Worst 1 in 20</small><b data-c>–</b></div></div><p class="exam-note" aria-live="polite"></p>`;
    const s = host.querySelector("svg"), base = { leave: 50, rain: 0.8, breakdown: 0.03, backup: false };
    const read = (st) => { host.querySelector("[data-a]").textContent = Math.round(st.late * 100) + "%"; host.querySelector("[data-b]").textContent = clock(st.med); host.querySelector("[data-c]").textContent = clock(st.p95); };
    let cur = -2;
    function draw(step) {
      if (step === cur) return; cur = step; s.innerHTML = "";
      const note = host.querySelector(".exam-note");
      if (step <= 0) {
        const icons = [["home", "7:40 leave"], ["pin", "walk 8 min"], ["car", "bus 25 min"], ["office", "exam 8:30"]];
        icons.forEach(([ic, t], i) => { const x = 70 + i * 153; const g = svg("g", { transform: `translate(${x - 22},70)` }); g.innerHTML = `<circle cx="22" cy="22" r="30" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.5"/><g transform="translate(10,10)" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${FK.icon(ic).replace(/<svg[^>]*>|<\/svg>/g, "")}</g>`; s.appendChild(g); s.appendChild(svg("text", { x, y: 150, "text-anchor": "middle", "font-size": 14, "font-weight": 700, class: "t-ink", text: t })); if (i < 3) s.appendChild(svg("line", { x1: x + 34, x2: x + 119, y1: 92, y2: 92, class: "s-ink", "stroke-dasharray": "4 4" })); });
        s.appendChild(svg("text", { x: 300, y: 200, "text-anchor": "middle", "font-size": 13, class: "t-grey", text: "Heavy rain forecast · buses often late · little spare time" }));
        read(stats(morning(base, 2000))); note.textContent = "One question: is leaving at the usual time risky?"; return;
      }
      if (step === 1) { const d = morning(base, 2000); histo(s, d, {}); const st = stats(d); read(st); note.textContent = `Probability lens: ${Math.round(st.late * 100)}% of simulated mornings end late.`; }
      if (step === 2) {
        const d = morning(base, 2000); const H = histo(s, d, { faint: true }); const st = stats(d); read(st);
        const mu = -12, sd = 3; let path = ""; for (let v = -40; v <= 10; v += 0.5) { const y = Math.exp(-0.5 * ((v - mu) / sd) ** 2); path += (v === -40 ? "M" : "L") + H.X(v) + "," + (H.H - H.m.b - y * (H.H - H.m.t - H.m.b) * 0.95); }
        s.appendChild(svg("path", { d: path, class: "s-ink", "stroke-width": 3 }));
        s.appendChild(svg("text", { x: H.X(mu) - 14, y: 70, "text-anchor": "end", "font-size": 12, "font-weight": 700, class: "t-ink", text: "What the student expects" }));
        note.textContent = `Behavioural lens: memory says “always on time”; the model says ${Math.round(st.late * 100)}% late.`;
      }
      if (step === 3) {
        const d0 = morning(base, 2000), d1 = morning({ ...base, backup: true }, 2000);
        const H = histo(s, d0, { faint: true }); histo(s, d1, { noAxis: true, max: H.max });
        const a = stats(d0), b = stats(d1); read(b);
        note.textContent = `Vulnerability lens: when the bus breaks down, a taxi cuts the worst 1-in-100 arrival from ${clock(a.p99)} to ${clock(b.p99)}.`;
      }
      if (step >= 4) {
        let leave = 50, d, st; do { leave += 1; d = morning({ ...base, leave }, 2000); st = stats(d); } while (st.late > 0.05 && leave < 110);
        histo(s, d, {}); read(st);
        note.textContent = `Management lens: to keep lateness under 5%, leave by ${clock(-leave)}, ${leave - 50} minutes earlier than usual.`;
      }
    }
    Press.scrolly(root, { step(i) { draw(Math.max(0, i)); } });
    draw(0);
  });

  /* ====================================================================
     Plan your own morning
     ==================================================================== */
  Press.fig("fig-morning", (root) => {
    const body = root.querySelector(".fig-body");
    const o = { leave: 50, rain: 0.8, breakdown: 0.03, backup: false };
    body.innerHTML = `<div class="split"><div class="exam"><svg viewBox="0 0 600 250" role="img" aria-label="Arrival times"></svg><div class="exam-read"><div><small>Chance of being late</small><b class="spot" data-a></b></div><div><small>Typical arrival</small><b data-b></b></div><div><small>Worst 1 in 20</small><b data-c></b></div></div></div><div class="controls" data-c></div></div>`;
    const c = body.querySelector("[data-c]");
    const sl = [
      range(c, { label: "Leave home at", min: 20, max: 90, step: 1, value: 50, fmt: (v) => clock(-v), onInput: (v) => { o.leave = v; draw(); } }),
      range(c, { label: "Chance of heavy rain", min: 0, max: 100, step: 5, value: 80, fmt: (v) => v + "%", onInput: (v) => { o.rain = v / 100; draw(); } }),
      range(c, { label: "Chance the bus breaks down", min: 0, max: 20, step: 1, value: 3, fmt: (v) => v + "%", onInput: (v) => { o.breakdown = v / 100; draw(); } })
    ];
    const tg = toggle(c, { label: "Money for a taxi if the bus fails", value: false, onChange: (v) => { o.backup = v; draw(); } });
    function draw() { const s = body.querySelector("svg"); s.innerHTML = ""; const d = morning(o, 2000, 11); histo(s, d, {}); const st = stats(d); body.querySelector("[data-a]").textContent = Math.round(st.late * 100) + "%"; body.querySelector("[data-b]").textContent = clock(st.med); body.querySelector("[data-c]").textContent = clock(st.p95); }
    draw();
    root.addEventListener("fig:reset", () => { Object.assign(o, { leave: 50, rain: 0.8, breakdown: 0.03, backup: false }); sl[0].set(50, true); sl[1].set(80, true); sl[2].set(3, true); tg.set(false, true); draw(); });
  });

  /* ====================================================================
     Hazard, exposure, vulnerability
     ==================================================================== */
  Press.fig("fig-hev", (root) => {
    const body = root.querySelector(".fig-body");
    const o = { storm: 60, x: 0.35, savings: false, insurance: false, raised: false };
    body.innerHTML = `<div class="split"><div class="hev"><svg viewBox="0 0 600 260" role="img" aria-label="A house near a river during a storm"></svg><div class="hev-meter"><span>Risk</span><span class="bar"><i></i></span><b data-r></b></div><p class="say" data-say></p></div><div class="controls" data-c></div></div>`;
    const c = body.querySelector("[data-c]");
    const S = [range(c, { label: "Storm strength (hazard)", min: 0, max: 100, value: 60, fmt: (v) => v + "%", onInput: (v) => { o.storm = v; draw(); } }),
      range(c, { label: "Where the house stands (exposure)", min: 0, max: 100, value: 35, fmt: (v) => (v < 30 ? "on the floodplain" : v < 65 ? "on the slope" : "on the hill"), onInput: (v) => { o.x = v / 100; draw(); } })];
    const T = [toggle(c, { label: "Family has savings", value: false, onChange: (v) => { o.savings = v; draw(); } }), toggle(c, { label: "House is insured", value: false, onChange: (v) => { o.insurance = v; draw(); } }), toggle(c, { label: "Floor raised on stilts", value: false, onChange: (v) => { o.raised = v; draw(); } })];
    const ground = (u) => 210 - 130 * Math.pow(u, 1.3);
    function draw() {
      const s = body.querySelector("svg"); s.innerHTML = "";
      let d = "M0,260 L0,215 "; for (let u = 0; u <= 1.001; u += 0.02) d += `L${80 + u * 520},${ground(u)} `; d += "L600,260 Z";
      const level = 205 - o.storm * 1.15;
      s.appendChild(svg("rect", { x: 0, y: level, width: 600, height: 260 - level, class: "water" }));
      s.appendChild(svg("path", { d, class: "ground" }));
      for (let i = 0; i < Math.round(o.storm / 4); i++) { const x = (i * 53) % 600, y = (i * 37) % 120; s.appendChild(svg("line", { x1: x, y1: y, x2: x - 6, y2: y + 16, stroke: "#3b82c4", "stroke-width": 1.5, opacity: 0.6 })); }
      const hx = 80 + o.x * 520, gy = ground(o.x), lift = o.raised ? 26 : 0, hy = gy - lift;
      const h = svg("g", { transform: `translate(${hx - 26},${hy - 48})` });
      if (lift) { h.appendChild(svg("line", { x1: 8, y1: 48, x2: 8, y2: 48 + lift, class: "s-ink", "stroke-width": 3 })); h.appendChild(svg("line", { x1: 44, y1: 48, x2: 44, y2: 48 + lift, class: "s-ink", "stroke-width": 3 })); }
      h.appendChild(svg("path", { d: "M0,22 L26,0 L52,22 Z", class: "f-spot" })); h.appendChild(svg("rect", { x: 5, y: 22, width: 42, height: 26, class: "f-sheet", stroke: "var(--ink)", style: "stroke:var(--ink)", "stroke-width": 1.5 }));
      h.appendChild(svg("rect", { x: 21, y: 32, width: 10, height: 16, class: "f-ink" }));
      s.appendChild(h);
      const depth = Math.max(0, level < hy ? (hy - level) : 0);
      const H = o.storm / 100, E = clamp(((gy - lift) - level + 60) / 120, 0, 1), V = (o.savings ? 0.6 : 1) * (o.insurance ? 0.5 : 1) * (o.raised ? 0.6 : 1);
      const risk = Math.round(100 * H * E * V);
      body.querySelector(".hev-meter .bar").style.setProperty("--v", risk + "%"); body.querySelector("[data-r]").textContent = risk;
      body.querySelector("[data-say]").innerHTML = depth > 0 ? `<b>The water reaches the house.</b> ${V < 1 ? "Protection softens the blow: same hazard, same exposure, lower risk." : "With no savings, insurance or raised floor, the family takes the full loss."}` : H > 0.6 ? "<b>A strong storm, but the house is above the water.</b> High hazard, low exposure." : "Low water. Move the house or raise the storm.";
    }
    draw();
    root.addEventListener("fig:reset", () => { Object.assign(o, { storm: 60, x: 0.35, savings: false, insurance: false, raised: false }); S[0].set(60, true); S[1].set(35, true); T.forEach((t) => t.set(false, true)); draw(); });
  });

  /* ====================================================================
     Four centuries of thinking about chance
     ==================================================================== */
  Press.fig("fig-history", (root) => {
    const body = root.querySelector(".fig-body");
    const EV = [[1654, "Pascal and Fermat", "Letters about a gambling problem found modern probability."], [1738, "Bernoulli's utility", "Daniel Bernoulli explains the St Petersburg paradox: value, not money, drives choice."], [1921, "Knight's distinction", "Frank Knight separates measurable risk from true uncertainty."], [1944, "Expected utility, formalised", "Von Neumann and Morgenstern derive expected utility from axioms."], [1952, "Portfolios", "Markowitz shows that risk depends on how assets move together."], [1953, "Allais's paradox", "Real choices break the axioms when certainty is on offer."], [1954, "Personal probability", "Savage builds decision theory on subjective probabilities."], [1961, "Ellsberg's urns", "People avoid ambiguity in ways no single belief can explain."], [1974, "Heuristics and biases", "Tversky and Kahneman describe availability, representativeness and anchoring."], [1979, "Prospect theory", "Kahneman and Tversky: reference points, loss aversion, uneven weighting of odds."], [1981, "The risk triplet", "Kaplan and Garrick: what can happen, how likely, with what consequence."], [1982, "Risk and culture", "Douglas and Wildavsky: what we fear is shaped by how we live together."], [1987, "Perception of risk", "Slovic shows dread and control drive public reactions."], [1992, "Risk society", "Beck's account of manufactured risk appears in English; cumulative prospect theory is published."], [1995, "Natural frequencies", "Gigerenzer and Hoffrage show counts beat percentages for Bayesian reasoning."], [2001, "Risk as feelings", "Loewenstein and colleagues: risk is felt before it is analysed."], [2008, "What's wrong with risk matrices?", "Cox shows heat maps can rank risks badly."], [2009, "ISO 31000", "The international standard defines risk as the effect of uncertainty on objectives (revised 2018)."], [2017, "COSO ERM", "Enterprise risk management is tied to strategy and performance."], [2023, "NIST AI RMF", "A framework for managing the risks of artificial intelligence."], [2024, "NIST CSF 2.0", "Cybersecurity risk adds a new function: govern."]];
    const Y0 = 1640, Y1 = 2030, W = 760, X = (y) => 24 + ((y - Y0) / (Y1 - Y0)) * (W - 48);
    body.innerHTML = `<div class="tl"><svg viewBox="0 0 ${W} 96" role="img" aria-label="Timeline of ideas about risk"></svg><div class="controls row" data-c></div><div class="tl-card" aria-live="polite"></div></div>`;
    const s = body.querySelector("svg");
    s.appendChild(svg("line", { x1: 24, y1: 48, x2: W - 24, y2: 48, class: "s-hair", "stroke-width": 2 }));
    const fill = svg("line", { x1: 24, y1: 48, x2: 24, y2: 48, class: "s-spot", "stroke-width": 3 }); s.appendChild(fill);
    [1650, 1750, 1850, 1950, 2020].forEach((y) => { s.appendChild(svg("line", { x1: X(y), y1: 43, x2: X(y), y2: 53, class: "s-ink" })); s.appendChild(svg("text", { x: X(y), y: 80, "text-anchor": "middle", "font-size": 13, "font-weight": 600, text: String(y) })); });
    const dots = EV.map((e, i) => { const g = svg("g", { class: "ev" }); g.appendChild(svg("circle", { cx: X(e[0]), cy: 48, r: 6 })); g.addEventListener("click", () => go(i)); s.appendChild(g); return g; });
    const mark = svg("text", { x: 24, y: 24, "text-anchor": "middle", "font-size": 14, "font-weight": 800, class: "t-spot" }); s.appendChild(mark);
    const card = body.querySelector(".tl-card"), c = body.querySelector("[data-c]"); let cur = -1;
    const sl = range(c, { label: "Event", min: 0, max: EV.length - 1, value: 0, fmt: (v) => String(EV[v][0]), onInput: (v) => go(v, true) });
    const nav = el("div", { class: "btnrow" }); c.appendChild(nav);
    button(nav, "Previous", () => go(Math.max(0, cur - 1))); button(nav, "Next", () => go(Math.min(EV.length - 1, cur + 1)));
    const play = button(nav, "Play", async () => { play.disabled = true; for (let i = 0; i < EV.length; i++) { go(i); await wait(900); } play.disabled = false; }, "solid");
    function go(i, fromSl) { if (i === cur) return; cur = i; if (!fromSl) sl.set(i, true); const y = EV[i][0]; fill.setAttribute("x2", X(y)); mark.setAttribute("x", X(y)); mark.textContent = String(y); dots.forEach((d, j) => { d.classList.toggle("past", j <= i); d.classList.toggle("on", j === i); }); card.innerHTML = `<div class="yr">${y}</div><div><h4>${EV[i][1]}</h4><p>${EV[i][2]}</p></div>`; card.classList.remove("swap"); void card.offsetWidth; card.classList.add("swap"); }
    go(0);
  });

  /* ====================================================================
     Ellsberg's two urns
     ==================================================================== */
  Press.fig("fig-ellsberg", (root) => {
    const body = root.querySelector(".fig-body");
    let stage = 0, picks = [];
    const urnSVG = (known) => { const r = rng(known ? 4 : 9); let balls = ""; for (let i = 0; i < 40; i++) { const x = 30 + (i % 8) * 17 + (Math.floor(i / 8) % 2) * 8, y = 64 + Math.floor(i / 8) * 17; const col = known ? (i % 2 ? "#141414" : "var(--spot)") : "var(--grey)"; balls += `<circle cx="${x}" cy="${y}" r="7" fill="${col}"/>`; } return `<svg viewBox="0 0 180 160"><path d="M20,40 Q20,150 90,150 Q160,150 160,40 Z" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/>${balls}${known ? "" : '<text x="90" y="120" text-anchor="middle" font-size="40" font-weight="800" fill="var(--paper)">?</text>'}</svg>`; };
    body.innerHTML = `<p class="bet" aria-live="polite"></p><div class="urns"><button class="urn" type="button" data-u="A">${urnSVG(true)}Urn A<small>50 red, 50 black</small></button><button class="urn" type="button" data-u="B">${urnSVG(false)}Urn B<small>100 balls, red and black, in an unknown mix</small></button></div><p class="say" data-say></p>`;
    const bet = body.querySelector(".bet"), say = body.querySelector("[data-say]");
    const BETS = ["Bet one: you win ₹1,000 if you draw a red ball. Which urn?", "Bet two: now you win ₹1,000 if you draw a black ball. Which urn?"];
    function paint() { bet.textContent = stage < 2 ? BETS[stage] : "Your choices"; body.querySelectorAll(".urn").forEach((u) => u.classList.remove("picked")); }
    body.querySelectorAll(".urn").forEach((u) => u.addEventListener("click", () => {
      if (stage >= 2) return; picks.push(u.dataset.u); u.classList.add("picked"); stage++;
      setTimeout(() => {
        if (stage < 2) { paint(); return; }
        bet.textContent = `You chose urn ${picks[0]} for red and urn ${picks[1]} for black.`;
        if (picks[0] === "A" && picks[1] === "A") say.innerHTML = "<b>Like most people, you chose the known urn both times.</b> But if you avoid urn B for red, you must think it holds fewer than 50 reds, which means more than 50 blacks, so it should be the better bet for black. No single belief about urn B makes both choices consistent. Ellsberg called this aversion to ambiguity, and it breaks Savage's axioms.";
        else if (picks[0] === "B" && picks[1] === "B") say.innerHTML = "<b>You chose the unknown urn both times.</b> That is the mirror image of the common pattern: a taste for ambiguity. Either way, no single belief about urn B's mix justifies both choices.";
        else say.innerHTML = "<b>Your choices are consistent with a definite belief</b> about urn B. Most people, though, pick urn A both times, and that pattern cannot be explained by any probability for urn B.";
        say.innerHTML += ' <button class="btn" type="button" data-again style="margin-left:.4rem">Try again</button>';
        say.querySelector("[data-again]").onclick = reset;
      }, 350);
    }));
    function reset() { stage = 0; picks = []; say.textContent = ""; paint(); }
    reset(); root.addEventListener("fig:reset", reset);
  });

  /* ====================================================================
     One release, six lenses
     ==================================================================== */
  Press.fig("fig-lens", (root) => {
    const body = root.querySelector(".fig-body");
    const L = {
      prob: ["Classical probability", "The chance of a production incident, and its likely size.", "How often similar releases have failed: say 4 of the last 50 Friday releases, about 8%.", "“An 8% chance of an incident, against about 3% for midweek releases.”"],
      eu: ["Expected utility", "The release's outcomes weighted by how much each would matter.", "Revenue from shipping now against the cost of an outage with the team away for the weekend.", "“Ship only if the expected utility beats waiting until Monday.”"],
      bayes: ["Bayesian", "A belief about failure that moves with evidence.", "Start from the 8% prior, then update on today's evidence: a flaky test, error rates on the canary server.", "“The canary's errors push the chance of an incident to about 20%. Hold.”"],
      behav: ["Behavioural", "How the team perceives the danger, not just its size.", "Deadline pressure, overconfidence after recent smooth releases, Friday-afternoon optimism.", "“Beware ‘it went fine last time’. Run a quick pre-mortem first.”"],
      org: ["Organisational", "The effect of uncertainty on the company's objectives, and who owns it.", "The appetite statement, the risk owner, the escalation path.", "“Policy: no payment changes after 3 pm on Fridays without sign-off. It waits.”"],
      domain: ["Cybersecurity", "Threat, vulnerability, exposure, impact and recovery.", "A new internet-facing payment endpoint. Are its authorization checks reviewed? Are monitoring and rollback ready?", "“Ship behind a feature flag, after the authorization review, with rollback tested.”"]
    };
    body.innerHTML = `<div data-t></div><div class="lens-card" aria-live="polite"></div>`;
    const card = body.querySelector(".lens-card");
    function show(k) { const x = L[k]; card.innerHTML = `<div><small>What counts as risk</small><p>${x[1]}</p></div><div><small>What gets measured</small><p>${x[2]}</p></div><div><small>What it would say</small><p>${x[3]}</p></div>`; card.style.animation = "none"; void card.offsetWidth; card.style.animation = ""; }
    tabs(body.querySelector("[data-t]"), { value: "prob", options: Object.entries(L).map(([v, x]) => ({ v, t: x[0] })), onChange: show });
    show("prob");
  });

  /* ---------- Expected-loss sentence ---------- */
  (function elSentence() {
    const p = document.getElementById("rx-el"); if (!p) return;
    Press.reactive(p, { p: 2, L: 100000, yrs: 30 }, (m) => { const q = m.p / 100; return { el: fmt.int(q * m.L), times: (q * m.yrs).toFixed(q * m.yrs < 10 ? 1 : 0), none: Math.round(Math.pow(1 - q, m.yrs) * 100) + "%" }; });
  })();
})();

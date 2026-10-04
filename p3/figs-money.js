/* Risk · expected loss and ruin, St Petersburg, the utility curve */
(function () {
  "use strict";
  const { el, svg, button, range, fmt, clamp, rng, wait, tex } = FK;

  /* ====================================================================
     The same average, a different fate
     ==================================================================== */
  Press.fig("fig-el", (root) => {
    const body = root.querySelector(".fig-body");
    const DEF = [["Server outage", 2, 100000], ["Minor bug in production", 30, 2000], ["Data breach", 0.5, 400000]];
    let rows = DEF.map((r) => r.slice()), reserve = 50000;
    body.innerHTML = `<div class="tablewrap" style="border:0;margin:0"><table class="el-table"><thead><tr><th>Scenario</th><th>Chance (%)</th><th>Loss</th><th>Contribution p × L</th><th></th></tr></thead><tbody></tbody></table></div>
      <div class="el-total"><span>Expected loss, EL = Σ p<sub>i</sub>L<sub>i</sub></span><b data-el></b></div><p class="fig-source" data-warn style="border:0;margin:.3rem 0 0"></p><div class="btnrow" style="margin-top:.6rem" data-b></div>
      <div class="ruin"><div class="controls"><div data-c></div></div><div class="ruin-grid" style="margin-top:.8rem"><div><h4>A sure loss of 2,000 a year</h4><svg viewBox="0 0 300 150" data-a></svg><span class="big" data-ra></span><span class="fig-source" style="border:0;margin:0">of lives ruined</span></div><div><h4>A 2% chance of losing 100,000 a year</h4><svg viewBox="0 0 300 150" data-bsvg></svg><span class="big spot" data-rb></span><span class="fig-source" style="border:0;margin:0">of lives ruined</span></div></div><p class="say" data-say></p></div>`;
    const tb = body.querySelector("tbody");
    function table() {
      tb.innerHTML = "";
      rows.forEach((r, i) => {
        const tr = el("tr", { html: `<td><input aria-label="Scenario name" value="${r[0]}"></td><td><input aria-label="Chance in percent" type="number" min="0" max="100" step="0.1" value="${r[1]}"></td><td><input aria-label="Loss" type="number" min="0" step="100" value="${r[2]}"></td><td class="contrib"><i></i><span></span></td><td><button class="del" type="button" aria-label="Remove row">×</button></td>` });
        const [n, p, l] = tr.querySelectorAll("input");
        n.addEventListener("input", () => (r[0] = n.value));
        p.addEventListener("input", () => { r[1] = clamp(+p.value || 0, 0, 100); totals(); });
        l.addEventListener("input", () => { r[2] = Math.max(0, +l.value || 0); totals(); });
        tr.querySelector(".del").addEventListener("click", () => { rows.splice(i, 1); table(); });
        tb.appendChild(tr);
      });
      totals();
    }
    function totals() {
      const c = rows.map((r) => (r[1] / 100) * r[2]), max = Math.max(1, ...c), sum = c.reduce((a, b) => a + b, 0);
      tb.querySelectorAll("tr").forEach((tr, i) => { tr.querySelector(".contrib i").style.setProperty("--v", (c[i] / max) * 100 + "%"); tr.querySelector(".contrib span").textContent = fmt.int(c[i]); });
      body.querySelector("[data-el]").textContent = fmt.int(sum);
      const ps = rows.reduce((a, r) => a + r[1], 0);
      body.querySelector("[data-warn]").textContent = ps > 100 ? "These chances add up to more than 100%. That is fine only if the scenarios can happen together." : "";
    }
    button(body.querySelector("[data-b]"), "Add a scenario", () => { rows.push(["New scenario", 5, 10000]); table(); });
    const rr = range(body.querySelector("[data-c]"), { label: "Cash reserve at the start", min: 5000, max: 200000, step: 5000, value: reserve, fmt: (v) => fmt.int(v), onInput: (v) => { reserve = v; ruin(); } });
    function sim(kind, seed) {
      const r = rng(seed), paths = [], YEARS = 30; let ruined = 0;
      for (let life = 0; life < 1000; life++) {
        let x = reserve, dead = false; const p = [x];
        for (let y = 0; y < YEARS; y++) { x += 2500; x -= kind === "A" ? 2000 : r() < 0.02 ? 100000 : 0; if (x < 0) dead = true; p.push(x); }
        if (dead) ruined++; if (life < 40) paths.push(p);
      }
      return { ruined: ruined / 1000, paths };
    }
    function plot(s, paths) {
      s.innerHTML = ""; const lo = -100000, hi = Math.max(220000, reserve + 80000), X = (i) => 8 + (i / 30) * 284, Y = (v) => 140 - ((clamp(v, lo, hi) - lo) / (hi - lo)) * 130;
      s.appendChild(svg("line", { x1: 8, x2: 292, y1: Y(0), y2: Y(0), class: "s-ink", "stroke-dasharray": "3 3" }));
      s.appendChild(svg("text", { x: 292, y: Y(0) - 4, "text-anchor": "end", "font-size": 10, class: "t-grey", text: "zero" }));
      paths.forEach((p) => { const dead = p.some((v) => v < 0); s.appendChild(svg("path", { d: p.map((v, i) => (i ? "L" : "M") + X(i) + "," + Y(v)).join(""), class: dead ? "s-spot" : "s-ink", "stroke-width": dead ? 1.6 : 1, opacity: dead ? 0.9 : 0.25 })); });
    }
    function ruin() {
      const a = sim("A", 3), b = sim("B", 5);
      plot(body.querySelector("[data-a]"), a.paths); plot(body.querySelector("[data-bsvg]"), b.paths);
      body.querySelector("[data-ra]").textContent = Math.round(a.ruined * 100) + "%"; body.querySelector("[data-rb]").textContent = Math.round(b.ruined * 100) + "%";
      body.querySelector("[data-say]").innerHTML = `<b>Both options cost 2,000 a year on average, about 60,000 over thirty years.</b> Yet with a ${fmt.int(reserve)} reserve, ${Math.round(b.ruined * 100)}% of the lives facing the rare loss go broke at some point, against ${Math.round(a.ruined * 100)}% for the sure loss. Expected loss cannot see survival.`;
    }
    table(); ruin();
    root.addEventListener("fig:reset", () => { rows = DEF.map((r) => r.slice()); table(); reserve = 50000; rr.set(50000, true); ruin(); });
  });

  /* ====================================================================
     The St Petersburg game
     ==================================================================== */
  const ce = (w) => { let eu = 0; for (let k = 1; k <= 60; k++) eu += Math.pow(2, -k) * Math.log(w + Math.pow(2, k)); return Math.exp(eu) - w; };
  Press.fig("fig-stp", (root) => {
    const body = root.querySelector(".fig-body");
    let plays = 0, total = 0, wealth = 100000;
    body.innerHTML = `<div class="split"><div><div class="btnrow" data-b></div><div class="coin" aria-live="polite"></div><div class="stats" data-st></div></div><div class="chart"><div data-c></div><svg viewBox="0 0 420 240" role="img" aria-label="What a cautious player would pay, by wealth"></svg><p class="say" data-say></p></div></div>`;
    const coin = body.querySelector(".coin"), b = body.querySelector("[data-b]");
    const one = () => { let k = 1; while (Math.random() < 0.5) k++; return k; };
    const playB = button(b, "Play once", async () => {
      playB.disabled = true; coin.innerHTML = ""; const k = one();
      for (let i = 1; i <= k; i++) { coin.appendChild(el("i", { class: i === k ? "h" : "", text: i === k ? "H" : "T" })); await wait(180); }
      plays++; total += Math.pow(2, k); stats(`Heads on toss ${k}: you win ₹${fmt.int(Math.pow(2, k))}.`); playB.disabled = false;
    }, "solid");
    button(b, "Play 10,000 times", () => { for (let i = 0; i < 10000; i++) { plays++; total += Math.pow(2, one()); } coin.innerHTML = ""; stats("Ten thousand more games played."); });
    function stats(msg) {
      body.querySelector("[data-st]").innerHTML = `<div><small>Games</small><b>${fmt.int(plays)}</b></div><div><small>Average win</small><b class="spot">₹${plays ? fmt.int(total / plays) : 0}</b></div><div><small>Theoretical average</small><b>∞</b></div>`;
      if (msg) body.querySelector("[data-say]").innerHTML = `${msg} The average creeps up only slowly, roughly with the logarithm of the number of games, because huge wins are so rare.`;
    }
    range(body.querySelector("[data-c]"), { label: "Your wealth", min: 1, max: 7, step: 0.05, value: 5, fmt: (v) => "₹" + fmt.int(Math.pow(10, v)), onInput: (v) => { wealth = Math.pow(10, v); curve(); } });
    function curve() {
      const s = body.querySelector("svg"); s.innerHTML = ""; const W = 420, H = 240, m = { l: 48, r: 12, t: 16, b: 36 };
      const X = (lw) => m.l + ((lw - 1) / 6) * (W - m.l - m.r), Y = (c) => H - m.b - (c / 30) * (H - m.t - m.b);
      [0, 10, 20, 30].forEach((v) => { s.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: "s-hair", "stroke-dasharray": "2 4" })); s.appendChild(svg("text", { x: m.l - 6, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, text: "₹" + v })); });
      [1, 3, 5, 7].forEach((lw) => s.appendChild(svg("text", { x: X(lw), y: H - 16, "text-anchor": "middle", "font-size": 11, text: "₹" + fmt.compact(Math.pow(10, lw)) })));
      s.appendChild(svg("text", { x: W - m.r, y: H - 2, "text-anchor": "end", "font-size": 11, class: "t-grey", text: "wealth (log scale)" }));
      let d = ""; for (let lw = 1; lw <= 7.001; lw += 0.05) d += (lw === 1 ? "M" : "L") + X(lw) + "," + Y(ce(Math.pow(10, lw)));
      s.appendChild(svg("path", { d, class: "s-spot", "stroke-width": 3 }));
      const lw = Math.log10(wealth), c = ce(wealth);
      s.appendChild(svg("circle", { cx: X(lw), cy: Y(c), r: 6, class: "f-ink" }));
      s.appendChild(svg("text", { x: X(lw) + (lw > 5.5 ? -10 : 10), y: Y(c) - 10, "text-anchor": lw > 5.5 ? "end" : "start", "font-size": 13, "font-weight": 800, class: "t-ink", text: "pays at most ₹" + c.toFixed(2) }));
      body.querySelector("[data-say]").innerHTML = `<b>With wealth of ₹${fmt.int(wealth)}, a player with log utility would pay at most ₹${c.toFixed(2)} to play</b>, even though the expected payout is infinite. Bernoulli's point: what matters is how much each rupee is worth to you, and that falls as you get richer.`;
    }
    stats(); curve();
    root.addEventListener("fig:reset", () => { plays = 0; total = 0; coin.innerHTML = ""; stats(); });
  });

  /* ====================================================================
     Why a curve makes you careful
     ==================================================================== */
  Press.fig("fig-utility", (root) => {
    const body = root.querySelector(".fig-body");
    const w0 = 100; let x = 60;
    body.innerHTML = `<div class="split"><div class="chart"><svg viewBox="0 0 460 280" role="img" aria-label="Log utility curve with a 50-50 gamble"></svg></div><div><div data-c></div><div class="stats" data-st></div><p class="say" data-say></p></div></div>`;
    range(body.querySelector("[data-c]"), { label: "Size of the 50-50 gamble (wealth starts at 100)", min: 0, max: 95, step: 1, value: x, fmt: (v) => "± " + v, onInput: (v) => { x = v; draw(); } });
    function draw() {
      const s = body.querySelector("svg"); s.innerHTML = ""; const W = 460, H = 280, m = { l: 40, r: 14, t: 16, b: 34 };
      const X = (w) => m.l + (w / 200) * (W - m.l - m.r), Y = (u) => H - m.b - ((u - 1) / (Math.log(200) - 1)) * (H - m.t - m.b);
      s.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: "s-ink" }));
      [0, 50, 100, 150, 200].forEach((w) => s.appendChild(svg("text", { x: X(w), y: H - 14, "text-anchor": "middle", "font-size": 11, text: w })));
      s.appendChild(svg("text", { x: W - m.r, y: H - 1, "text-anchor": "end", "font-size": 11, class: "t-grey", text: "wealth" }));
      s.appendChild(svg("text", { x: m.l, y: 12, "font-size": 11, class: "t-grey", text: "utility = ln(wealth)" }));
      let d = ""; for (let w = 3; w <= 200; w += 1) d += (w === 3 ? "M" : "L") + X(w) + "," + Y(Math.log(w)); s.appendChild(svg("path", { d, class: "s-ink", "stroke-width": 2.5 }));
      const a = w0 - x, b = w0 + x, ua = Math.log(Math.max(a, 0.5)), ub = Math.log(b), eu = (ua + ub) / 2, cE = Math.exp(eu);
      s.appendChild(svg("line", { x1: X(a), y1: Y(ua), x2: X(b), y2: Y(ub), class: "s-hair", "stroke-width": 1.5, "stroke-dasharray": "4 3" }));
      [[a, ua], [b, ub]].forEach(([w, u]) => s.appendChild(svg("circle", { cx: X(w), cy: Y(u), r: 5, class: "f-ink" })));
      s.appendChild(svg("circle", { cx: X(w0), cy: Y(Math.log(w0)), r: 5, class: "f-ink" }));
      s.appendChild(svg("circle", { cx: X(w0), cy: Y(eu), r: 6, class: "f-spot" }));
      s.appendChild(svg("line", { x1: X(cE), y1: Y(eu), x2: X(w0), y2: Y(eu), class: "s-spot", "stroke-width": 3 }));
      s.appendChild(svg("line", { x1: X(cE), y1: Y(eu), x2: X(cE), y2: H - m.b, class: "s-spot", "stroke-dasharray": "3 3" }));
      s.appendChild(svg("text", { x: (X(cE) + X(w0)) / 2, y: Y(eu) - 8, "text-anchor": "middle", "font-size": 12, "font-weight": 800, class: "t-spot", text: "risk premium" }));
      body.querySelector("[data-st]").innerHTML = `<div><small>Average wealth</small><b>100</b></div><div><small>Certainty equivalent</small><b class="spot">${cE.toFixed(1)}</b></div><div><small>Risk premium</small><b>${(w0 - cE).toFixed(1)}</b></div>`;
      body.querySelector("[data-say]").innerHTML = x === 0 ? "No gamble, no gap. Widen it." : `<b>The gamble averages 100, but feels like ${cE.toFixed(1)} for certain.</b> Because the curve bends, the pain of falling to ${a} outweighs the pleasure of rising to ${b}. You would give up ${(w0 - cE).toFixed(1)} to avoid the gamble altogether: that is risk aversion, and it is perfectly rational.`;
    }
    draw();
  });
})();

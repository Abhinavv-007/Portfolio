/* Risk · variance, Bayes, portfolio, prospect theory */
(function () {
  "use strict";
  const { el, svg, button, range, fmt, clamp, tex } = FK;

  /* ====================================================================
     Two roads to the same variance
     ==================================================================== */
  Press.fig("fig-var", (root) => {
    const body = root.querySelector(".fig-body");
    const DEF = [2, -3, 5, 1, -6, 4]; let v = DEF.slice();
    body.innerHTML = `<div class="var-wrap"><svg viewBox="0 0 600 260" role="img" aria-label="Six outcomes you can drag"></svg></div><div class="var-calc"><div>By the definition, E[(X − μ)²]<b data-a></b><span data-ad></span></div><div>By the identity, E[X²] − μ²<b data-b></b><span data-bd></span></div></div>`;
    const s = body.querySelector("svg"), W = 600, H = 260, m = { l: 40, r: 20, t: 14, b: 26 }, lo = -10, hi = 10;
    const X = (i) => m.l + 40 + i * ((W - m.l - m.r - 80) / 5), Y = (x) => m.t + ((hi - x) / (hi - lo)) * (H - m.t - m.b), inv = (py) => clamp(hi - ((py - m.t) / (H - m.t - m.b)) * (hi - lo), lo, hi);
    let drag = -1;
    function draw() {
      s.innerHTML = ""; const mu = v.reduce((a, b) => a + b, 0) / 6;
      [-10, -5, 0, 5, 10].forEach((t) => { s.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: "s-hair", "stroke-dasharray": "2 4" })); s.appendChild(svg("text", { x: m.l - 8, y: Y(t) + 4, "text-anchor": "end", "font-size": 11, text: t })); });
      s.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: Y(mu), y2: Y(mu), class: "s-spot", "stroke-width": 2 }));
      s.appendChild(svg("text", { x: m.l + 4, y: Y(mu) - 6, "text-anchor": "start", "font-size": 12, "font-weight": 800, class: "t-spot", text: "mean μ = " + mu.toFixed(2) }));
      v.forEach((x, i) => {
        const d = Math.abs(x - mu), side = Math.min(60, d * (H - m.t - m.b) / (hi - lo));
        s.appendChild(svg("rect", { x: X(i) + 10, y: Math.min(Y(x), Y(mu)), width: side, height: side, class: "f-wash", stroke: "var(--spot)", style: "stroke:var(--spot)", "stroke-width": 1 }));
        s.appendChild(svg("line", { x1: X(i), x2: X(i), y1: Y(x), y2: Y(mu), class: "s-ink", "stroke-width": 1.5 }));
        const g = svg("g", { class: "hdl", tabindex: 0, role: "slider", "aria-label": "Outcome " + (i + 1), "aria-valuenow": x.toFixed(1) });
        g.appendChild(svg("circle", { cx: X(i), cy: Y(x), r: 11, class: "f-ink" }));
        g.appendChild(svg("text", { x: X(i), y: Y(x) + 4, "text-anchor": "middle", "font-size": 10, "font-weight": 700, style: "fill:var(--paper)", text: x.toFixed(0) }));
        g.addEventListener("pointerdown", (e) => { drag = i; s.setPointerCapture(e.pointerId); });
        g.addEventListener("keydown", (e) => { if (e.key === "ArrowUp") { e.preventDefault(); v[i] = clamp(v[i] + 1, lo, hi); draw(); } if (e.key === "ArrowDown") { e.preventDefault(); v[i] = clamp(v[i] - 1, lo, hi); draw(); } });
        s.appendChild(g);
      });
      const a = v.reduce((t, x) => t + (x - mu) ** 2, 0) / 6, ex2 = v.reduce((t, x) => t + x * x, 0) / 6, b = ex2 - mu * mu;
      body.querySelector("[data-a]").textContent = a.toFixed(3); body.querySelector("[data-b]").textContent = b.toFixed(3);
      body.querySelector("[data-ad]").textContent = "average of the pink squares"; body.querySelector("[data-bd]").textContent = `${ex2.toFixed(3)} − ${(mu * mu).toFixed(3)}`;
    }
    s.addEventListener("pointermove", (e) => { if (drag < 0) return; const r = s.getBoundingClientRect(); v[drag] = Math.round(inv(((e.clientY - r.top) / r.height) * H) * 2) / 2; draw(); });
    s.addEventListener("pointerup", () => (drag = -1)); s.addEventListener("pointercancel", () => (drag = -1));
    draw();
    root.addEventListener("fig:reset", () => { v = DEF.slice(); draw(); });
  });

  /* ====================================================================
     A positive test, a thousand people
     ==================================================================== */
  function bayes(prev, sens, fpr) { const n = 1000, ill = prev * n, tp = ill * sens, fn = ill - tp, fp = (n - ill) * fpr, tn = n - ill - fp; return { tp, fn, fp, tn, post: tp / (tp + fp) }; }
  Press.fig("fig-bayes", (root) => {
    const body = root.querySelector(".fig-body");
    let prev = 0.01, sens = 0.95, fpr = 0.05, revealed = false, guess = 50;
    body.innerHTML = `<div class="split"><div><div class="guess-box"><div data-g></div><div class="btnrow" data-gb></div></div><div class="controls" data-c style="margin-top:1rem"></div><div class="btnrow" style="margin-top:.8rem" data-b></div></div><div><div class="people"><svg viewBox="0 0 400 252" role="img" aria-label="1,000 people sorted by disease and test result"></svg></div><div class="legend"><span><i style="background:var(--spot)"></i>Ill, tests positive</span><span><i style="border:2px solid var(--spot)"></i>Ill, missed</span><span><i style="background:var(--ink)"></i>Healthy, false alarm</span><span><i style="background:var(--hair-2)"></i>Healthy, negative</span></div><div class="stats" data-st></div></div></div><p class="say" data-say>Commit to a guess before you look.</p>`;
    range(body.querySelector("[data-g]"), { label: "Your guess: chance of disease after a positive test", min: 0, max: 100, value: guess, fmt: (v) => v + "%", onInput: (v) => (guess = v) });
    const showB = button(body.querySelector("[data-gb]"), "Show me", () => { revealed = true; body.querySelector(".guess-box").classList.add("done"); showB.disabled = true; draw(true); }, "solid");
    const c = body.querySelector("[data-c]");
    const S = [range(c, { label: "How common the disease is", min: 0.1, max: 30, step: 0.1, value: 1, fmt: (v) => v.toFixed(1) + "%", onInput: (v) => { prev = v / 100; draw(); } }),
      range(c, { label: "Sensitivity: ill people the test catches", min: 50, max: 99.9, step: 0.1, value: 95, fmt: (v) => v.toFixed(1) + "%", onInput: (v) => { sens = v / 100; draw(); } }),
      range(c, { label: "False-positive rate among healthy people", min: 0.1, max: 30, step: 0.1, value: 5, fmt: (v) => v.toFixed(1) + "%", onInput: (v) => { fpr = v / 100; draw(); } })];
    button(body.querySelector("[data-b]"), "Positive again? Test a second time", () => { const r = bayes(prev, sens, fpr); prev = clamp(r.post, 0.001, 0.3); S[0].set(+(prev * 100).toFixed(1), true); revealed = true; draw(true, true); });
    const dots = [], s = body.querySelector("svg");
    for (let i = 0; i < 1000; i++) { const d = svg("circle", { cx: 6 + (i % 40) * 9.8, cy: 6 + Math.floor(i / 40) * 9.8, r: 3.6 }); s.appendChild(d); dots.push(d); }
    function draw(fromBtn, second) {
      const r = bayes(prev, sens, fpr), tp = Math.round(r.tp), fn = Math.round(r.fn), fp = Math.round(r.fp);
      dots.forEach((d, i) => {
        let f = "var(--hair-2)", st = "none";
        if (!revealed) f = "var(--hair-2)";
        else if (i < tp) f = "var(--spot)"; else if (i < tp + fn) { f = "transparent"; st = "var(--spot)"; } else if (i < tp + fn + fp) f = "var(--ink)";
        d.style.fill = f; d.style.stroke = st; d.style.strokeWidth = st === "none" ? 0 : 1.5;
      });
      body.querySelector("[data-st]").innerHTML = revealed ? `<div><small>Test positive</small><b>${tp + fp}</b></div><div><small>Actually ill</small><b class="spot">${tp}</b></div><div><small>Chance you are ill</small><b class="spot">${(r.post * 100).toFixed(1)}%</b></div>` : `<div><small>Chance you are ill</small><b>?</b></div>`;
      if (!revealed) return;
      const say = body.querySelector("[data-say]");
      if (second) say.innerHTML = `<b>A second positive test.</b> Yesterday's posterior becomes today's prior (${(prev * 100).toFixed(1)}%), and the chance climbs to ${(r.post * 100).toFixed(1)}%. Evidence accumulates; belief follows it.`;
      else if (fromBtn) say.innerHTML = `<b>You guessed ${guess}%. The answer is ${(r.post * 100).toFixed(1)}%.</b> Of ${tp + fp} people who test positive, only ${tp} are ill: the ${fp} false alarms come from the much larger healthy group. ${guess > 60 ? "Most people guess close to 95%, the test's accuracy." : ""}`;
      else say.innerHTML = `Of every 1,000 people tested, ${tp + fp} test positive and ${tp} of them are ill: ${(r.post * 100).toFixed(1)}%.`;
    }
    draw();
    root.addEventListener("fig:reset", () => { prev = 0.01; sens = 0.95; fpr = 0.05; S[0].set(1, true); S[1].set(95, true); S[2].set(5, true); revealed = false; showB.disabled = false; body.querySelector(".guess-box").classList.remove("done"); body.querySelector("[data-say]").textContent = "Commit to a guess before you look."; draw(); });
  });
  (function bayesSentence() {
    const p = document.getElementById("rx-bayes"); if (!p) return;
    Press.reactive(p, { prev: 1, sens: 95, fpr: 5 }, (m) => { const r = bayes(m.prev / 100, m.sens / 100, m.fpr / 100); return { post: (r.post * 100).toFixed(1) + "%", pos: fmt.int(r.tp + r.fp), tp: fmt.int(r.tp) }; });
  })();

  /* ====================================================================
     Where diversification comes from
     ==================================================================== */
  Press.fig("fig-port", (root) => {
    const body = root.querySelector(".fig-body");
    const o = { s1: 20, s2: 30, rho: 0.2, w: 0.5 };
    body.innerHTML = `<div class="split"><div class="chart"><svg viewBox="0 0 460 280" role="img" aria-label="Portfolio volatility against the mix of two assets"></svg><div class="live-eq" data-eq></div><p class="fig-source" style="border:0;margin:.2rem 0 0">Grey curves show ρ = −1, −0.5, 0, 0.5 and 1. The bold curve is your ρ.</p></div><div class="controls" data-c></div></div><p class="say" data-say></p>`;
    const c = body.querySelector("[data-c]");
    const S = [range(c, { label: "Volatility of asset 1, σ₁", min: 5, max: 40, value: o.s1, fmt: (v) => v + "%", onInput: (v) => { o.s1 = v; draw(); } }),
      range(c, { label: "Volatility of asset 2, σ₂", min: 5, max: 40, value: o.s2, fmt: (v) => v + "%", onInput: (v) => { o.s2 = v; draw(); } }),
      range(c, { label: "How they move together, correlation ρ", min: -1, max: 1, step: 0.05, value: o.rho, fmt: (v) => v.toFixed(2), onInput: (v) => { o.rho = v; draw(); } }),
      range(c, { label: "Share in asset 1, w₁", min: 0, max: 1, step: 0.01, value: o.w, fmt: (v) => Math.round(v * 100) + "%", onInput: (v) => { o.w = v; draw(); } })];
    const sig = (w, rho) => Math.sqrt(Math.max(0, w * w * o.s1 * o.s1 + (1 - w) ** 2 * o.s2 * o.s2 + 2 * w * (1 - w) * rho * o.s1 * o.s2));
    function draw() {
      const s = body.querySelector("svg"); s.innerHTML = ""; const W = 460, H = 280, m = { l: 44, r: 14, t: 16, b: 34 };
      const X = (w) => m.l + w * (W - m.l - m.r), Y = (v) => H - m.b - (v / 42) * (H - m.t - m.b);
      [0, 10, 20, 30, 40].forEach((v) => { s.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: "s-hair", "stroke-dasharray": "2 4" })); s.appendChild(svg("text", { x: m.l - 6, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, text: v + "%" })); });
      [[0, "all asset 2"], [0.5, "half and half"], [1, "all asset 1"]].forEach(([w, t]) => s.appendChild(svg("text", { x: X(w), y: H - 14, "text-anchor": w === 0 ? "start" : w === 1 ? "end" : "middle", "font-size": 11, text: t })));
      [-1, -0.5, 0, 0.5, 1].forEach((r) => { let d = ""; for (let w = 0; w <= 1.0001; w += 0.01) d += (w ? "L" : "M") + X(w) + "," + Y(sig(w, r)); s.appendChild(svg("path", { d, class: "s-hair", "stroke-width": 1 })); });
      let d = ""; for (let w = 0; w <= 1.0001; w += 0.01) d += (w ? "L" : "M") + X(w) + "," + Y(sig(w, o.rho)); s.appendChild(svg("path", { d, class: "s-spot", "stroke-width": 3 }));
      const sp = sig(o.w, o.rho); s.appendChild(svg("circle", { cx: X(o.w), cy: Y(sp), r: 6, class: "f-ink" }));
      s.appendChild(svg("text", { x: X(o.w), y: Y(sp) - 12, "text-anchor": "middle", "font-size": 13, "font-weight": 800, class: "t-ink", text: "σₚ = " + sp.toFixed(1) + "%" }));
      const w1 = o.w, w2 = 1 - o.w, cov = o.rho * o.s1 * o.s2 / 10000;
      tex(body.querySelector("[data-eq]"), `\\begin{aligned} \\operatorname{Var}(R_p) &= ${w1.toFixed(2)}^2(${(o.s1 / 100).toFixed(2)})^2 + ${w2.toFixed(2)}^2(${(o.s2 / 100).toFixed(2)})^2 + 2(${w1.toFixed(2)})(${w2.toFixed(2)})(${cov.toFixed(4)}) \\\\ &= ${((sp / 100) ** 2).toFixed(4)}, \\qquad \\sigma_p = ${sp.toFixed(1)}\\% \\end{aligned}`, true);
      const lone = Math.min(o.s1, o.s2), best = Math.min(...Array.from({ length: 101 }, (_, k) => sig(k / 100, o.rho)));
      body.querySelector("[data-say]").innerHTML = best < lone - 0.05 ? `<b>The right mix is calmer than either asset alone:</b> as low as ${best.toFixed(1)}% against ${lone}% for the steadier asset by itself. That reduction exists only because the two do not move in lockstep (ρ = ${o.rho.toFixed(2)}).` : `<b>With ρ = ${o.rho.toFixed(2)}, mixing barely helps.</b> When assets move together, owning both is almost like owning one.`;
    }
    draw();
    root.addEventListener("fig:reset", () => { Object.assign(o, { s1: 20, s2: 30, rho: 0.2, w: 0.5 }); S[0].set(20, true); S[1].set(30, true); S[2].set(0.2, true); S[3].set(0.5, true); draw(); });
  });

  /* ====================================================================
     How losses and odds are felt (prospect theory)
     ==================================================================== */
  const vfn = (x, a, l) => (x >= 0 ? Math.pow(x, a) : -l * Math.pow(-x, a));
  const wfn = (p, g) => Math.pow(p, g) / Math.pow(Math.pow(p, g) + Math.pow(1 - p, g), 1 / g);
  window.RISK = { vfn, wfn };
  Press.fig("fig-pt", (root) => {
    const body = root.querySelector(".fig-body");
    const o = { a: 0.88, l: 2.25, g: 0.61 };
    body.innerHTML = `<div class="split"><div class="chart"><svg viewBox="0 0 300 260" data-v role="img" aria-label="Value function"></svg></div><div class="chart"><svg viewBox="0 0 300 260" data-w role="img" aria-label="Probability weighting function"></svg></div></div><div class="controls row" data-c></div><p class="say" data-say></p>`;
    const c = body.querySelector("[data-c]");
    const S = [range(c, { label: "Curvature, α = β", min: 0.3, max: 1, step: 0.01, value: o.a, fmt: (v) => v.toFixed(2), onInput: (v) => { o.a = v; draw(); } }),
      range(c, { label: "Loss aversion, λ", min: 1, max: 4, step: 0.05, value: o.l, fmt: (v) => v.toFixed(2), onInput: (v) => { o.l = v; draw(); } }),
      range(c, { label: "Probability distortion, γ", min: 0.3, max: 1, step: 0.01, value: o.g, fmt: (v) => v.toFixed(2), onInput: (v) => { o.g = v; draw(); } })];
    function draw() {
      const sv = body.querySelector("[data-v]"); sv.innerHTML = "";
      const X = (x) => 150 + (x / 100) * 135, vmax = vfn(100, o.a, 1) * 2.4, Y = (v) => 130 - (v / vmax) * 115;
      sv.appendChild(svg("line", { x1: 15, x2: 285, y1: 130, y2: 130, class: "s-ink" })); sv.appendChild(svg("line", { x1: 150, x2: 150, y1: 10, y2: 250, class: "s-ink" }));
      sv.appendChild(svg("text", { x: 285, y: 146, "text-anchor": "end", "font-size": 11, text: "gains" })); sv.appendChild(svg("text", { x: 15, y: 146, "font-size": 11, text: "losses" }));
      sv.appendChild(svg("text", { x: 156, y: 18, "font-size": 11, class: "t-grey", text: "felt value v(x)" }));
      let d = ""; for (let x = -100; x <= 100; x += 2) d += (x === -100 ? "M" : "L") + X(x) + "," + clamp(Y(vfn(x, o.a, o.l)), 2, 258); sv.appendChild(svg("path", { d, class: "s-spot", "stroke-width": 3 }));
      const g = vfn(100, o.a, o.l), b = vfn(-100, o.a, o.l);
      sv.appendChild(svg("circle", { cx: X(100), cy: Y(g), r: 4, class: "f-ink" })); sv.appendChild(svg("circle", { cx: X(-100), cy: clamp(Y(b), 4, 256), r: 4, class: "f-ink" }));
      const sw = body.querySelector("[data-w]"); sw.innerHTML = "";
      const PX = (p) => 30 + p * 255, PY = (w) => 235 - w * 220;
      sw.appendChild(svg("line", { x1: 30, x2: 285, y1: 235, y2: 235, class: "s-ink" })); sw.appendChild(svg("line", { x1: 30, x2: 30, y1: 15, y2: 235, class: "s-ink" }));
      sw.appendChild(svg("line", { x1: PX(0), y1: PY(0), x2: PX(1), y2: PY(1), class: "s-hair", "stroke-dasharray": "4 4" }));
      sw.appendChild(svg("text", { x: 285, y: 252, "text-anchor": "end", "font-size": 11, text: "real probability" })); sw.appendChild(svg("text", { x: 36, y: 22, "font-size": 11, class: "t-grey", text: "decision weight" }));
      let e = ""; for (let p = 0; p <= 1.0001; p += 0.01) e += (p ? "L" : "M") + PX(p) + "," + PY(wfn(Math.min(p, 1), o.g)); sw.appendChild(svg("path", { d: e, class: "s-spot", "stroke-width": 3 }));
      const w01 = wfn(0.01, o.g), w99 = wfn(0.99, o.g);
      body.querySelector("[data-say]").innerHTML = `<b>Losing 100 feels ${(Math.abs(b) / g).toFixed(2)} times as bad as winning 100 feels good.</b> A 1% chance is weighted like ${(w01 * 100).toFixed(1)}%, and a 99% chance like ${(w99 * 100).toFixed(1)}%: small odds loom large and near-certainties are discounted, which is why the same people buy lottery tickets and insurance.`;
    }
    draw();
    root.addEventListener("fig:reset", () => { Object.assign(o, { a: 0.88, l: 2.25, g: 0.61 }); S[0].set(0.88, true); S[1].set(2.25, true); S[2].set(0.61, true); draw(); });
  });
})();

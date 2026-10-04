/* Risk · framing, relative versus absolute risk, eight fields */
(function () {
  "use strict";
  const { el, svg, range, tabs, fmt } = FK;
  const R = window.RISK || { vfn: (x, a, l) => (x >= 0 ? Math.pow(x, a) : -l * Math.pow(-x, a)), wfn: (p, g) => Math.pow(p, g) / Math.pow(Math.pow(p, g) + Math.pow(1 - p, g), 1 / g) };

  /* ====================================================================
     Same options, different reference point
     ==================================================================== */
  Press.fig("fig-frame", (root) => {
    const body = root.querySelector(".fig-body");
    const A = 0.88, L = 2.25, G = 0.61, D = 0.69;
    const V = (outs) => outs.reduce((t, [p, x]) => t + (p === 1 ? 1 : R.wfn(p, x >= 0 ? G : D)) * R.vfn(x, A, L), 0);
    const EV = (outs) => outs.reduce((t, [p, x]) => t + p * x, 0);
    const CASES = {
      above: { lead: "The firm is comfortably above its target. Results are measured against that target.", a: ["Cautious launch", "A sure 40 above target.", [[1, 40]]], b: ["Risky launch", "Half the time 100 above target, half the time exactly on it.", [[0.5, 100], [0.5, 0]]] },
      below: { lead: "The firm is 60 below target, and results are due soon. The same launches now look like this.", a: ["Cautious launch", "A sure 20 below target: a certain miss.", [[1, -20]]], b: ["Risky launch", "Half the time 40 above target, half the time still 60 below.", [[0.5, 40], [0.5, -60]]] }
    };
    body.innerHTML = `<div data-t></div><p class="say" data-lead style="border-left-color:var(--hair-2)"></p><div class="frame-opts"></div><p class="say" data-say></p>`;
    function show(k) {
      const c = CASES[k], va = V(c.a[2]), vb = V(c.b[2]);
      body.querySelector("[data-lead]").textContent = c.lead;
      body.querySelector(".frame-opts").innerHTML = [[c.a, va], [c.b, vb]].map(([o, v]) => `<div class="fopt ${v === Math.max(va, vb) ? "pick" : ""}"><h4>${o[0]}</h4><p>${o[1]}</p><span class="v">Expected value ${EV(o[2]) >= 0 ? "+" : ""}${EV(o[2])} &middot; felt value ${v.toFixed(1)}</span><br><span class="tag">The manager picks this</span></div>`).join("");
      body.querySelector("[data-say]").innerHTML = k === "above" ? "<b>Above target, the manager plays safe</b>, even though the risky launch has the higher average (50 against 40). In the domain of gains, people are usually risk-averse." : "<b>Below target, the same manager gambles.</b> A sure miss of 20 feels worse than a coin flip between beating the target by 40 and missing it by 60, because losses loom larger than gains and the gamble offers a way out. In the domain of losses, people are usually risk-seeking.";
    }
    tabs(body.querySelector("[data-t]"), { label: "Where the firm stands", value: "above", options: [{ v: "above", t: "Above target" }, { v: "below", t: "Below target, results due" }], onChange: show });
    show("above");
  });

  /* ====================================================================
     "Doubles the risk" of what?
     ==================================================================== */
  Press.fig("fig-rel", (root) => {
    const body = root.querySelector(".fig-body");
    let base = 2, mult = 2;
    body.innerHTML = `<div class="split"><div class="people"><svg viewBox="0 0 400 252" role="img" aria-label="1,000 people, with baseline and extra cases"></svg><div class="legend"><span><i style="background:var(--ink)"></i>Would get it anyway</span><span><i style="background:var(--spot)"></i>Extra cases from the exposure</span></div></div><div><div class="controls" data-c></div><div class="stats" data-st></div><p class="say" data-say></p></div></div>`;
    const c = body.querySelector("[data-c]");
    range(c, { label: "Starting risk, per 1,000 people", min: 1, max: 100, value: base, fmt: (v) => v + " in 1,000", onInput: (v) => { base = v; draw(); } });
    range(c, { label: "The headline multiplier", min: 1, max: 5, step: 0.1, value: mult, fmt: (v) => v.toFixed(1) + "×", onInput: (v) => { mult = v; draw(); } });
    const s = body.querySelector("svg"), dots = [];
    for (let i = 0; i < 1000; i++) { const d = svg("circle", { cx: 6 + (i % 40) * 9.8, cy: 6 + Math.floor(i / 40) * 9.8, r: 3.6 }); s.appendChild(d); dots.push(d); }
    function draw() {
      const after = Math.min(1000, Math.round(base * mult)), extra = after - base;
      dots.forEach((d, i) => { d.style.fill = i < base ? "var(--ink)" : i < after ? "var(--spot)" : "var(--hair)"; });
      const word = mult === 2 ? "doubles" : mult === 3 ? "triples" : `multiplies by ${mult.toFixed(1)}`;
      body.querySelector("[data-st]").innerHTML = `<div><small>Relative risk</small><b class="spot">${mult.toFixed(1)}×</b></div><div><small>Absolute change</small><b>+${extra} in 1,000</b></div><div><small>Extra people affected</small><b>${(extra / 10).toFixed(1)}%</b></div>`;
      body.querySelector("[data-say]").innerHTML = `<b>“This exposure ${word} your risk.”</b> True, and it means going from ${base} in 1,000 to ${after} in 1,000: ${extra} extra people out of every thousand. ${base < 10 ? "From a small start, a scary headline can describe a small change." : "From a larger start, the same headline describes many more people."} Always ask: ${mult.toFixed(1)} times what?`;
    }
    draw();
  });

  /* ====================================================================
     How each field reads risk
     ==================================================================== */
  Press.fig("fig-fields", (root) => {
    const body = root.querySelector(".fig-body");
    const F = {
      edu: ["Education", "Risk builds up through accumulated conditions, not one dramatic event. Risk factors such as weak attachment to school, academic difficulty and family stress raise the chance of absence and dropping out, without deciding anyone's fate.", ["Attendance and risk-factor screening", "Support available: tutoring, internet, flexibility", "Same hazard, unequal vulnerability"], ["Risk factors", "Vulnerability", "Behavioural"]],
      health: ["Health", "Population statistics meet individual bodies. Risk is expressed as incidence, absolute and relative risk, attributable risk and survival, but patients hear “5%” through their own lives and fears.", ["Incidence, absolute and relative risk", "Test results and base rates", "Framing of benefits and harms"], ["Bayesian", "Probability", "Behavioural"]],
      travel: ["Travel", "Destination, itinerary, season, infrastructure and the traveller all shape risk. Vivid fears like crashes crowd out the everyday threats: road injuries, dehydration, lost medicine, missed connections.", ["Destination and activity risk", "Backup options and medical access", "Everyday threats over vivid ones"], ["Probability", "Behavioural", "Domain"]],
      fin: ["Finance", "The richest maths, and the meaning depends on who asks: volatility for a trader, solvency for a pension fund, contagion for a regulator, permanent loss for a household.", ["Variance, value at risk, drawdown", "Correlation and stress tests", "Liquidity and default"], ["Probability", "Expected utility", "Behavioural"]],
      eng: ["Engineering", "Which parts can fail, in what sequence, how likely, with what consequence. Design itself reduces risk through redundancy, safety margins and fail-safes.", ["Failure scenarios and fault trees", "Reliability and redundancy", "Consequence chains"], ["Scenario, likelihood, consequence", "Probability", "Domain"]],
      cyber: ["Cybersecurity", "Technical and strategic at once: attackers adapt. A flaw is the hazard, internet exposure the exposure, slow patching the vulnerability; detection and recovery decide the outcome.", ["Threat, vulnerability, exposure, impact", "Detection and response time", "Recovery and backups"], ["Bayesian", "Organisational", "Domain"]],
      biz: ["Business", "Strategic, operational, legal, financial, reputational and supply-chain risk, often without stable probabilities. Firms create value by taking chosen risks.", ["Scenarios and sensitivity analysis", "Appetite statements", "Internal controls"], ["Organisational", "Expected utility", "Knightian uncertainty"]],
      pol: ["Public policy", "Where analysis meets ethics. Average risk can fall while the vulnerable carry more of what remains, so policy must weigh numbers, institutions and justice together.", ["Distribution of burdens", "Benefit and cost, with fairness", "Legitimacy and trust"], ["Organisational", "Behavioural", "Vulnerability"]]
    };
    body.innerHTML = `<div data-t></div><div class="field-card" aria-live="polite"></div>`;
    const card = body.querySelector(".field-card");
    function show(k) { const f = F[k]; card.innerHTML = `<div><h4>${f[0]}</h4><p>${f[1]}</p></div><div><ul>${f[2].map((x) => `<li>${x}</li>`).join("")}</ul><div class="fit">${f[3].map((x) => `<span>${x}</span>`).join("")}</div></div>`; card.style.animation = "none"; void card.offsetWidth; card.style.animation = ""; }
    tabs(body.querySelector("[data-t]"), { value: "edu", options: Object.entries(F).map(([v, f]) => ({ v, t: f[0] })), onChange: show });
    show("edu");
  });
})();

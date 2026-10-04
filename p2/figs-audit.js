/* The Glass Ballot Box · BRAVO audit, sample-size sentence, timeline, dispute */
(function () {
  "use strict";
  const { el, svg, button, range, toggle, tabs, fmt, clamp, wait } = FK;
  const asn = (window.GB && window.GB.asn) || ((m, a) => { const s = 0.5 + m / 200; return Math.log(1 / a) / (s * Math.log(2 * s) + (1 - s) * Math.log(2 * (1 - s))); });

  /* ====================================================================
     Audit an election (BRAVO ballot-polling RLA)
     ==================================================================== */
  Press.fig("fig-rla", (root) => {
    const body = root.querySelector(".fig-body");
    let margin = 10, alpha = 0.05, wrong = false, n = 0, w = 0, l = 0, T = 1, path = [], done = null;
    body.innerHTML = `<div class="split"><div class="rla-chart"><svg viewBox="0 0 560 280" role="img" aria-label="Audit evidence as ballots are drawn"></svg><div class="rla-draws" aria-hidden="true"></div></div>
      <div><div class="controls" data-c></div><div class="btnrow" style="margin-top:.9rem" data-b></div><div class="stats" data-st></div></div></div><p class="say" data-say>Draw ballots and watch the evidence climb towards the line.</p>`;
    const c = body.querySelector("[data-c]");
    range(c, { label: "Reported margin", min: 1, max: 30, step: 1, value: 10, fmt: (v) => v + " points", onInput: (v) => { margin = v; reset(); } });
    range(c, { label: "Risk limit", min: 1, max: 20, step: 1, value: 5, fmt: (v) => v + "%", onInput: (v) => { alpha = v / 100; reset(); } });
    toggle(c, { label: "Make the reported result wrong", value: false, onChange: (v) => { wrong = v; reset(); } });
    const b = body.querySelector("[data-b]");
    button(b, "Draw 1", () => draw(1));
    button(b, "Draw 50", () => draw(50));
    const runB = button(b, "Run the audit", async () => { runB.disabled = true; while (!done) { draw(5); await wait(18); } runB.disabled = false; }, "solid");
    const sRep = () => 0.5 + margin / 200;
    const cap = () => Math.max(400, Math.round(asn(margin, alpha) * 6));
    function draw(k) {
      for (let i = 0; i < k && !done; i++) {
        const trueW = wrong ? 1 - sRep() : sRep();
        const isW = Math.random() < trueW; n++;
        if (isW) { w++; T *= sRep() / 0.5; } else { l++; T *= (1 - sRep()) / 0.5; }
        path.push(T);
        const d = el("i", { class: isW ? "" : "l" }); const strip = body.querySelector(".rla-draws"); strip.appendChild(d); while (strip.children.length > 240) strip.firstChild.remove();
        if (T >= 1 / alpha) done = "confirmed"; else if (n >= cap()) done = "handcount";
      }
      paint();
    }
    function paint() {
      const s = body.querySelector("svg"); s.innerHTML = "";
      const W = 560, H = 280, m = { l: 48, r: 12, t: 16, b: 32 }, maxN = Math.max(60, Math.ceil(n * 1.1)), lo = -2.3, hi = Math.max(Math.log10(1 / alpha) + 0.5, 2);
      const X = (i) => m.l + (i / maxN) * (W - m.l - m.r), Y = (v) => H - m.b - ((clamp(v, lo, hi) - lo) / (hi - lo)) * (H - m.t - m.b);
      [-2, 0, 1, 2].filter((v) => v <= hi).forEach((v) => { s.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: "s-hair", "stroke-dasharray": "2 4" })); s.appendChild(svg("text", { x: m.l - 6, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, text: { "-2": "1/100", "0": "1", "1": "10", "2": "100" }[String(v)] })); });
      const th = Math.log10(1 / alpha);
      s.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: Y(th), y2: Y(th), class: "s-spot", "stroke-width": 2 }));
      s.appendChild(svg("text", { x: W - m.r, y: Y(th) - 6, "text-anchor": "end", "font-size": 12, "font-weight": 700, class: "t-spot", text: `confirm at T ≥ ${fmt.int(1 / alpha)}` }));
      s.appendChild(svg("text", { x: W - m.r, y: H - 8, "text-anchor": "end", "font-size": 11, class: "t-grey", text: "ballots drawn" }));
      s.appendChild(svg("text", { x: m.l, y: 11, "font-size": 11, class: "t-grey", text: "evidence T (log scale)" }));
      if (path.length) { let d = `M${X(0)},${Y(0)}`; path.forEach((v, i) => (d += `L${X(i + 1)},${Y(Math.log10(v))}`)); s.appendChild(svg("path", { d, class: "s-ink", "stroke-width": 2.2 })); s.appendChild(svg("circle", { cx: X(n), cy: Y(Math.log10(T)), r: 5, class: done === "confirmed" ? "f-spot" : "f-ink" })); }
      body.querySelector("[data-st]").innerHTML = `<div><small>Ballots checked</small><b>${fmt.int(n)}</b></div><div><small>Winner : loser</small><b>${w} : ${l}</b></div><div><small>Evidence T</small><b class="spot">${T < 1000 ? T.toFixed(2) : fmt.compact(T)}</b></div><div><small>Expected if right</small><b>${fmt.int(Math.round(asn(margin, alpha)))}</b></div>`;
      const say = body.querySelector("[data-say]");
      if (done === "confirmed") say.innerHTML = `<b>Outcome confirmed after ${fmt.int(n)} ballots.</b> If the reported winner had really lost, an audit like this would have confirmed the wrong result at most ${Math.round(alpha * 100)}% of the time.${wrong ? " This time the risk limit was the unlucky few per cent." : ""}`;
      else if (done === "handcount") say.innerHTML = wrong ? `<b>The evidence never arrived, so the audit escalates to a full hand count</b>, which finds the true winner. That is the point: a wrong result cannot pass quietly.` : `<b>Escalated to a full hand count</b> after ${fmt.int(n)} ballots. With a tight margin, chance alone sometimes drags an audit out.`;
      else if (n) say.textContent = wrong ? "The reported loser actually won. Watch the evidence sink instead of rising." : "Each ballot for the reported winner multiplies the evidence up; each for the loser pulls it down.";
    }
    function reset() { n = w = l = 0; T = 1; path = []; done = null; body.querySelector(".rla-draws").innerHTML = ""; paint(); body.querySelector("[data-say]").textContent = "Draw ballots and watch the evidence climb towards the line."; }
    reset();
    root.addEventListener("fig:reset", reset);
  });

  /* ---------- Expected sample size sentence ---------- */
  (function asnSentence() {
    const p = document.getElementById("rx-asn"); if (!p) return;
    Press.reactive(p, { m: 10, a: 5 }, (x) => { const v = asn(x.m, x.a / 100); return { asn: fmt.int(v < 1000 ? Math.round(v) : Math.round(v / 100) * 100) }; });
  })();

  /* ====================================================================
     From the secret ballot to public proof (timeline)
     ==================================================================== */
  Press.fig("fig-timeline", (root) => {
    const body = root.querySelector(".fig-body");
    const EV = [
      [1856, "The secret ballot", "Victoria, in Australia, introduces the government-printed secret ballot, soon copied worldwide as the “Australian ballot”."],
      [1888, "Secrecy reaches the United States", "Louisville and the state of Massachusetts adopt the Australian ballot."],
      [1892, "Lever machines", "Mechanical lever voting machines are first used, in Lockport, New York."],
      [1964, "Punched cards", "Punch-card ballots arrive, and with them, decades later, the “hanging chads” of Florida."],
      [1981, "Mix networks", "David Chaum publishes the mix network, the root of many verifiable voting designs."],
      [1982, "India's first EVM", "Electronic voting machines are first used in a by-election in Paravur, Kerala."],
      [2000, "Florida", "A presidential election hangs on a few hundred votes and unreadable punch cards."],
      [2002, "Help America Vote Act", "The United States funds a move to new voting equipment."],
      [2004, "EVMs everywhere in India", "Every constituency in India's general election votes on electronic machines."],
      [2005, "Online votes in Estonia", "Estonia offers internet voting in a nationwide election for the first time."],
      [2006, "Software independence, and the challenge", "Rivest and Wack define software independence; Benaloh proposes the cast-or-challenge check."],
      [2008, "Helios", "Ben Adida releases Helios, web-based open-audit voting."],
      [2009, "Takoma Park", "Scantegrity II: the first binding government election with an end-to-end verifiable system and ballot privacy."],
      [2012, "BRAVO and evidence-based elections", "Lindeman, Stark and Yates publish BRAVO; Stark and Wagner argue for evidence-based elections."],
      [2013, "Paper trails in India", "Voter-verifiable paper audit trails are first used, in the Noksen by-election in Nagaland."],
      [2017, "Colorado's audits", "The first statewide risk-limiting audits in the United States."],
      [2018, "Paper and audits recommended", "The US National Academies recommend paper ballots and risk-limiting audits. MIT researchers later find serious flaws in Voatz, a blockchain voting app used in West Virginia that year."],
      [2019, "VVPAT in every constituency", "India's general election uses paper audit trails everywhere, with five machines per assembly segment checked against their slips."],
      [2022, "ElectionGuard in Preston, Idaho", "Voters can choose to vote with ElectionGuard in a general election."],
      [2023, "Half of Estonia votes online", "51% of votes in the parliamentary election are cast over the internet."],
      [2024, "India's Supreme Court on VVPATs", "The court declines to order a count of every paper slip, and adds checks on symbol-loading units and machine memory."]
    ];
    const Y0 = 1850, Y1 = 2028, W = 760, X = (y) => 24 + ((y - Y0) / (Y1 - Y0)) * (W - 48);
    body.innerHTML = `<div class="tl"><svg viewBox="0 0 ${W} 96" role="img" aria-label="Timeline of voting technology, 1856 to 2024"></svg><div class="controls row" data-c></div><div class="tl-card" aria-live="polite"></div></div>`;
    const s = body.querySelector("svg");
    s.appendChild(svg("line", { x1: 24, y1: 48, x2: W - 24, y2: 48, class: "s-hair", "stroke-width": 2 }));
    const fill = svg("line", { x1: 24, y1: 48, x2: 24, y2: 48, class: "s-spot", "stroke-width": 3 }); s.appendChild(fill);
    for (let y = 1860; y <= 2020; y += 40) { s.appendChild(svg("line", { x1: X(y), y1: 43, x2: X(y), y2: 53, class: "s-ink" })); s.appendChild(svg("text", { x: X(y), y: 80, "text-anchor": "middle", "font-size": 13, "font-weight": 600, text: String(y) })); }
    const dots = EV.map((e, i) => { const g = svg("g", { class: "ev" }); g.appendChild(svg("circle", { cx: X(e[0]), cy: 48, r: 6 })); g.addEventListener("click", () => go(i)); s.appendChild(g); return g; });
    const mark = svg("text", { x: 24, y: 24, "text-anchor": "middle", "font-size": 14, "font-weight": 800, class: "t-spot" }); s.appendChild(mark);
    const card = body.querySelector(".tl-card"), c = body.querySelector("[data-c]");
    let cur = -1;
    const sl = range(c, { label: "Event", min: 0, max: EV.length - 1, value: 0, fmt: (v) => String(EV[v][0]), onInput: (v) => go(v, true) });
    const nav = el("div", { class: "btnrow" }); c.appendChild(nav);
    button(nav, "Previous", () => go(Math.max(0, cur - 1)));
    button(nav, "Next", () => go(Math.min(EV.length - 1, cur + 1)));
    const play = button(nav, "Play", async () => { play.disabled = true; for (let i = 0; i < EV.length; i++) { go(i); await wait(950); } play.disabled = false; }, "solid");
    function go(i, fromSlider) {
      if (i === cur) return; cur = i; if (!fromSlider) sl.set(i, true);
      const y = EV[i][0]; fill.setAttribute("x2", X(y)); mark.setAttribute("x", X(y)); mark.textContent = String(y);
      dots.forEach((d, j) => { d.classList.toggle("past", j <= i); d.classList.toggle("on", j === i); });
      card.innerHTML = `<div class="yr">${y}</div><div><h4>${EV[i][1]}</h4><p>${EV[i][2]}</p></div>`; card.classList.remove("swap"); void card.offsetWidth; card.classList.add("swap");
    }
    go(0);
  });

  /* ====================================================================
     The night the result is challenged
     ==================================================================== */
  Press.fig("fig-dispute", (root) => {
    const body = root.querySelector(".fig-body");
    const CLAIMS = ["The machines flipped votes.", "Ballots were added after the polls closed.", "The counting software was rigged."];
    const A = {
      black: [["The machines were tested before the election. You will have to take our word for it.", 0], ["Our records show no additions. The records are internal.", 0], ["The software is certified, but its code is a trade secret.", 0]],
      paper: [["We hand-checked a random sample of paper ballots in a risk-limiting audit. They match the machine count.", 1], ["Ballot totals match the signed poll books at every station. Gaps would show.", 0.5], ["The paper sample independently confirms the software's totals.", 1]],
      glass: [["Voters' challenges and receipt checks found no flips, and the paper audit agrees.", 1], ["The public ledger closed with a published snapshot hash. No ballot was added after it, and anyone can check.", 1], ["Anyone can recompute the tally from the published sealed ballots. Thousands of people already have.", 1]]
    };
    let sys = "black", answered = new Set();
    body.innerHTML = `<div class="dispute"><div data-t></div><div class="claims"></div><p class="verdict-line" aria-live="polite"></p></div>`;
    tabs(body.querySelector("[data-t]"), { label: "Your election system", value: sys, options: [{ v: "black", t: "Black box" }, { v: "paper", t: "Paper with audits" }, { v: "glass", t: "Glass ballot box" }], onChange: (v) => { sys = v; reset(); } });
    const wrap = body.querySelector(".claims");
    function reset() {
      answered.clear(); wrap.innerHTML = ""; body.querySelector(".verdict-line").textContent = "";
      CLAIMS.forEach((q, i) => {
        const c = el("div", { class: "claim", html: `<q>${q}</q><div class="ans"></div><div class="btnrow"></div>` });
        button(c.querySelector(".btnrow"), "Respond", () => { const [t, k] = A[sys][i]; c.querySelector(".ans").textContent = t; c.classList.add(k >= 1 ? "s" : k > 0 ? "m" : "w"); c.querySelector(".btnrow").remove(); answered.add(i); if (answered.size === 3) verdict(); }, "solid");
        wrap.appendChild(c);
      });
    }
    function verdict() {
      const v = { black: "Unresolved. The public is left to decide whom to believe, and the dispute lingers for years.", paper: "Largely resolved. The audit answers most claims with physical evidence.", glass: "Resolved, with evidence anyone can check for themselves." }[sys];
      body.querySelector(".verdict-line").textContent = v;
    }
    reset();
    root.addEventListener("fig:reset", reset);
  });
})();

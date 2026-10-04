/* Data for Sale · consent phones, policy maths, tomorrow's paper, law timeline, contract */
(function () {
  "use strict";
  const { el, svg, button, range, tabs, fmt, clamp, lerp, tween, wait, iphone } = FK;

  /* ====================================================================
     Say no, if you can (two phones)
     ==================================================================== */
  Press.fig("fig-consent", (root) => {
    const body = root.querySelector(".fig-body");
    const PURPOSES = ["Store and access information on your device", "Personalised ads and ad measurement", "Personalised content and profiling", "Precise location", "Share with 847 partners"];
    body.innerHTML = `<div class="phone-tabs" data-pt></div><div class="phones"><div class="show" data-p="a"><div data-phone></div><span class="cap-l">Built the usual way</span></div><div data-p="b"><div data-phone></div><span class="cap-l">Fair by design</span></div></div><div class="stats" data-st></div><p class="say" data-say>Refuse all tracking on both phones.</p>`;
    tabs(body.querySelector("[data-pt]"), { value: "a", options: [{ v: "a", t: "Phone A" }, { v: "b", t: "Phone B" }], onChange: (v) => body.querySelectorAll("[data-p]").forEach((d) => d.classList.toggle("show", d.dataset.p === v)) });
    const P = {};
    ["a", "b"].forEach((k) => {
      const ph = iphone(body.querySelector(`[data-p="${k}"] [data-phone]`), { finish: k === "a" ? "silver" : "orange", width: "15.5rem", label: k === "a" ? "Phone A" : "Phone B" });
      ph.content.innerHTML = `<div class="site"><div class="mast">The Daily Ledger</div><span class="hd"></span>${[92, 80, 96, 70, 88, 60, 84].map((w) => `<span class="ln" style="width:${w}%"></span>`).join("")}</div><div data-sheet></div>`;
      ph.screen.insertAdjacentHTML("beforeend", `<span class="taps"></span>`);
      P[k] = { ph, taps: 0, t0: 0, res: null, sheet: ph.content.querySelector("[data-sheet]"), tapEl: ph.screen.querySelector(".taps") };
    });
    function tap(k) {
      const p = P[k]; if (!p.t0) p.t0 = performance.now(); p.taps++;
      p.ph.island.classList.add("wide"); p.tapEl.textContent = p.taps + (p.taps === 1 ? " tap" : " taps"); p.tapEl.classList.add("on");
      clearTimeout(p.tm); p.tm = setTimeout(() => { p.tapEl.classList.remove("on"); p.ph.island.classList.remove("wide"); }, 1300);
    }
    function finish(k, res) {
      const p = P[k]; p.res = res; p.secs = (performance.now() - p.t0) / 1000;
      p.sheet.innerHTML = `<div class="cs-done"><div><b>${p.taps}</b>${res === "reject" ? "taps to say no" : "taps, and you said <strong>yes</strong>"}<br><span style="color:#8a8a8e">${p.secs.toFixed(1)} seconds</span><br><button type="button" data-again>Try again</button></div></div>`;
      p.sheet.querySelector("[data-again]").onclick = () => (k === "a" ? darkStart() : fairStart());
      summary();
    }
    function reset(k) { Object.assign(P[k], { taps: 0, t0: 0, res: null }); }
    function darkStart() {
      reset("a");
      P.a.sheet.innerHTML = `<div class="cs"><div class="grab"></div><h5>We value your privacy</h5>We and our 847 partners use cookies and similar technologies to personalise content and ads and to analyse our traffic.<button class="acc" type="button" data-acc>Accept all</button><button class="lnk" type="button" data-more>Manage options</button></div>`;
      P.a.sheet.querySelector("[data-acc]").onclick = () => { tap("a"); finish("a", "accept"); };
      P.a.sheet.querySelector("[data-more]").onclick = () => { tap("a"); layer2(); };
    }
    function layer2() {
      const on = PURPOSES.map(() => true);
      P.a.sheet.innerHTML = `<div class="cs"><div class="grab"></div><h5>Your choices</h5><span style="color:#8a8a8e;font-size:3cqw">Legitimate interest applies: partners may process data without consent.</span>${PURPOSES.map((x, i) => `<div class="row"><span>${x}</span><button class="sw" type="button" role="switch" aria-checked="true" aria-label="${x}" data-i="${i}"></button></div>`).join("")}<button class="acc" type="button" data-acc>Accept all</button><button class="lnk" type="button" data-save>Confirm my choices</button><div class="warn" data-w></div></div>`;
      P.a.sheet.querySelectorAll(".sw").forEach((b) => (b.onclick = () => { tap("a"); const i = +b.dataset.i; on[i] = !on[i]; b.setAttribute("aria-checked", String(on[i])); }));
      P.a.sheet.querySelector("[data-acc]").onclick = () => { tap("a"); finish("a", "accept"); };
      P.a.sheet.querySelector("[data-save]").onclick = () => { tap("a"); if (on.some(Boolean)) { P.a.sheet.querySelector("[data-w]").textContent = "Some purposes are still on. Everything starts switched on here."; return; } layer3(); };
    }
    function layer3() {
      P.a.sheet.innerHTML = `<div class="cs"><div class="grab"></div><h5>Are you sure?</h5>Without cookies you'll see less relevant ads, and some features may not work properly.<button class="acc" type="button" data-acc>Go back and accept</button><button class="lnk" type="button" data-yes>Yes, I'm sure</button></div>`;
      P.a.sheet.querySelector("[data-acc]").onclick = () => { tap("a"); finish("a", "accept"); };
      P.a.sheet.querySelector("[data-yes]").onclick = () => { tap("a"); finish("a", "reject"); };
    }
    function fairStart() {
      reset("b");
      P.b.sheet.innerHTML = `<div class="cs"><div class="grab"></div><h5>Can we use cookies?</h5>We'd like to measure visits and show ads. You can say no and the site works the same.<div class="pair"><button type="button" data-acc>Accept all</button><button type="button" data-rej>Reject all</button></div><button class="lnk" type="button" data-cus style="color:#555">Choose by purpose</button></div>`;
      P.b.sheet.querySelector("[data-acc]").onclick = () => { tap("b"); finish("b", "accept"); };
      P.b.sheet.querySelector("[data-rej]").onclick = () => { tap("b"); finish("b", "reject"); };
      P.b.sheet.querySelector("[data-cus]").onclick = () => { tap("b"); body.querySelector("[data-say]").textContent = "On a fair banner every purpose starts switched off, and Reject all does the same job in one tap."; };
    }
    function summary() {
      const a = P.a, b = P.b, st = (p) => (p.res ? (p.res === "reject" ? "said no" : "said yes") : "not finished");
      body.querySelector("[data-st]").innerHTML = `<div><small>Phone A, taps</small><b class="spot">${a.res ? a.taps : "–"}</b><span class="sub">${st(a)}</span></div><div><small>Phone B, taps</small><b>${b.res ? b.taps : "–"}</b><span class="sub">${st(b)}</span></div><div><small>UK pop-ups meeting EU minimums, 2019</small><b>11.8%</b></div>`;
      const s = body.querySelector("[data-say]");
      if (a.res === "reject" && b.res === "reject") s.innerHTML = `<b>The same answer took ${a.taps} taps on one phone and ${b.taps} on the other.</b> European law expects refusing to be as easy as accepting. Design decides whether it is.`;
      else if (a.res === "accept") s.innerHTML = "<b>That is the result Phone A was built for:</b> a bright button for yes, a faint link for no, every switch on by default, and a guilt trip at the end.";
    }
    darkStart(); fairStart(); summary();
    root.addEventListener("fig:reset", () => { darkStart(); fairStart(); summary(); body.querySelector("[data-say]").textContent = "Refuse all tracking on both phones."; });
  });

  /* ---------- Reading every privacy policy ---------- */
  (function policies() {
    const p = document.getElementById("rx-policies"); if (!p) return;
    Press.reactive(p, { sites: 200, words: 2500, wpm: 250 }, (m) => {
      const hours = (m.sites * m.words) / m.wpm / 60;
      return { hours: hours < 10 ? hours.toFixed(1) + " hours" : fmt.int(hours) + " hours", days: (hours / 8).toFixed(1) + " working days", wp: ((m.sites * m.words) / 587287).toFixed(1) };
    });
  })();

  /* ====================================================================
     Tomorrow's front page
     ==================================================================== */
  Press.fig("fig-tomorrow", (root) => {
    const body = root.querySelector(".fig-body");
    const L = [["Transparency by design", 30], ["Regulation and enforcement", 20], ["Ethical design", 40], ["Culture and digital literacy", 25]];
    const v = L.map((x) => x[1]);
    body.innerHTML = `<div class="tmrw"><div class="controls" data-c></div><div class="mini"><div class="mf">The Morning Ledger</div><div class="md"><span data-d></span><span>Price: one click</span></div><h4 data-h></h4><p data-s></p><div class="idx"><span>Trust index</span><span class="sc"><i></i></span><span data-i></span></div></div></div>`;
    const sl = L.map(([t], i) => range(body.querySelector("[data-c]"), { label: t, min: 0, max: 100, value: v[i], fmt: (x) => x + "%", onInput: (x) => { v[i] = x; draw(); } }));
    body.querySelector("[data-d]").textContent = "Tomorrow";
    const HEADS = [
      ["Data Barons Tighten Their Grip as Users Shrug", "With {w} barely touched, the invisible trade carries on out of sight."],
      ["Patchwork Rules, Persistent Leaks", "Some progress, but weak {w} keeps the old business model alive."],
      ["Users Gain Ground as Platforms Open Their Books", "A real shift, though {w} is still the weak spot critics are watching."],
      ["The Invisible Trade Ends: Data Now Means Rights, Not Profits", "Transparency, law, design and culture finally pull the same way."]
    ];
    let band = -1, typing = 0;
    async function typeset(node, text) {
      const id = ++typing;
      if (Press.isCalm()) { node.textContent = text; return; }
      node.textContent = "";
      for (let i = 1; i <= text.length; i++) { if (id !== typing) return; node.textContent = text.slice(0, i); await new Promise((r) => setTimeout(r, 16)); }
    }
    function draw() {
      const score = Math.exp(v.reduce((a, x) => a + Math.log(Math.max(x, 1) / 100), 0) / v.length) * 100;
      const weak = L[v.indexOf(Math.min(...v))][0].toLowerCase();
      const b = score < 25 ? 0 : score < 50 ? 1 : score < 75 ? 2 : 3;
      body.querySelector("[data-s]").textContent = HEADS[b][1].replace("{w}", weak);
      body.querySelector(".sc i").style.setProperty("--x", score + "%");
      body.querySelector("[data-i]").textContent = Math.round(score) + " / 100";
      if (b !== band) { band = b; typeset(body.querySelector("[data-h]"), HEADS[b][0]); }
    }
    draw();
    root.addEventListener("fig:reset", () => { L.forEach((x, i) => { v[i] = x[1]; sl[i].set(x[1], true); }); band = -1; draw(); });
  });

  /* ====================================================================
     Fifty-five years of catching up
     ==================================================================== */
  Press.fig("fig-laws", (root) => {
    const body = root.querySelector(".fig-body");
    const EV = [
      [1970, "The first data protection law", "The German state of Hesse passes a data protection act in response to government computerisation."],
      [1973, "Sweden's Data Act", "The first national data protection law anywhere."],
      [1974, "The US Privacy Act", "Rules for how US federal agencies handle records about individuals. Private companies are not covered."],
      [1980, "OECD Privacy Guidelines", "Eight principles, including purpose limitation and individual participation, that shape laws for decades."],
      [1981, "Convention 108", "The Council of Europe adopts the first legally binding international treaty on data protection."],
      [1995, "The EU Data Protection Directive", "Directive 95/46/EC brings common rules to the European Union."],
      [2011, "India's SPDI Rules", "Rules under the Information Technology Act set India's first duties for handling sensitive personal data."],
      [2013, "The Snowden revelations", "Documents on mass surveillance change what the public expects of privacy."],
      [2014, "The FTC's data broker study", "A US regulator documents brokers holding thousands of data points per consumer."],
      [2017, "Privacy becomes a fundamental right in India", "Nine judges of the Supreme Court of India rule in Justice K. S. Puttaswamy v. Union of India that the Constitution protects privacy."],
      [2018, "The GDPR applies", "Europe's regulation takes effect on 25 May, weeks after the Cambridge Analytica scandal breaks. California passes its Consumer Privacy Act in June."],
      [2019, "A $5 billion penalty", "The FTC fines Facebook and imposes new privacy controls."],
      [2020, "California and Brazil in force", "California's consumer privacy law takes effect, followed by Brazil's general data protection law."],
      [2021, "China's PIPL", "China's Personal Information Protection Law comes into force on 1 November."],
      [2022, "Auctions and brokers in the dock", "The ICCL counts 178 trillion bid-request broadcasts a year, and the FTC sues the location broker Kochava."],
      [2023, "India's DPDP Act and a record fine", "India passes the Digital Personal Data Protection Act. Ireland fines Meta €1.2 billion over data transfers."],
      [2024, "A first ban on selling sensitive location data", "The FTC's order against X-Mode Social. UNCTAD counts data protection laws in 71% of countries."],
      [2025, "India's draft rules", "In January the government publishes draft rules to put the 2023 Act into practice."]
    ];
    const Y0 = 1968, Y1 = 2027, W = 760, X = (y) => 24 + ((y - Y0) / (Y1 - Y0)) * (W - 48);
    body.innerHTML = `<div class="tl"><svg viewBox="0 0 ${W} 96" role="img" aria-label="Timeline of data protection laws, 1970 to 2025"></svg><div class="controls row" data-c></div><div class="tl-card" aria-live="polite"></div></div>`;
    const s = body.querySelector("svg");
    s.appendChild(svg("line", { x1: 24, y1: 48, x2: W - 24, y2: 48, class: "s-hair", "stroke-width": 2 }));
    const fill = svg("line", { x1: 24, y1: 48, x2: 24, y2: 48, class: "s-spot", "stroke-width": 3 }); s.appendChild(fill);
    for (let y = 1970; y <= 2020; y += 10) { s.appendChild(svg("line", { x1: X(y), y1: 43, x2: X(y), y2: 53, class: "s-ink" })); s.appendChild(svg("text", { x: X(y), y: 80, "text-anchor": "middle", "font-size": 13, "font-weight": 600, text: String(y) })); }
    const dots = EV.map((e) => { const g = svg("g", { class: "ev" }); g.appendChild(svg("circle", { cx: X(e[0]), cy: 48, r: 6.5 })); g.addEventListener("click", () => go(EV.indexOf(e))); s.appendChild(g); return g; });
    const mark = svg("text", { x: 24, y: 24, "text-anchor": "middle", "font-size": 14, "font-weight": 800, class: "t-spot" }); s.appendChild(mark);
    const card = body.querySelector(".tl-card");
    let cur = 0;
    const c = body.querySelector("[data-c]");
    const sl = range(c, { label: "Year", min: 1970, max: 2025, value: 1970, fmt: (v) => String(v), onInput: (v) => { let i = 0; EV.forEach((e, j) => { if (e[0] <= v) i = j; }); go(i, v); } });
    const nav = el("div", { class: "btnrow" }); c.appendChild(nav);
    button(nav, "Previous", () => go(Math.max(0, cur - 1)));
    button(nav, "Next", () => go(Math.min(EV.length - 1, cur + 1)));
    const play = button(nav, "Play", async () => { play.disabled = true; for (let i = 0; i < EV.length; i++) { go(i); await wait(900); } play.disabled = false; }, "solid");
    function go(i, year) {
      const changed = i !== cur; cur = i; const y = year || EV[i][0];
      if (!year) sl.set(EV[i][0], true);
      fill.setAttribute("x2", X(y)); mark.setAttribute("x", X(y)); mark.textContent = String(y);
      dots.forEach((d, j) => { d.classList.toggle("past", EV[j][0] <= y); d.classList.toggle("on", j === i); });
      card.innerHTML = `<div class="yr">${EV[i][0]}</div><div><h4>${EV[i][1]}</h4><p>${EV[i][2]}</p></div>`;
      if (changed) { card.classList.remove("swap"); void card.offsetWidth; card.classList.add("swap"); }
    }
    go(0);
  });

  /* ====================================================================
     Draft the contract (with a signature pad)
     ==================================================================== */
  Press.fig("fig-contract", (root) => {
    const body = root.querySelector(".fig-body");
    const C = ["My data is an extension of me, not a crop to be harvested.", "Ownership and control are the default. Sharing needs informed consent I can withdraw.", "I have the right to know who holds my data, why and for how long.", "Decisions made about me by algorithms must be explained and open to challenge.", "Products must not be designed to exploit weaknesses in human psychology.", "Saying no to tracking must be as easy as saying yes.", "When my data crosses a border, my rights go with it.", "Surveillance is never the price of convenience."];
    const picked = new Set();
    const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    body.innerHTML = `<div class="contract"><div><ul class="clauses"></ul><div class="btnrow" style="margin-top:.8rem" data-b></div></div>
      <div class="deed"><h4>A New Digital Social Contract</h4><p class="sub">Between people, platforms and the states that govern them</p><div data-body></div>
      <div class="pad"><canvas aria-label="Signature pad. Draw your signature."></canvas><span class="ph">Sign here</span><div class="lbl"><span>Signature</span><span>${date}</span></div></div><div class="seal">Signed<br>and<br>sealed</div></div></div>`;
    const ul = body.querySelector(".clauses");
    C.forEach((t, i) => { const li = el("li"); const b = el("button", { type: "button", class: "clause", "aria-pressed": "false", html: `<span class="bx" aria-hidden="true"></span><span>${t}</span>` }); b.addEventListener("click", () => { picked.has(i) ? picked.delete(i) : picked.add(i); b.setAttribute("aria-pressed", String(picked.has(i))); text(); }); li.appendChild(b); ul.appendChild(li); });
    function text() { const l = [...picked].sort((a, b) => a - b); body.querySelector("[data-body]").innerHTML = l.length ? `<ol>${l.map((i) => `<li>${C[i]}</li>`).join("")}</ol>` : `<p class="empty">Choose clauses on the left.</p>`; }
    // signature pad
    const cv = body.querySelector(".pad canvas"), ctx = cv.getContext("2d"), ph = body.querySelector(".pad .ph"), seal = body.querySelector(".seal");
    let drawing = false, last = null, ink = 0;
    function sizePad() { const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1f3a9e"; ink = 0; seal.classList.remove("on"); ph.style.display = ""; }
    new ResizeObserver(sizePad).observe(cv);
    const pt = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; };
    cv.addEventListener("pointerdown", (e) => { drawing = true; cv.setPointerCapture(e.pointerId); last = pt(e); ph.style.display = "none"; });
    cv.addEventListener("pointermove", (e) => {
      if (!drawing) return; const p = pt(e), d = Math.hypot(p.x - last.x, p.y - last.y), v = d / Math.max(1, p.t - last.t);
      ctx.lineWidth = clamp(3.2 - v * 1.4, 1.1, 3.2); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.quadraticCurveTo(last.x, last.y, (last.x + p.x) / 2, (last.y + p.y) / 2); ctx.lineTo(p.x, p.y); ctx.stroke();
      ink += d; last = p; if (ink > 120 && picked.size) seal.classList.add("on");
    });
    const up = () => { drawing = false; if (ink > 120 && !picked.size) Press.toast("Choose at least one clause to seal it"); };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    const bar = body.querySelector("[data-b]");
    button(bar, "Adopt all clauses", () => { C.forEach((_, i) => picked.add(i)); ul.querySelectorAll(".clause").forEach((b) => b.setAttribute("aria-pressed", "true")); text(); if (ink > 120) seal.classList.add("on"); });
    button(bar, "Clear signature", () => sizePad());
    button(bar, "Copy the text", async () => { const l = [...picked].sort((a, b) => a - b); const t = "A New Digital Social Contract\n\n" + (l.length ? l.map((i, k) => k + 1 + ". " + C[i]).join("\n") : "(no clauses chosen)") + "\n\nFrom Data for Sale by Abhinav Raj, abhnv.in/p1/"; try { await navigator.clipboard.writeText(t); Press.toast("Contract copied"); } catch (_) { Press.toast("Copying is not available here"); } });
    text();
    root.addEventListener("fig:reset", () => { picked.clear(); ul.querySelectorAll(".clause").forEach((b) => b.setAttribute("aria-pressed", "false")); text(); sizePad(); });
  });
})();

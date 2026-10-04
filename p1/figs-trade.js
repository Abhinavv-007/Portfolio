/* Data for Sale · live count, the auction story, the brief, the dossier, the basket */
(function () {
  "use strict";
  const { el, svg, button, fmt, lerp, clamp, loop, icon, randomHex } = FK;
  const T0 = performance.now();

  /* ---------- Front page: broadcasts since the page opened ---------- */
  (function live() {
    const out = document.getElementById("liveCount"); if (!out) return;
    const perSec = 178e12 / (365.25 * 86400);
    loop(out.parentElement, () => { out.textContent = fmt.int(((performance.now() - T0) / 1000) * perSec); }).start();
  })();

  /* ====================================================================
     The 110-millisecond auction (scroll story)
     ==================================================================== */
  Press.fig("story-auction", (root) => {
    const host = root.querySelector(".auction");
    const BIDDERS = ["Travel buyer", "Retail buyer", "Lending buyer", "Insurance buyer", "Brand buyer", "Data partner"];
    const PERSONAS = [
      { seg: ["in-market: flights", "frequent traveller", "late-night scroller"], win: 0 },
      { seg: ["new parent (inferred)", "budget shopper", "in-market: prams"], win: 1 },
      { seg: ["job seeker", "modelled credit: low", "payday-loan interest"], win: 2 }
    ];
    const PH = [[0, 2, "Ad slot found"], [2, 12, "Writing the bid request"], [12, 26, "Broadcast to every bidder"], [26, 84, "Bidders price you"], [84, 94, "Highest bid wins"], [94, 110, "Ad delivered, data kept"]];
    const FIELDS = ["page", "dev", "ip", "geo", "uid", "segs"];
    let persona = 0, plan, G, nodes = [], t = 0, target = 0, mode = "scroll", realStart = 0;

    host.innerHTML = `<svg role="img" aria-label="Animated diagram of an ad auction"></svg>
      <div class="auction-foot"><div class="clock"><b>0.0 ms</b><span>Ready</span><small></small></div>
      <pre class="codebox" aria-label="Simplified bid request"></pre>
      <div class="sent">${["Page", "Phone", "IP address", "Location", "Tracking ID", "Segments"].map((x, i) => `<i data-k="${FIELDS[i]}">${x}</i>`).join("")}</div></div>`;
    const s = host.querySelector("svg"), code = host.querySelector(".codebox");
    const clockB = host.querySelector(".clock b"), clockS = host.querySelector(".clock span"), clockN = host.querySelector(".clock small");

    function writeCode() {
      const p = PERSONAS[persona], f = (k, v) => `<span class="f" data-k="${k}">${v}</span>`, K = (x) => `<span class="k">"${x}"</span>`, S = (x) => `<span class="s">"${x}"</span>`;
      code.innerHTML = `{\n  ${K("id")}: ${S(randomHex(4) + "…")}, ${K("tmax")}: 120,\n  ${K("site")}: { ${f("page", K("page") + ": " + S("news.example/election-live"))} },\n  ${K("device")}: {\n    ${f("dev", K("model") + ": " + S("Pixel 8") + ", " + K("os") + ": " + S("Android 15"))},\n    ${f("ip", K("ip") + ": " + S("103.21.xx.xx"))},\n    ${f("geo", K("geo") + ": { " + K("lat") + ": 28.6139, " + K("lon") + ": 77.2090 }")}\n  },\n  ${K("user")}: {\n    ${f("uid", K("id") + ": " + S("u-77a1c9…"))},\n    ${f("segs", K("segments") + ": [" + p.seg.map(S).join(", ") + "]")}\n  }\n}`;
    }
    function makePlan() {
      const p = PERSONAS[persona];
      plan = BIDDERS.map((_, i) => { const bidding = i !== 5; const resp = 36 + ((i * 37) % 38); let bid = bidding ? 0.45 + ((i * 53) % 100) / 100 : 0; if (i === p.win) bid = 2.6 + persona * 0.35; return { recv: 14 + i * 1.6, bidding, resp, arrive: resp + 8, bid }; });
    }
    function geometry(narrow) {
      return narrow
        ? { narrow, vb: [360, 252], P: { x: 8, y: 6, w: 70, h: 128 }, E: { x: 214, y: 70, r: 38 }, fs: 12.5, fs2: 10.5, bid: (i) => ({ x: 4 + (i % 3) * 118, y: 152 + Math.floor(i / 3) * 52, w: 112, h: 44 }), anchor: (b) => ({ x: b.x + b.w / 2, y: b.y }) }
        : { narrow, vb: [640, 340], P: { x: 14, y: 84, w: 92, h: 172 }, E: { x: 286, y: 170, r: 46 }, fs: 15, fs2: 12.5, bid: (i) => ({ x: 452, y: 6 + i * 56, w: 184, h: 46 }), anchor: (b) => ({ x: b.x, y: b.y + b.h / 2 }) };
    }
    const edge = (a) => { const E = G.E, dx = a.x - E.x, dy = a.y - E.y, d = Math.hypot(dx, dy) || 1; return { x: E.x + (dx / d) * E.r, y: E.y + (dy / d) * E.r }; };
    function build() {
      const narrow = window.innerWidth < 900;
      if (G && G.narrow === narrow) return;
      G = geometry(narrow); s.innerHTML = ""; nodes = [];
      s.setAttribute("viewBox", `0 0 ${G.vb[0]} ${G.vb[1]}`);
      const P = G.P, E = G.E;
      G.out = { x: P.x + P.w, y: narrow ? E.y : P.y + P.h / 2 }; G.in = { x: E.x - E.r, y: E.y };
      G.slot = { x: P.x + 10, y: P.y + P.h * 0.34, w: P.w - 20, h: P.h * 0.28 };
      s.appendChild(svg("path", { d: `M${G.out.x},${G.out.y} L${G.in.x},${G.in.y}`, class: "wire" }));
      BIDDERS.forEach((_, i) => { const a = G.anchor(G.bid(i)), o = edge(a); s.appendChild(svg("path", { d: `M${o.x},${o.y} L${a.x},${a.y}`, class: "wire" })); });
      const ph = svg("g");
      ph.appendChild(svg("rect", { x: P.x, y: P.y, width: P.w, height: P.h, rx: P.w * 0.18, class: "f-sheet", stroke: "currentColor", style: "color:var(--ink)", "stroke-width": 1.6 }));
      ph.appendChild(svg("rect", { x: P.x + P.w * 0.36, y: P.y + 6, width: P.w * 0.28, height: 6, rx: 3, class: "f-ink" }));
      [0.15, 0.2, 0.245].forEach((k, j) => ph.appendChild(svg("rect", { x: P.x + 10, y: P.y + P.h * k, width: P.w - 20 - j * 12, height: j ? 4 : 6, rx: 2, class: "f-ink", opacity: j ? 0.25 : 0.8 })));
      G.adSlot = svg("rect", { x: G.slot.x, y: G.slot.y, width: G.slot.w, height: G.slot.h, rx: 3, fill: "none", "stroke-dasharray": "3 3", style: "stroke:var(--grey)" });
      G.adText = svg("text", { x: G.slot.x + G.slot.w / 2, y: G.slot.y + G.slot.h / 2 + 4, "text-anchor": "middle", "font-size": G.fs2, text: "ad slot" });
      ph.appendChild(G.adSlot); ph.appendChild(G.adText);
      [0, 1, 2].forEach((k) => ph.appendChild(svg("rect", { x: P.x + 10, y: G.slot.y + G.slot.h + 9 + k * 9, width: P.w - 22 - k * 9, height: 4, rx: 2, class: "f-ink", opacity: 0.25 })));
      ph.appendChild(svg("text", { x: P.x + P.w / 2, y: P.y + P.h + 17, "text-anchor": "middle", "font-size": G.fs, class: "t-head", text: "You" }));
      s.appendChild(ph);
      G.ring = svg("circle", { cx: E.x, cy: E.y, r: E.r + 5, class: "s-spot", "stroke-width": 2, opacity: 0 }); s.appendChild(G.ring);
      s.appendChild(svg("circle", { cx: E.x, cy: E.y, r: E.r, class: "f-ink" }));
      s.appendChild(svg("text", { x: E.x, y: E.y - 2, "text-anchor": "middle", "font-size": G.fs, style: "fill:var(--paper)", "font-weight": 700, text: "Ad" }));
      s.appendChild(svg("text", { x: E.x, y: E.y + G.fs, "text-anchor": "middle", "font-size": G.fs, style: "fill:var(--paper)", "font-weight": 700, text: "exchange" }));
      BIDDERS.forEach((name, i) => {
        const b = G.bid(i), a = G.anchor(b), g = svg("g", { class: "node" });
        g.appendChild(svg("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: 4 }));
        g.appendChild(svg("text", { x: b.x + 9, y: b.y + b.h * 0.42, "font-size": G.fs, "font-weight": 700, class: "t-ink", text: G.narrow ? name.replace(" buyer", "") : name }));
        const sub = svg("text", { x: b.x + 9, y: b.y + b.h * 0.8, "font-size": G.fs2, text: "waiting" }); g.appendChild(sub);
        s.appendChild(g);
        const out = svg("circle", { r: 5, class: "pkt", opacity: 0 }); s.appendChild(out);
        const back = svg("g", { opacity: 0 }, [svg("rect", { x: -22, y: -10, width: 44, height: 20, rx: 10, class: "f-ink" }), svg("text", { x: 0, y: 4, "text-anchor": "middle", "font-size": 11, "font-weight": 700, style: "fill:var(--paper)", text: "" })]);
        s.appendChild(back);
        nodes.push({ g, sub, out, back, a, o: edge(a) });
      });
      G.toEx = svg("circle", { r: 5, class: "pkt", opacity: 0 }); s.appendChild(G.toEx);
      G.ad = svg("rect", { width: 20, height: 13, rx: 2, class: "f-spot", opacity: 0 }); s.appendChild(G.ad);
      render(t);
    }
    function render(time) {
      if (!G || !plan) return;
      const tt = clamp(time, 0, 110);
      clockB.textContent = tt.toFixed(1) + " ms";
      const ph = PH.find((p) => tt >= p[0] && tt < p[1]) || PH[5];
      clockS.textContent = ph[2];
      const k0 = clamp(tt / 2, 0, 1);
      G.toEx.setAttribute("opacity", tt > 0.05 && tt < 2.2 ? 1 : 0);
      G.toEx.setAttribute("cx", lerp(G.out.x, G.in.x, k0)); G.toEx.setAttribute("cy", lerp(G.out.y, G.in.y, k0));
      G.ring.setAttribute("opacity", tt > 2 && tt < 12 ? 0.4 + 0.6 * Math.abs(Math.sin(tt * 0.9)) : 0);
      const nOn = tt < 2 ? 0 : tt < 12 ? Math.ceil(((tt - 2) / 10) * 6) : tt < 26 ? 6 : 0;
      host.querySelectorAll(".f, .sent i").forEach((n) => n.classList.toggle("on", FIELDS.indexOf(n.dataset.k) > -1 && FIELDS.indexOf(n.dataset.k) < nOn));
      const winI = tt >= 90 ? plan.reduce((b, p, i) => (p.bid > plan[b].bid ? i : b), 0) : -1;
      let saw = 0;
      nodes.forEach((n, i) => {
        const p = plan[i], sent = 12 + i * 0.5, k = clamp((tt - sent) / (p.recv - sent), 0, 1);
        n.out.setAttribute("opacity", tt > sent && tt < p.recv ? 1 : 0);
        n.out.setAttribute("cx", lerp(n.o.x, n.a.x, k)); n.out.setAttribute("cy", lerp(n.o.y, n.a.y, k));
        if (tt >= p.recv) saw++;
        let lab = "waiting";
        if (tt >= p.recv) lab = p.bidding ? (tt < p.resp ? "looking you up" : "bids $" + p.bid.toFixed(2)) : "listening, no bid";
        if (n.sub.textContent !== lab) n.sub.textContent = lab;
        if (p.bidding) {
          const kb = clamp((tt - p.resp) / (p.arrive - p.resp), 0, 1);
          n.back.setAttribute("opacity", tt > p.resp && tt < p.arrive + 0.6 ? 1 : 0);
          n.back.setAttribute("transform", `translate(${lerp(n.a.x, n.o.x, kb)},${lerp(n.a.y, n.o.y, kb)})`);
          n.back.lastChild.textContent = "$" + p.bid.toFixed(2);
        }
        n.g.classList.toggle("win", i === winI); n.g.classList.toggle("dim", winI >= 0 && i !== winI);
      });
      clockN.textContent = `Bidders holding your data: ${saw} of 6`;
      const ka = clamp((tt - 96) / 10, 0, 1);
      G.ad.setAttribute("opacity", tt > 96 && tt < 106 ? 1 : 0);
      G.ad.setAttribute("x", lerp(G.in.x - 20, G.slot.x + G.slot.w / 2 - 10, ka)); G.ad.setAttribute("y", lerp(G.in.y - 6, G.slot.y + G.slot.h / 2 - 6, ka));
      const done = tt >= 106;
      G.adSlot.style.fill = done ? "var(--spot)" : "none";
      G.adText.textContent = done ? BIDDERS[winI < 0 ? 0 : winI].split(" ")[0] + " ad" : "ad slot";
      G.adText.style.fill = done ? "#fff" : "";
    }
    writeCode(); makePlan(); build();
    window.addEventListener("resize", build);
    Press.scrolly(root, { progress(idx, p) { if (mode === "scroll") target = idx < 0 ? 0 : lerp(PH[idx][0], PH[idx][1], p); } });
    const lp = loop(root, (dt) => {
      if (mode === "real") {
        const e = performance.now() - realStart; t = Math.min(110, e);
        if (e > 2600) { mode = "scroll"; }
      } else t += (target - t) * Math.min(1, dt * 9);
      render(t);
    });
    lp.start();
    const real = root.querySelector("[data-realspeed]");
    if (real) real.addEventListener("click", () => {
      persona = (persona + 1) % PERSONAS.length; writeCode(); makePlan();
      mode = "real"; realStart = performance.now(); t = 0;
      setTimeout(() => Press.toast("110 milliseconds. A blink takes roughly 300."), 500);
    });
  });

  /* ---------- Where do you live? ---------- */
  (function region() {
    const p = document.getElementById("rx-region"); if (!p) return;
    Press.reactive(p, { where: "the United States" }, (m) => {
      const d = m.where === "Europe" ? 376 : 747, every = 86400 / d;
      return { day: fmt.int(d), year: fmt.int(d * 365), every: every < 120 ? Math.round(every) + " seconds" : Math.floor(every / 60) + " minutes " + Math.round(every % 60) + " seconds" };
    });
  })();

  /* ====================================================================
     Four questions
     ==================================================================== */
  Press.fig("fig-questions", (root) => {
    const Q = [
      ["How is personal data turned into profit behind the scenes?", "Apps, websites and devices record behaviour. Brokers merge it into profiles and attach labels. Ad auctions and data sales then turn those profiles into money, many times a day, for every user.", "#s3", "See sections 1, 3 and 6"],
      ["Who controls this system, and who is left out?", "A handful of platforms and a large, mostly invisible broker industry hold the data. The people it describes have little say, and those with the least power carry the most risk when profiles are wrong or used as proxies.", "#s6", "See sections 6 and 7"],
      ["What are the risks to freedom, privacy and democracy?", "Compulsive design, the chilling effect of being watched, feeds that narrow what people see, and decisions about credit and jobs made by systems that do not explain themselves.", "#s5", "See sections 5, 7 and 8"],
      ["Can the system be fixed, and if so, how?", "Yes: transparency by design, laws that are actually enforced, design that does not exploit people, and a new digital social contract. Most of the pieces already exist. They are not yet joined up.", "#s9", "See sections 9 to 12"]
    ];
    const list = root.querySelector(".qa");
    Q.forEach(([q, a, href, more], i) => {
      const item = el("div", { class: "qa-item", role: "listitem" });
      const btn = el("button", { type: "button", class: "qa-q", "aria-expanded": "false", html: `<span class="n">Q${i + 1}</span><b>${q}</b><span class="pm" aria-hidden="true"></span>` });
      const ans = el("div", { class: "qa-a", html: `<div><p>${a}</p><a href="${href}">${more}</a></div>` });
      btn.addEventListener("click", () => { const open = item.classList.toggle("open"); btn.setAttribute("aria-expanded", String(open)); });
      item.appendChild(btn); item.appendChild(ans); list.appendChild(item);
    });
  });

  /* ====================================================================
     Harmless alone, revealing together
     ==================================================================== */
  Press.fig("fig-dossier", (root) => {
    const body = root.querySelector(".fig-body");
    const SRC = [["loc", "pin", "Location"], ["card", "card", "Card purchases"], ["search", "search", "Searches"], ["speaker", "mic", "Smart speaker"], ["car", "car", "Connected car"], ["fit", "watch", "Fitness band"], ["apps", "phone", "Apps used"], ["social", "people", "Social graph"]];
    const INF = [
      { need: ["loc"], t: "Home and workplace addresses", s: "hi", why: "Where a phone sleeps is a home. Where it spends weekdays is a job.", buy: ["advertisers", "people-search sites"] },
      { need: ["loc"], t: "Religious practice", s: "hi", why: "Weekly visits to a place of worship, a risk named in the FTC's Kochava case.", buy: ["data brokers"] },
      { need: ["loc", "car"], t: "When the home is empty", s: "hi", why: "Departure times plus location give away a daily routine.", buy: ["anyone buying location data"] },
      { need: ["card", "search"], t: "Likely expecting a baby", s: "hi", why: "Ordinary purchases plus searches, the retail “pregnancy score”.", buy: ["retailers"] },
      { need: ["loc", "fit"], t: "A possible health condition", s: "hi", why: "Clinic visits plus a rising heart rate and poor sleep.", buy: ["insurers"] },
      { need: ["card", "apps"], t: "Money trouble", s: "hi", why: "Loan apps, a budget phone and a late fee: the kind of footprint lenders study.", buy: ["lenders"] },
      { need: ["search", "speaker"], t: "Stress and poor sleep", s: "md", why: "Late-night voice requests and anxious searches.", buy: ["wellness advertisers"] },
      { need: ["search", "social"], t: "Political leaning", s: "md", why: "What you follow and search predicts your views.", buy: ["political campaigns"] },
      { need: ["social", "loc"], t: "Who you are seeing", s: "md", why: "Two phones that spend weekends in the same place.", buy: ["advertisers"] },
      { need: ["car"], t: "A risky-driver score", s: "md", why: "Telematics can feed insurance pricing.", buy: ["insurers"] },
      { need: ["apps"], t: "Single and dating", s: "md", why: "App use alone is enough.", buy: ["advertisers"] },
      { need: ["search"], t: "Planning a trip", s: "lo", why: "One search is enough for an ad segment.", buy: ["travel advertisers"] }
    ];
    const DEF = ["loc", "search"], on = new Set(DEF);
    body.innerHTML = `<div class="dossier-wrap"><div class="ring"><svg viewBox="-74 -14 508 388" role="group" aria-label="Data sources"></svg></div>
      <div><div class="file"><div class="file-h"><span>Broker file &middot; subject 47-118</span><span data-n>0 inferences</span></div><ul aria-live="polite"></ul></div>
      <div class="worth"><div class="ctl-label"><span>Value to buyers</span><span class="val" data-v></span></div><div class="bar"><i></i></div><p class="fig-source" style="border:0;margin-top:.4rem" data-b></p></div></div></div>`;
    const s = body.querySelector("svg"), C = 180, R = 124;
    const pos = SRC.map((_, i) => { const a = -Math.PI / 2 + (i / SRC.length) * Math.PI * 2; return { x: C + R * Math.cos(a), y: C + R * Math.sin(a), a }; });
    const chords = svg("g"); s.appendChild(chords);
    s.appendChild(svg("circle", { cx: C, cy: C, r: 34, class: "f-ink" }));
    const you = svg("g", { style: "color:var(--paper)" }); you.innerHTML = `<g transform="translate(${C - 14},${C - 17}) scale(1.15)">${icon("user", 24).replace('class="ico"', "")}</g>`; s.appendChild(you);
    s.appendChild(svg("text", { x: C, y: C + 24, "text-anchor": "middle", "font-size": 10, "font-weight": 700, style: "fill:var(--paper)", text: "YOU" }));
    const nodeEls = {};
    SRC.forEach(([k, ic, label], i) => {
      const p = pos[i], g = svg("g", { class: "src", tabindex: 0, role: "button", "aria-pressed": "false", "aria-label": label });
      g.appendChild(svg("circle", { cx: p.x, cy: p.y, r: 25 }));
      const ig = svg("g", { class: "ico", transform: `translate(${p.x - 11},${p.y - 11}) scale(0.92)` }); ig.innerHTML = icon(ic, 24).replace(/<svg[^>]*>|<\/svg>/g, "").replace(/^/, '<g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">') + "</g>";
      g.appendChild(ig);
      const lx = C + (R + 38) * Math.cos(p.a), ly = C + (R + 38) * Math.sin(p.a) + 4;
      g.appendChild(svg("text", { x: lx, y: ly, "text-anchor": Math.abs(Math.cos(p.a)) < 0.3 ? "middle" : Math.cos(p.a) > 0 ? "start" : "end", text: label }));
      const flip = () => { on.has(k) ? on.delete(k) : on.add(k); draw(); };
      g.addEventListener("click", flip); g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
      s.appendChild(g); nodeEls[k] = { g, p };
    });
    const list = body.querySelector("ul");
    function chordPath(inf) {
      const a = nodeEls[inf.need[0]].p;
      if (inf.need.length === 1) return `M${a.x},${a.y} L${C + (a.x - C) * 0.3},${C + (a.y - C) * 0.3}`;
      const b = nodeEls[inf.need[1]].p;
      return `M${a.x},${a.y} Q${C + ((a.x + b.x) / 2 - C) * 0.25},${C + ((a.y + b.y) / 2 - C) * 0.25} ${b.x},${b.y}`;
    }
    function draw() {
      SRC.forEach(([k]) => { nodeEls[k].g.classList.toggle("on", on.has(k)); nodeEls[k].g.setAttribute("aria-pressed", String(on.has(k))); });
      const inf = INF.filter((i) => i.need.every((n) => on.has(n)));
      chords.innerHTML = "";
      inf.forEach((x, j) => {
        const p = svg("path", { d: chordPath(x), class: "chord", "data-i": j }); chords.appendChild(p);
        if (!Press.isCalm()) { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.getBoundingClientRect(); p.style.transition = "stroke-dashoffset .7s cubic-bezier(.22,1,.36,1)"; p.style.strokeDashoffset = 0; }
      });
      list.innerHTML = inf.length ? inf.map((x, j) => `<li data-i="${j}" style="animation-delay:${j * 40}ms"><span class="lvl ${x.s}">${x.s === "hi" ? "Sensitive" : x.s === "md" ? "Personal" : "Routine"}</span><span><b>${x.t}</b><span class="why">${x.why}</span></span></li>`).join("") : `<li class="empty">Nothing yet. Most inferences need two sources.</li>`;
      list.querySelectorAll("li[data-i]").forEach((li) => {
        li.addEventListener("mouseenter", () => chords.querySelector(`[data-i="${li.dataset.i}"]`).classList.add("hot"));
        li.addEventListener("mouseleave", () => chords.querySelector(`[data-i="${li.dataset.i}"]`).classList.remove("hot"));
      });
      const hi = inf.filter((x) => x.s === "hi").length, md = inf.filter((x) => x.s === "md").length;
      body.querySelector("[data-n]").textContent = inf.length + (inf.length === 1 ? " inference" : " inferences");
      const v = clamp((inf.length - hi - md + md * 3 + hi * 7) / 48, 0, 1);
      body.querySelector(".worth .bar").style.setProperty("--v", (on.size ? Math.max(4, v * 100) : 0) + "%");
      body.querySelector("[data-v]").textContent = !on.size ? "nothing" : v < 0.08 ? "a fraction of a cent" : v < 0.3 ? "a few cents" : v < 0.6 ? "a premium segment" : "rare and sensitive";
      const buyers = [...new Set(inf.flatMap((x) => x.buy))];
      body.querySelector("[data-b]").textContent = buyers.length ? "Likely buyers: " + buyers.join(", ") + "." : "";
    }
    draw();
    root.addEventListener("fig:reset", () => { on.clear(); DEF.forEach((k) => on.add(k)); draw(); });
  });

  /* ====================================================================
     What your basket says
     ==================================================================== */
  Press.fig("fig-basket", (root) => {
    const body = root.querySelector(".fig-body");
    const ITEMS = [["Unscented lotion", "large bottle", 20], ["Calcium tablets", "60 pack", 12], ["Magnesium tablets", "60 pack", 12], ["Zinc tablets", "30 pack", 12], ["Cotton wool", "extra large bag", 14], ["Scent-free soap", "pack of 4", 10], ["Hand sanitiser", "500 ml", 6], ["Washcloths", "pack of 6", 8], ["Crisps", "sharing bag", 0], ["Phone charger", "USB-C", 0], ["Coffee beans", "1 kg", 0], ["Shampoo", "citrus scent", 0]];
    const LINE = 60, inCart = new Set();
    body.innerHTML = `<div class="shop"><div class="shelf"></div><div class="cart"><div class="ctl-label"><span>Your basket</span><span class="val" data-sc>Score 0</span></div><div class="cart-list"><span class="none">Empty. Tap an item.</span></div>
      <div class="score"><div class="track"></div><div class="fill"></div><div class="line" style="left:${LINE}%"></div></div>
      <div class="mailer"><b>This week's coupons</b><span data-m>Coffee, snacks and household cleaning.</span></div></div></div>`;
    const shelf = body.querySelector(".shelf"), cart = body.querySelector(".cart-list");
    ITEMS.forEach(([n, d, w], i) => {
      const b = el("button", { type: "button", class: "item", html: `<span>${n}</span><small>${d}</small><span class="tag-plus" aria-hidden="true">+</span>`, "aria-label": "Add " + n });
      b.addEventListener("click", () => toggle(i, b));
      shelf.appendChild(b);
    });
    function fly(from) {
      if (Press.isCalm()) return;
      const a = from.getBoundingClientRect(), z = cart.getBoundingClientRect();
      const f = el("div", { class: "flyer", text: "+" }); document.body.appendChild(f);
      f.style.left = a.left + a.width / 2 + "px"; f.style.top = a.top + 10 + "px";
      f.animate([{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${z.left + 30 - a.left - a.width / 2}px, ${z.top + 10 - a.top - 10}px) scale(.6)`, opacity: 0.2 }], { duration: 520, easing: "cubic-bezier(.22,1,.36,1)" }).onfinish = () => f.remove();
    }
    function toggle(i, b) { if (inCart.has(i)) inCart.delete(i); else { inCart.add(i); fly(b); } paint(); }
    function paint() {
      shelf.querySelectorAll(".item").forEach((b, i) => b.classList.toggle("in", inCart.has(i)));
      cart.innerHTML = inCart.size ? "" : '<span class="none">Empty. Tap an item.</span>';
      [...inCart].forEach((i) => { const c = el("button", { type: "button", text: ITEMS[i][0] + " ×", "aria-label": "Remove " + ITEMS[i][0] }); c.addEventListener("click", () => { inCart.delete(i); paint(); }); cart.appendChild(c); });
      const score = Math.min(100, [...inCart].reduce((a, i) => a + ITEMS[i][2], 0));
      body.querySelector(".fill").style.width = score + "%";
      body.querySelector("[data-sc]").textContent = "Score " + score;
      const hit = score >= LINE, m = body.querySelector(".mailer");
      m.classList.toggle("hit", hit);
      body.querySelector("[data-m]").innerHTML = hit ? "Cots, nappies and baby lotion, mixed in with a lawnmower and wine glasses so the offer does not look too knowing. The 2012 report described the store doing exactly this." : score > 25 ? "Vitamins, soap and household cleaning. The score is rising." : "Coffee, snacks and household cleaning.";
    }
    root.addEventListener("fig:reset", () => { inCart.clear(); paint(); });
  });
})();

/* Data for Sale · one phone one day, the broker pipeline, the five-minute test */
(function () {
  "use strict";
  const { el, svg, button, range, fmt, clamp, rng, loop, icon, iphone, genArt, tween, wait } = FK;
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };

  /* ====================================================================
     One phone, one day (24-hour clock of location pings)
     ==================================================================== */
  Press.fig("fig-clock", (root) => {
    const body = root.querySelector(".fig-body");
    const P = { home: { r: 112, label: "Home" }, road: { r: 128, label: "On the road" }, office: { r: 96, label: "Office park" }, clinic: { r: 150, label: "Medical clinic", s: 1 }, worship: { r: 150, label: "Place of worship", s: 1 }, friend: { r: 136, label: "A friend's flat" }, cafe: { r: 128, label: "Café" } };
    const pings = [];
    for (let m = 0; m <= 440; m += 40) pings.push([m, "home"]);
    [[532, "road"], [544, "road"], [556, "road"]].forEach((p) => pings.push(p));
    for (let m = 575; m <= 775; m += 30) pings.push([m, "office"]);
    pings.push([790, "cafe"]); [[812, "clinic"], [832, "clinic"], [852, "clinic"]].forEach((p) => pings.push(p));
    for (let m = 880; m <= 1060; m += 30) pings.push([m, "office"]);
    [[1085, "road"], [1112, "worship"], [1132, "worship"], [1152, "worship"], [1180, "road"], [1235, "friend"], [1265, "friend"], [1295, "friend"], [1330, "road"]].forEach((p) => pings.push(p));
    for (let m = 1360; m < 1440; m += 40) pings.push([m, "home"]);
    const LEARN = [
      [120, "home", "Where you live", "The phone spends every night at the same address."],
      [560, "car", "When your home is empty", "You leave at about 08:50 on weekdays."],
      [650, "office", "Where you work", "Weekdays, 09:30 to 18:00, at the same office park."],
      [815, "cross", "A visit to a medical clinic", "Forty minutes at a clinic on a Friday afternoon.", 1],
      [1115, "church", "Your religion", "Friday evening at a place of worship.", 1],
      [1240, "people", "Who you spend evenings with", "An hour at the same flat as last week, with another phone that stays the night."]
    ];
    body.innerHTML = `<div class="split"><div class="clockface"><svg viewBox="0 0 400 400" role="slider" aria-label="Time of day" aria-valuemin="0" aria-valuemax="1439" tabindex="0"></svg></div>
      <div><div class="btnrow" data-b></div><div class="ctl-label" style="margin-top:1rem"><span>What a broker can now say about you</span><span class="val" data-c></span></div><ul class="learned" aria-live="polite"></ul></div></div>`;
    const s = body.querySelector("svg"), C = 200, list = body.querySelector(".learned");
    const ang = (m) => (m / 1440) * Math.PI * 2 - Math.PI / 2;
    const at = (m, r) => [C + r * Math.cos(ang(m)), C + r * Math.sin(ang(m))];
    s.appendChild(svg("circle", { cx: C, cy: C, r: 178, class: "f-sheet", stroke: "currentColor", style: "color:var(--ink)", "stroke-width": 1.5 }));
    for (let h = 0; h < 24; h++) { const [x1, y1] = at(h * 60, 170), [x2, y2] = at(h * 60, h % 6 ? 163 : 156); s.appendChild(svg("line", { x1, y1, x2, y2, class: "s-ink", "stroke-width": h % 6 ? 1 : 2 })); }
    [["midnight", 0], ["6 am", 360], ["noon", 720], ["6 pm", 1080]].forEach(([t, m]) => { const [x, y] = at(m, 140); s.appendChild(svg("text", { x, y: y + 4, "text-anchor": "middle", "font-size": 12, "font-weight": 700, class: "t-grey", text: t })); });
    const sweep = svg("path", { class: "f-wash" }); s.appendChild(sweep);
    const dots = pings.map(([m, k]) => { const [x, y] = at(m, P[k].r), d = svg("circle", { cx: x, cy: y, r: 0, class: P[k].s ? "f-spot" : "f-ink", opacity: P[k].s ? 1 : 0.7 }); s.appendChild(d); return d; });
    const hand = svg("line", { x1: C, y1: C, x2: C, y2: C - 150, class: "s-spot", "stroke-width": 3, "stroke-linecap": "round" });
    const knob = svg("circle", { cx: C, cy: C - 150, r: 11, class: "f-spot", style: "cursor:grab" });
    s.appendChild(hand); s.appendChild(knob);
    s.appendChild(svg("circle", { cx: C, cy: C, r: 52, class: "f-paper", stroke: "currentColor", style: "color:var(--hair-2)" }));
    const tLabel = svg("text", { x: C, y: C + 2, "text-anchor": "middle", "font-size": 26, "font-weight": 800, class: "t-ink", text: "00:00" });
    const pLabel = svg("text", { x: C, y: C + 22, "text-anchor": "middle", "font-size": 11, class: "t-grey", text: "Home" });
    s.appendChild(tLabel); s.appendChild(pLabel);
    let now = 0, shown = 0;
    function set(m) {
      now = clamp(m, 0, 1439);
      const [x, y] = at(now, 150); hand.setAttribute("x2", x); hand.setAttribute("y2", y); knob.setAttribute("cx", x); knob.setAttribute("cy", y);
      const [sx, sy] = at(now, 178);
      sweep.setAttribute("d", now < 1 ? "" : `M${C},${C} L${C},${C - 178} A178,178 0 ${now > 720 ? 1 : 0} 1 ${sx},${sy} Z`);
      dots.forEach((d, i) => d.setAttribute("r", pings[i][0] <= now ? (P[pings[i][1]].s ? 6 : 4.2) : 0));
      const hh = Math.floor(now / 60), mm = Math.floor(now % 60);
      tLabel.textContent = String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
      let place = "Home"; pings.forEach(([m, k]) => { if (m <= now) place = P[k].label; }); pLabel.textContent = place;
      s.setAttribute("aria-valuenow", Math.round(now)); s.setAttribute("aria-valuetext", tLabel.textContent + ", " + place);
      const got = LEARN.filter((l) => l[0] <= now);
      if (got.length !== shown) {
        shown = got.length;
        list.innerHTML = got.length ? got.map((l) => `<li class="${l[4] ? "sens" : ""}"><span class="ic">${icon(l[1], 18)}</span><span><b>${l[2]}</b><span>${l[3]}</span></span></li>`).join("") : `<li class="wait">Nothing yet. Keep the day moving.</li>`;
        body.querySelector("[data-c]").textContent = pings.filter((p) => p[0] <= now).length + " pings";
      }
    }
    const toMin = (e) => { const r = s.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 400 - C, y = ((e.clientY - r.top) / r.height) * 400 - C; let a = Math.atan2(y, x) + Math.PI / 2; if (a < 0) a += Math.PI * 2; return (a / (Math.PI * 2)) * 1440; };
    let drag = false;
    s.addEventListener("pointerdown", (e) => { drag = true; s.setPointerCapture(e.pointerId); const m = toMin(e); if (Math.abs(m - now) < 500 || now < 5) set(m); });
    s.addEventListener("pointermove", (e) => { if (!drag) return; const m = toMin(e); if (Math.abs(m - now) < 600) set(m); });
    s.addEventListener("pointerup", () => (drag = false)); s.addEventListener("pointercancel", () => (drag = false));
    s.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); set(now + 15); } if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); set(now - 15); } });
    let playing = false;
    const playBtn = button(body.querySelector("[data-b]"), "Play the day", async () => {
      if (playing) return; playing = true; playBtn.disabled = true; const from = now >= 1430 ? 0 : now;
      await tween((1439 - from) * 6, (k) => set(from + (1439 - from) * k), (k) => k);
      playing = false; playBtn.disabled = false;
    }, "solid");
    set(0);
    root.addEventListener("fig:reset", () => { shown = -1; set(0); });
  });

  /* ====================================================================
     Where your data goes (pipeline with flowing particles)
     ==================================================================== */
  Press.fig("fig-pipeline", (root) => {
    const body = root.querySelector(".fig-body");
    const COL = ["Apps and SDKs", "Websites and cookies", "Cards and loyalty", "Carriers and location", "Connected devices", "Public records"];
    const BRK = ["Identity matching", "Enrichment and inference", "Segment marketplace"];
    const BUY = [
      ["Advertisers", "Audience segments, interests, life events.", "Targeting ads and measuring them.", "The FTC's 2014 study found brokers selling segments with names like “Urban Scramble” and “Mobile Mixers”, which it said contained high concentrations of low-income Latino and Black consumers.", 4],
      ["Insurers", "Lifestyle, health and driving signals.", "Marketing, and in some markets pricing.", "In 2019 New York's financial regulator warned life insurers that external consumer data and algorithms must not lead to unfair discrimination.", 0],
      ["Lenders", "Alternative data and digital footprints.", "Scoring people with thin credit files.", "Berg and colleagues found that phone type, email provider and the hour of an order predicted repayment as well as a credit score.", 18],
      ["Employers and landlords", "Background and tenant-screening reports.", "Deciding who is interviewed or housed.", "Because these reports can cost people homes and jobs, US law gives people the right to see and dispute them. Many countries offer no such right.", 0],
      ["Political campaigns", "Psychographic and issue profiles.", "Micro-targeted persuasion and turnout.", "Data from up to 87 million Facebook users reached Cambridge Analytica, and the FTC later fined Facebook $5 billion.", 26],
      ["Government agencies", "Location histories and other commercial data.", "Investigations, sometimes without a warrant.", "The Brennan Center calls it the data broker loophole: buying what would otherwise need a court order.", 17],
      ["People-search sites", "Names, addresses, relatives, phone numbers.", "Selling look-ups to anyone who pays.", "The FTC sued Kochava in 2022 over location data that could reveal visits to clinics, places of worship and shelters.", 15]
    ];
    let sel = 0, L = null;
    body.innerHTML = `<div class="pipe"><svg role="img" aria-label="How personal data flows from collectors to brokers to buyers"></svg></div><div class="pipe-case" aria-live="polite"></div>`;
    const s = body.querySelector("svg"), detail = body.querySelector(".pipe-case");
    function build() {
      const narrow = body.clientWidth < 640; if (L && L.narrow === narrow) return;
      s.innerHTML = ""; L = { narrow, N: {}, paths: [] };
      const box = (id, x, y, w, h, t, buyer) => { const g = svg("g", { class: buyer ? "buyer" : "box-n" }); g.appendChild(svg("rect", { x, y, width: w, height: h, rx: 4, class: buyer ? null : "f-sheet", style: buyer ? null : "stroke:var(--ink)", "stroke-width": 1.1 })); g.appendChild(svg("text", { x: x + w / 2, y: y + h / 2 + 4, "text-anchor": "middle", "font-size": narrow ? 11 : 12.5, "font-weight": 700, class: "t-ink", text: t })); s.appendChild(g); L.N[id] = { x, y, w, h, g }; };
      let W, H;
      if (!narrow) { W = 800; H = 420; box("you", 8, 192, 64, 36, "You"); COL.forEach((c, i) => box("c" + i, 118, 26 + i * 62, 170, 34, c)); BRK.forEach((b, i) => box("b" + i, 340, 110 + i * 84, 180, 42, b)); BUY.forEach((b, i) => box("y" + i, 600, 12 + i * 57, 192, 38, b[0], 1)); }
      else { W = 360; H = 760; box("you", 145, 6, 70, 32, "You"); COL.forEach((c, i) => box("c" + i, i % 2 ? 186 : 6, 74 + Math.floor(i / 2) * 46, 168, 32, c)); BRK.forEach((b, i) => box("b" + i, 60, 248 + i * 64, 240, 38, b)); BUY.forEach((b, i) => box("y" + i, i % 2 ? 186 : 6, 470 + Math.floor(i / 2) * 64, 168, 40, b[0], 1)); }
      s.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const link = (a, b, tgt) => { const A = L.N[a], B = L.N[b]; let d; if (!narrow) { const x1 = A.x + A.w, y1 = A.y + A.h / 2, x2 = B.x, y2 = B.y + B.h / 2, m = (x1 + x2) / 2; d = `M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}`; } else { const x1 = A.x + A.w / 2, y1 = A.y + A.h, x2 = B.x + B.w / 2, y2 = B.y, m = (y1 + y2) / 2; d = `M${x1},${y1} C${x1},${m} ${x2},${m} ${x2},${y2}`; } const p = svg("path", { d, class: "s-hair", "stroke-width": 1.2 }); s.insertBefore(p, s.firstChild); L.paths.push({ p, len: 0, tgt }); };
      COL.forEach((_, i) => link("you", "c" + i)); COL.forEach((_, i) => link("c" + i, "b0")); link("b0", "b1"); link("b1", "b2"); BUY.forEach((_, i) => link("b2", "y" + i, i));
      L.paths.forEach((x) => (x.len = x.p.getTotalLength()));
      BUY.forEach((b, i) => { const g = L.N["y" + i].g; g.setAttribute("tabindex", "0"); g.setAttribute("role", "button"); g.setAttribute("aria-label", b[0]); const pick = () => { sel = i; paint(); }; g.addEventListener("click", pick); g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } }); });
      L.dots = svg("g"); s.appendChild(L.dots); parts.length = 0; paint();
    }
    function paint() {
      if (!L) return;
      BUY.forEach((_, i) => L.N["y" + i].g.classList.toggle("on", i === sel));
      L.paths.forEach((x) => { const hot = x.tgt === sel; x.p.setAttribute("class", hot ? "s-spot" : "s-hair"); x.p.setAttribute("stroke-width", hot ? 2.4 : 1.2); });
      const b = BUY[sel];
      detail.innerHTML = `<h4>${b[0]}</h4><p><b>What they buy:</b> ${b[1]} <b>What for:</b> ${b[2]}</p><p class="case">${b[3]}${b[4] ? ` <a class="cite" data-ref="${b[4]}" href="#ref-${b[4]}">${b[4]}</a>` : ""}</p>`;
    }
    const parts = [], r = rng(3);
    build(); new ResizeObserver(build).observe(body);
    let acc = 0;
    const lp = loop(root, (dt) => {
      if (!L) return;
      acc += dt;
      if (acc > 0.09 && parts.length < 54) { acc = 0; const c = Math.floor(r() * COL.length), y = r() < 0.5 ? sel : Math.floor(r() * BUY.length); const d = svg("circle", { r: 3.2 }); L.dots.appendChild(d); parts.push({ route: [c, COL.length + c, 12, 13, 14 + y], leg: 0, k: 0, v: 0.7 + r() * 0.6, y, d }); }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; const path = L.paths[p.route[p.leg]];
        p.k += (dt * 150 * p.v) / path.len;
        if (p.k >= 1) { p.leg++; p.k = 0; if (p.leg >= p.route.length) { p.d.remove(); parts.splice(i, 1); continue; } }
        const q = L.paths[p.route[p.leg]], pt = q.p.getPointAtLength(p.k * q.len);
        p.d.setAttribute("cx", pt.x); p.d.setAttribute("cy", pt.y);
        p.d.style.fill = p.leg >= 2 ? "var(--spot)" : "var(--ink)";
        p.d.setAttribute("opacity", p.leg >= 4 && p.y !== sel ? 0.25 : 0.9);
      }
    });
    if (!Press.isCalm()) lp.start();
    root.addEventListener("fig:reset", () => { sel = 0; paint(); });
  });

  /* ====================================================================
     The five-minute test
     ==================================================================== */
  Press.fig("fig-scroll", (root) => {
    const body = root.querySelector(".fig-body");
    const KEY = "dfs:five";
    const CAP = ["You won't believe what happened next", "Day 214 of trying this", "POV: it's 1 a.m. and you're still here", "Nobody talks about this trick", "Wait for the end", "This changed how I see everything", "Rate this from 1 to 10", "Part 3, part 4 tomorrow", "Only real ones remember this", "I tried it so you don't have to"];
    const USERS = ["daily.dose", "clipvault", "tiny.wins", "nightowl", "feedfuel", "loopqueen", "just.one.more", "scrollclub"];
    body.innerHTML = `<div class="split phone-left"><div data-phone></div><div class="five"><p class="say" data-say>Swipe up on the phone. There is no clock and no end.</p><div class="btnrow" data-b></div><div data-g hidden></div><div data-res></div><div><div class="ctl-label"><span>Your earlier attempts, this browser</span></div><ul class="hist"></ul></div></div></div>`;
    const ph = iphone(body.querySelector("[data-phone]"), { finish: "blue", dark: true, width: "17.5rem", label: "iPhone showing an endless video feed" });
    const reels = el("div", { class: "reels", tabindex: "0", "aria-label": "Endless feed. Scroll it." }); ph.content.style.top = "0"; ph.content.appendChild(reels);
    const r = rng(11); let seed = 100, t0 = 0, running = false, done = false, auto = null;
    function addReels(n) {
      for (let i = 0; i < n; i++) {
        const rl = el("div", { class: "reel" }); const c = el("canvas"); rl.appendChild(c);
        rl.insertAdjacentHTML("beforeend", `<div class="cap"><b>@${USERS[Math.floor(r() * USERS.length)]}</b>${CAP[Math.floor(r() * CAP.length)]}</div><div class="acts"><span>${icon("heart")}${fmt.compact(800 + r() * 220000)}</span><span>${icon("chat")}${fmt.compact(20 + r() * 4000)}</span><span>${icon("bag")}</span></div>`);
        reels.appendChild(rl);
        const w = reels.clientWidth || 260, h = reels.clientHeight || 520; genArt(c, seed++, w, h);
      }
    }
    requestAnimationFrame(() => addReels(6));
    const begin = () => { if (running || done) return; running = true; t0 = performance.now(); doneBtn.disabled = false; say("Scrolling. Stop whenever you like."); };
    reels.addEventListener("scroll", () => { begin(); if (reels.scrollTop + reels.clientHeight * 3 > reels.scrollHeight) addReels(4); }, { passive: true });
    const say = (h) => (body.querySelector("[data-say]").innerHTML = h);
    const b = body.querySelector("[data-b]");
    const doneBtn = button(b, "I'm done", () => stop(), "solid"); doneBtn.disabled = true;
    const autoBtn = button(b, "Autoplay off", () => { if (auto) { clearInterval(auto); auto = null; autoBtn.textContent = "Autoplay off"; return; } begin(); autoBtn.textContent = "Autoplay on"; auto = setInterval(() => reels.scrollBy({ top: reels.clientHeight, behavior: "smooth" }), 3200); });
    function stop() {
      if (!running) return; running = false; done = true; if (auto) { clearInterval(auto); auto = null; autoBtn.textContent = "Autoplay off"; }
      const actual = (performance.now() - t0) / 1000; reels.style.pointerEvents = "none"; reels.style.filter = "grayscale(1) brightness(.5)"; doneBtn.disabled = true;
      const g = body.querySelector("[data-g]"); g.hidden = false; g.innerHTML = ""; say("<b>Before you look:</b> how long do you think that was?");
      const gr = range(g, { label: "Your guess", min: 5, max: 600, step: 5, value: 60, fmt: (v) => fmt.time(v) });
      button(g, "Show me", () => reveal(actual, gr.value), "spot").style.marginTop = "0.6rem";
    }
    function reveal(actual, guess) {
      body.querySelector("[data-g]").hidden = true;
      const h = store.get(KEY, []); h.unshift({ a: Math.round(actual), g: guess }); store.set(KEY, h.slice(0, 5));
      const max = Math.max(actual, guess), err = (guess - actual) / actual;
      body.querySelector("[data-res]").innerHTML = `<div class="vs"><div class="bar"><span>Your guess</span><i style="width:0"></i><span>${fmt.time(guess)}</span></div><div class="bar t"><span>Actual</span><i style="width:0"></i><span>${fmt.time(actual)}</span></div></div>`;
      requestAnimationFrame(() => { const bars = body.querySelectorAll(".vs i"); bars[0].style.width = (guess / max) * 100 + "%"; bars[1].style.width = (actual / max) * 100 + "%"; });
      say(Math.abs(err) < 0.15 ? "<b>Close.</b> Try again with autoplay on, and see if it holds." : err < 0 ? `<b>Off by ${Math.abs(Math.round(err * 100))}%.</b> Time slipped away. With no stopping cues, feeds make time feel shorter than it is.` : `<b>Off by ${Math.round(err * 100)}%.</b> Short sessions can feel long. It is the long, absorbed ones that vanish.`);
      paintHist();
      const again = button(body.querySelector("[data-res]"), "Try again", () => { again.remove(); reset(); }); again.style.marginTop = "0.8rem";
    }
    function paintHist() { const h = store.get(KEY, []); body.querySelector(".hist").innerHTML = h.length ? h.map((x) => `<li><span>guessed ${fmt.time(x.g)}</span><span>actually ${fmt.time(x.a)}</span></li>`).join("") : "<li><span>None yet</span><span></span></li>"; }
    function reset() { done = false; running = false; if (auto) { clearInterval(auto); auto = null; autoBtn.textContent = "Autoplay off"; } reels.style.pointerEvents = ""; reels.style.filter = ""; reels.innerHTML = ""; addReels(6); reels.scrollTop = 0; body.querySelector("[data-g]").hidden = true; body.querySelector("[data-res]").innerHTML = ""; doneBtn.disabled = true; say("Swipe up on the phone. There is no clock and no end."); }
    paintHist();
    root.addEventListener("fig:reset", reset);
  });
})();

/* Data for Sale · pull to refresh, the feed that narrows, the lender */
(function () {
  "use strict";
  const { el, svg, button, tabs, toggle, clamp, rng, icon, wait, iphone } = FK;

  /* ====================================================================
     The slot machine in your pocket
     ==================================================================== */
  Press.fig("fig-pull", (root) => {
    const body = root.querySelector(".fig-body");
    body.innerHTML = `<div class="split phone-left"><div data-phone></div><div data-side></div></div>`;
    const ph = iphone(body.querySelector("[data-phone]"), { finish: "orange", width: "17.5rem", label: "iPhone showing a notifications feed" });
    ph.content.innerHTML = `<div class="ptr-wrap" tabindex="0" aria-label="Notifications. Drag down to refresh, or press the down arrow.">
      <div class="ptr-spin"><svg viewBox="0 0 24 24">${Array.from({ length: 8 }, (_, i) => `<rect x="11" y="2" width="2" height="6" rx="1" fill="currentColor" opacity="${0.25 + i * 0.1}" transform="rotate(${i * 45} 12 12)"/>`).join("")}</svg></div>
      <div class="ptr-list"><div class="ptr-title">Notifications</div>
        <div class="n-card"><span class="av">${icon("heart")}</span><span><b>Maya liked your photo</b><small>2 hours ago</small></span></div>
        <div class="n-card"><span class="av">${icon("chat")}</span><span><b>3 new comments</b><small>Yesterday</small></span></div>
        <div class="n-card"><span class="av">${icon("bell")}</span><span><b>Memories from 2021</b><small>Monday</small></span></div></div></div>
      <div class="island-msg"><span>${icon("heart")}</span><span data-im></span></div><div class="hearts"></div>`;
    const wrap = ph.content.querySelector(".ptr-wrap"), list = ph.content.querySelector(".ptr-list"), spin = ph.content.querySelector(".ptr-spin");
    const title = list.querySelector(".ptr-title"), imsg = ph.content.querySelector(".island-msg"), hearts = ph.content.querySelector(".hearts");
    const side = body.querySelector("[data-side]");
    const WINS = [["heart", "14 new likes", "on the photo you posted last night"], ["people", "3 new followers", "including someone from school"], ["flame", "Your post is trending", "in your city right now"], ["chat", "You were mentioned", "in a comment by a friend"], ["flame", "Streak saved", "day 41, keep it going"]];
    let mode = "variable", pulls = [], since = 0, off = false, offAt = 0, busy = false;

    const tb = tabs(side, { label: "Reward schedule", value: mode, options: [{ v: "variable", t: "Unpredictable" }, { v: "fixed", t: "Every third pull" }], onChange: (v) => { mode = v; since = 0; paint(); } });
    const sw = toggle(side, { label: "Turn rewards off", value: false, onChange: (v) => { off = v; offAt = pulls.length; paint(); } });
    sw.el.style.marginTop = "0.9rem";
    side.insertAdjacentHTML("beforeend", `<div class="ctl-label" style="margin-top:1rem"><span>Your pulls</span><span class="val" data-pc></span></div><div class="ticks" aria-hidden="true"></div><div class="stats" data-st></div><p class="say" data-say>Drag the screen down and let go. Watch the island.</p>`);
    const ticks = side.querySelector(".ticks");

    // drag physics
    const screenW = () => ph.screen.clientWidth;
    let y0 = null, offset = 0;
    const thr = () => screenW() * 0.2;
    const setOff = (o, anim) => { offset = o; list.style.transition = anim ? "transform .5s cubic-bezier(.34,1.56,.64,1)" : "none"; list.style.transform = `translateY(${o}px)`; spin.style.opacity = clamp(o / thr(), 0, 1); spin.style.transform = `rotate(${o * 3}deg)`; };
    wrap.addEventListener("pointerdown", (e) => { if (busy) return; y0 = e.clientY; wrap.setPointerCapture(e.pointerId); });
    wrap.addEventListener("pointermove", (e) => { if (y0 == null) return; const dy = Math.max(0, e.clientY - y0); setOff(thr() * 1.8 * (1 - Math.exp(-dy / (thr() * 1.6)))); });
    const release = () => { if (y0 == null) return; y0 = null; if (offset >= thr()) refresh(); else setOff(0, true); };
    wrap.addEventListener("pointerup", release); wrap.addEventListener("pointercancel", release);
    wrap.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!busy) { setOff(thr(), true); refresh(); } } });

    async function refresh() {
      busy = true; setOff(thr() * 0.75, true);
      spin.animate([{ transform: "rotate(0)" }, { transform: "rotate(360deg)" }], { duration: 700, iterations: 1 });
      await wait(750);
      let win = false;
      if (!off) { if (mode === "variable") win = Math.random() < 1 / 3; else { since++; win = since % 3 === 0; } }
      pulls.push({ win, ext: off });
      const w = WINS[Math.floor(Math.random() * WINS.length)];
      const card = el("div", { class: "n-card enter " + (win ? "win" : "nil"), html: win ? `<span class="av">${icon(w[0])}</span><span><b>${w[1]}</b><small>${w[2]}</small></span>` : "No new notifications" });
      title.after(card);
      while (list.children.length > 8) list.lastChild.remove();
      setOff(0, true);
      if (win) celebrate(w[1]);
      paint(); busy = false;
    }
    function celebrate(text) {
      ph.island.classList.add("wide"); imsg.querySelector("[data-im]").textContent = text; imsg.classList.add("on");
      setTimeout(() => { imsg.classList.remove("on"); ph.island.classList.remove("wide"); }, 1700);
      if (Press.isCalm()) return;
      for (let i = 0; i < 9; i++) { const h = el("i", { html: icon("heart"), style: `left:${30 + Math.random() * 40}%;top:${30 + Math.random() * 30}%;--r:${-30 + Math.random() * 60}deg;animation-delay:${i * 60}ms` }); hearts.appendChild(h); setTimeout(() => h.remove(), 1600); }
    }
    function paint() {
      ticks.innerHTML = pulls.slice(-70).map((p) => `<i class="${p.win ? "w" : p.ext ? "x" : ""}"></i>`).join("");
      const wins = pulls.filter((p) => p.win).length; let dr = 0, cur = 0; pulls.forEach((p) => { cur = p.win ? 0 : cur + 1; dr = Math.max(dr, cur); });
      side.querySelector("[data-pc]").textContent = pulls.length ? pulls.length + " so far" : "";
      side.querySelector("[data-st]").innerHTML = `<div><small>Rewards</small><b class="spot">${wins}</b></div><div><small>Payout rate</small><b>${pulls.length ? Math.round((wins / pulls.length) * 100) : 0}%</b></div><div><small>Longest dry run</small><b>${dr}</b></div>`;
      const say = side.querySelector("[data-say]"), after = pulls.length - offAt;
      if (off) say.innerHTML = `<b>Rewards are off.</b> You have pulled ${after} time${after === 1 ? "" : "s"} since. On the fixed schedule most people notice the pattern has broken within a few pulls. On the unpredictable one, nothing always looks like it might be followed by something, so the pulling goes on. That persistence is what a feed sells.`;
      else if (mode === "fixed" && pulls.length > 3) say.innerHTML = "<b>Every third pull pays.</b> After a few rounds you can predict each reward, and predictable rewards are easier to walk away from.";
      else if (pulls.length > 3) say.innerHTML = "<b>Same payout rate, no pattern.</b> You cannot tell which pull will pay, so every empty one feels like it is due. Slot machines and notification feeds share this design.";
    }
    paint();
    root.addEventListener("fig:reset", () => { pulls = []; since = 0; off = false; sw.set(false, true); tb.set("variable", true); mode = "variable"; list.querySelectorAll(".n-card.enter").forEach((n) => n.remove()); paint(); side.querySelector("[data-say]").textContent = "Drag the screen down and let go. Watch the island."; });
  });

  /* ====================================================================
     The feed that narrows
     ==================================================================== */
  Press.fig("fig-bubble", (root) => {
    const body = root.querySelector(".fig-body");
    const T = [
      ["Science", "#2f6db5", ["Telescope finds water vapour on a distant planet", "New battery chemistry lasts twice as long", "Why memory improves after sleep", "Glacier melt is speeding up, survey finds"]],
      ["Sport", "#2e8b57", ["Underdogs win the final in extra time", "Teenage sprinter breaks a 20-year record", "The tactic that changed the match", "Fans queue overnight for derby tickets"]],
      ["Local", "#b9851b", ["Council votes on new night-bus routes", "Market street goes car-free on Sundays", "Library extends opening hours for exams", "Volunteers pull two tonnes of rubbish from the lake"]],
      ["Celebrity", "#d9301c", ["Star's surprise wedding photos leak", "Actor's furious reply to critics goes viral", "The feud everyone is talking about tonight", "You won't believe who was spotted together"]],
      ["Politics", "#6a4bb3", ["Parliament debates the new data bill", "Minister faces questions over contract", "What the budget means for students", "Opposition walks out of heated session"]],
      ["Tech", "#1f8a8a", ["New phone launches with a bigger battery", "App update quietly changes privacy settings", "Inside the chip shortage, two years on", "Why your laptop fan is so loud"]]
    ];
    const PREF = [0.15, 0.15, 0.14, 0.26, 0.15, 0.15];
    let w, hist, round, diverse = false, auto = null, feed = [];
    const r = rng(42);
    body.innerHTML = `<div class="stories"></div><div class="controls row" style="margin-top:1rem"><div class="btnrow" data-b></div><div data-t></div></div>
      <div class="bubble-row"><svg viewBox="0 0 600 112" role="img" aria-label="History of the topics in each feed"></svg><svg class="gauge" viewBox="0 0 120 120" role="img" aria-label="Feed diversity"></svg></div>
      <div class="legend">${T.map((t) => `<span><i style="background:${t[1]}"></i>${t[0]}</span>`).join("")}</div><p class="say" data-say>Tap the stories you would actually open.</p>`;
    const autoBtn = button(body.querySelector("[data-b]"), "Start the autopilot reader", () => toggleAuto(), "solid");
    tabs(body.querySelector("[data-t]"), { label: "Recommender", value: "engage", options: [{ v: "engage", t: "Maximise engagement" }, { v: "diverse", t: "With a diversity rule" }], onChange: (v) => { diverse = v === "diverse"; serve(); } });
    const [hs, gs] = body.querySelectorAll(".bubble-row svg");
    const probs = () => { const p = w.map((x) => Math.pow(x, 2.2)), s = p.reduce((a, b) => a + b, 0); return p.map((x) => (diverse ? 0.6 * (x / s) + 0.4 / 6 : x / s)); };
    const pick = (p) => { let u = r(), i = 0; while (i < p.length - 1 && u > p[i]) { u -= p[i]; i++; } return i; };
    function serve() {
      const p = probs(); feed = Array.from({ length: 6 }, () => pick(p));
      if (diverse) { const u = new Set(feed); let k = 0; while (u.size < 3 && k < 6) { const t = Math.floor(r() * 6); if (!u.has(t)) { feed[k] = t; u.add(t); } k++; } }
      const box = body.querySelector(".stories"); box.innerHTML = "";
      feed.forEach((ti, i) => { const t = T[ti]; const b = el("button", { type: "button", class: "story", style: `--c:${t[1]};animation-delay:${i * 35}ms`, html: `<small>${t[0]}</small>${t[2][Math.floor(r() * t[2].length)]}` }); b.addEventListener("click", () => engage(ti, b)); box.appendChild(b); });
      hist.push(feed.slice()); if (hist.length > 30) hist.shift(); draw();
    }
    function engage(ti, b) { if (b) b.classList.add("read"); w[ti] += 1; w = w.map((x) => Math.max(0.05, x * 0.97)); round++; setTimeout(serve, b ? 240 : 0); }
    const H = (arr) => { const c = new Array(6).fill(0); arr.forEach((t) => c[t]++); let h = 0; c.forEach((x) => { if (x) { const p = x / arr.length; h -= p * Math.log(p); } }); return h / Math.log(6); };
    function draw() {
      hs.innerHTML = ""; const cw = 600 / 30;
      hist.forEach((col, x) => col.slice().sort().forEach((t, y) => hs.appendChild(svg("rect", { x: x * cw + 2, y: 4 + y * 15, width: cw - 4, height: 13, rx: 2, fill: T[t][1] }))));
      hs.appendChild(svg("text", { x: 2, y: 108, "font-size": 11, text: "earlier feeds" })); hs.appendChild(svg("text", { x: 598, y: 108, "font-size": 11, "text-anchor": "end", text: "latest" }));
      const d = H(hist.slice(-5).flat());
      gs.innerHTML = "";
      const arc = (k) => { const a = -Math.PI / 2 + k * Math.PI * 2; return [60 + 46 * Math.cos(a), 60 + 46 * Math.sin(a)]; };
      gs.appendChild(svg("circle", { cx: 60, cy: 60, r: 46, class: "s-hair", "stroke-width": 10 }));
      const [x1, y1] = arc(Math.min(0.999, d));
      gs.appendChild(svg("path", { d: `M60,14 A46,46 0 ${d > 0.5 ? 1 : 0} 1 ${x1},${y1}`, class: "s-spot", "stroke-width": 10, "stroke-linecap": "round" }));
      gs.appendChild(svg("text", { x: 60, y: 62, "text-anchor": "middle", "font-size": 26, "font-weight": 800, class: "t-ink", text: Math.round(d * 100) + "%" }));
      gs.appendChild(svg("text", { x: 60, y: 80, "text-anchor": "middle", "font-size": 10, text: "diversity" }));
      const say = body.querySelector("[data-say]");
      const top = T[w.indexOf(Math.max(...w))][0];
      if (round > 6) say.innerHTML = diverse ? "<b>With a diversity rule</b> the feed keeps at least three topics and spends 40% of its picks exploring. Engagement may dip a little. The reader's world stays wide. That trade-off is a design choice." : d < 0.45 ? `<b>The bubble has closed around ${top}.</b> The autopilot reader leaned only slightly towards celebrity news (26% against about 15% for each other topic), yet the feed now shows little besides one subject. Early taps snowball: whatever gets clicked first gets shown more, and gets clicked more.` : "Diversity is falling as the recommender learns. Keep going.";
    }
    function toggleAuto() {
      if (auto) { clearInterval(auto); auto = null; autoBtn.textContent = "Start the autopilot reader"; body.querySelector(".stories").classList.remove("fast"); return; }
      autoBtn.textContent = "Stop the autopilot"; body.querySelector(".stories").classList.add("fast");
      auto = setInterval(() => { const ws = feed.map((t) => PREF[t]), s = ws.reduce((a, b) => a + b, 0), i = pick(ws.map((x) => x / s)); engage(feed[i], body.querySelector(".stories").children[i]); if (round > 60) toggleAuto(); }, Press.isCalm() ? 120 : 420);
    }
    function reset() { if (auto) toggleAuto(); w = new Array(6).fill(1); hist = []; round = 0; serve(); body.querySelector("[data-say]").textContent = "Tap the stories you would actually open."; }
    reset(); root.addEventListener("fig:reset", reset);
  });

  /* ====================================================================
     Same income, different answer
     ==================================================================== */
  Press.fig("fig-lender", (root) => {
    const body = root.querySelector(".fig-body");
    const B0 = 1.2, LINE = 0.6;
    const F = [["Phone", [["iPhone", 0], ["Budget Android", -0.55]]], ["Email address", [["name@provider", 0], ["sk8r1987@free", -0.45]]], ["Applied at", [["3 p.m.", 0], ["2 a.m.", -0.7]]], ["Came from", [["Price comparison", 0], ["A pop-up ad", -0.6]]], ["Typing", [["No typos", 0], ["Several typos", -0.5]]]];
    const B = [1, 1, 0, 0, 0];
    const sig = (z) => 1 / (1 + Math.exp(-z));
    const fixed = `<div class="field"><span>Monthly income</span><em>₹62,000</em></div><div class="field"><span>Existing loans</span><em>None</em></div><div class="field"><span>Missed payments</span><em>None</em></div>`;
    body.innerHTML = `<div class="forms"><div class="form"><h4>Application A</h4><span class="stamp" data-sa></span>${fixed}${F.map((f) => `<div class="field"><span>${f[0]}</span><em>${f[1][0][0]}</em></div>`).join("")}<p class="prob" data-pa></p></div>
      <div class="form"><h4>Application B</h4><span class="stamp" data-sb></span>${fixed}${F.map((f, i) => `<div class="field"><span>${f[0]}</span><span class="choice" data-f="${i}">${f[1].map((o, j) => `<button type="button" data-j="${j}" aria-pressed="${B[i] === j}">${o[0]}</button>`).join("")}</span></div>`).join("")}<p class="prob" data-pb></p></div></div>
      <details class="box"><summary>Open the box: how the score is made</summary><div data-eq></div><table class="wt" data-wt></table><p class="say">Neither applicant's money changed. Only their habits did. A real applicant would usually see the decision and nothing else, which is why algorithmic decisions need to be explainable and open to challenge.</p></details>`;
    FK.tex(body.querySelector("[data-eq]"), "p(\\text{repay}) = \\frac{1}{1 + e^{-(\\beta_0 + \\sum_i \\beta_i x_i)}}", true);
    body.querySelectorAll("[data-f]").forEach((g) => g.addEventListener("click", (e) => { const b = e.target.closest("[data-j]"); if (!b) return; B[+g.dataset.f] = +b.dataset.j; g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); score(); }));
    let last = null;
    function score() {
      const zB = B0 + F.reduce((a, f, i) => a + f[1][B[i]][1], 0), pA = sig(B0), pB = sig(zB);
      const sa = body.querySelector("[data-sa]"), sb = body.querySelector("[data-sb]");
      sa.className = "stamp " + (pA >= LINE ? "ok" : "no"); sa.textContent = pA >= LINE ? "Approved" : "Declined";
      const ok = pB >= LINE; sb.className = "stamp " + (ok ? "ok" : "no") + (last !== null && last !== ok ? " bump" : ""); sb.textContent = ok ? "Approved" : "Declined"; last = ok;
      body.querySelector("[data-pa]").innerHTML = `Predicted chance of repaying: <b>${Math.round(pA * 100)}%</b>. Approval needs ${LINE * 100}%.`;
      body.querySelector("[data-pb]").innerHTML = `Predicted chance of repaying: <b>${Math.round(pB * 100)}%</b>.`;
      body.querySelector("[data-wt]").innerHTML = `<tr><td>Starting score, β₀</td><td>+${B0.toFixed(2)}</td></tr>` + F.map((f, i) => { const v = f[1][B[i]][1]; return `<tr><td>${f[0]}: ${f[1][B[i]][0]}</td><td class="${v < 0 ? "neg" : ""}">${v === 0 ? "0.00" : v.toFixed(2)}</td></tr>`; }).join("") + `<tr><td><b>Application B, total</b></td><td><b>${zB.toFixed(2)} → ${Math.round(pB * 100)}%</b></td></tr>`;
    }
    score();
    root.addEventListener("fig:reset", () => { [1, 1, 0, 0, 0].forEach((v, i) => (B[i] = v)); body.querySelectorAll("[data-f]").forEach((g, i) => g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.j === B[i])))); last = null; score(); });
  });
})();

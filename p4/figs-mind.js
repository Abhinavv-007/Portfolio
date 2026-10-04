/* The Outsourced Reality · realism to traceability, head start, liar's dividend, deference test, synthetic crowd */
(function () {
  "use strict";
  const { el, svg, range, toggle, button, fmt, clamp, rng, wait, tween, iphone } = FK;

  /* ====================================================================
     What makes a video count as evidence?
     ==================================================================== */
  Press.fig("fig-trace", (root) => {
    const body = root.querySelector(".fig-body");
    const S = [
      ["Looks completely real", "Easy to fake now", 40, 3, 0],
      ["Shared 50,000 times", "Easy to fake", 25, 0, 0],
      ["Confident caption from a big account", "Easy to fake", 20, 0, 0],
      ["Original file kept, with a matching hash", "Hard to fake", 4, 15, 1],
      ["Content credentials intact from the camera", "Hard to fake", 3, 20, 1],
      ["A named source who filmed it, on record", "Hard to fake", 5, 17, 1],
      ["Independent footage of the same moment", "Hard to fake", 5, 25, 1],
      ["Shadows, weather and landmarks match the place", "Hard to fake", 3, 20, 1]
    ];
    body.innerHTML = `<div class="split"><div class="trace-list"></div><div><div class="bars"><div><span>How convincing it feels</span><span class="bar"><i data-f></i></span><b data-fv>0</b></div><div><span>How much it should count</span><span class="bar spot"><i data-c></i></span><b data-cv>0</b></div></div><p class="say" data-say>Switch on the signals. Start with the first three.</p></div></div>`;
    const on = new Array(S.length).fill(false), list = body.querySelector(".trace-list");
    S.forEach((x, i) => { const b = el("button", { type: "button", class: "sig" + (x[4] ? " hard" : ""), "aria-pressed": "false", html: `<i></i><span>${x[0]}</span><small>${x[1]}</small>` }); b.addEventListener("click", () => { on[i] = !on[i]; b.setAttribute("aria-pressed", String(on[i])); paint(); }); list.appendChild(b); });
    function paint() {
      const f = Math.min(100, S.reduce((a, x, i) => a + (on[i] ? x[2] : 0), 0)), c = Math.min(100, S.reduce((a, x, i) => a + (on[i] ? x[3] : 0), 0));
      body.querySelector("[data-f]").style.setProperty("--v", f + "%"); body.querySelector("[data-c]").style.setProperty("--v", c + "%");
      body.querySelector("[data-fv]").textContent = f; body.querySelector("[data-cv]").textContent = c;
      const surf = on.slice(0, 3).filter(Boolean).length, proc = on.slice(3).filter(Boolean).length;
      body.querySelector("[data-say]").innerHTML = !surf && !proc ? "Switch on the signals. Start with the first three." : surf && !proc ? `<b>It feels ${f >= 60 ? "very " : ""}convincing, and almost none of that should count.</b> Realism, reach and confident captions are exactly what a generator can produce on demand.` : !surf ? `<b>Less exciting, far stronger.</b> Each of these signals ties the video to a place, a person or an unbroken file history. This is where trust has to move.` : c >= 70 ? "<b>Now it counts.</b> Notice that almost all of the weight comes from the slow, boring signals, not the ones that made it go viral." : `<b>Feels ${f}, counts ${c}.</b> The gap between the two bars is the space a fake lives in.`;
    }
  });

  /* ---------- Head start: the tempo sentence ---------- */
  (function tempo() {
    const p = document.getElementById("rx-tempo"); if (!p) return;
    const big = (v) => (v >= 8e9 ? "more people than are alive" : v >= 1e9 ? (v / 1e9).toFixed(1) + " billion" : v >= 1e6 ? (v / 1e6).toFixed(1) + " million" : fmt.int(Math.round(v / 100) * 100));
    Press.reactive(p, { make: 5, check: 6, dbl: 45 }, (m) => {
      const lead = m.check * 60 - m.make;
      return lead <= 0 ? { lead: "nothing at all", crowd: "only its first 100" } : { lead: fmt.time(lead * 60), crowd: big(100 * Math.pow(2, lead / m.dbl)) };
    });
  })();

  /* ====================================================================
     The liar's dividend
     ==================================================================== */
  Press.fig("fig-dividend", (root) => {
    const body = root.querySelector(".fig-body");
    body.innerHTML = `<p class="say" style="margin-top:0;border-left-color:var(--ink)"><b>An authentic recording</b> of an official, verified by three newsrooms, is published. One hundred people watch it.</p><div class="split"><div class="dots"><svg viewBox="0 0 300 300" role="img" aria-label="100 people: who believes the real recording, who is unsure, who dismisses it"></svg><div class="legend"><span><i style="background:var(--ink)"></i>Believe it</span><span><i style="background:var(--hair-2)"></i>Unsure</span><span><i style="background:var(--spot)"></i>Dismiss it as fake</span></div></div><div><div class="controls" data-c></div><div class="stats" data-st></div><p class="say" data-say></p></div></div>`;
    const s = body.querySelector("svg"), r = rng(23), u = [], dots = [];
    for (let i = 0; i < 100; i++) { u.push(r()); const d = svg("circle", { cx: 15 + (i % 10) * 30, cy: 15 + Math.floor(i / 10) * 30, r: 11 }); s.appendChild(d); dots.push(d); }
    const order = u.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const m = { b: 20, deny: false, cred: false }, c = body.querySelector("[data-c]");
    range(c, { label: "People who think most viral videos could be fake", min: 0, max: 90, value: 20, fmt: (v) => v + "%", onInput: (v) => { m.b = v; paint(); } });
    toggle(c, { label: "The official says the recording is AI", value: false, onChange: (v) => { m.deny = v; paint(); } });
    toggle(c, { label: "The recording carries content credentials", value: false, onChange: (v) => { m.cred = v; paint(); } });
    function paint() {
      const b = m.b / 100, dis = clamp(0.03 + 0.55 * b * (m.deny ? 1.5 : 1) * (m.cred ? 0.45 : 1), 0, 0.95), uns = clamp(0.06 + 0.35 * b * (m.cred ? 0.6 : 1), 0, 1 - dis);
      const nd = Math.round(dis * 100), nu = Math.round(uns * 100), nb = 100 - nd - nu;
      order.forEach((idx, k) => { dots[idx].style.fill = k < nd ? "var(--spot)" : k < nd + nu ? "var(--hair-2)" : "var(--ink)"; });
      body.querySelector("[data-st]").innerHTML = `<div><small>Believe the real recording</small><b>${nb}</b></div><div><small>Unsure</small><b>${nu}</b></div><div><small>Dismiss it as fake</small><b class="spot">${nd}</b></div>`;
      body.querySelector("[data-say]").innerHTML = m.deny && m.b >= 40 ? `<b>This is the liar's dividend.</b> No fake was made. The general belief that fakes are everywhere was enough for ${nd} people to wave away something real.` : m.cred ? "<b>Provenance helps, but does not erase doubt.</b> A verifiable history gives undecided people something firmer than a feeling to stand on." : m.b < 15 ? "When few people expect fakes, a verified recording is mostly taken at its word." : `<b>Doubt grows with the belief that fakes are common,</b> even though this recording is real. Now let the official deny it.`;
    }
    paint();
  });

  /* ====================================================================
     The deference test
     ==================================================================== */
  Press.fig("fig-defer", (root) => {
    const body = root.querySelector(".fig-body");
    const Q = [
      ["Which is bigger, 9.11 or 9.9?", "9.11 is bigger, since 11 is more than 9.", false, "9.9 is bigger. 9.90 is more than 9.11."],
      ["What is the capital of Australia?", "Canberra.", true],
      ["How many times does the letter r appear in “strawberry”?", "Two.", false, "Three: st-r-awbe-r-r-y."],
      ["What is 17 × 24?", "408.", true],
      ["Is the Great Wall of China visible from the Moon with the naked eye?", "Yes. It is the only human-made structure visible from the Moon.", false, "No. It is far too narrow to see from the Moon without aid."],
      ["Who showed that people remember where to find information online rather than the information itself?", "Sparrow, Liu and Wegner, in Science, 2011.", true],
      ["Who coined the phrase “liar's dividend”?", "Daniel Kahneman, in Thinking, Fast and Slow (2011).", false, "Robert Chesney and Danielle Citron, in their 2019 law review article on deepfakes."],
      ["What does SHA-256 output?", "A 256-bit fingerprint, usually written as 64 hexadecimal characters.", true]
    ];
    body.innerHTML = `<div class="split phone-left"><div data-phone></div><div class="defer-score"><div class="stats" data-st></div><p class="say" data-say>Eight questions. The assistant always sounds sure. Accept its answer, or spend a few seconds checking.</p><div class="btnrow" data-b style="margin-top:.8rem"></div><div data-list></div></div></div>`;
    const ph = iphone(body.querySelector("[data-phone]"), { finish: "blue", dark: true, label: "Chat with an assistant" });
    ph.content.innerHTML = `<div class="chat"><div class="chat-log" aria-live="polite"></div><div class="chat-act"><button class="acc" type="button">Accept</button><button class="chk" type="button">Check it</button></div></div>`;
    const log = ph.content.querySelector(".chat-log"), acc = ph.content.querySelector(".acc"), chk = ph.content.querySelector(".chk");
    let i = 0, res = [], checkTime = 0, busy = false, run = 0;
    const add = (cls, html) => { const b = el("div", { class: "bub " + cls, html }); log.appendChild(b); log.scrollTop = log.scrollHeight; return b; };
    const stats = () => {
      const checked = res.filter((r) => r.checked).length, done = i >= Q.length;
      const accWrong = res.filter((r) => !r.checked && !r.ok).length;
      body.querySelector("[data-st]").innerHTML = `<div><small>Answered</small><b>${res.length} of 8</b></div><div><small>Checked</small><b>${checked}</b></div><div><small>Seconds spent checking</small><b>${checkTime.toFixed(0)}</b></div><div><small>Wrong answers you accepted</small><b class="spot">${done ? accWrong : "?"}</b></div>`;
    };
    async function ask() {
      const my = run;
      if (i >= Q.length) return finish();
      busy = true; acc.disabled = chk.disabled = true;
      add("me", Q[i][0]); await wait(350);
      const t = add("ai", `<span class="typing"><i></i><i></i><i></i></span>`); await wait(700); if (my !== run) return;
      t.innerHTML = `${Q[i][1]}<span class="conf">Confidence: high</span>`; log.scrollTop = log.scrollHeight;
      busy = false; acc.disabled = chk.disabled = false; stats();
    }
    acc.addEventListener("click", () => { if (busy) return; res.push({ checked: false, ok: Q[i][2] }); i++; ask(); });
    chk.addEventListener("click", async () => {
      if (busy) return; busy = true; acc.disabled = chk.disabled = true; const my = run;
      const b = add("ai", `Checking sources<div class="checkbar"><i></i></div>`), bar = b.querySelector("i"), t0 = performance.now();
      await tween(2600, (k) => (bar.style.width = k * 100 + "%"), (k) => k); if (my !== run) return;
      checkTime += (performance.now() - t0) / 1000 || 2.6; b.remove();
      const q = Q[i]; add("verdict " + (q[2] ? "right" : "wrong"), q[2] ? "Checked: the answer holds up." : "Checked: wrong. " + q[3]);
      res.push({ checked: true, ok: q[2] }); i++; await wait(500); ask();
    });
    function finish() {
      acc.disabled = chk.disabled = true; stats();
      const wrong = Q.filter((q) => !q[2]).length, caught = res.filter((r, k) => r.checked && !Q[k][2]).length, accWrong = res.filter((r) => !r.checked && !r.ok).length, wasted = res.filter((r, k) => r.checked && Q[k][2]).length;
      add("ai", `Done. Thanks for chatting!<span class="conf">Confidence: high</span>`);
      body.querySelector("[data-say]").innerHTML = accWrong === 0 ? `<b>You caught all ${wrong} wrong answers.</b> ${wasted ? `You also spent time checking ${wasted} that were fine. That is the cost of calibration, and it is worth paying when stakes are high.` : "Perfectly calibrated, or very suspicious."}` : `<b>You took ${accWrong} wrong answer${accWrong > 1 ? "s" : ""} on board,</b> each delivered with the same confidence as the right ones. You caught ${caught} of ${wrong}. Fluency told you nothing about which was which.`;
      body.querySelector("[data-list]").innerHTML = `<ol>${Q.map((q, k) => `<li class="${!res[k].checked && !q[2] ? "miss" : ""}">${q[2] ? "Right" : "Wrong"}${res[k].checked ? ", you checked" : ", you accepted"}${q[2] ? "" : `: ${q[3]}`}</li>`).join("")}</ol>`;
    }
    function reset() { run++; i = 0; res = []; checkTime = 0; busy = false; log.innerHTML = ""; body.querySelector("[data-list]").innerHTML = ""; body.querySelector("[data-say]").textContent = "Eight questions. The assistant always sounds sure. Accept its answer, or spend a few seconds checking."; stats(); ask(); }
    button(body.querySelector("[data-b]"), "Start over", reset);
    stats();
    FK.whenVisible(root, ask, 0.3);
    root.addEventListener("fig:reset", reset);
  });

  /* ====================================================================
     How big is the crowd, really?
     ==================================================================== */
  Press.fig("fig-crowd", (root) => {
    const body = root.querySelector(".fig-body");
    const HUMAN = { a: ["Finally someone said it.", "Agree, and I live near there.", "This matches what I saw at the meeting.", "Fair point, though the numbers need checking."], d: ["That is not what the report says.", "Source? This looks cut from a longer clip.", "I was there. This is misleading.", "Read the whole statement before sharing."], n: ["Does anyone have the original?", "Waiting for the full story.", "Interesting. Following."] };
    const BOT = ["This is the truth they don't want you to see.", "Everyone needs to see this.", "100% agree. Share it.", "Exactly right. Wake up."];
    body.innerHTML = `<div class="split"><div><div class="dots"><svg viewBox="0 0 400 200" role="img" aria-label="200 replies coloured by stance"></svg></div><div class="legend"><span><i style="background:var(--spot)"></i>Agrees</span><span><i style="background:var(--ink)"></i>Disagrees</span><span><i style="background:var(--hair-2)"></i>Neutral</span><span data-botleg hidden><i style="background:transparent;border:2px solid var(--spot)"></i>Written by a machine</span></div><div class="controls" data-c></div></div><div><div class="stats" data-st></div><small style="display:block;margin-top:1rem;font:700 .78rem/1.3 var(--f-sans);color:var(--grey)">WHAT A READER SEES FIRST</small><div class="replies" aria-live="polite"></div></div></div><p class="say" data-say></p>`;
    const s = body.querySelector("svg"), dots = [];
    for (let k = 0; k < 200; k++) { const d = svg("circle", { cx: 10 + (k % 20) * 20, cy: 10 + Math.floor(k / 20) * 20, r: 7.5, "stroke-width": 2.5 }); s.appendChild(d); dots.push(d); }
    const m = { bots: 30, reveal: false, first: true }, c = body.querySelector("[data-c]");
    range(c, { label: "Replies written by machines", min: 0, max: 80, value: 30, fmt: (v) => v + "%", onInput: (v) => { m.bots = v; paint(); } });
    toggle(c, { label: "Machine replies arrive first", value: true, onChange: (v) => { m.first = v; paint(); } });
    toggle(c, { label: "Reveal who is a machine", value: false, onChange: (v) => { m.reveal = v; paint(); } });
    const r0 = rng(3), shuffle = Array.from({ length: 200 }, (_, k) => [r0(), k]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    function paint() {
      const nb = Math.round(m.bots * 2), nh = 200 - nb, ha = Math.round(nh * 0.3), hd = Math.round(nh * 0.5);
      const items = [];
      for (let k = 0; k < nb; k++) items.push({ bot: true, st: "a" });
      for (let k = 0; k < nh; k++) items.push({ bot: false, st: k < ha ? "a" : k < ha + hd ? "d" : "n" });
      const mixed = shuffle.map((k) => items[k]);
      mixed.forEach((it, k) => { const d = dots[k], col = it.st === "a" ? "var(--spot)" : it.st === "d" ? "var(--ink)" : "var(--hair-2)"; d.style.fill = m.reveal && it.bot ? "transparent" : col; d.style.stroke = m.reveal && it.bot ? "var(--spot)" : "none"; });
      body.querySelector("[data-botleg]").hidden = !m.reveal;
      const shown = (nb + ha) / 200;
      body.querySelector("[data-st]").innerHTML = `<div><small>Real people who agree</small><b>30%</b></div><div><small>Replies that agree</small><b class="spot">${Math.round(shown * 100)}%</b></div><div><small>Looks like</small><b>${shown > 0.5 ? "A majority" : shown > 0.35 ? "A big minority" : "A minority"}</b></div>`;
      const first = (m.first ? mixed.slice().sort((a, b) => b.bot - a.bot) : mixed).slice(0, 4), rr = rng(9);
      body.querySelector(".replies").innerHTML = first.map((it, k) => { const pool = it.bot ? BOT : HUMAN[it.st], txt = pool[Math.floor(rr() * pool.length)], hue = Math.floor(rr() * 360); return `<div class="reply ${it.bot ? "bot" : ""}" style="animation-delay:${k * 60}ms"><span class="av" style="background:hsl(${hue} 45% 62%)"></span><div><b>${it.bot ? "user" + (10000 + Math.floor(rr() * 89999)) : ["mira.k", "dev_ops_sam", "lena_writes", "o.adeyemi", "tom.h", "priya_r"][Math.floor(rr() * 6)]}</b>${it.bot && m.reveal ? '<span class="tag">machine</span>' : ""} <small>${k + 1}m</small><br>${txt}</div></div>`; }).join("");
      body.querySelector("[data-say]").innerHTML = nb === 0 ? "<b>No machines:</b> the replies are an honest, if noisy, sample of what people think." : `<b>Only 30% of real people agree, but ${Math.round(shown * 100)}% of the replies do.</b> ${m.first ? "And because machine replies come first, the opening screen looks unanimous. " : ""}Synthetic media can fabricate events. Synthetic consensus fabricates publics.`;
    }
    paint();
  });
})();

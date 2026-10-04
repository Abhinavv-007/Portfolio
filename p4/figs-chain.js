/* The Outsourced Reality · ear hash, two chains, who-makes/who-reads, pairs, hash lab */
(function () {
  "use strict";
  const { el, svg, button, fmt, clamp, tween, sha256 } = FK;

  /* ---------- Ear: the fingerprint of this second ---------- */
  (function ear() {
    const out = document.getElementById("earHash"); if (!out || !window.crypto || !crypto.subtle) return;
    const tick = async () => { const h = await sha256(new Date().toISOString().slice(0, 19)); out.textContent = h.slice(0, 8) + " " + h.slice(8, 16); };
    tick(); setInterval(() => { if (!document.hidden) tick(); }, 1000);
  })();

  /* ====================================================================
     Two chains (scroll story)
     ==================================================================== */
  Press.fig("story-chains", (root) => {
    const host = root.querySelector(".chains");
    const E = ["Creation", "Capture", "Storage", "Distribution", "Interpretation", "Verification"];
    const J = ["Exposure", "Attention", "Interpretation", "Reliance", "Deference", "Dependency"];
    const narrow = host.clientWidth < 560;
    host.innerHTML = `<svg viewBox="0 0 ${narrow ? "360 292" : "600 330"}" role="img" aria-label="Two chains of six links each. Links turn red as the clip breaks them."></svg>
      <div class="chain-read"><div><small>Evidence links holding</small><b data-e>6 of 6</b></div><div><small>Judgment links holding</small><b data-j>6 of 6</b></div><div><small>Times shared</small><b class="spot" data-s>0</b></div></div>
      <p class="chain-note" aria-live="polite"></p>`;
    const s = host.querySelector("svg"), X = (i) => (narrow ? 28 + i * 60.8 : 50 + i * 100), RY = narrow ? [84, 222] : [100, 245], NR = narrow ? 13 : 17, TY = narrow ? [18, 156] : [26, 171];
    s.appendChild(svg("text", { x: 0, y: TY[0], class: "t-head", "font-size": 19, text: "The evidence chain" }));
    s.appendChild(svg("text", { x: 0, y: TY[1], class: "t-head", "font-size": 19, text: "The judgment chain" }));
    const links = [], nodes = [];
    [E, J].forEach((row, r) => {
      for (let i = 0; i < 5; i++) { const l = svg("line", { x1: X(i) + NR + 1, x2: X(i + 1) - NR - 1, y1: RY[r], y2: RY[r], class: "link" }); s.appendChild(l); links.push(l); }
      row.forEach((t, i) => {
        const g = svg("g", { class: "node", transform: `translate(${X(i)},${RY[r]})` });
        g.appendChild(svg("circle", { r: NR }));
        g.appendChild(svg("path", { d: "M-6,-6L6,6M6,-6L-6,6", class: "x" }));
        g.appendChild(svg("text", { y: narrow ? (i % 2 ? 50 : 31) : 38, "text-anchor": "middle", text: t }));
        s.appendChild(g); nodes.push(g);
      });
    });
    const burst = svg("g", { class: "burst" }); s.appendChild(burst);
    const tok = svg("g", { class: "tok" });
    tok.appendChild(svg("rect", { x: -26, y: -15, width: 52, height: 30, rx: 15, class: "f-sheet", stroke: "var(--ink)", "stroke-width": 1.5 }));
    [0.6, 1, 0.75, 0.9, 0.5].forEach((h, k) => { const b = svg("rect", { x: -15 + k * 6.5, y: -9 * h, width: 3.5, height: 18 * h, rx: 1.5, class: "bar" }); b.style.animationDelay = k * 0.13 + "s"; tok.appendChild(b); });
    s.appendChild(tok);
    const STEPS = [
      { bad: [0], at: [0, 0], shares: 0, note: "Thirty seconds of a voice, with no event behind it." },
      { bad: [0, 1, 2], at: [0, 2], shares: 0, note: "Re-recorded, metadata gone. There is no original to check." },
      { bad: [0, 1, 2, 3], at: [0, 3], shares: 12400, note: "Thousands of shares before anyone listens twice." },
      { bad: [0, 1, 2, 3, 4, 5], at: [0, 5], shares: 48200, note: "Judged by how real it sounds. The check arrives six hours late." },
      { bad: [0, 1, 2, 3, 4, 5, 6, 7], at: [1, 1], shares: 61900, note: "A chosen feed, a few seconds of attention." },
      { bad: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], at: [1, 4], shares: 70300, note: "A fluent answer is accepted without checking." },
      { bad: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], at: [1, 5], shares: 74800, note: "Next time, nobody asks at all. Both chains have failed." }
    ];
    let shares = 0, cur = -1, burstDone = false;
    const shareOut = host.querySelector("[data-s]");
    function go(i) {
      i = clamp(i, 0, STEPS.length - 1); if (i === cur) return; cur = i;
      const st = STEPS[i];
      nodes.forEach((n, k) => n.classList.toggle("bad", st.bad.includes(k)));
      links.forEach((l, k) => { const a = k < 5 ? k : k + 1; l.classList.toggle("bad", st.bad.includes(a) && st.bad.includes(a + 1)); });
      tok.style.transform = `translate(${X(st.at[1])}px, ${RY[st.at[0]] - (narrow ? 36 : 44)}px)`;
      const e = 6 - st.bad.filter((k) => k < 6).length, j = 6 - st.bad.filter((k) => k >= 6).length;
      host.querySelector("[data-e]").textContent = e + " of 6"; host.querySelector("[data-j]").textContent = j + " of 6";
      host.querySelector("[data-e]").classList.toggle("spot", e < 6); host.querySelector("[data-j]").classList.toggle("spot", j < 6);
      host.querySelector(".chain-note").textContent = st.note;
      const from = shares, to = st.shares; shares = to;
      tween(900, (k) => (shareOut.textContent = fmt.int(from + (to - from) * k)));
      if (i >= 2 && !burstDone) { burstDone = true; spray(); }
    }
    function spray() {
      for (let k = 0; k < 26; k++) {
        const c = svg("circle", { cx: X(3), cy: RY[0], r: 3 + Math.random() * 2.5 }); burst.appendChild(c);
        const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 60;
        c.style.transition = `transform 1.1s var(--ease) ${k * 0.02}s, opacity 1.6s ease ${0.6 + k * 0.02}s`;
        requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d * 0.6}px)`; c.style.opacity = 0; }));
      }
      setTimeout(() => { burst.innerHTML = ""; }, 3200);
    }
    go(0);
    Press.scrolly(root, { step(i) { go(Math.max(0, i)); } });
  });

  /* ====================================================================
     Who makes it, and who reads it?
     ==================================================================== */
  Press.fig("fig-quad", (root) => {
    const body = root.querySelector(".fig-body");
    const Q = {
      "00": ["The old baseline", "A reporter photographs a flood. You look at the picture and decide what it shows.", "Records were never perfect: framing, cropping and honest mistakes have always mattered. But faking this picture used to be costly, and the judging was yours."],
      "10": ["Synthetic evidence", "A generated video of the same flood. You still judge it yourself, by eye.", "The evidence side breaks. Looking real no longer signals being real, and your eyes are the only check left."],
      "01": ["Outsourced judgment", "The real photograph, but an assistant tells you what it means and you never look closely.", "The judgment side thins. The record is sound, but the summary chooses what to keep, and you stop checking."],
      "11": ["Outsourced reality", "A generated flood video, summarised and vouched for by an assistant. You read the summary.", "Both chains fail at once. The machine made what you saw and the machine told you what it meant."]
    };
    body.innerHTML = `<div class="quad"><svg viewBox="-34 -14 448 438" role="img" aria-label="A square. Across: who makes what you see. Up: who reads it for you. Drag the dot."></svg><div class="quad-card" aria-live="polite"></div></div>`;
    const s = body.querySelector("svg"), S = 360, x0 = 20, y0 = 10;
    const heat = svg("g"); s.appendChild(heat);
    const N = 12, cell = S / N;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = (i + 0.5) / N, y = 1 - (j + 0.5) / N;
      heat.appendChild(svg("rect", { x: x0 + i * cell, y: y0 + j * cell, width: cell + 0.5, height: cell + 0.5, class: "f-spot", opacity: (0.04 + 0.2 * x + 0.2 * y + 0.36 * x * y).toFixed(3) }));
    }
    s.appendChild(svg("rect", { x: x0, y: y0, width: S, height: S, class: "s-ink", "stroke-width": 1.5 }));
    s.appendChild(svg("line", { x1: x0 + S / 2, x2: x0 + S / 2, y1: y0, y2: y0 + S, class: "s-ink", "stroke-dasharray": "3 4" }));
    s.appendChild(svg("line", { x1: x0, x2: x0 + S, y1: y0 + S / 2, y2: y0 + S / 2, class: "s-ink", "stroke-dasharray": "3 4" }));
    [["00", 0, 1], ["10", 1, 1], ["01", 0, 0], ["11", 1, 0]].forEach(([k, cx, cy]) => {
      const t = svg("text", { x: x0 + cx * S / 2 + S / 4, y: y0 + cy * S / 2 + S / 4 + 5, "text-anchor": "middle", "font-size": 15, class: "t-head cell", text: Q[k][0] });
      t.addEventListener("click", () => set(cx * 0.5 + 0.25, (1 - cy) * 0.5 + 0.25, true)); s.appendChild(t);
    });
    s.appendChild(svg("text", { x: x0, y: y0 + S + 22, "font-size": 12, text: "A person records it" }));
    s.appendChild(svg("text", { x: x0 + S, y: y0 + S + 22, "font-size": 12, "text-anchor": "end", text: "A machine generates it" }));
    s.appendChild(svg("text", { x: x0 + S / 2, y: y0 + S + 40, "font-size": 13, "font-weight": 800, "text-anchor": "middle", class: "t-ink", text: "Who makes what you see" }));
    const yl = (t, y, anchor, w) => s.appendChild(svg("text", { transform: `translate(${x0 - 10},${y}) rotate(-90)`, "font-size": 12, "font-weight": w || 500, "text-anchor": anchor, class: w ? "t-ink" : null, text: t }));
    yl("You read it yourself", y0 + S, "start"); yl("A machine reads it for you", y0, "end");
    const puck = svg("g", { class: "puck", tabindex: 0, role: "slider", "aria-label": "Position. Use arrow keys." });
    puck.appendChild(svg("circle", { r: 20, class: "f-paper", stroke: "var(--ink)", "stroke-width": 2.5 }));
    puck.appendChild(svg("circle", { r: 7, class: "f-spot" }));
    s.appendChild(puck);
    const card = body.querySelector(".quad-card");
    let px = 0.2, py = 0.2, lastKey = "";
    function set(x, y, anim) {
      const fx = px, fy = py; x = clamp(x, 0, 1); y = clamp(y, 0, 1);
      const paint = (k) => { px = fx + (x - fx) * k; py = fy + (y - fy) * k; draw(); };
      if (anim) tween(500, paint); else paint(1);
    }
    function draw() {
      puck.setAttribute("transform", `translate(${x0 + px * S},${y0 + (1 - py) * S})`);
      const key = (px >= 0.5 ? "1" : "0") + (py >= 0.5 ? "1" : "0"), q = Q[key];
      if (key !== lastKey) {
        lastKey = key;
        card.innerHTML = `<h4>${q[0]}</h4><p class="eg">${q[1]}</p><p>${q[2]}</p><div class="bars"><div><span>Evidence chain strain</span><span class="bar"><i data-b0></i></span><b data-v0></b></div><div><span>Judgment chain strain</span><span class="bar"><i data-b1></i></span><b data-v1></b></div><div><span>Both at once</span><span class="bar spot"><i data-b2></i></span><b data-v2></b></div></div>`;
        card.classList.remove("swap"); void card.offsetWidth; card.classList.add("swap");
      }
      [px, py, px * py].forEach((v, k) => { card.querySelector(`[data-b${k}]`).style.setProperty("--v", v * 100 + "%"); card.querySelector(`[data-v${k}]`).textContent = Math.round(v * 100) + "%"; });
    }
    const local = (e) => { const p = s.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(s.getScreenCTM().inverse()); return [(q.x - x0) / S, 1 - (q.y - y0) / S]; };
    let drag = false;
    s.addEventListener("pointerdown", (e) => { drag = true; s.setPointerCapture(e.pointerId); const [x, y] = local(e); set(x, y, !e.target.closest(".puck")); });
    s.addEventListener("pointermove", (e) => { if (!drag) return; const [x, y] = local(e); set(x, y); });
    s.addEventListener("pointerup", () => (drag = false)); s.addEventListener("pointercancel", () => (drag = false));
    puck.addEventListener("keydown", (e) => { const d = { ArrowRight: [0.05, 0], ArrowLeft: [-0.05, 0], ArrowUp: [0, 0.05], ArrowDown: [0, -0.05] }[e.key]; if (d) { e.preventDefault(); set(px + d[0], py + d[1]); } });
    draw();
    FK.whenVisible(root, () => set(0.86, 0.9, true));
  });

  /* ====================================================================
     Four pairs: sort, then flip
     ==================================================================== */
  Press.fig("fig-pairs", (root) => {
    const body = root.querySelector(".fig-body");
    const P = [
      { k: "Information or evidence?", q: "A clip of a flooded street is posted with no date, no place and no uploader.", a: ["Information", "Evidence"], right: 0, h: "Information, not yet evidence", e: "Information is content. It becomes evidence only when it is tied to a claim through its source, context, integrity and relevance. Until someone knows when and where this was filmed, it cannot support anything." },
      { k: "Trust or belief?", q: "You accept a claim mainly because it fits what you already think.", a: ["Trust", "Belief"], right: 1, h: "Belief, without trust", e: "Belief is accepting a claim. Trust is a relationship: you make yourself vulnerable to a source because of its competence, honesty or process. Fit with your views is neither." },
      { k: "Verification or suspicion?", q: "You assume every video of a politician is probably fake, and move on.", a: ["Verification", "Suspicion"], right: 1, h: "Suspicion, not verification", e: "Suspicion is a feeling of doubt. Verification is a disciplined process: check the source, the original, the context and other reports. Blanket doubt feels sceptical but abandons judgment as surely as gullibility does." },
      { k: "Judgment or truth?", q: "You compare two reports, check who filmed the clip, and decide you are fairly, not fully, sure.", a: ["Judgment", "Truth"], right: 0, h: "Judgment, about truth", e: "Truth is about the world. Judgment is the human capacity to weigh reasons and decide how much confidence is warranted. You can judge well and still be wrong; the habit is what protects you." }
    ];
    body.innerHTML = `<div class="pairs"></div><p class="pair-score" aria-live="polite">0 of 4 sorted.</p>`;
    const wrap = body.querySelector(".pairs"), got = {};
    P.forEach((p, i) => {
      const c = el("div", { class: "pcard", html: `<div class="pcard-in"><div class="pface front"><small>${p.k}</small><p class="q">${p.q}</p><div class="opts"></div></div><div class="pface back" aria-hidden="true"><small>${p.k}</small><h4><span class="verdict"></span>${p.h}</h4><p>${p.e}</p><button class="again" type="button">Turn back</button></div></div>` });
      p.a.forEach((t, j) => button(c.querySelector(".opts"), t, () => {
        got[i] = j === p.right;
        c.querySelector(".verdict").textContent = got[i] ? `You said ${t}. So does the paper.` : `You said ${t}. The paper draws the line differently.`;
        c.classList.add("flipped"); c.querySelector(".back").removeAttribute("aria-hidden"); c.querySelector(".front").setAttribute("aria-hidden", "true");
        score();
      }));
      c.querySelector(".again").addEventListener("click", () => { c.classList.remove("flipped"); c.querySelector(".front").removeAttribute("aria-hidden"); c.querySelector(".back").setAttribute("aria-hidden", "true"); });
      wrap.appendChild(c);
    });
    function score() {
      const n = Object.keys(got).length, r = Object.values(got).filter(Boolean).length;
      body.querySelector(".pair-score").textContent = n < 4 ? `${n} of 4 sorted.` : `You sorted ${r} of 4 the way the paper does. ${r === 4 ? "These are exactly the lines AI tends to blur." : "That is the point: fluent tools make these lines easy to miss."}`;
    }
  });

  /* ====================================================================
     A fingerprint is not a fact
     ==================================================================== */
  Press.fig("fig-hash", (root) => {
    const body = root.querySelector(".fig-body");
    const START = "The mayor said the bridge is safe.";
    body.innerHTML = `<div class="hashlab"><label class="ctl"><span class="ctl-label"><span>The claim</span><span class="val" data-n></span></span><textarea spellcheck="false" aria-label="Claim to fingerprint"></textarea></label>
      <div class="hexgrid" aria-label="SHA-256 fingerprint" role="img"></div>
      <div class="btnrow" style="margin-top:.9rem" data-b></div>
      <div class="stats" data-st></div>
      <div class="proves"><div class="yes"><b>Proves</b><span data-y>Seal it first. Then the fingerprint can show whether this exact text has changed.</span></div><div class="no"><b>Does not prove</b>Who wrote it, or that the mayor ever said it.</div><div class="no"><b>Does not prove</b>That the bridge is actually safe.</div></div></div>`;
    const ta = body.querySelector("textarea"), grid = body.querySelector(".hexgrid");
    const cells = Array.from({ length: 64 }, () => grid.appendChild(el("span", { text: "0" })));
    let sealed = null, prev = "", seq = 0;
    const bits = (a, b) => { let n = 0; for (let i = 0; i < 64; i++) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { n += x & 1; x >>= 1; } } return n; };
    async function update() {
      const my = ++seq, h = await sha256(ta.value); if (my !== seq) return;
      const ref = sealed || prev;
      cells.forEach((c, i) => { c.textContent = h[i]; c.classList.toggle("flip", !!ref && ref[i] !== h[i]); });
      body.querySelector("[data-n]").textContent = ta.value.length + " characters";
      const st = body.querySelector("[data-st]"), y = body.querySelector("[data-y]"), yes = body.querySelector(".yes");
      if (sealed) {
        const b = bits(sealed, h), same = b === 0;
        st.innerHTML = `<div><small>Matches the sealed copy</small><b class="${same ? "" : "spot"}">${same ? "Yes" : "No"}</b></div><div><small>Bits different</small><b>${b} of 256</b></div><div><small>Hex characters changed</small><b>${cells.filter((c) => c.classList.contains("flip")).length} of 64</b></div>`;
        y.textContent = same ? "This exact text is unchanged since you sealed it." : "This text has changed since you sealed it. Even one character flips about half the bits.";
        yes.classList.toggle("broken", false);
      } else {
        st.innerHTML = `<div><small>Fingerprint length</small><b>256 bits</b></div><div><small>Changed since your last keystroke</small><b>${prev ? cells.filter((c) => c.classList.contains("flip")).length : 0} of 64</b></div>`;
      }
      prev = h;
    }
    const b = body.querySelector("[data-b]");
    button(b, "Seal this version", async () => { sealed = await sha256(ta.value); Press.toast("Sealed. Now change one letter."); update(); }, "solid");
    button(b, "Change one letter", () => {
      const v = ta.value; if (!v) return; let i = Math.floor(Math.random() * v.length); while (v[i] === " " && v.length > 1) i = Math.floor(Math.random() * v.length);
      const c = v[i], n = c === c.toUpperCase() && c !== c.toLowerCase() ? c.toLowerCase() : c === c.toLowerCase() && c !== c.toUpperCase() ? c.toUpperCase() : c === "." ? "!" : "x";
      ta.value = v.slice(0, i) + n + v.slice(i + 1); update();
    });
    button(b, "Start again", () => { ta.value = START; sealed = null; prev = ""; update(); });
    ta.value = START; ta.addEventListener("input", update); update();
    root.addEventListener("fig:reset", () => { ta.value = START; sealed = null; prev = ""; update(); });
  });
})();

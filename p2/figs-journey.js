/* The Glass Ballot Box · ear count, ballot journey, dispute maths, glass booth, three proofs */
(function () {
  "use strict";
  const { el, svg, button, tabs, fmt, lerp, clamp, icon, sha256, randomHex, wait, loop } = FK;
  const API = "https://glass-ballot-box.abhnv.workers.dev", EID = "f7559217-fbc2-474e-a534-3a821f7d2ca4";
  window.GB = { API, EID };

  /* ---------- Ear: ballots on the reader ledger ---------- */
  (async function ear() {
    const out = document.getElementById("earCount"); if (!out) return;
    try { const r = await fetch(`${API}/api/board?election_id=${EID}`, { signal: AbortSignal.timeout(6000) }); const j = await r.json(); out.textContent = fmt.int((j.ballots || []).length); }
    catch (_) { out.textContent = "offline"; }
  })();

  const asn = (marginPts, alpha) => { const s = 0.5 + marginPts / 200; const kl = s * Math.log(2 * s) + (1 - s) * Math.log(2 * (1 - s)); return Math.log(1 / alpha) / kl; };
  window.GB.asn = asn;
  const roundNice = (v) => (v < 1000 ? Math.round(v / 10) * 10 : Math.round(v / 100) * 100);

  /* ====================================================================
     One ballot's journey (scroll story)
     ==================================================================== */
  Press.fig("story-ballot", (root) => {
    const host = root.querySelector(".journey");
    const ST = [["Booth", "user"], ["Machine", "phone"], ["Storage", "lock"], ["Tally", "office"], ["Result", "bell"]];
    const STATE = [
      { at: 0, dark: [], leaks: 0, trust: 10, ev: 10, note: "You can vouch for this step yourself." },
      { at: 1, dark: [1], leaks: 1, trust: 35, ev: 10, note: "First blind spot: did the machine record what you meant?" },
      { at: 2, dark: [1, 2], leaks: 2, trust: 60, ev: 8, note: "Second: every handover depends on people you will never meet." },
      { at: 3, dark: [1, 2, 3], leaks: 3, trust: 80, ev: 5, note: "Third: the software's totals are all the public sees." },
      { at: 4, dark: [1, 2, 3, 4], leaks: 4, trust: 95, ev: 3, note: "The result arrives with almost no public evidence attached." },
      { at: 4, dark: [], leaks: 0, glass: true, trust: 25, ev: 92, note: "Glass version: receipt, published ballot and public proof at every step." }
    ];
    host.innerHTML = `<svg role="img" aria-label="A ballot moving through five stages"></svg>
      <div class="meters"><div class="meter-row"><div class="ctl-label"><span>Trust you are asked for</span><span class="val" data-t>10%</span></div><div class="bar"><i></i></div></div>
      <div class="meter-row ev"><div class="ctl-label"><span>Evidence you can check</span><span class="val" data-e>10%</span></div><div class="bar"><i></i></div></div></div>
      <p class="journey-note" aria-live="polite"></p>`;
    const s = host.querySelector("svg");
    let G, nodes = [], leaks = [], proofs = [], token, cur = -1, tokX = 0, target = 0;
    function build() {
      const narrow = window.innerWidth < 600;
      if (G && G.narrow === narrow) return;
      G = narrow ? { narrow, W: 360, H: 190, w: 60, h: 64, y: 70, fs: 10.5, gap: 75 } : { narrow, W: 640, H: 220, w: 100, h: 78, y: 78, fs: 13, gap: 132 };
      s.setAttribute("viewBox", `0 0 ${G.W} ${G.H}`); s.innerHTML = ""; nodes = []; leaks = []; proofs = [];
      const x0 = (G.W - (G.gap * 4 + G.w)) / 2;
      G.x = (i) => x0 + i * G.gap;
      for (let i = 0; i < 4; i++) {
        const xa = G.x(i) + G.w, xb = G.x(i + 1), y = G.y + G.h / 2;
        s.appendChild(svg("line", { x1: xa + 4, y1: y, x2: xb - 6, y2: y, class: "s-ink", "stroke-width": 1.5 }));
        s.appendChild(svg("path", { d: `M${xb - 12},${y - 5} L${xb - 5},${y} L${xb - 12},${y + 5}`, class: "s-ink", "stroke-width": 1.5 }));
        const lk = svg("circle", { cx: (xa + xb) / 2, cy: y - 16, r: G.narrow ? 6 : 8, class: "leak" }); s.appendChild(lk);
        const lt = svg("text", { x: (xa + xb) / 2, y: y - 12, "text-anchor": "middle", "font-size": G.narrow ? 8 : 10, "font-weight": 800, style: "fill:#fff", text: "?", class: "leak" }); s.appendChild(lt);
        leaks.push([lk, lt]);
      }
      ST.forEach(([label, ic], i) => {
        const g = svg("g", { class: "stage" });
        g.appendChild(svg("rect", { x: G.x(i), y: G.y, width: G.w, height: G.h, rx: 6 }));
        const ig = svg("g", { class: "ic", transform: `translate(${G.x(i) + G.w / 2 - 11},${G.y + (G.narrow ? 10 : 14)})` });
        ig.innerHTML = `<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon(ic).replace(/<svg[^>]*>|<\/svg>/g, "")}</g>`;
        g.appendChild(ig);
        g.appendChild(svg("text", { x: G.x(i) + G.w / 2, y: G.y + G.h - (G.narrow ? 10 : 14), "text-anchor": "middle", "font-size": G.fs, "font-weight": 700, class: "t-ink", text: label }));
        s.appendChild(g); nodes.push(g);
        const pf = svg("g", { class: "proof" });
        pf.appendChild(svg("rect", { x: G.x(i) + 4, y: G.y + G.h + 10, width: G.w - 8, height: G.narrow ? 20 : 24, rx: 12, class: "f-spot" }));
        pf.appendChild(svg("text", { x: G.x(i) + G.w / 2, y: G.y + G.h + (G.narrow ? 24 : 26), "text-anchor": "middle", "font-size": G.narrow ? 9 : 11, "font-weight": 700, style: "fill:#fff", text: ["you chose", "sealed + receipt", "published", "proof public", "anyone checks"][i] }));
        s.appendChild(pf); proofs.push(pf);
      });
      token = svg("g", {}, [svg("rect", { x: -11, y: -14, width: 22, height: 28, rx: 3, class: "f-spot" }), svg("path", { d: "M-6,-6 H6 M-6,0 H6 M-6,6 H2", style: "stroke:#fff", "stroke-width": 1.5 })]);
      s.appendChild(token);
      cur = -1; apply(0);
    }
    function apply(i) {
      if (i === cur) return; cur = i; const st = STATE[Math.max(0, i)];
      nodes.forEach((g, j) => { g.classList.toggle("dark", st.dark.includes(j)); g.classList.toggle("lit", !!st.glass || (j === 0 && !st.glass)); });
      leaks.forEach((l, j) => l.forEach((n) => n.classList.toggle("on", j < st.leaks)));
      proofs.forEach((p) => p.classList.toggle("on", !!st.glass));
      host.querySelector(".meter-row .bar i").style.setProperty("--v", st.trust + "%");
      host.querySelector(".meter-row.ev .bar i").style.setProperty("--v", st.ev + "%");
      host.querySelector("[data-t]").textContent = st.trust + "%"; host.querySelector("[data-e]").textContent = st.ev + "%";
      host.querySelector(".journey-note").textContent = st.note;
    }
    build(); window.addEventListener("resize", build);
    Press.scrolly(root, { progress(idx, p) {
      const i = Math.max(0, idx); apply(i);
      const st = STATE[i];
      target = st.glass ? 4 * Math.min(1, p * 1.6) : Math.min(st.at, (i > 0 ? STATE[i - 1].at : 0) + p * 1.4);
    } });
    loop(root, (dt) => { tokX += (target - tokX) * Math.min(1, dt * 8); if (G) token.setAttribute("transform", `translate(${G.x(0) + G.w / 2 + tokX * G.gap},${G.y - 22})`); }).start();
  });

  /* ---------- Dispute sentence ---------- */
  (function dispute() {
    const p = document.getElementById("rx-dispute"); if (!p) return;
    Press.reactive(p, { margin: 2 }, (m) => ({ black: "“please trust us”", n: fmt.int(roundNice(asn(m.margin, 0.05))) }));
  })();

  /* ====================================================================
     Proofs are public. Choices stay private.
     ==================================================================== */
  Press.fig("fig-glass", (root) => {
    const body = root.querySelector(".fig-body");
    const OPTS = ["Candidate A", "Candidate B", "Candidate C"];
    let pick = null, mine = null, view = "public";
    const others = Array.from({ length: 6 }, () => randomHex(32));
    body.innerHTML = `<div class="glass"><div class="booth"><h4>Your booth</h4><div class="choices"></div><div class="btnrow" style="margin-top:.8rem" data-b></div><div class="sealing" aria-live="polite"></div></div>
      <div><div data-t></div><div class="board" style="margin-top:.6rem"><h4>Public bulletin board</h4><div data-list></div></div></div></div>`;
    const ch = body.querySelector(".choices");
    OPTS.forEach((o) => { const b = el("button", { type: "button", class: "choice", "aria-pressed": "false", html: `<span class="dot"></span>${o}` }); b.addEventListener("click", () => { if (mine) return; pick = o; ch.querySelectorAll(".choice").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); sealBtn.disabled = false; }); ch.appendChild(b); });
    const sealBtn = button(body.querySelector("[data-b]"), "Seal and publish", seal, "solid"); sealBtn.disabled = true;
    tabs(body.querySelector("[data-t]"), { value: view, options: [{ v: "public", t: "What the public sees" }, { v: "you", t: "What you know" }], onChange: (v) => { view = v; paint(); } });
    const log = body.querySelector(".sealing");
    async function seal() {
      sealBtn.disabled = true;
      const nonce = randomHex(16);
      log.innerHTML = `choice = <b>${pick}</b>`; await wait(400);
      log.innerHTML += `<br>nonce = ${nonce}`; await wait(500);
      const h = await sha256(`${pick}|${nonce}`);
      log.innerHTML += `<br>SHA-256 = <b>${h.slice(0, 24)}…</b>`;
      mine = { pick, nonce, h }; others.splice(3, 0, null); paint();
    }
    function paint() {
      const list = body.querySelector("[data-list]");
      list.innerHTML = others.map((x, i) => {
        const isMine = x === null; const h = isMine ? mine.h : x;
        const who = isMine && view === "you" ? `<span class="who">Yours: ${mine.pick}</span>` : "";
        return `<div class="entry ${isMine && view === "you" ? "mine" : ""}"><b>#${String(i + 1).padStart(3, "0")}</b><span>${who}${h.slice(0, 40)}…</span></div>`;
      }).join("") + (mine ? "" : `<div class="entry"><b>…</b><span style="color:#9aa3b5">Waiting for your ballot</span></div>`);
    }
    paint();
    root.addEventListener("fig:reset", () => { pick = null; mine = null; const i = others.indexOf(null); if (i > -1) others.splice(i, 1); ch.querySelectorAll(".choice").forEach((x) => x.setAttribute("aria-pressed", "false")); log.innerHTML = ""; sealBtn.disabled = true; paint(); });
  });

  /* ====================================================================
     Run the audit (three proofs)
     ==================================================================== */
  Press.fig("fig-proofs", (root) => {
    const body = root.querySelector(".fig-body");
    const P = [
      ["Cast as intended", "Did the machine seal what I chose?", async (L) => {
        const nonce = randomHex(8); L("You chose <b>B</b>. The machine shows a sealed ballot."); await wait(600);
        const h = await sha256("B|" + nonce); L("Sealed: " + h.slice(0, 20) + "…"); await wait(600);
        L("You press Challenge. The machine must open it."); await wait(700);
        L("Opened: choice B, nonce " + nonce); await wait(500);
        const h2 = await sha256("B|" + nonce); L(h2 === h ? '<span class="ok">Recomputed hash matches. The machine was honest this time.</span>' : "Mismatch");
      }],
      ["Recorded as cast", "Is my ballot on the public record?", async (L) => {
        const code = randomHex(4).toUpperCase(); L("Your receipt code: <b>" + code + "</b>"); await wait(600);
        L("Searching 1,000 published ballots…"); await wait(900);
        L('<span class="ok">Found at position 418, unchanged since the polls closed.</span>');
      }],
      ["Tallied as recorded", "Do the published ballots add up to the result?", async (L) => {
        L("Combining 1,000 sealed ballots…"); await wait(800);
        L("Decrypted total: A 512, B 488"); await wait(600);
        L("Announced result: A 512, B 488"); await wait(500);
        L('<span class="ok">The totals match, and anyone can repeat this check.</span>');
      }]
    ];
    body.innerHTML = `<div class="proofs"></div><p class="audit-stamp" aria-live="polite">Audit complete: all three proofs hold</p>`;
    const wrap = body.querySelector(".proofs"); const done = new Set();
    P.forEach(([t, q, run], i) => {
      const c = el("div", { class: "pcard", html: `<span class="tick" aria-hidden="true">${icon("lock", 16).replace(/<path[^>]*>/, "")}&#10003;</span><h4>${t}</h4><p class="q">${q}</p><div class="log"></div>` });
      const b = button(c, "Run this check", async () => { b.disabled = true; const log = c.querySelector(".log"); log.innerHTML = ""; await run((h) => (log.innerHTML += (log.innerHTML ? "<br>" : "") + h)); c.classList.add("done"); done.add(i); if (done.size === 3) body.querySelector(".audit-stamp").classList.add("on"); b.disabled = false; b.textContent = "Run again"; }, "solid");
      b.style.alignSelf = "flex-start"; wrap.appendChild(c);
    });
    wrap.querySelectorAll(".tick").forEach((t) => (t.innerHTML = "&#10003;"));
    root.addEventListener("fig:reset", () => { done.clear(); wrap.querySelectorAll(".pcard").forEach((c) => { c.classList.remove("done"); c.querySelector(".log").innerHTML = ""; c.querySelector(".btn").textContent = "Run this check"; }); body.querySelector(".audit-stamp").classList.remove("on"); });
  });
})();

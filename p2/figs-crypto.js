/* The Glass Ballot Box · ledger layers, homomorphic tally, mix network */
(function () {
  "use strict";
  const { el, svg, button, toggle, fmt, lerp, tween, wait, randomHex, rng } = FK;

  /* ====================================================================
     Which layer saves the election?
     ==================================================================== */
  Press.fig("fig-layers", (root) => {
    const body = root.querySelector(".fig-body");
    const S = { device: true, ledger: true, proofs: false };
    body.innerHTML = `<div class="layers"><div><div class="switches"></div><div class="btnrow" style="margin-top:1rem" data-b></div></div><div class="lay-out" aria-live="polite"><p class="say" style="margin:0">Set the layers, then cast a test vote for A.</p></div></div>`;
    const sw = body.querySelector(".switches");
    const T = [toggle(sw, { label: "Voting device is honest", value: true, onChange: (v) => { S.device = v; } }), toggle(sw, { label: "Votes stored on an append-only ledger", value: true, onChange: (v) => { S.ledger = v; } }), toggle(sw, { label: "Voters and the public can verify (receipt checks, audits)", value: false, onChange: (v) => { S.proofs = v; } })];
    const out = body.querySelector(".lay-out");
    button(body.querySelector("[data-b]"), "Cast a test vote for A", async () => {
      out.innerHTML = "";
      const rec = S.device ? "A" : "B";
      const row = (k, t, cls) => out.appendChild(el("div", { class: "lay-row " + cls, html: `<b>${k}</b><span>${t}</span>` }));
      row("Capture", S.device ? "The device records A, as you meant." : "The compromised device records B instead of A.", S.device ? "ok" : "bad"); await wait(450);
      row("Storage", S.ledger ? `The record says ${rec}, and it can never be rewritten.` : `The record says ${rec}, in a database insiders could quietly edit.`, S.ledger ? (S.device ? "ok" : "warn") : "warn"); await wait(450);
      row("Checking", S.proofs ? (S.device ? "Your receipt check confirms A is on the record." : "Your check shows B where you chose A. The switch is caught, with evidence.") : "Nobody can check what was recorded.", S.proofs ? (S.device ? "ok" : "ok") : "warn"); await wait(450);
      let v, c;
      if (!S.device && S.ledger && !S.proofs) { v = "Wrong, and permanent. The ledger preserved the error perfectly."; c = "bad"; }
      else if (!S.device && !S.proofs) { v = "Wrong, and nobody will ever know."; c = "bad"; }
      else if (!S.device && S.proofs) { v = "Caught. Verification exposed the bad device, whatever the storage."; c = "ok"; }
      else if (S.device && !S.proofs) { v = "Correct, but unprovable. The public has to take it on trust."; c = "warn"; }
      else { v = "Correct, and anyone can prove it."; c = "ok"; }
      row("Verdict", v, c);
    }, "solid");
    root.addEventListener("fig:reset", () => { T[0].set(true); T[1].set(true); T[2].set(false); out.innerHTML = '<p class="say" style="margin:0">Set the layers, then cast a test vote for A.</p>'; });
  });

  /* ====================================================================
     Count votes without opening them (exponential ElGamal, toy key)
     p = 8388287 is a safe prime (p = 2q + 1, q = 4194143); g = 4 has order q.
     ==================================================================== */
  Press.fig("fig-homo", (root) => {
    const body = root.querySelector(".fig-body");
    const p = 8388287n, q = 4194143n, g = 4n;
    const pow = (b, e, m) => { let r = 1n; b %= m; while (e > 0n) { if (e & 1n) r = (r * b) % m; b = (b * b) % m; e >>= 1n; } return r; };
    const rnd = () => (BigInt("0x" + randomHex(4)) % (q - 2n)) + 1n;
    let x = rnd(), h = pow(g, x, p);
    const votes = [1, 0, 1, 1, 0, 1], ct = new Array(6).fill(null);
    let stage = 0;
    body.innerHTML = `<div class="ctl-label" style="margin-bottom:.6rem"><span>Public key h = g<sup>x</sup> mod p</span><span class="val" data-k></span></div><div class="homo-grid"></div><div class="btnrow" style="margin-top:1rem" data-b></div><div class="homo-steps" aria-live="polite"></div><p class="say" data-say>Set each voter's answer, then seal the ballots.</p>`;
    const grid = body.querySelector(".homo-grid"), steps = body.querySelector(".homo-steps"), say = body.querySelector("[data-say]");
    body.querySelector("[data-k]").textContent = `${h} (p = ${p})`;
    votes.forEach((v, i) => {
      const c = el("div", { class: "voter", html: `<b>Voter ${i + 1}</b><div class="yn"><button type="button" data-v="1">Yes</button><button type="button" data-v="0">No</button></div><div class="ct"></div>` });
      c.querySelectorAll("[data-v]").forEach((b) => { b.setAttribute("aria-pressed", String(+b.dataset.v === v)); b.addEventListener("click", () => { votes[i] = +b.dataset.v; c.querySelectorAll("[data-v]").forEach((y) => y.setAttribute("aria-pressed", String(y === b))); }); });
      grid.appendChild(c);
    });
    const bar = body.querySelector("[data-b]");
    const sealB = button(bar, "Seal all ballots", async () => {
      sealB.disabled = true;
      for (let i = 0; i < 6; i++) { const r = rnd(); ct[i] = [pow(g, r, p), (pow(g, BigInt(votes[i]), p) * pow(h, r, p)) % p]; grid.children[i].classList.add("sealed"); grid.children[i].querySelector(".ct").textContent = `(${ct[i][0]}, ${ct[i][1]})`; await wait(160); }
      steps.innerHTML = `<div><b>Sealed.</b> Each ballot is a pair (g<sup>r</sup>, g<sup>m</sup>h<sup>r</sup>). A yes and a no look equally random.</div>`;
      say.textContent = "Nobody, including the counting server, can tell a yes from a no now. Multiply them."; mulB.disabled = false; stage = 1;
    }, "solid");
    const mulB = button(bar, "Multiply the ciphertexts", async () => {
      mulB.disabled = true; let a = 1n, b = 1n; ct.forEach(([c1, c2]) => { a = (a * c1) % p; b = (b * c2) % p; });
      steps.innerHTML += `<div><b>Combined:</b> (${a}, ${b}) is a sealed ballot containing the sum, though no single ballot was opened.</div>`;
      decB.disabled = false; body._comb = [a, b]; stage = 2;
    }); mulB.disabled = true;
    const decB = button(bar, "Decrypt only the total", async () => {
      decB.disabled = true; const [a, b] = body._comb;
      const gm = (b * pow(a, p - 1n - x, p)) % p; let M = -1; for (let k = 0; k <= 6; k++) if (pow(g, BigInt(k), p) === gm) { M = k; break; }
      steps.innerHTML += `<div><b>Decrypted:</b> g<sup>M</sup> = ${gm}, and the only M from 0 to 6 that gives it is <b>${M}</b>. Total yes votes: ${M} of 6.</div>`;
      say.innerHTML = `<b>The tally is ${M} yes, ${6 - M} no.</b> Real systems split the key x among several trustees, so no single person could decrypt an individual ballot even if they wanted to.`;
    }); decB.disabled = true;
    root.addEventListener("fig:reset", () => { x = rnd(); h = pow(g, x, p); body.querySelector("[data-k]").textContent = `${h} (p = ${p})`; ct.fill(null); [...grid.children].forEach((c) => { c.classList.remove("sealed"); c.querySelector(".ct").textContent = ""; }); steps.innerHTML = ""; sealB.disabled = false; mulB.disabled = true; decB.disabled = true; say.textContent = "Set each voter's answer, then seal the ballots."; });
  });

  /* ====================================================================
     Follow your ballot (mix network game)
     ==================================================================== */
  Press.fig("fig-mix", (root) => {
    const body = root.querySelector(".fig-body");
    const N = 6, VOTES = ["A", "B", "A", "C", "B", "A"];
    let labels, round, guesses, waiting, G;
    body.innerHTML = `<div class="mix"><svg role="img" aria-label="Ballots passing through three mix servers"></svg></div><div class="btnrow" style="margin-top:.6rem" data-b></div><p class="say" data-say></p>`;
    const s = body.querySelector("svg"), say = body.querySelector("[data-say]");
    const START = "Your ballot is the highlighted one. Press “Run the next mix”.";
    const balls = [];
    function geo() {
      const narrow = body.clientWidth < 560;
      if (narrow) { const RY = [8, 116, 224, 332]; return { narrow, vb: "0 0 360 376", W: 52, H: 32, at: (col, row) => [4 + row * 59, RY[col]], srv: (k) => [0, RY[k] + 46, 360, 24], fs: 10 }; }
      const COLX = [24, 186, 348, 510]; return { narrow, vb: "0 0 640 300", W: 100, H: 32, at: (col, row) => [COLX[col], 14 + row * 46], srv: (k) => [COLX[k] + 112, 6, 38, 280], fs: 11 };
    }
    function build() {
      const g2 = geo(); if (G && G.narrow === g2.narrow) return; G = g2;
      s.setAttribute("viewBox", G.vb); s.innerHTML = ""; balls.length = 0;
      [0, 1, 2].forEach((k) => { const [x, y, w, h] = G.srv(k), g = svg("g", { class: "srv" }); g.appendChild(svg("rect", { x, y, width: w, height: h, rx: 5 })); const cx = x + w / 2, cy = y + h / 2 + 4; g.appendChild(svg("text", { x: cx, y: cy, "text-anchor": "middle", "font-size": 12, transform: G.narrow ? null : `rotate(-90 ${cx} ${cy - 4})`, text: `Mix server ${k + 1}` })); s.appendChild(g); });
      for (let i = 0; i < N; i++) { const g = svg("g", { class: "bal", style: "cursor:pointer" }); g.appendChild(svg("rect", { x: 0, y: 0, width: G.W, height: G.H, rx: 4 })); const t = svg("text", { x: G.W / 2, y: G.H / 2 + 4, "text-anchor": "middle", style: `font-size:${G.fs}px` }); g.appendChild(t); s.appendChild(g); g.addEventListener("click", () => guess(i)); balls.push({ g, t, col: 0, row: i }); }
      reset();
    }
    function place(i, col, row) { const [x, y] = G.at(col, row); balls[i].g.setAttribute("transform", `translate(${x},${y})`); balls[i].col = col; balls[i].row = row; }
    function reset() { labels = Array.from({ length: N }, () => randomHex(3)); round = 0; guesses = []; waiting = false; balls.forEach((b, i) => { b.t.textContent = labels[i]; b.g.setAttribute("class", "bal" + (i === 2 ? " me" : "")); place(i, 0, i); }); nextB.disabled = false; nextB.textContent = "Run the next mix"; say.textContent = START; }
    const nextB = button(body.querySelector("[data-b]"), "Run the next mix", async () => {
      if (waiting) return;
      if (round >= 3) { reset(); return; }
      nextB.disabled = true; round++;
      const order = [...Array(N).keys()].sort(() => Math.random() - 0.5);
      const from = balls.map((b) => G.at(b.col, b.row));
      balls.forEach((b, i) => { labels[i] = randomHex(3); b.g.setAttribute("class", "bal lost"); });
      await tween(900, (k) => balls.forEach((b, i) => { const to = G.at(round, order[i]); b.g.setAttribute("transform", `translate(${lerp(from[i][0], to[0], k)},${lerp(from[i][1], to[1], k)})`); if (k > 0.5) b.t.textContent = labels[i]; }), FK.ease.inOut);
      balls.forEach((b, i) => { b.col = round; b.row = order[i]; b.g.setAttribute("class", "bal"); });
      waiting = true; say.innerHTML = `<b>Mix ${round} done.</b> Every ballot was shuffled and re-encrypted, so it looks brand new. Tap the one you think is yours.`;
    }, "solid");
    function guess(i) {
      if (!waiting) return; waiting = false; guesses.push(i === 2);
      balls[i].g.setAttribute("class", "bal lost");
      if (round < 3) { nextB.disabled = false; say.innerHTML = `Guess noted. ${round === 1 ? "Two" : "One"} more mix to go.`; return; }
      balls[2].g.setAttribute("class", "bal me");
      const right = guesses.filter(Boolean).length;
      say.innerHTML = `<b>You followed it ${right} time${right === 1 ? "" : "s"} out of 3.</b> Guessing at random you would expect to be right one time in six each round. After the final mix the ballots are opened: ${VOTES.join(", ")}. Every vote is counted, and no vote can be traced back to a voter.`;
      nextB.textContent = "Start again"; nextB.disabled = false;
    }
    build(); new ResizeObserver(build).observe(body);
    root.addEventListener("fig:reset", reset);
  });
})();

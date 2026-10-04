/* The Glass Ballot Box · Benaloh challenge, vote buyer, tamper-evident chain */
(function () {
  "use strict";
  const { el, svg, button, range, tabs, fmt, clamp, sha256, randomHex, wait } = FK;

  /* ====================================================================
     Catch the cheating machine (Benaloh challenge)
     ==================================================================== */
  Press.fig("fig-benaloh", (root) => {
    const body = root.querySelector(".fig-body");
    let cheat = 0.3, rate = 0.1, voters = 0, altered = 0, caught = false, busy = false;
    body.innerHTML = `<div class="ben"><div><div class="machine"><div class="scr" aria-live="polite">Voter 1 has chosen. The machine has sealed a ballot. Cast it, or challenge it?</div></div>
      <div class="btnrow" style="margin-top:.8rem" data-b></div><div class="queue" aria-hidden="true"></div><div class="controls" data-c></div></div>
      <div><svg viewBox="0 0 420 260" role="img" aria-label="Chance a cheating machine goes undetected"></svg><div class="stats" data-st></div></div></div><p class="say" data-say>Play a few voters yourself, then let the crowd take over.</p>`;
    const scr = body.querySelector(".scr"), q = body.querySelector(".queue"), say = body.querySelector("[data-say]");
    const b = body.querySelector("[data-b]");
    const castB = button(b, "Cast", () => step(false), "solid");
    const chalB = button(b, "Challenge", () => step(true));
    const autoB = button(b, "Run 200 voters", () => crowd(), "spot");
    const c = body.querySelector("[data-c]");
    range(c, { label: "How often the machine cheats", min: 5, max: 80, step: 5, value: 30, fmt: (v) => v + "% of ballots", onInput: (v) => (cheat = v / 100) });
    range(c, { label: "How often voters challenge (crowd run)", min: 1, max: 40, step: 1, value: 10, fmt: (v) => v + "%", onInput: (v) => { rate = v / 100; curve(); } });
    const pick = () => "ABC"[Math.floor(Math.random() * 3)];
    function tile(cls, t) { const i = el("i", { class: cls, text: t }); q.appendChild(i); while (q.children.length > 80) q.firstChild.remove(); }
    async function step(challenge) {
      if (busy || caught) return; busy = true;
      const want = pick(), cheats = Math.random() < cheat, sealed = cheats ? "ABC".replace(want, "")[Math.floor(Math.random() * 2)] : want;
      voters++;
      if (!challenge) { if (cheats) altered++; tile("cast", ""); scr.innerHTML = `Voter ${voters} cast a sealed ballot. Nobody can see inside it.`; }
      else {
        scr.innerHTML = `Voter ${voters} chose ${want}. Challenge: the machine opens the sealed ballot…`; await wait(500);
        if (cheats) { caught = true; tile("caught", "!"); scr.innerHTML = `<span class="bad">Caught.</span> Voter ${voters} chose ${want}, but the machine sealed ${sealed}. Evidence in hand: the machine is pulled.`; }
        else { tile("clean", "ok"); scr.innerHTML = `<span class="good">Honest.</span> The sealed ballot really was ${want}. It is spoiled, and the voter votes again.`; }
      }
      stats(); busy = false;
    }
    async function crowd() {
      if (busy) return; reset(true); busy = true; autoB.disabled = true;
      for (let k = 0; k < 200 && !caught; k++) {
        const ch = Math.random() < rate, cheats = Math.random() < cheat; voters++;
        if (ch && cheats) { caught = true; tile("caught", "!"); }
        else if (ch) tile("clean", "ok"); else { if (cheats) altered++; tile("cast", ""); }
        if (k % 4 === 0) { stats(); await wait(16); }
      }
      stats(); busy = false; autoB.disabled = false;
      scr.innerHTML = caught ? `<span class="bad">Exposed after ${voters} voters</span>, having altered ${altered} ballot${altered === 1 ? "" : "s"} first.` : `<span class="good">Not caught in 200 voters</span>, after altering ${altered} ballot${altered === 1 ? "" : "s"}. Raise the challenge rate and try again.`;
      say.innerHTML = caught ? `<b>The machine could not tell which ballots would be opened.</b> Even rare, random challenges catch a cheat long before it can change much. That is why Benaloh's simple idea is used in real systems.` : `<b>Lucky machine.</b> With so few challenges it slipped through this time. The curve shows how fast that luck runs out.`;
    }
    function stats() {
      body.querySelector("[data-st]").innerHTML = `<div><small>Voters</small><b>${voters}</b></div><div><small>Ballots altered</small><b class="spot">${altered}</b></div><div><small>Status</small><b>${caught ? "Caught" : "Running"}</b></div>`;
      curve();
    }
    function curve() {
      const s = body.querySelector("svg"); s.innerHTML = ""; const W = 420, H = 260, m = { l: 44, r: 10, t: 14, b: 34 }, N = 100;
      const X = (n) => m.l + (n / N) * (W - m.l - m.r), Y = (p) => H - m.b - p * (H - m.t - m.b);
      [0, 0.5, 1].forEach((v) => { s.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: "s-hair", "stroke-dasharray": "2 4" })); s.appendChild(svg("text", { x: m.l - 6, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, text: v * 100 + "%" })); });
      [0, 25, 50, 75, 100].forEach((n) => s.appendChild(svg("text", { x: X(n), y: H - 14, "text-anchor": "middle", "font-size": 11, text: n })));
      s.appendChild(svg("text", { x: W - m.r, y: H - 2, "text-anchor": "end", "font-size": 11, class: "t-grey", text: "ballots altered" }));
      s.appendChild(svg("text", { x: m.l + 46, y: 10, "font-size": 11, class: "t-grey", text: "chance of escaping" }));
      let d = ""; for (let n = 0; n <= N; n++) d += (n ? "L" : "M") + X(n) + "," + Y(Math.pow(1 - rate, n));
      s.appendChild(svg("path", { d, class: "s-spot", "stroke-width": 3 }));
      const a = clamp(altered, 0, N), p = Math.pow(1 - rate, a);
      s.appendChild(svg("circle", { cx: X(a), cy: Y(p), r: 6, class: "f-ink" }));
      s.appendChild(svg("text", { x: X(a) + (a > 70 ? -10 : 10), y: Y(p) - 10, "text-anchor": a > 70 ? "end" : "start", "font-size": 12, "font-weight": 700, class: "t-ink", text: (p * 100).toFixed(p < 0.1 ? 2 : 0) + "%" }));
    }
    function reset(silent) { voters = 0; altered = 0; caught = false; q.innerHTML = ""; if (!silent) { scr.innerHTML = "Voter 1 has chosen. The machine has sealed a ballot. Cast it, or challenge it?"; say.textContent = "Play a few voters yourself, then let the crowd take over."; } stats(); }
    stats();
    root.addEventListener("fig:reset", () => reset());
  });

  /* ---------- (1 - c)^n sentence ---------- */
  (function ben() {
    const p = document.getElementById("rx-benaloh"); if (!p) return;
    Press.reactive(p, { c: 10, n: 50 }, (m) => { const v = Math.pow(1 - m.c / 100, m.n) * 100; return { p: v < 0.01 ? "less than 0.01%" : v.toFixed(v < 1 ? 2 : 1) + "%" }; });
  })();

  /* ====================================================================
     Try to buy a vote
     ==================================================================== */
  Press.fig("fig-receipt", (root) => {
    const body = root.querySelector(".fig-body");
    let mode = "plain";
    body.innerHTML = `<div data-t></div><div class="buyer" style="margin-top:1rem"><div class="slip" aria-live="polite"></div><div><div class="chat" aria-live="polite"></div><div class="btnrow" style="margin-top:.8rem" data-b></div></div></div>`;
    tabs(body.querySelector("[data-t]"), { value: mode, options: [{ v: "plain", t: "Receipt shows the vote" }, { v: "code", t: "Receipt shows a tracking code" }], onChange: (v) => { mode = v; reset(); } });
    const slip = body.querySelector(".slip"), chat = body.querySelector(".chat");
    const code = () => randomHex(2).toUpperCase() + "-" + randomHex(2).toUpperCase() + "-" + randomHex(2).toUpperCase();
    function paintSlip() {
      slip.innerHTML = mode === "plain"
        ? `<h5>Voter receipt</h5>Polling station 14<br>12 June, 10:42<span class="big spot">Vote: Candidate A</span>Keep this receipt.`
        : `<h5>Voter receipt</h5>Polling station 14<br>12 June, 10:42<span class="big">Tracking code<br>${code()}</span>Look this code up on the public board to see your sealed ballot was counted.`;
    }
    const say = (who, t) => { chat.appendChild(el("div", { class: "bub " + who, html: t })); };
    const btn = button(body.querySelector("[data-b]"), "Offer ₹2,000 and ask for proof", run, "solid");
    async function run() {
      btn.disabled = true; chat.innerHTML = "";
      say("me", "₹2,000 if you voted for A. Show me your receipt."); await wait(700);
      say("them", "Here it is."); await wait(700);
      if (mode === "plain") { say("me", "It says A. Here is your money."); await wait(600); say("sys", "The vote was sold, and the buyer could check the deal. Coercion works the same way."); }
      else { say("me", "This code tells me nothing. Which way did you vote?"); await wait(800); say("them", "It only proves my ballot was counted. Not what is inside."); await wait(700); say("me", "Then I can't be sure. No deal."); await wait(500); say("sys", "No proof, no payment. The secret ballot survives, and the voter can still verify."); }
      btn.disabled = false; btn.textContent = "Try again";
    }
    function reset() { chat.innerHTML = ""; paintSlip(); btn.textContent = "Offer ₹2,000 and ask for proof"; btn.disabled = false; }
    reset();
    root.addEventListener("fig:reset", reset);
  });

  /* ====================================================================
     Rewrite history, if you can (tamper-evident hash chain)
     ==================================================================== */
  Press.fig("fig-chain", (root) => {
    const body = root.querySelector(".fig-body");
    const DATA = ["Ward 1: A 412, B 388", "Ward 2: A 301, B 356", "Ward 3: A 529, B 471", "Ward 4: A 214, B 240"];
    body.innerHTML = `<div class="chain"></div><p class="say" data-say>All four links hold. Now change a number in Ward 2.</p>`;
    const wrap = body.querySelector(".chain"), say = body.querySelector("[data-say]");
    let published = [];
    const blocks = DATA.map((d, i) => {
      const b = el("div", { class: "blk", html: `<h5>Block ${i + 1}<span>linked</span></h5><label>Contents<input type="text" value="${d}" aria-label="Block ${i + 1} contents"></label><label>Points back to</label><div class="hx" data-prev></div><label>Fingerprint (SHA-256)</label><div class="hx" data-h></div>` });
      wrap.appendChild(b); b.querySelector("input").addEventListener("input", recompute); return b;
    });
    async function chainOf(values) { const out = []; let prev = "GENESIS"; for (let i = 0; i < values.length; i++) { const h = await sha256(`${prev}|${i + 1}|${values[i]}`); out.push({ prev, h }); prev = h; } return out; }
    async function recompute() {
      const live = await chainOf(blocks.map((b) => b.querySelector("input").value));
      let broken = 0;
      live.forEach((x, i) => {
        const bad = x.h !== published[i].h; if (bad) broken++;
        blocks[i].classList.toggle("bad", bad);
        blocks[i].querySelector("h5 span").textContent = bad ? "broken" : "linked";
        blocks[i].querySelector("[data-prev]").textContent = x.prev === "GENESIS" ? "GENESIS" : x.prev.slice(0, 22) + "…";
        const hh = blocks[i].querySelector("[data-h]"); hh.textContent = x.h.slice(0, 22) + "…"; hh.classList.toggle("bad", bad);
      });
      const first = live.findIndex((x, i) => x.h !== published[i].h);
      say.innerHTML = broken ? `<b>${broken} of 4 fingerprints no longer match the published record.</b> Changing block ${first + 1} changed its fingerprint, and because every later block includes the one before it, the break runs all the way to the end. To hide the edit you would have to rewrite every later block and the copy everyone else already holds.` : "All four links hold. Now change a number in Ward 2.";
    }
    (async () => { published = await chainOf(DATA); recompute(); })();
    root.addEventListener("fig:reset", () => { blocks.forEach((b, i) => (b.querySelector("input").value = DATA[i])); recompute(); });
  });
})();

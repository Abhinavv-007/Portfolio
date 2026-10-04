/* Risk · risk matrix with appetite and Cox's test, framework chooser */
(function () {
  "use strict";
  const { el, svg, range, toggle, fmt, clamp } = FK;

  /* ====================================================================
     The risk matrix, and its blind spot
     ==================================================================== */
  Press.fig("fig-matrix", (root) => {
    const body = root.querySelector(".fig-body");
    const LIK = ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"], CON = ["Minor", "Moderate", "Major", "Severe", "Catastrophic"];
    const DEF = [["Laptop stolen", 3, 1], ["Ransomware", 2, 4], ["Server outage", 3, 2], ["Key supplier fails", 1, 3], ["Exam paper leak", 1, 4], ["Phishing click", 4, 1]];
    let toks = DEF.map((t) => ({ name: t[0], l: t[1], c: t[2] })), appetite = 8, cox = false;
    body.innerHTML = `<div class="matrix-wrap"><div class="matrix"><svg viewBox="0 0 440 400" role="img" aria-label="Five by five risk matrix"></svg></div><div><div data-c></div><ul class="treat" aria-live="polite"></ul><div data-cox></div></div></div>`;
    const c = body.querySelector("[data-c]");
    range(c, { label: "Risk appetite: act above a score of", min: 2, max: 20, value: appetite, fmt: (v) => v, onInput: (v) => { appetite = v; draw(); } });
    toggle(c, { label: "Cox's test: add two risks with the same score", value: false, onChange: (v) => { cox = v; draw(); } }).el.style.margin = "0.4rem 0 0.8rem";
    const s = body.querySelector("svg"), X0 = 104, Y0 = 16, CW = 66, CH = 66;
    const cx = (ci) => X0 + ci * CW + CW / 2, cy = (li) => Y0 + (4 - li) * CH + CH / 2;
    let drag = null;
    function list() {
      const all = toks.concat(cox ? COX : []);
      return all;
    }
    const COX = [{ name: "Frequent glitch", l: 4, c: 0, el: 9000, note: "90% a year, loss 10,000", fixed: true }, { name: "Rare disaster", l: 0, c: 4, el: 9000, note: "1% a year, loss 900,000", fixed: true }];
    function draw() {
      s.innerHTML = "";
      for (let li = 0; li < 5; li++) for (let ci = 0; ci < 5; ci++) {
        const score = (li + 1) * (ci + 1), hot = score > appetite;
        s.appendChild(svg("rect", { x: X0 + ci * CW + 1, y: Y0 + (4 - li) * CH + 1, width: CW - 2, height: CH - 2, rx: 3, fill: hot ? "var(--spot)" : "var(--paper-2)", opacity: hot ? 0.18 + (score / 25) * 0.55 : 1 }));
        s.appendChild(svg("text", { x: X0 + ci * CW + CW - 6, y: Y0 + (4 - li) * CH + 14, "text-anchor": "end", "font-size": 10, class: "t-grey", text: score }));
      }
      LIK.forEach((t, li) => s.appendChild(svg("text", { x: X0 - 8, y: cy(li) + 4, "text-anchor": "end", "font-size": 11, "font-weight": 600, text: t })));
      CON.forEach((t, ci) => s.appendChild(svg("text", { x: cx(ci), y: Y0 + 5 * CH + 16, "text-anchor": "middle", "font-size": 10.5, "font-weight": 600, text: t })));
      s.appendChild(svg("text", { x: X0 + 2.5 * CW, y: 396, "text-anchor": "middle", "font-size": 11, class: "t-grey", text: "consequence →" }));
      s.appendChild(svg("text", { x: 14, y: Y0 + 2.5 * CH, "text-anchor": "middle", "font-size": 11, class: "t-grey", transform: `rotate(-90 14 ${Y0 + 2.5 * CH})`, text: "likelihood →" }));
      const all = list(), counts = {};
      all.forEach((t, i) => {
        const key = t.l + "-" + t.c, k = counts[key] = (counts[key] || 0) + 1;
        const ox = ((k - 1) % 2) * 22 - 11 + (k === 1 ? 11 : 0) * 0, oy = Math.floor((k - 1) / 2) * 20 - 6;
        const g = svg("g", { class: "tok", tabindex: t.fixed ? null : 0, transform: `translate(${cx(t.c) + (k > 1 ? ox : 0)},${cy(t.l) + (k > 1 ? oy : 0)})` });
        g.appendChild(svg("circle", { r: 13, fill: t.fixed ? "var(--ink)" : "var(--paper)" }));
        g.appendChild(svg("text", { y: 4, "text-anchor": "middle", "font-size": 11, style: t.fixed ? "fill:var(--paper)" : "", class: t.fixed ? null : "t-ink", text: t.fixed ? (t.l === 4 ? "G" : "D") : String(i + 1) }));
        if (!t.fixed) g.addEventListener("pointerdown", (e) => { drag = t; s.setPointerCapture(e.pointerId); });
        s.appendChild(g);
      });
      const ul = body.querySelector(".treat");
      ul.innerHTML = toks.map((t, i) => { const sc = (t.l + 1) * (t.c + 1), hot = sc > appetite; const act = hot ? (t.c >= 3 && t.l <= 1 ? "Transfer or insure" : "Reduce or avoid") : "Accept and monitor"; return `<li><b>${i + 1}</b><span>${t.name} <span style="color:var(--grey)">(${LIK[t.l]}, ${CON[t.c].toLowerCase()})</span></span><span class="act ${hot ? "hi" : "lo"}">${act}</span></li>`; }).join("");
      body.querySelector("[data-cox]").innerHTML = cox ? `<div class="cox"><b>G and D share a score of 5 and the same colour.</b> G is a frequent glitch (${COX[0].note}); D a rare disaster (${COX[1].note}). Both cost 9,000 a year on average, yet one is a nuisance and the other could end the organisation. Cox showed that matrices can give identical ratings to very different risks, and sometimes rank a smaller risk above a larger one.</div>` : "";
    }
    s.addEventListener("pointermove", (e) => { if (!drag) return; const r = s.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 440, y = ((e.clientY - r.top) / r.height) * 400; const ci = clamp(Math.floor((x - X0) / CW), 0, 4), li = clamp(4 - Math.floor((y - Y0) / CH), 0, 4); if (ci !== drag.c || li !== drag.l) { drag.c = ci; drag.l = li; draw(); } });
    s.addEventListener("pointerup", () => (drag = null)); s.addEventListener("pointercancel", () => (drag = null));
    draw();
    root.addEventListener("fig:reset", () => { toks = DEF.map((t) => ({ name: t[0], l: t[1], c: t[2] })); draw(); });
  });

  /* ====================================================================
     Which framework fits your problem?
     ==================================================================== */
  Press.fig("fig-table", (root) => {
    const body = root.querySelector(".fig-body"), table = body.querySelector("table.compare");
    const TASKS = [["Price losses that repeat", ["prob"]], ["Choose between uncertain options", ["eu"]], ["Learn as evidence arrives", ["bayes"]], ["Explain how people react", ["behav"]], ["Run an organisation", ["org"]], ["Act in a specialised field", ["domain"]], ["Communicate a risk to the public", ["behav", "org"]], ["Face something genuinely new", ["bayes", "org", "behav"]]];
    const bar = el("div", { class: "chooser", role: "group", "aria-label": "Choose a task" });
    body.insertBefore(bar, body.firstChild);
    let cur = -1;
    TASKS.forEach(([t, keys], i) => { const b = el("button", { type: "button", "aria-pressed": "false", text: t }); b.addEventListener("click", () => { cur = cur === i ? -1 : i; bar.querySelectorAll("button").forEach((x, j) => x.setAttribute("aria-pressed", String(j === cur))); table.classList.toggle("filtering", cur >= 0); table.querySelectorAll("tbody tr").forEach((tr) => tr.classList.toggle("hit", cur >= 0 && TASKS[cur][1].includes(tr.dataset.k))); }); bar.appendChild(b); });
  });
})();

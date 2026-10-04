/* Data for Sale · draw-your-guess revenue chart and the receipt printer */
(function () {
  "use strict";
  const { el, svg, button, fmt, loop, whenVisible, rng, wait } = FK;
  const T0 = performance.now();

  /* ====================================================================
     How fast did Meta's revenue grow? (draw your guess)
     Meta Platforms annual reports, total revenue, US$ billions.
     ==================================================================== */
  Press.fig("fig-drawit", (root) => {
    const body = root.querySelector(".fig-body");
    const DATA = [[2012, 5.09], [2013, 7.87], [2014, 12.47], [2015, 17.93], [2016, 27.64], [2017, 40.65], [2018, 55.84], [2019, 70.70], [2020, 85.97], [2021, 117.93], [2022, 116.61], [2023, 134.90], [2024, 164.50]].map(([x, y]) => ({ x, y }));
    const wrap = el("div"); body.appendChild(wrap);
    const chart = FK.drawit(wrap, {
      data: DATA, reveal: 5, yMax: 180, yTicks: [0, 50, 100, 150], xEvery: 2, height: 320,
      yFmt: (v) => "$" + Math.round(v) + "bn", hint: "Draw the line from here",
      label: "Chart of Meta revenue: draw your guess for 2018 to 2024",
      onDraw: (complete) => { showBtn.disabled = !complete; if (complete) say.innerHTML = "Ready when you are."; }
    });
    const row = el("div", { class: "btnrow", style: "margin-top:.8rem" }); body.appendChild(row);
    const showBtn = button(row, "Show me the real line", async () => {
      showBtn.disabled = true;
      const r = await chart.show();
      const g = r.last.guess, tr = r.last.truth;
      const diff = Math.abs(g - tr) / tr;
      say.innerHTML = `<b>Meta took $164.5 billion in 2024</b>, more than 30 times its 2012 revenue. You guessed about $${Math.round(g)} billion. ` +
        (diff < 0.15 ? "That is close. Most people undershoot." : g < tr ? "Like most people, you undershot. The curve kept bending upwards, with one dip in 2022." : "You overshot, which is rare. Growth was steep, with one dip in 2022.");
    }, "solid");
    showBtn.disabled = true;
    button(row, "Skip and reveal", async () => { showBtn.disabled = true; await chart.show(); say.innerHTML = "<b>From $5.1 billion to $164.5 billion in twelve years.</b> Almost all of it from selling advertising aimed with the help of users' data."; });
    const say = el("p", { class: "say", html: "Drag across the shaded area to draw how you think revenue grew." }); body.appendChild(say);
    root.addEventListener("fig:reset", () => { chart.reset(); showBtn.disabled = true; say.innerHTML = "Drag across the shaded area to draw how you think revenue grew."; });
  });

  /* ====================================================================
     Your receipt for reading this (printer)
     ==================================================================== */
  const touched = new Set();
  document.addEventListener("pointerdown", (e) => { const f = e.target.closest(".fig, .scrolly"); if (f) touched.add(f.id); }, { passive: true });

  Press.fig("fig-receipt", (root) => {
    const body = root.querySelector(".fig-body");
    const ARPP = 49.63, MIN_DAY = 141, RTB_DAY = 747, perMin = ARPP / (365 * MIN_DAY);
    let start = T0;
    const no = Math.floor(100000 + Math.random() * 899999);
    const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    body.innerHTML = `<div class="printer"><div class="printer-head"><i></i></div><div class="paper-roll" style="height:0"><div class="receipt" role="table" aria-label="Receipt">
      <h4>The Attention Economy Co.</h4><div class="c">Receipt ${no} &middot; ${date}</div><div class="c">Till: you</div><hr>
      <div class="row"><span>Time on this page</span><span data-r="time">0s</span></div>
      <div class="row"><span>Sections reached</span><span data-r="secs">0 of 12</span></div>
      <div class="row"><span>Figures you touched</span><span data-r="figs">0</span></div><hr>
      <div class="row"><span>Your attention at platform rates</span><span data-r="value">$0.0000</span></div>
      <div class="row"><span>Auction broadcasts about a typical US user meanwhile</span><span data-r="rtb">0.00</span></div><hr>
      <div class="row"><span>Cash charged</span><span>$0.00</span></div>
      <div class="row paid"><span>Paid with</span><span>attention, data, trust</span></div>
      <div class="row tot"><span>TOTAL DUE</span><span>$0.00</span></div><hr>
      <div class="c">No ads and no trackers on this page.<br>On an ad-funded page this time would have been sold.</div>
      <svg viewBox="0 0 220 40" aria-hidden="true"></svg></div><div class="zigzag"></div></div></div>
      <div class="btnrow" style="justify-content:center;margin-top:1rem"></div>`;
    const roll = body.querySelector(".paper-roll"), rec = body.querySelector(".receipt");
    const bar = body.querySelector("svg"), r = rng(no);
    for (let x = 0; x < 220;) { const w = 1 + Math.floor(r() * 3); if (r() > 0.35) bar.appendChild(svg("rect", { x, y: 0, width: w, height: 40, fill: "#1a1712" })); x += w + 1; }
    const val = (k) => body.querySelector(`[data-r="${k}"]`);
    function update() {
      const secs = (performance.now() - start) / 1000;
      val("time").textContent = fmt.time(secs);
      let n = 0; document.querySelectorAll(".sec").forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * 0.6) n++; });
      val("secs").textContent = n + " of 12";
      val("figs").textContent = touched.size;
      val("value").textContent = "$" + ((secs / 60) * perMin).toFixed(4);
      val("rtb").textContent = ((secs / 86400) * RTB_DAY).toFixed(2);
    }
    async function printOut() {
      roll.style.transition = "none"; roll.style.height = "0px"; roll.getBoundingClientRect();
      const full = rec.offsetHeight + 10;
      if (Press.isCalm()) { roll.style.height = "auto"; return; }
      roll.style.transition = "";
      for (let h = 0; h <= full; h += 34) { roll.style.height = h + "px"; await wait(55); }
      roll.style.height = "auto";
    }
    update();
    whenVisible(root, printOut);
    let acc = 0; loop(root, (dt) => { acc += dt; if (acc > 0.25) { acc = 0; update(); } }).start();
    button(body.querySelector(".btnrow"), "Tear it off and start again", async () => {
      rec.parentElement.classList.add("tear"); await wait(700); rec.parentElement.classList.remove("tear");
      start = performance.now(); touched.clear(); update(); printOut();
    });
    root.addEventListener("fig:reset", () => { start = performance.now(); touched.clear(); update(); printOut(); });
  });
})();

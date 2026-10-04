/* The Outsourced Reality · comparison desk, watermark lab, judgment-preserving design */
(function () {
  "use strict";
  const { el, range, toggle, tabs, button, fmt, clamp, rng, iphone, wait } = FK;

  /* ====================================================================
     The comparison desk: fix one side, or both
     ==================================================================== */
  Press.fig("fig-desk", (root) => {
    const body = root.querySelector(".fig-body");
    const D = {
      edu: ["Education", "AI-written assignments, invented citations, synthetic proof of competence.", "Students outsource reading, writing and reflection before the skills form.",
        ["Students hand in generated essays and nobody can tell what anyone has learned. Grades stop meaning much.", "Disclosure rules and checks catch some generated work, but the thinking is still outsourced in ways that pass. Learning still erodes.", "Students are taught to question AI, but grading still rewards polished output, so the pull to outsource stays.", "Assessment asks for drafts, oral defence and process evidence, and AI is used as a questioning tutor. Output and understanding line up again."]],
      news: ["Journalism", "Synthetic images, audio and fake eyewitness footage enter the news flow.", "Audiences and newsrooms react before checking; cynicism hits real reporting.",
        ["A fabricated eyewitness video leads the evening news. The correction reaches a fraction of the audience.", "Provenance checks keep the fake off air, but readers never see the checking and assume the newsroom is guessing.", "Readers are more sceptical, but without provenance tools the newsroom cannot prove what is real, so scepticism hardens into cynicism.", "The newsroom verifies, then shows its working: source notes, provenance and what is still uncertain. Trust is earned in public."]],
      law: ["Courts", "Fake recordings or documents; real evidence dismissed as AI; broken custody.", "Judges and juries over-trust realism or swing to blanket doubt.",
        ["A cloned voice message is admitted on how it sounds, and a genuine recording is attacked as AI and excluded.", "Originals and hashes are preserved, but judges and juries cannot tell what a forensic report can and cannot show.", "Juries are warned about deepfakes, then doubt every recording, including the genuine ones.", "Custody, hashes and provenance are routine, and experts explain the limits plainly. Real evidence keeps its weight; fakes lose theirs."]],
      vote: ["Elections", "Deepfake speeches, cloned calls, synthetic endorsements.", "Voters defer to emotional media, or dismiss real evidence as fake.",
        ["A synthetic call two days before the vote tells people to stay home. By the time it is debunked, the polls have closed.", "Platforms label the clip, but voters have no trusted channel to confirm the real polling information.", "Voters know to be careful, but with no rapid verification they cannot tell which of two messages is official.", "A known official channel answers within the hour and the platform escalates the clip. The fake loses its timing advantage."]],
      plat: ["Platforms", "Amplified synthetic content, stripped metadata, fake social signals.", "Popularity is read as credibility, personalisation as relevance.",
        ["Synthetic posts are amplified for engagement, and popularity reads as truth.", "Labels appear on some AI content, but the feed still rewards whatever spreads fastest.", "Users are nudged to think before sharing, but stripped metadata leaves them nothing to check.", "Credentials are kept and shown, risky unverified media gets friction, and outside researchers can audit the effect."]],
      work: ["Workplaces", "AI summaries become records with no link back to their sources.", "Staff rely on outputs nobody reads, audits or owns.",
        ["A board approves a plan from an AI summary nobody checked. When it fails, nobody owns the decision.", "Summaries now link to their sources, but nobody is responsible for reading them.", "Staff are told to review AI output, but there is no record of what was reviewed.", "Source-linked summaries, review thresholds and a named owner for every decision. AI speeds the work without laundering responsibility."]],
      cyber: ["Cybersecurity", "Synthetic identities, phishing, cloned voice instructions.", "Analysts over-trust AI triage and its tidy explanations.",
        ["A cloned voice of the finance director approves an urgent transfer, and the AI triage marks it routine.", "A call-back check blocks the transfer, but the AI-drafted incident report blames the wrong system.", "Analysts distrust the triage, but with no authentication on high-value requests the cloned voice still works.", "Multi-factor checks on high-value requests, reproducible evidence and human review of AI conclusions. Trust stops being the attack surface."]],
      intimate: ["Intimate AI", "Simulated people, synthetic memories, persuasive dialogue.", "Users treat adaptive systems as authorities on self, relationships or grief.",
        ["A grieving user spends hours a day with a simulation of a parent that agrees with everything they say.", "The app clearly says it is a simulation, but nothing limits how persuasive it becomes.", "The user knows to be careful, but the system is built to keep them engaged.", "Clear disclosure, limits on persuasive personalisation and a path back to human support. Comfort without capture."]]
    };
    body.innerHTML = `<div data-t></div><div class="desk-card" aria-live="polite"></div><div class="fixes" data-f></div><div class="outcome" aria-live="polite"></div>`;
    let key = "edu", ev = false, ju = false;
    const card = body.querySelector(".desk-card"), out = body.querySelector(".outcome");
    function show() {
      const d = D[key];
      card.innerHTML = `<div class="desk-grid"><div class="spot"><small>How evidence fails</small><p>${d[1]}</p></div><div><small>How judgment fails</small><p>${d[2]}</p></div></div>`;
      outcome(); card.classList.remove("swap"); void card.offsetWidth; card.classList.add("swap");
    }
    function outcome() {
      const i = ev && ju ? 3 : ev ? 1 : ju ? 2 : 0;
      out.innerHTML = `<b>${["Neither side fixed.", "Evidence side fixed only.", "Judgment side fixed only.", "Both sides fixed."][i]}</b> ${D[key][3][i]}`;
      out.classList.toggle("good", i === 3); out.classList.remove("swap"); void out.offsetWidth; out.classList.add("swap");
    }
    const f = body.querySelector("[data-f]");
    const t1 = toggle(f, { label: "Fix the evidence side", value: false, onChange: (v) => { ev = v; outcome(); } });
    const t2 = toggle(f, { label: "Fix the judgment side", value: false, onChange: (v) => { ju = v; outcome(); } });
    tabs(body.querySelector("[data-t]"), { value: key, options: Object.entries(D).map(([v, d]) => ({ v, t: d[0] })), onChange: (v) => { key = v; ev = ju = false; t1.set(false, true); t2.set(false, true); show(); } });
    show();
  });

  /* ====================================================================
     Watermark lab (after Kirchenbauer et al., 2023)
     ==================================================================== */
  Press.fig("fig-mark", (root) => {
    const body = root.querySelector(".fig-body");
    const SRC = "{The|A|Our} {city|town|local} {council|committee|board} {said|stated|announced} on {Monday|Tuesday|Friday} that the {old|ageing|historic} {bridge|crossing|span} {will|would|should} {stay|remain|be kept} {open|in use|in service} while {engineers|inspectors|surveyors} {review|examine|assess} {new|fresh|recent} {reports|findings|claims} of {cracks|damage|wear} {found|spotted|seen} {last|earlier this|this} {month|week|spring}. {Residents|Locals|Neighbours} {have|had} {asked|urged|pressed} for {clear|plain|straight} {answers|information|facts}, and {officials|leaders|staff} {promised|pledged|offered} a {full|complete|detailed} {update|briefing|report} {soon|shortly|within days}. {Traffic|Travel|Commuting} {may|might|could} {be|become|grow} {slower|heavier|busier} {during|throughout|for} the {work|repairs|project}, and {buses|coaches|shuttles} {could|may|might} {take|use|follow} a {longer|different|new} {route|road|path}. {Shops|Businesses|Traders} {near|beside|by} the {river|water|quay} {fear|worry|expect} {fewer|smaller|thinner} {crowds|numbers|visits} {over|across|in} the {coming|next|following} {weeks|months|season}, {but|though|yet} the {mayor|leader|chair} {insists|says|argues} the {town|city|area} {will|can|should} {cope|manage|adapt}. {Engineers|Inspectors|Surveyors} {plan|intend|hope} to {publish|release|share} {their|the|all} {findings|results|data} {online|in full|publicly}, {with|including|plus} {photos|images|pictures} and {measurements|readings|notes}. A {final|formal|firm} {decision|ruling|verdict} is {expected|due|likely} {before|by|near} the {end|close|turn} of the {year|season|summer}.";
    const parts = SRC.split(/(\{[^}]+\})/).filter(Boolean).map((p) => (p[0] === "{" ? { opts: p.slice(1, -1).split("|") } : { text: p }));
    const T = parts.filter((p) => p.opts).length;
    const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return h >>> 0; };
    const green = (prev, w) => (hash(prev.toLowerCase() + "|" + w.toLowerCase()) & 1) === 0;
    const lastWord = (s) => { const m = s.trim().split(/\s+/); return m[m.length - 1] || ""; };
    body.innerHTML = `<div class="controls row" data-c></div><div class="btnrow" style="margin:1rem 0" data-b></div><div class="mark-text" aria-live="polite"></div>
      <div class="zmeter" aria-hidden="true"><div class="track" style="background:linear-gradient(90deg,var(--paper-2) 0 60%,var(--spot-wash) 60%)"></div><div class="thr" style="left:60%"><span>Flagged above z = 4</span></div><div class="pin"></div><div class="ticks">${[-2, 0, 2, 4, 6, 8].map((v, k) => `<span style="left:${k * 20}%">${v < 0 ? "\u2212" + -v : v}</span>`).join("")}</div></div>
      <div class="stats" data-st></div><p class="say" data-say></p>`;
    let strength = 1, view = true, pick = [], fresh = new Set(), r = rng(41), lastAction = "mark";
    const c = body.querySelector("[data-c]");
    range(c, { label: "Watermark strength", min: 0, max: 100, step: 5, value: 100, fmt: (v) => v + "%", onInput: (v) => { strength = v / 100; generate(true); } });
    toggle(c, { label: "Show the detector's view", value: true, onChange: (v) => { view = v; render(); } });
    // Walk the text, choosing a word for each slot; returns chosen indexes.
    function generate(marked) {
      lastAction = marked ? "mark" : "human"; fresh.clear(); r = rng(Math.floor(Math.random() * 1e9));
      let prev = "", k = 0; pick = [];
      parts.forEach((p) => {
        if (p.text) { prev = lastWord(p.text) || prev; return; }
        const g = p.opts.map((w, i) => (green(prev, w) ? i : -1)).filter((i) => i >= 0);
        const i = marked && g.length && r() < strength ? g[Math.floor(r() * g.length)] : Math.floor(r() * p.opts.length);
        pick[k++] = i; prev = p.opts[i].split(" ").pop();
      });
      render();
    }
    function paraphrase() {
      lastAction = "para"; const idx = Array.from({ length: T }, (_, i) => i).filter((i) => parts.filter((p) => p.opts)[i].opts.length > 1);
      for (let n = 0; n < 10; n++) { const i = idx[Math.floor(Math.random() * idx.length)], o = parts.filter((p) => p.opts)[i].opts; pick[i] = (pick[i] + 1 + Math.floor(Math.random() * (o.length - 1))) % o.length; fresh.add(i); }
      render();
    }
    function render() {
      let prev = "", k = 0, G = 0, html = "";
      parts.forEach((p) => {
        if (p.text) { html += p.text; prev = lastWord(p.text) || prev; return; }
        const w = p.opts[pick[k]], g = green(prev, w); G += g;
        html += `<span class="w ${g ? "g" : "r"} ${fresh.has(k) ? "new" : ""}">${w}</span>`; prev = w.split(" ").pop(); k++;
      });
      const box = body.querySelector(".mark-text"); box.innerHTML = html; box.classList.toggle("view", view);
      const z = (G - 0.5 * T) / Math.sqrt(T * 0.25), flagged = z > 4;
      body.querySelector(".pin").style.left = clamp((z + 2) / 10, 0, 1) * 100 + "%";
      body.querySelector("[data-st]").innerHTML = `<div><small>Words checked (T)</small><b>${T}</b></div><div><small>Green words</small><b>${G} <span style="font-size:.9rem;font-weight:600">(${Math.round((G / T) * 100)}%)</span></b></div><div><small>z-score</small><b class="spot">${z.toFixed(2)}</b></div><div><small>Detector says</small><b>${flagged ? "Machine-made" : "No watermark"}</b></div>`;
      body.querySelector("[data-say]").innerHTML = lastAction === "human" ? `<b>Written without the watermark:</b> about half the words land green by chance, so z sits near zero. ${flagged ? "This rare false alarm is why the bar is set high." : ""}` : lastAction === "para" ? `<b>${fresh.size} words rewritten.</b> ${flagged ? "Still flagged, but the score is falling. Keep paraphrasing." : "The watermark has washed out. The text is no less machine-made; the detector simply cannot tell any more."}` : flagged ? `<b>Watermarked:</b> ${Math.round((G / T) * 100)}% of words are green, far more than the 50% chance would give. Now paraphrase it.` : strength < 0.5 ? "<b>A weak watermark</b> barely shifts the word choices, so the detector cannot separate it from human writing." : "<b>Close to the line.</b> Short texts give the detector too little to go on. Try a stronger watermark.";
    }
    const b = body.querySelector("[data-b]");
    button(b, "Write with watermark", () => generate(true), "spot");
    button(b, "Paraphrase 10 words", paraphrase);
    button(b, "Write it as a person would", () => generate(false));
    generate(true);
    root.addEventListener("fig:reset", () => generate(true));
  });

  /* ====================================================================
     The same answer, designed two ways
     ==================================================================== */
  Press.fig("fig-design", (root) => {
    const body = root.querySelector(".fig-body");
    const O = [
      ["src", "Link the sources"], ["unc", "Say how sure it is"], ["split", "Separate evidence from inference"],
      ["counter", "Offer the strongest counter-view"], ["slow", "Slow down when stakes are high"]
    ];
    body.innerHTML = `<div class="split phone-left design-wrap"><div data-phone></div><div><div class="controls" data-c></div><div class="bars" style="margin-top:1.2rem"><div><span>What you can judge yourself</span><span class="bar spot"><i data-j></i></span><b data-jv>0</b></div><div><span>Seconds to read</span><span class="bar"><i data-s></i></span><b data-sv>0</b></div></div><p class="say" data-say></p></div></div>`;
    const ph = iphone(body.querySelector("[data-phone]"), { finish: "orange", dark: true, label: "Assistant answer" });
    ph.content.innerHTML = `<div class="chat"><div class="chat-log"><div class="bub me">Is the video of the minister at the depot real?</div><div class="bub ai" data-ans></div></div></div>`;
    const ans = ph.content.querySelector("[data-ans]"), on = {};
    const c = body.querySelector("[data-c]");
    O.forEach(([k, t]) => toggle(c, { label: t, value: false, onChange: (v) => { on[k] = v; paint(); } }));
    function paint() {
      let h = "";
      if (on.split) h += `<span class="sec-t">What was checked</span>`;
      h += on.unc ? "It is probably real, but not confirmed." : "Yes, the video is real.";
      if (on.split) h += ` The location matches the depot and two other people filmed the same moment.<span class="sec-t">What I infer</span>The clip is likely authentic, but the original file has not been found, so editing cannot be ruled out.`;
      if (on.unc) h += `<span class="conf">Confidence: moderate. One key check is missing.</span>`; else h += `<span class="conf">Confidence: high</span>`;
      if (on.src) h += `<span class="src"><b>Source 1</b>Second video of the same moment, posted by a bystander</span><span class="src"><b>Source 2</b>Broadcaster's statement on the original footage</span>`;
      if (on.counter) h += `<span class="src"><b>Strongest case against</b>The audio track is slightly out of sync, which can happen with re-uploads or with editing.</span>`;
      if (on.slow) h += `<span class="sec-t">Before you share</span>This could affect a vote this week. Look at the original first.<button class="hold" type="button"><i></i><span>Hold to share anyway</span></button>`;
      ans.innerHTML = h; ans.classList.remove("swap"); void ans.offsetWidth; ans.classList.add("swap");
      const hold = ans.querySelector(".hold"); if (hold) wireHold(hold);
      const n = O.filter(([k]) => on[k]).length, judge = [8, 30, 52, 70, 84, 94][n], secs = 3 + (on.src ? 6 : 0) + (on.unc ? 3 : 0) + (on.split ? 9 : 0) + (on.counter ? 5 : 0) + (on.slow ? 4 : 0);
      body.querySelector("[data-j]").style.setProperty("--v", judge + "%"); body.querySelector("[data-jv]").textContent = judge;
      body.querySelector("[data-s]").style.setProperty("--v", (secs / 30) * 100 + "%"); body.querySelector("[data-sv]").textContent = secs;
      body.querySelector("[data-say]").innerHTML = n === 0 ? "<b>Fast, fluent and impossible to check.</b> The answer gives you a verdict and nothing to judge it with. Switch the design choices on." : n < 5 ? `<b>${n} of 5 on.</b> Each choice costs a few seconds of reading and hands back a piece of the judgment.` : "<b>All five on.</b> Slower to read, and you could now defend, or reject, the answer yourself. That is the trade the paper argues for when stakes are high.";
    }
    function wireHold(b) {
      const bar = b.querySelector("i"), lab = b.querySelector("span"); let t = 0, raf = 0, start = 0;
      const down = (e) => { e.preventDefault(); start = performance.now(); const go = (now) => { t = Math.min(1, (now - start) / 1600); bar.style.width = t * 100 + "%"; if (t < 1) raf = requestAnimationFrame(go); else lab.textContent = "Shared, after a pause"; }; raf = requestAnimationFrame(go); };
      const up = () => { cancelAnimationFrame(raf); if (t < 1) { bar.style.width = "0"; t = 0; } };
      b.addEventListener("pointerdown", down); b.addEventListener("pointerup", up); b.addEventListener("pointerleave", up); b.addEventListener("pointercancel", up);
    }
    paint();
  });
})();

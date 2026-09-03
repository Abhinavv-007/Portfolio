/*
  Interactive layer for abhnv.in — "The Build Journal".

  app.js renders the pages and owns the page furniture (menu, intro, reveals).
  This file adds the things a reader can *operate*: the press seals, the loupe,
  the per-page instruments, and the six hidden press marks.

  Loaded after app.js, so the DOM app.js renders is already in place.
  Everything here degrades to plain, readable paper when JavaScript,
  IntersectionObserver, localStorage or motion are unavailable.
*/
(function () {
  "use strict";

  const data = window.PORTFOLIO || {};
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const page = document.body.dataset.page || "";
  const isCaseStudy = Boolean(document.body.dataset.caseStudy);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const pad = (n) => String(n).padStart(2, "0");
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  /* ------------------------------------------------------------------ */
  /* Press marks — six of them, one per page, hidden in that page's own  */
  /* mechanic. Found marks are stamped into the proof strip in the       */
  /* footer of every page.                                              */
  /* ------------------------------------------------------------------ */

  const MARKS = [
    { id: "halftone", page: "index", name: "The halftone", note: "Hidden in the dot screen of the front-page clipping." },
    { id: "mismatch", page: "security", name: "The mismatch", note: "Printed the moment one account read another's invoice." },
    { id: "fineprint", page: "work", name: "The fine print", note: "Set too small to read without the loupe." },
    { id: "watermark", page: "credentials", name: "The watermark", note: "Pressed into the sheet. Only the light table shows it." },
    { id: "wire", page: "api", name: "The wire", note: "Struck on the plate under the latency dial." },
    { id: "wax", page: "contact", name: "The wax", note: "Sitting under the signature stamp all along." }
  ];

  const STORE_KEY = "buildjournal.pressmarks.v1";

  const readFound = () => {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list.filter((id) => MARKS.some((m) => m.id === id)) : [];
    } catch (err) {
      return [];
    }
  };
  const writeFound = (list) => {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (err) { /* private mode: keep it in memory */ }
  };

  let found = readFound();
  const has = (id) => found.includes(id);

  const proofStrips = [];
  let proofToast = null;

  function sealSvg(label) {
    // A round letterpress mark. The glyph is the journal's "B/J" monogram.
    return `
      <svg class="pm-seal-art" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <circle cx="24" cy="24" r="22" class="pm-seal-rim"></circle>
        <circle cx="24" cy="24" r="18.5" class="pm-seal-hair"></circle>
        <text x="24" y="28.5" class="pm-seal-glyph">${esc(label)}</text>
      </svg>`;
  }

  function renderProofStrip(strip) {
    const count = found.length;
    const complete = count === MARKS.length;
    strip.classList.toggle("is-complete", complete);
    const slots = MARKS.map((mark, i) => {
      const got = has(mark.id);
      return `
        <span class="pm-slot${got ? " is-found" : ""}" data-mark-slot="${esc(mark.id)}" title="${got ? esc(mark.name + " — " + mark.note) : "Not found yet"}">
          ${got ? sealSvg(pad(i + 1)) : `<span class="pm-slot-num" aria-hidden="true">${pad(i + 1)}</span>`}
          <span class="pm-slot-name">${got ? esc(mark.name) : "—"}</span>
        </span>`;
    }).join("");
    strip.innerHTML = `
      <span class="pm-strip-label">Printer's proofs</span>
      <span class="pm-slots" role="list" aria-label="Press marks found">${slots}</span>
      <span class="pm-strip-count" aria-live="polite">${
        complete
          ? "Full set. Every press mark in this issue is accounted for."
          : `${count} of ${MARKS.length} press marks found &middot; six are hidden across this issue`
      }</span>
      ${complete ? `<button type="button" class="pm-proof-open" data-proof-open>Open the proof</button>` : ""}
    `;
    const opener = $("[data-proof-open]", strip);
    if (opener) opener.addEventListener("click", openProofSheet);
  }

  function mountProofStrips() {
    $$(".footer").forEach((footer) => {
      const colophon = $(".footer-colophon", footer);
      if (!colophon) return;
      const strip = document.createElement("div");
      strip.className = "pm-strip";
      strip.setAttribute("aria-label", "Press marks");
      colophon.parentNode.insertBefore(strip, colophon);
      proofStrips.push(strip);
      renderProofStrip(strip);
    });
  }

  function showToast(mark, index) {
    if (!proofToast) {
      proofToast = document.createElement("div");
      proofToast.className = "pm-toast";
      proofToast.setAttribute("role", "status");
      proofToast.setAttribute("aria-live", "polite");
      document.body.appendChild(proofToast);
    }
    const complete = found.length === MARKS.length;
    proofToast.innerHTML = `
      <span class="pm-toast-seal">${sealSvg(pad(index + 1))}</span>
      <span class="pm-toast-copy">
        <strong>${complete ? "Full set" : "Press mark found"}</strong>
        <span class="pm-toast-name">${esc(mark.name)}</span>
        <span class="pm-toast-note">${esc(mark.note)}</span>
        <span class="pm-toast-count">${found.length} of ${MARKS.length}</span>
      </span>`;
    proofToast.classList.remove("is-in");
    void proofToast.offsetWidth;
    proofToast.classList.add("is-in");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => proofToast.classList.remove("is-in"), complete ? 9000 : 6000);
  }

  function findMark(id) {
    const index = MARKS.findIndex((m) => m.id === id);
    if (index < 0 || has(id)) return false;
    found = found.concat(id);
    writeFound(found);
    proofStrips.forEach(renderProofStrip);
    showToast(MARKS[index], index);
    document.body.classList.toggle("has-full-set", found.length === MARKS.length);
    if (found.length === MARKS.length) window.setTimeout(openProofSheet, 1400);
    return true;
  }

  // Anything with data-press-mark becomes a findable mark: a small ink
  // glyph that presses itself into the strip when clicked or focused+entered.
  function armMark(el, id) {
    if (!el || has(id)) { if (el) el.remove(); return; }
    el.classList.add("pm-mark");
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", "An unclaimed press mark. Press to stamp it into the printer's proofs.");
    el.innerHTML = sealSvg("?");
    const claim = (event) => {
      event.preventDefault();
      event.stopPropagation();
      el.classList.add("is-claimed");
      findMark(id);
      window.setTimeout(() => el.remove(), 700);
    };
    el.addEventListener("click", claim);
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") claim(event);
    });
  }

  function openProofSheet() {
    if ($(".pm-sheet")) return;
    const sheet = document.createElement("div");
    sheet.className = "pm-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", "Printer's proof");
    const number = 100 + (found.join("").length * 7) % 800;
    sheet.innerHTML = `
      <div class="pm-sheet-paper">
        <button type="button" class="pm-sheet-close" aria-label="Close the proof">&times;</button>
        <div class="pm-sheet-mast">
          <span>The Build Journal</span>
          <span>Printer's proof</span>
          <span>Nº ${number}</span>
        </div>
        <h2>You found all six.</h2>
        <p class="pm-sheet-lede">Six marks were set into this issue, one on every desk. Finding them meant using each page the way it was built to be used: the loupe on the clipping, the light table on the certificates, the dial in the wire room, an invoice read by the wrong account.</p>
        <ul class="pm-sheet-list">
          ${MARKS.map((m, i) => `<li><span class="pm-sheet-seal">${sealSvg(pad(i + 1))}</span><span><strong>${esc(m.name)}</strong><em>${esc(m.note)}</em></span></li>`).join("")}
        </ul>
        <p class="pm-sheet-note">That is the whole job, really. Read closely, try the thing nobody tries, and write down what you found. Thanks for reading properly — <strong>Abhinav</strong>.</p>
        <div class="pm-sheet-foot">
          <a class="text-link hover-cut" href="/contact"><span>Write to me</span></a>
          <a class="text-link hover-cut" href="/security"><span>How I test systems</span></a>
        </div>
      </div>`;
    document.body.appendChild(sheet);
    document.body.classList.add("pm-sheet-open");
    const close = () => {
      sheet.classList.add("is-out");
      document.body.classList.remove("pm-sheet-open");
      window.setTimeout(() => sheet.remove(), 320);
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (event) => { if (event.key === "Escape") close(); };
    $(".pm-sheet-close", sheet).addEventListener("click", close);
    sheet.addEventListener("click", (event) => { if (event.target === sheet) close(); });
    document.addEventListener("keydown", onKey);
    window.setTimeout(() => sheet.classList.add("is-in"), 20);
    $(".pm-sheet-close", sheet).focus();
  }

  function setupPressMarks() {
    mountProofStrips();
    if (found.length === MARKS.length) document.body.classList.add("has-full-set");
  }

  /* ------------------------------------------------------------------ */
  /* The loupe — a magnifier over a printed surface. Moving it does not  */
  /* scale anything; it opens a circular window onto a second layer that */
  /* holds the fine print, the dot screen and, sometimes, a press mark.  */
  /* ------------------------------------------------------------------ */

  function attachLoupe(host, buildLayer, options = {}) {
    if (!host || host.dataset.loupeReady === "1") return null;
    host.dataset.loupeReady = "1";
    host.classList.add("has-loupe");

    // The layer is masked visually, never hidden from assistive tech: what it
    // holds is real copy, and sometimes a focusable press mark.
    const layer = document.createElement("div");
    layer.className = `loupe-layer${options.className ? " " + options.className : ""}`;
    layer.innerHTML = buildLayer();

    const glass = document.createElement("span");
    glass.className = "loupe-glass";
    glass.setAttribute("aria-hidden", "true");

    const hint = document.createElement("span");
    hint.className = "loupe-hint";
    hint.textContent = options.hint || (coarsePointer ? "Tap and drag to read the fine print" : "Move the loupe over the page");

    host.append(layer, glass, hint);

    let open = false;
    const move = (x, y) => {
      const rect = host.getBoundingClientRect();
      const lx = ((x - rect.left) / rect.width) * 100;
      const ly = ((y - rect.top) / rect.height) * 100;
      host.style.setProperty("--loupe-x", `${lx}%`);
      host.style.setProperty("--loupe-y", `${ly}%`);
    };
    const setOpen = (next) => {
      open = next;
      host.classList.toggle("is-loupe-open", next);
    };

    host.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      move(event.clientX, event.clientY);
      setOpen(true);
    });
    host.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch" && !open) return;
      move(event.clientX, event.clientY);
      if (!open) setOpen(true);
    });
    host.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      setOpen(false);
    });
    // Touch: press and drag. The lens follows the finger and stays until release.
    host.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "touch") return;
      move(event.clientX, event.clientY);
      setOpen(true);
    });
    host.addEventListener("pointerup", () => { if (coarsePointer) window.setTimeout(() => setOpen(false), 1600); });

    // Keyboard: a focusable control parks the lens in the middle and holds it
    // open, so the hidden copy is reachable without a pointer at all.
    const key = document.createElement("button");
    key.type = "button";
    key.className = "loupe-key";
    key.textContent = options.keyLabel || "Read the fine print";
    key.setAttribute("aria-pressed", "false");
    key.addEventListener("click", () => {
      const next = !host.classList.contains("is-pinned");
      host.classList.toggle("is-pinned", next);
      key.setAttribute("aria-pressed", String(next));
      key.textContent = next ? (options.keyLabelOn || "Put the loupe down") : (options.keyLabel || "Read the fine print");
      host.style.setProperty("--loupe-x", "50%");
      host.style.setProperty("--loupe-y", "50%");
    });
    (options.keyHost || host).appendChild(key);

    host.style.setProperty("--loupe-x", "50%");
    host.style.setProperty("--loupe-y", "50%");
    return { layer, glass, open: () => setOpen(true) };
  }

  /* ------------------------------------------------------------------ */
  /* Seals — the round letterpress badge, generalised from the Bugcrowd  */
  /* medallion on the security desk.                                     */
  /* ------------------------------------------------------------------ */

  function seal(word, sub, tone) {
    return `
      <span class="seal${tone ? " seal--" + tone : ""}" aria-hidden="true">
        <span class="seal-ring"></span>
        <span class="seal-word">${esc(word)}</span>
        ${sub ? `<span class="seal-sub">${esc(sub)}</span>` : ""}
      </span>`;
  }

  // Every desk gets its own mark in the folio strip, so the page announces
  // which part of the paper you are standing in.
  // A printer's signature mark: one letter identifying the gathering. Small
  // enough to sit in the folio rule, large enough to actually read.
  const DESK_SEALS = {
    index: { letter: "F", name: "Front desk" },
    security: { letter: "S", name: "Security desk" },
    work: { letter: "C", name: "Case files" },
    credentials: { letter: "R", name: "Records office" },
    api: { letter: "W", name: "Wire room" },
    contact: { letter: "P", name: "Post desk" },
    terminal: { letter: "K", name: "Command desk" }
  };

  function setupDeskSeal() {
    const folio = $(".folio-strip");
    const spec = DESK_SEALS[page];
    if (!folio || !spec || $(".desk-seal", folio)) return;
    const mark = document.createElement("span");
    mark.className = "desk-seal";
    mark.setAttribute("aria-hidden", "true");
    mark.title = spec.name;
    mark.innerHTML = `
      <svg viewBox="0 0 44 44" focusable="false">
        <circle cx="22" cy="22" r="20.5" class="desk-seal-rim"></circle>
        <circle cx="22" cy="22" r="17" class="desk-seal-hair"></circle>
        <text x="22" y="29.5" class="desk-seal-word">${esc(spec.letter)}</text>
      </svg>`;
    folio.appendChild(mark);
  }

  /* ------------------------------------------------------------------ */
  /* Profile desk — the Linotype.                                        */
  /* The timeline stops being a list and becomes the machine that set    */
  /* it: pick an era, watch the line get cast, read the slug it made.    */
  /* ------------------------------------------------------------------ */

  function mirrorSlug(text) {
    return text.toUpperCase().split("").reverse().join("");
  }

  function setupLinotype() {
    const host = $("[data-timeline]");
    const entries = data.timeline || [];
    if (!host || !entries.length) return;

    host.classList.add("linotype");
    host.innerHTML = `
      <div class="lino-head">
        <span class="lino-kicker">The linotype</span>
        <span class="lino-hint">Pick a line to cast</span>
      </div>
      <div class="lino-rail" role="tablist" aria-label="Timeline" aria-orientation="horizontal">
        ${entries.map((item, i) => `
          <button type="button" role="tab" id="lino-tab-${i}" aria-controls="lino-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-lino="${i}">
            <span class="lino-when">${esc(item.when)}</span>
            <span class="lino-tick" aria-hidden="true"></span>
          </button>`).join("")}
      </div>
      <div class="lino-machine">
        <div class="lino-slug" aria-hidden="true"><span data-lino-slug></span></div>
        <div class="lino-panel" role="tabpanel" id="lino-panel" tabindex="0">
          <h3 data-lino-title></h3>
          <p data-lino-body></p>
        </div>
      </div>`;

    const tabs = $$("[data-lino]", host);
    const slug = $("[data-lino-slug]", host);
    const title = $("[data-lino-title]", host);
    const body = $("[data-lino-body]", host);
    let current = -1;
    let token = 0;

    const cast = async (index, focus) => {
      const next = (index + entries.length) % entries.length;
      if (next === current) return;
      current = next;
      const run = ++token;
      const item = entries[current];

      tabs.forEach((tab, i) => {
        tab.setAttribute("aria-selected", String(i === current));
        tab.setAttribute("tabindex", i === current ? "0" : "-1");
        tab.classList.toggle("is-active", i === current);
      });
      if (focus) tabs[current].focus();
      host.setAttribute("data-lino-current", String(current));
      $("#lino-panel", host).setAttribute("aria-labelledby", `lino-tab-${current}`);
      slug.textContent = mirrorSlug(item.title);

      if (reducedMotion || document.visibilityState === "hidden") {
        title.textContent = item.title;
        body.textContent = item.body;
        host.classList.add("is-cast", "is-set");
        return;
      }

      host.classList.remove("is-cast", "is-set");
      host.classList.add("is-casting");
      // The title arrives one matrix at a time, the way the machine assembles it.
      title.innerHTML = item.title.split("").map((ch, i) =>
        `<span class="lino-char" style="--i:${i}">${ch === " " ? "&nbsp;" : esc(ch)}</span>`
      ).join("");
      // A line that never finished casting must still be readable, so the
      // characters are pinned visible once the animation has had its time.
      window.clearTimeout(cast.settle);
      cast.settle = window.setTimeout(() => host.classList.add("is-set"), 400 + item.title.length * 22 + 320);
      body.textContent = "";
      await sleep(120);
      if (run !== token) return;
      host.classList.add("is-cast");
      await sleep(260);
      if (run !== token) return;
      host.classList.remove("is-casting");
      // Then the body sets itself, word by word, like the rest of the column.
      // Timers are clamped in a background tab, so the line is finished in
      // one go if it starts taking longer than a reader would wait.
      const words = item.body.split(/(\s+)/);
      const started = performance.now();
      for (let i = 0; i < words.length; i += 1) {
        if (run !== token) return;
        if (performance.now() - started > 2200) {
          body.append(words.slice(i).join(""));
          break;
        }
        body.append(words[i]);
        if (words[i].trim()) await sleep(18);
      }
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => cast(i, false));
      tab.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); cast(i + 1, true); }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); cast(i - 1, true); }
        if (event.key === "Home") { event.preventDefault(); cast(0, true); }
        if (event.key === "End") { event.preventDefault(); cast(entries.length - 1, true); }
      });
    });

    // The first line is set in plain type straight away, so the panel is
    // never empty no matter what happens to observers or animations. The
    // performance only replaces something that is already readable.
    const first = entries[0];
    title.textContent = first.title;
    body.textContent = first.body;
    slug.textContent = mirrorSlug(first.title);
    tabs[0].classList.add("is-active");
    host.classList.add("is-set");

    if ("IntersectionObserver" in window && !reducedMotion) {
      const io = new IntersectionObserver((items) => {
        if (!items.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        cast(0, false);
      }, { threshold: 0.35 });
      io.observe(host);
      // If the observer never gets its chance — a background tab, a browser
      // that throttles it away — the line stands as printed.
      window.setTimeout(() => { io.disconnect(); if (current < 0) cast(0, false); }, 4000);
    } else {
      cast(0, false);
    }
  }

  /* --- The front-page clipping, read through the loupe ---------------- */

  function setupClippingLoupe() {
    const clip = $(".clipping");
    if (!clip) return;
    const frame = $(".clipping-body", clip) || clip;

    attachLoupe(frame, () => `
      <span class="loupe-halftone"></span>
      <span class="loupe-fineprint">
        <em>Colophon.</em> Set in Playfair Display and printed at abhnv.in.
        Six press marks were struck into this issue — this is the first of them.
        <span class="pm-mark-slot" data-mark="halftone"></span>
      </span>
    `, {
      className: "loupe-layer--clipping",
      hint: coarsePointer ? "Press and drag across the clipping" : "Move the loupe across the clipping",
      keyLabel: "Read the fine print",
      keyLabelOn: "Put the loupe down",
      keyHost: clip
    });

    const slot = $("[data-mark='halftone']", clip);
    if (slot) armMark(slot, "halftone");
  }

  /* ------------------------------------------------------------------ */
  /* Case files — the builds desk.                                       */
  /* Each product becomes a dossier: numbered tab, a LIVE seal, and the  */
  /* security decision set as fine print you need the loupe to read.     */
  /* ------------------------------------------------------------------ */

  function setupCaseFiles() {
    if (page !== "work" || isCaseStudy) return;
    const grid = $("#workPageGrid");
    if (!grid) return;
    const cards = $$(".work-detail-card", grid);
    if (!cards.length) return;

    const projects = data.projects || [];

    cards.forEach((card, index) => {
      const project = projects[index] || {};
      card.classList.add("case-file");
      card.dataset.tags = (project.tags || []).join("|").toLowerCase();

      // The folder tab: a numbered file, stamped and filed.
      const tab = document.createElement("div");
      tab.className = "case-tab";
      tab.innerHTML = `
        <span class="case-tab-num" aria-hidden="true">Case file Nº ${pad(index + 1)}</span>
        <span class="case-tab-marks">
          ${seal("Live", project.type || "", "live")}
          ${seal(String((project.tags || []).length || 3), "Tags", "count")}
        </span>`;
      const main = $(".work-detail-main", card);
      card.insertBefore(tab, main);

      // The security lens replaces the old disclosure toggle: the note is
      // printed on the sheet, too small to read, and the loupe reads it.
      const note = project.securityNote;
      const old = $(".security-note", card);
      if (!note) { if (old) old.remove(); return; }

      if (old) old.remove();
      // The lens gets the full width of the file rather than the narrow
      // column, so the fine print has room to actually be fine print.
      const lens = document.createElement("div");
      lens.className = "case-lens";
      lens.innerHTML = `
        <div class="case-lens-head">
          <span class="case-lens-heading">
            <span class="case-lens-label">Security lens</span>
            <span class="case-lens-sub">The decision I would look for as a researcher</span>
          </span>
        </div>
        <div class="case-lens-print" data-lens-print>
          <p class="case-lens-blur" aria-hidden="true">${esc(note)}</p>
        </div>`;
      card.appendChild(lens);

      const print = $("[data-lens-print]", lens);
      attachLoupe(print, () => `
        <p class="case-lens-sharp">${esc(note)}${
          index === cards.length - 1
            ? ` <span class="case-lens-extra">Set smaller still: a press mark, filed with the rest.</span><span class="pm-mark-slot" data-mark="fineprint"></span>`
            : ""
        }</p>
      `, {
        className: "loupe-layer--lens",
        hint: coarsePointer ? "Press and drag to read it" : "Move the loupe to read it",
        keyLabel: "Read the fine print",
        keyLabelOn: "Put the loupe down",
        keyHost: $(".case-lens-head", lens)
      });

      const slot = $("[data-mark='fineprint']", lens);
      if (slot) armMark(slot, "fineprint");
    });

    setupCaseFilters(grid, cards, projects);
    setupPaperFiles();
  }

  // The papers sit in the same drawer as the products, so they are filed the
  // same way: a numbered tab and a mark saying what the thing is.
  function setupPaperFiles() {
    const grid = $("#researchPageGrid");
    if (!grid) return;
    const papers = data.researchPapers || [];
    $$(".research-card", grid).forEach((card, index) => {
      if ($(".case-tab", card)) return;
      const paper = papers[index] || {};
      card.classList.add("case-file", "case-file--paper");
      const tab = document.createElement("div");
      tab.className = "case-tab";
      tab.innerHTML = `
        <span class="case-tab-num" aria-hidden="true">Paper Nº ${pad(index + 1)}</span>
        <span class="case-tab-marks">
          ${seal("Read", paper.label || "Long read", "paper")}
          ${seal(String((paper.tags || []).length || 3), "Tags", "count")}
        </span>`;
      card.insertBefore(tab, $(".work-detail-main", card));
    });
  }

  // A row of rubber stamps over the desk. Choosing one re-files the drawer:
  // the cards that do not match are pulled, the rest settle back into place.
  function setupCaseFilters(grid, cards, projects) {
    const tags = [];
    projects.forEach((project) => (project.tags || []).forEach((tag) => {
      if (!tags.includes(tag)) tags.push(tag);
    }));
    if (tags.length < 2) return;

    const bar = document.createElement("div");
    bar.className = "case-filters";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Filter the case files by subject");
    bar.innerHTML = `
      <span class="case-filters-label">Re-file the drawer</span>
      <div class="case-filters-row">
        <button type="button" class="case-stamp is-on" data-tag="*" aria-pressed="true">All files<small>${projects.length}</small></button>
        ${tags.map((tag) => `
          <button type="button" class="case-stamp" data-tag="${esc(tag.toLowerCase())}" aria-pressed="false">${esc(tag)}<small>${projects.filter((p) => (p.tags || []).includes(tag)).length}</small></button>`).join("")}
      </div>
      <p class="case-filters-count" aria-live="polite"></p>`;
    // The board around the grid is a two-column layout; a third child would
    // break it. The bar goes inside the grid and spans every column instead.
    grid.prepend(bar);

    const stamps = $$(".case-stamp", bar);
    const count = $(".case-filters-count", bar);

    const apply = (tag) => {
      let shown = 0;
      cards.forEach((card) => {
        const match = tag === "*" || (card.dataset.tags || "").split("|").includes(tag);
        card.classList.toggle("is-filed-out", !match);
        if (match) {
          shown += 1;
          card.style.setProperty("--file-delay", `${shown * 55}ms`);
        }
      });
      count.textContent = tag === "*"
        ? `All ${shown} case files on the desk.`
        : `${shown} file${shown === 1 ? "" : "s"} pulled for “${tag}”.`;
      stamps.forEach((stamp) => {
        const on = stamp.dataset.tag === tag;
        stamp.classList.toggle("is-on", on);
        stamp.setAttribute("aria-pressed", String(on));
      });
      // Re-run the press animation so the drawer visibly settles again.
      grid.classList.remove("is-refiling");
      void grid.offsetWidth;
      if (!reducedMotion) grid.classList.add("is-refiling");
    };

    bar.addEventListener("click", (event) => {
      const stamp = event.target.closest("[data-tag]");
      if (stamp) apply(stamp.dataset.tag);
    });
    apply("*");
  }

  /* ------------------------------------------------------------------ */
  /* The wire room — /api.                                               */
  /* Responses arrive over a wire, so they get a wire's instruments: the */
  /* console prints them line by line, a dial swings to the round trip,  */
  /* and every request leaves a stub on the tape you can pull again.     */
  /* ------------------------------------------------------------------ */

  // A semicircular gauge: -90deg is the fast end, +90deg the slow one, and
  // the scale is logarithmic because 20ms and 40ms matter more than 900ms
  // and 920ms do.
  const DIAL_MIN = 5;
  const DIAL_MAX = 1000;
  const DIAL_R = 74;
  const DIAL_CX = 100;
  const DIAL_CY = 112;
  const dialAngle = (ms) => {
    const clamped = Math.min(DIAL_MAX, Math.max(DIAL_MIN, ms || DIAL_MIN));
    const t = (Math.log(clamped) - Math.log(DIAL_MIN)) / (Math.log(DIAL_MAX) - Math.log(DIAL_MIN));
    return -90 + t * 180;
  };
  const dialPoint = (deg, radius) => {
    const rad = deg * Math.PI / 180;
    return [
      DIAL_CX + Math.sin(rad) * radius,
      DIAL_CY - Math.cos(rad) * radius
    ];
  };

  function setupWireRoom() {
    if (page !== "api") return;
    const console_ = $(".api-console");
    if (!console_) return;

    const room = document.createElement("div");
    room.className = "wire-room";
    room.innerHTML = `
      <div class="wire-dial">
        <div class="wire-dial-head">
          <span class="wire-dial-kicker">Round trip</span>
          <span class="wire-dial-sub">Edge to browser</span>
        </div>
        <div class="wire-dial-face">
          <svg viewBox="0 0 200 126" role="img" aria-label="Latency dial">
            <path class="wire-arc" d="M ${DIAL_CX - DIAL_R} ${DIAL_CY} A ${DIAL_R} ${DIAL_R} 0 0 1 ${DIAL_CX + DIAL_R} ${DIAL_CY}"></path>
            <g class="wire-ticks">
              ${[5, 10, 25, 50, 100, 250, 500, 1000].map((ms) => {
                const deg = dialAngle(ms);
                const [ox, oy] = dialPoint(deg, DIAL_R);
                const [ix, iy] = dialPoint(deg, DIAL_R - 9);
                const [tx, ty] = dialPoint(deg, DIAL_R - 20);
                return `<line x1="${ox.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${ix.toFixed(1)}" y2="${iy.toFixed(1)}"></line>
                        <text x="${tx.toFixed(1)}" y="${(ty + 2.6).toFixed(1)}">${ms}</text>`;
              }).join("")}
            </g>
            <g class="wire-needle" data-wire-needle style="transform: rotate(-90deg)">
              <line x1="${DIAL_CX}" y1="${DIAL_CY}" x2="${DIAL_CX}" y2="${DIAL_CY - DIAL_R + 6}"></line>
              <line class="wire-needle-tail" x1="${DIAL_CX}" y1="${DIAL_CY}" x2="${DIAL_CX}" y2="${DIAL_CY + 10}"></line>
            </g>
            <circle class="wire-boss" cx="${DIAL_CX}" cy="${DIAL_CY}" r="7.5"></circle>
            <circle class="wire-boss-pin" cx="${DIAL_CX}" cy="${DIAL_CY}" r="2.6"></circle>
          </svg>
          <button type="button" class="wire-boss-hit" data-wire-boss aria-label="Lift the plate under the dial"></button>
        </div>
        <p class="wire-readout">
          <strong data-wire-ms>&mdash;</strong>
          <span data-wire-note>Waiting for the first request</span>
        </p>
        <p class="wire-plate" data-wire-plate hidden><em>Maker's plate</em><span class="pm-mark-slot wire-mark" data-mark="wire"></span></p>
      </div>
      <div class="wire-tape">
        <div class="wire-tape-head">
          <span class="wire-dial-kicker">The tape</span>
          <span class="wire-dial-sub">Pull a stub to send it again</span>
        </div>
        <div class="wire-tape-strip" data-wire-tape role="list">
          <p class="wire-tape-empty">Nothing on the tape yet. Run a route above.</p>
        </div>
      </div>`;
    // The quickstart is a two-column grid; the room belongs after the whole
    // section so it gets the full width of the page.
    const section = console_.closest(".api-quickstart") || console_.parentNode;
    section.parentNode.insertBefore(room, section.nextSibling);

    const needle = $("[data-wire-needle]", room);
    const readMs = $("[data-wire-ms]", room);
    const readNote = $("[data-wire-note]", room);
    const tape = $("[data-wire-tape]", room);
    let requests = 0;

    document.addEventListener("api:response", (event) => {
      const { path, ms, status, ok } = event.detail || {};
      requests += 1;

      needle.style.transform = `rotate(${dialAngle(ms).toFixed(2)}deg)`;
      room.classList.toggle("is-slow", ms > 250);
      room.classList.toggle("is-error", !ok);
      readMs.textContent = ok ? `${ms} ms` : "no reply";
      readNote.textContent = ok
        ? (ms < 40 ? "Served from the edge cache." : ms < 150 ? "A normal trip from the edge." : "Slower than usual — the function ran cold.")
        : "The request did not complete.";

      const empty = $(".wire-tape-empty", tape);
      if (empty) empty.remove();
      const stub = document.createElement("button");
      stub.type = "button";
      stub.className = `wire-stub${ok ? "" : " is-error"}`;
      stub.setAttribute("role", "listitem");
      stub.dataset.path = path || "/api";
      stub.innerHTML = `
        <span class="wire-stub-path">${esc(path || "/api")}</span>
        <span class="wire-stub-meta"><b>${ok ? status : "ERR"}</b><i>${ms} ms</i></span>
        <span class="wire-stub-no">Nº ${pad(requests)}</span>`;
      stub.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("api:run", { detail: { path: stub.dataset.path } }));
      });
      tape.prepend(stub);
      if (!reducedMotion) {
        stub.classList.add("is-fresh");
        window.setTimeout(() => stub.classList.remove("is-fresh"), 700);
      }
      while (tape.children.length > 12) tape.lastElementChild.remove();

      // The console prints the response rather than simply having it.
      if (!reducedMotion) {
        console_.classList.remove("is-printing");
        void console_.offsetWidth;
        console_.classList.add("is-printing");
        window.setTimeout(() => console_.classList.remove("is-printing"), 900);
      }

      // Three trips down the wire and the plate under the dial is worth a look.
      if (requests >= 3) $("[data-wire-plate]", room)?.removeAttribute("hidden");
    });

    const boss = $("[data-wire-boss]", room);
    const plate = $("[data-wire-plate]", room);
    const mark = $(".wire-mark", room);
    if (boss && plate && mark) {
      armMark(mark, "wire");
      if (has("wire")) plate.remove();
      boss.addEventListener("click", () => {
        plate.removeAttribute("hidden");
        room.classList.add("is-plate-open");
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* The post desk — /contact.                                           */
  /* Sending a message is a physical act here: the topic is stamped, the */
  /* letter carries a stamp of its own, the send button presses wax, and */
  /* a successful send cancels the postage.                              */
  /* ------------------------------------------------------------------ */

  const TOPIC_SEALS = {
    "security-research": "Res",
    "product-security": "Rev",
    "vulnerability-report": "Vuln",
    "build": "Bld",
    "other": "Note"
  };

  function setupPostDesk() {
    if (page !== "contact") return;
    const form = $("#contactForm");

    if (form) {
      // Wax on the send button. app.js still owns the submit; this only
      // gives the press something to feel like.
      const send = form.querySelector('button[type="submit"]');
      if (send && !$(".wax", send)) {
        const wax = document.createElement("span");
        wax.className = "wax";
        wax.setAttribute("aria-hidden", "true");
        wax.innerHTML = `<span class="wax-blob"></span><span class="wax-die">AR</span>`;
        send.prepend(wax);
        send.classList.add("has-wax");
        send.addEventListener("pointerdown", () => send.classList.add("is-pressing"));
        ["pointerup", "pointerleave", "pointercancel"].forEach((type) =>
          send.addEventListener(type, () => send.classList.remove("is-pressing")));
        send.addEventListener("click", () => {
          send.classList.remove("is-sealing");
          void send.offsetWidth;
          send.classList.add("is-sealing");
          window.setTimeout(() => send.classList.remove("is-sealing"), 900);
        });
      }

      // The topic radios become a tray of rubber stamps.
      $$(".contact-topic", form).forEach((label) => {
        const input = label.querySelector("input");
        const pill = label.querySelector("span");
        if (!input || !pill || $(".topic-seal", label)) return;
        label.classList.add("is-stamp");
        const badge = document.createElement("span");
        badge.className = "topic-seal";
        badge.setAttribute("aria-hidden", "true");
        badge.textContent = TOPIC_SEALS[input.value] || "Note";
        // Inside the pill, not beside it: the pill styling applies to every
        // span in the label, so a sibling would render as a second box.
        pill.prepend(badge);
        input.addEventListener("change", () => {
          if (!input.checked || reducedMotion) return;
          label.classList.remove("is-pressed");
          void label.offsetWidth;
          label.classList.add("is-pressed");
          window.setTimeout(() => label.classList.remove("is-pressed"), 520);
        });
      });
    }

    // The letter gets real postage, and the postage gets cancelled on send.
    const letter = $("[data-letter]");
    if (letter && !$(".letter-postage", letter)) {
      const postage = document.createElement("div");
      postage.className = "letter-postage";
      postage.setAttribute("aria-hidden", "true");
      postage.innerHTML = `
        <span class="postage-stamp">
          <span class="postage-value">₹5</span>
          <span class="postage-name">The Build<br>Journal</span>
          <span class="postage-place">India</span>
        </span>
        <span class="postage-cancel">
          <svg viewBox="0 0 120 120" focusable="false">
            <circle cx="60" cy="60" r="46"></circle>
            <circle cx="60" cy="60" r="38"></circle>
            <text x="60" y="52">ABHNV.IN</text>
            <text x="60" y="72" class="postage-cancel-sub">RECEIVED</text>
          </svg>
        </span>`;
      letter.appendChild(postage);

      const status = $("#contactFormStatus");
      if (status && "MutationObserver" in window) {
        const observer = new MutationObserver(() => {
          if (status.dataset.state === "success") letter.classList.add("is-cancelled");
          if (status.dataset.state === "error") letter.classList.remove("is-cancelled");
        });
        observer.observe(status, { attributes: true, attributeFilter: ["data-state"] });
      }
    }

    // The signature stamp has been sitting on the desk this whole time.
    // Lift it and there is a press mark under the wax.
    const stamp = $(".contact-stamp");
    if (stamp && !has("wax")) {
      const cradle = document.createElement("span");
      cradle.className = "wax-cradle";
      cradle.innerHTML = `<span class="pm-mark-slot" data-mark="wax"></span>`;
      stamp.parentNode.insertBefore(cradle, stamp);
      cradle.appendChild(stamp);
      stamp.classList.add("is-liftable");
      stamp.setAttribute("role", "button");
      stamp.setAttribute("tabindex", "0");
      stamp.setAttribute("aria-label", "Lift the signature stamp");
      const lift = () => cradle.classList.add("is-lifted");
      stamp.addEventListener("click", lift);
      stamp.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); lift(); }
      });
      armMark($("[data-mark='wax']", cradle), "wax");
    }
  }

  /* ------------------------------------------------------------------ */
  /* The records office — /credentials.                                  */
  /* Certificates are documents, so they get the two things documents    */
  /* get: an embossed VERIFIED seal, and a light table to hold them up   */
  /* to when you want to see what is pressed into the sheet.             */
  /* ------------------------------------------------------------------ */

  function setupRecordsOffice() {
    if (page !== "credentials") return;
    const grid = $("#certsGrid");
    if (!grid) return;

    const decorate = () => {
      $$(".cert-card, .certs-grid > a, .certs-grid > article", grid).forEach((card, index) => {
        if (card.dataset.recordReady === "1") return;
        card.dataset.recordReady = "1";
        card.classList.add("record-card");
        // The card already carries a VERIFIED plate in its corner, so the
        // seal is the record number rather than a second copy of the word.
        const emboss = document.createElement("span");
        emboss.className = "record-emboss";
        emboss.setAttribute("aria-hidden", "true");
        emboss.innerHTML = `
          <svg viewBox="0 0 72 72" focusable="false">
            <circle cx="36" cy="36" r="33"></circle>
            <circle cx="36" cy="36" r="27"></circle>
            <text x="36" y="32">RECORD</text>
            <text x="36" y="45" class="record-emboss-num">${pad(index + 1)}</text>
          </svg>`;
        card.appendChild(emboss);
        // A watermark is pressed into the sheet itself. It is decoration
        // until the light is behind it. The card is a link, so the mark that
        // can be claimed lives outside it, on the sheet.
        if (index === 2) {
          const water = document.createElement("span");
          water.className = "record-watermark";
          water.setAttribute("aria-hidden", "true");
          water.innerHTML = `<span class="record-watermark-art">BJ</span>`;
          card.appendChild(water);
          card.classList.add("is-watermarked");
        }
      });
    };

    decorate();
    // The grid is re-rendered when a filter is used, so re-stamp after it.
    if ("MutationObserver" in window) {
      new MutationObserver(decorate).observe(grid, { childList: true });
    }

    // The light table itself.
    const toolbar = $(".certs-toolbar");
    if (toolbar && !$(".light-table-switch")) {
      const control = document.createElement("button");
      control.type = "button";
      control.className = "light-table-switch";
      control.setAttribute("aria-pressed", "false");
      control.innerHTML = `<span class="lt-lamp" aria-hidden="true"></span><span>Hold to the light</span>`;
      toolbar.parentNode.insertBefore(control, toolbar.nextSibling);
      const markRail = document.createElement("span");
      markRail.className = "record-mark-rail";
      markRail.innerHTML = `<span class="record-mark-note">Something is pressed into the third sheet.</span><span class="pm-mark-slot" data-mark="watermark"></span>`;
      control.parentNode.insertBefore(markRail, control.nextSibling);
      if (has("watermark")) markRail.remove(); else armMark($("[data-mark='watermark']", markRail), "watermark");

      control.addEventListener("click", () => {
        const on = !document.body.classList.contains("light-table-on");
        document.body.classList.toggle("light-table-on", on);
        control.setAttribute("aria-pressed", String(on));
        control.classList.toggle("is-on", on);
        control.querySelector("span:last-child").textContent = on ? "Put the sheet down" : "Hold to the light";
      });
    }
  }

  /* --- The security desk: the lab already proves the point ------------ */

  function setupLabMark() {
    if (page !== "security" || has("mismatch")) return;
    const lab = $("[data-authlab]");
    const verdict = $("[data-lab-verdict]", lab || document);
    if (!lab || !verdict) return;
    // The mark is struck the moment the lab actually leaks a record — that
    // is, when the reader switches the ownership check off and looks.
    const observer = new MutationObserver(() => {
      if (!lab.classList.contains("is-leak")) return;
      observer.disconnect();
      const slot = document.createElement("span");
      slot.className = "pm-mark-slot pm-mark-slot--lab";
      verdict.appendChild(slot);
      armMark(slot, "mismatch");
    });
    observer.observe(lab, { attributes: true, attributeFilter: ["class"] });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  setupPressMarks();
  setupDeskSeal();
  setupLinotype();
  setupClippingLoupe();
  setupCaseFiles();
  setupWireRoom();
  setupPostDesk();
  setupRecordsOffice();
  setupLabMark();
})();

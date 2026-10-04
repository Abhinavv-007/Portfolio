/* ==========================================================================
   The Build Journal · Research Supplement · press engine
   The fold, running head, scroll stories, draggable numbers, contents,
   reading room, citations, KaTeX and lazy figures.
   ========================================================================== */
(function () {
  "use strict";

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  root.classList.add("js");

  /* ---------- Reader settings (this browser only) ---------- */
  const store = {
    get(k, d) { try { return localStorage.getItem("press:" + k) || d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem("press:" + k, v); } catch (_) {} }
  };
  const rmq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const settings = { theme: store.get("theme", "paper"), size: store.get("size", "m"), motion: store.get("motion", rmq.matches ? "calm" : "full") };
  function applySettings() {
    settings.theme === "night" ? root.setAttribute("data-theme", "night") : root.removeAttribute("data-theme");
    settings.size === "m" ? root.removeAttribute("data-size") : root.setAttribute("data-size", settings.size);
    root.classList.toggle("calm", settings.motion === "calm");
  }
  applySettings();
  const isCalm = () => settings.motion === "calm" || rmq.matches;

  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("is-on"); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("is-on"), 2200);
  }

  /* ---------- Scroll bus: one rAF per frame for everything that follows the page ---------- */
  const scrollers = [];
  let ticking = false;
  function frame() { ticking = false; const y = window.scrollY, vh = window.innerHeight; scrollers.forEach((f) => f(y, vh)); }
  function onScroll(f) { scrollers.push(f); }
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  window.addEventListener("resize", () => requestAnimationFrame(frame), { passive: true });

  /* ---------- The fold: the front page arrives folded and opens as you scroll ---------- */
  function setupFold() {
    const desk = $(".desk"); if (!desk) return;
    const fold = $(".sheet-fold", desk), top = $(".sheet-top", desk), hint = $(".fold-hint", desk);
    if (!fold) return;
    const can = () => window.innerWidth >= 900 && !isCalm();
    onScroll((y, vh) => {
      if (!can()) { fold.style.transform = ""; desk.style.setProperty("--hint", 0); fold.style.setProperty("--crease", 0.06); return; }
      const p = Math.max(0, Math.min(1, y / (vh * 0.55)));
      const e = 1 - Math.pow(1 - p, 3);
      const a = -178 * (1 - e);
      fold.style.transform = `rotateX(${a.toFixed(2)}deg)`;
      top.style.transform = "translateZ(1px)";
      fold.style.setProperty("--crease", (0.06 + 0.3 * (1 - e)).toFixed(3));
      desk.style.setProperty("--hint", Math.max(0, 1 - p * 4).toFixed(3));
      desk.style.paddingBottom = "";
    });
    if (hint) hint.addEventListener("click", () => window.scrollTo({ top: window.innerHeight * 0.6, behavior: "smooth" }));
  }

  /* ---------- Running head + progress + current section ---------- */
  const sections = [];
  function setupRunhead() {
    const head = $(".runhead"), paper = $(".paper"), desk = $(".desk");
    $$(".sec").forEach((sec, i) => {
      const h2 = $(".sec-head h2", sec);
      sections.push({ el: sec, id: sec.id, num: String(i + 1), title: sec.dataset.title || (h2 ? h2.textContent.trim() : "") });
    });
    if (!head) return;
    const label = $(".runhead-sec", head), bar = $(".progress", head);
    let cur = null;
    onScroll((y, vh) => {
      const on = desk ? y > desk.offsetTop + desk.offsetHeight - 60 : y > 300;
      head.classList.toggle("is-on", on);
      if (paper && bar) { const p = (y + vh - paper.offsetTop) / paper.offsetHeight; bar.style.setProperty("--p", Math.max(0, Math.min(1, p)).toFixed(4)); }
      let c = null; for (const s of sections) if (s.el.getBoundingClientRect().top < vh * 0.4) c = s;
      if (c !== cur) {
        cur = c;
        if (label) label.innerHTML = c ? `<b>${c.num}</b>${c.title}` : "";
        $$(".toc li").forEach((li) => li.classList.toggle("is-current", !!c && li.dataset.id === c.id));
      }
    });
  }

  /* ---------- Small things that print themselves ---------- */
  function dropCaps() {
    $$(".sec").forEach((sec) => { const p = $(".col > p:not(.nodrop):not(.fig-source)", sec); if (p) p.classList.add("dropcap"); });
  }
  function revealHeads() {
    const heads = $$(".sec-head");
    if (isCalm() || !("IntersectionObserver" in window)) { heads.forEach((h) => h.classList.add("is-in")); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -10% 0px" });
    heads.forEach((h) => io.observe(h));
  }
  function countUps() {
    const els = $$("[data-count]"); if (!els.length) return;
    const show = (el, v) => { const d = +(el.dataset.dec || 0); el.textContent = (el.dataset.prefix || "") + v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) + (el.dataset.suffix || ""); };
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      const el = e.target, to = parseFloat(el.dataset.count);
      if (isCalm()) { show(el, to); return; }
      const t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / 1300); show(el, to * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { threshold: 0.5 });
    els.forEach((el) => { show(el, 0); io.observe(el); });
  }
  function readingTime() {
    const paper = $(".paper"); if (!paper) return;
    const wpm = 230; let acc = 0;
    sections.forEach((s) => { s.minute = Math.round(acc / wpm); acc += (s.el.textContent || "").split(/\s+/).length; });
    $$("[data-readtime]").forEach((el) => (el.textContent = Math.max(1, Math.round(acc / wpm)) + " minute read"));
  }

  /* ---------- Overlays: contents and the reading room ---------- */
  function overlay(id, title, sub, body) {
    const o = document.createElement("div");
    o.className = "overlay"; o.id = id; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-label", title);
    o.innerHTML = `<div class="sheet-modal"><button class="tool close" type="button" data-close aria-label="Close">Close</button><h2>${title}</h2><p class="sub">${sub}</p>${body}</div>`;
    document.body.appendChild(o);
    let back;
    o.open = () => { back = document.activeElement; o.classList.add("is-open"); document.body.style.overflow = "hidden"; setTimeout(() => $("[data-close]", o).focus(), 30); };
    o.close = () => { o.classList.remove("is-open"); document.body.style.overflow = ""; if (back) back.focus(); };
    o.addEventListener("click", (e) => { if (e.target === o || e.target.closest("[data-close]")) o.close(); });
    o.addEventListener("keydown", (e) => { if (e.key === "Escape") o.close(); });
    return o;
  }
  function setupOverlays() {
    const paperTitle = ($(".banner") || {}).textContent || document.title;
    if (sections.length) {
      const items = sections.map((s) => `<li data-id="${s.id}"><a href="#${s.id}" data-close><span class="toc-n">${s.num}</span><span class="toc-t">${s.title}</span><span class="toc-m">${s.minute ? s.minute + " min in" : "Start"}</span></a></li>`).join("");
      const extra = $$("[data-index-extra]").map((el) => `<li><a href="#${el.id}" data-close><span class="toc-n">&middot;</span><span class="toc-t">${el.dataset.indexExtra}</span><span class="toc-m"></span></a></li>`).join("");
      overlay("press-contents", "Contents", paperTitle.trim(), `<ol class="toc">${items}${extra}</ol>`);
    }
    const seg = (name, opts) => `<div class="tabs" data-setting="${name}">${opts.map(([v, t]) => `<button type="button" data-val="${v}" aria-pressed="${settings[name] === v}">${t}</button>`).join("")}</div>`;
    const room = overlay("press-room", "Reading room", "Saved in this browser only", `<div class="settings">
      <div class="ctl"><span class="ctl-label">Edition</span>${seg("theme", [["paper", "Day"], ["night", "Night"]])}</div>
      <div class="ctl"><span class="ctl-label">Type size</span>${seg("size", [["s", "Small"], ["m", "Regular"], ["l", "Large"]])}</div>
      <div class="ctl"><span class="ctl-label">Motion</span>${seg("motion", [["full", "Full"], ["calm", "Reduced"]])}</div></div>`);
    room.addEventListener("click", (e) => {
      const b = e.target.closest("[data-val]"); if (!b) return;
      const g = b.closest("[data-setting]"), name = g.dataset.setting;
      settings[name] = b.dataset.val; store.set(name, b.dataset.val); applySettings();
      $$("button", g).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      document.dispatchEvent(new CustomEvent("press:settings", { detail: { ...settings } }));
      requestAnimationFrame(frame);
    });
    const tools = $(".runhead-tools");
    if (tools) tools.innerHTML = (sections.length ? `<button class="tool" type="button" data-open="press-contents">Contents</button>` : "") + `<button class="tool" type="button" data-open="press-room" aria-label="Reading settings">Aa</button>`;
    document.addEventListener("click", (e) => { const b = e.target.closest("[data-open]"); if (b) { const o = document.getElementById(b.dataset.open); if (o) { e.preventDefault(); o.open(); } } });
  }

  /* ---------- Citations and glossary ---------- */
  function setupPopovers() {
    const pop = document.createElement("div"); pop.className = "pop"; pop.id = "press-pop"; pop.setAttribute("role", "tooltip"); document.body.appendChild(pop);
    let owner = null, hideT;
    const place = (el) => {
      const r = el.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight, sx = window.scrollX, sy = window.scrollY;
      let left = Math.max(sx + 10, Math.min(r.left + sx + r.width / 2 - pw / 2, sx + document.documentElement.clientWidth - pw - 10));
      let top = r.top + sy - ph - 10; if (r.top - ph - 10 < 64) top = r.bottom + sy + 10;
      pop.style.left = left + "px"; pop.style.top = top + "px";
    };
    const show = (el) => {
      clearTimeout(hideT);
      let html;
      if (el.classList.contains("cite")) {
        const ids = (el.dataset.ref || "").split(",").map((s) => s.trim());
        html = ids.map((id) => { const li = document.getElementById("ref-" + id); return li ? `<small>Source ${id}</small>${li.innerHTML}` : ""; }).join("<hr style='border:0;border-top:1px solid var(--hair);margin:.55rem 0'>");
        html += `<a class="jump" href="#ref-${ids[0]}" data-jump>All sources</a>`;
      } else html = `<small>${el.dataset.term || el.textContent}</small>${el.dataset.def}`;
      if (owner && owner !== el) owner.setAttribute("aria-expanded", "false");
      owner = el; el.setAttribute("aria-expanded", "true"); pop.innerHTML = html; pop.classList.add("is-open"); place(el);
    };
    const hide = () => { hideT = setTimeout(() => { pop.classList.remove("is-open"); if (owner) owner.setAttribute("aria-expanded", "false"); owner = null; }, 150); };
    document.addEventListener("mouseover", (e) => { const el = e.target.closest(".cite, dfn[data-def], .term[data-def]"); if (el && matchMedia("(hover: hover)").matches) show(el); });
    document.addEventListener("mouseout", (e) => { if (e.target.closest(".cite, dfn[data-def], .term[data-def]")) hide(); });
    document.addEventListener("focusin", (e) => { const el = e.target.closest && e.target.closest(".cite, dfn[data-def], .term[data-def]"); if (el) show(el); });
    document.addEventListener("click", (e) => {
      const el = e.target.closest(".cite, dfn[data-def], .term[data-def]");
      if (el) { e.preventDefault(); owner === el && pop.classList.contains("is-open") ? hide() : show(el); return; }
      const j = e.target.closest("[data-jump]");
      if (j) { e.preventDefault(); const li = $(j.getAttribute("href")); if (li) { li.scrollIntoView({ behavior: isCalm() ? "auto" : "smooth", block: "center" }); li.classList.remove("is-flash"); void li.offsetWidth; li.classList.add("is-flash"); } }
      if (!e.target.closest(".pop")) pop.classList.remove("is-open");
    });
    pop.addEventListener("mouseenter", () => clearTimeout(hideT)); pop.addEventListener("mouseleave", hide);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") pop.classList.remove("is-open"); });
    window.addEventListener("resize", () => pop.classList.remove("is-open"));
    $$(".cite, dfn[data-def], .term[data-def]").forEach((el) => { if (el.tagName !== "A" && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0"); el.setAttribute("aria-describedby", "press-pop"); });
  }

  /* ---------- Equations ---------- */
  function renderMath() {
    if (!window.katex) return false;
    $$(".eq[data-tex]").forEach((el) => {
      if (el.dataset.done) return; el.dataset.done = "1";
      const body = document.createElement("div"); body.className = "eq-body";
      try { katex.render(el.dataset.tex, body, { displayMode: true, throwOnError: false, strict: "ignore" }); } catch (_) { body.textContent = el.dataset.tex; }
      el.textContent = ""; el.appendChild(body);
      if (el.dataset.n) { const n = document.createElement("span"); n.className = "eq-n"; n.textContent = "(" + el.dataset.n + ")"; el.appendChild(n); if (!el.id) el.id = "eq-" + el.dataset.n; }
      el.setAttribute("role", "math"); el.setAttribute("tabindex", "0");
    });
    $$(".tex").forEach((el) => { if (el.dataset.done) return; el.dataset.done = "1"; try { katex.render(el.textContent, el, { throwOnError: false, strict: "ignore" }); } catch (_) {} });
    return true;
  }
  function waitMath() { if (!renderMath()) { let n = 0; const t = setInterval(() => { if (renderMath() || ++n > 80) clearInterval(t); }, 100); } }

  /* ---------- Figures: mount when near the screen ---------- */
  const inits = {};
  let booted = false;
  function fig(id, init) { inits[id] = init; if (booted) mount(document.getElementById(id)); }
  function mount(el) {
    if (!el || el.dataset.mounted || !inits[el.id]) return;
    const go = () => { if (el.dataset.mounted) return; el.dataset.mounted = "1"; try { inits[el.id](el); } catch (err) { console.error("Figure " + el.id, err); } };
    if (!("IntersectionObserver" in window)) return go();
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); go(); } }, { rootMargin: "700px 0px" });
    io.observe(el);
  }
  function setupFigures() {
    $$(".fig[data-resettable] .fig-head").forEach((h) => { if (!$(".fig-reset", h)) h.insertAdjacentHTML("beforeend", '<button class="fig-reset" type="button">Reset</button>'); });
    document.addEventListener("click", (e) => { const b = e.target.closest(".fig-reset"); if (b) b.closest(".fig").dispatchEvent(new CustomEvent("fig:reset")); });
    $$(".fig, .scrolly").forEach(mount);
  }

  /* ---------- Scroll stories ---------- */
  function scrolly(el, handler) {
    const steps = $$(".step", el); let active = -1;
    onScroll((y, vh) => {
      const line = vh * 0.62; let idx = -1, p = 0;
      steps.forEach((s, i) => { const r = s.getBoundingClientRect(); if (r.top < line) { idx = i; p = Math.max(0, Math.min(1, (line - r.top) / r.height)); } });
      if (idx !== active) { steps.forEach((s, i) => s.classList.toggle("is-on", i === idx)); active = idx; handler.step && handler.step(idx); }
      handler.progress && handler.progress(idx, p, idx < 0 ? 0 : idx + p);
    });
    requestAnimationFrame(frame);
  }

  /* ---------- Draggable numbers inside sentences ---------- */
  const formats = {
    int: (v) => Math.round(v).toLocaleString("en-US"),
    dec1: (v) => v.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    dec2: (v) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    pct: (v) => Math.round(v) + "%",
    usd: (v) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  };
  function reactive(scope, model, compute) {
    const knobs = $$(".knob[data-k]", scope);
    const paint = () => {
      knobs.forEach((k) => { const key = k.dataset.k; if (k.classList.contains("pick")) k.textContent = model[key]; else k.textContent = (k.dataset.pre || "") + (formats[k.dataset.fmt || "int"])(model[key]) + (k.dataset.post || ""); k.setAttribute("aria-valuenow", model[key]); });
      const out = compute(model) || {};
      $$("[data-out]", scope).forEach((o) => { if (o.dataset.out in out && o.textContent !== String(out[o.dataset.out])) o.textContent = out[o.dataset.out]; });
    };
    knobs.forEach((k) => {
      const key = k.dataset.k;
      k.setAttribute("tabindex", "0");
      if (k.classList.contains("pick")) {
        const opts = k.dataset.options.split("|");
        k.setAttribute("role", "button");
        const next = (d) => { const i = opts.indexOf(String(model[key])); model[key] = opts[(i + d + opts.length) % opts.length]; paint(); };
        k.addEventListener("click", () => next(1));
        k.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") { e.preventDefault(); next(1); } if (e.key === "ArrowLeft") { e.preventDefault(); next(-1); } });
        return;
      }
      const min = +k.dataset.min, max = +k.dataset.max, step = +(k.dataset.step || 1), px = +(k.dataset.px || 5);
      k.setAttribute("role", "slider"); k.setAttribute("aria-valuemin", min); k.setAttribute("aria-valuemax", max);
      k.setAttribute("aria-label", k.getAttribute("aria-label") || "Drag to change");
      const set = (v) => { model[key] = Math.max(min, Math.min(max, Math.round(v / step) * step)); paint(); };
      let x0 = 0, v0 = 0;
      k.addEventListener("pointerdown", (e) => { x0 = e.clientX; v0 = model[key]; k.setPointerCapture(e.pointerId); k.classList.add("is-drag"); document.body.style.cursor = "ew-resize"; });
      k.addEventListener("pointermove", (e) => { if (!k.classList.contains("is-drag")) return; const dx = e.clientX - x0; set(v0 + Math.sign(dx) * Math.pow(Math.abs(dx) / px, 1.25) * step); });
      const end = () => { k.classList.remove("is-drag"); document.body.style.cursor = ""; };
      k.addEventListener("pointerup", end); k.addEventListener("pointercancel", end);
      k.addEventListener("keydown", (e) => { const big = e.shiftKey ? 10 : 1; if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); set(model[key] + step * big); } if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); set(model[key] - step * big); } });
    });
    paint();
    return { paint, model };
  }

  /* ---------- Copy and share ---------- */
  function setupCopy() {
    document.addEventListener("click", async (e) => {
      const c = e.target.closest("[data-copy]");
      if (c) { const src = $(c.dataset.copy); try { await navigator.clipboard.writeText(src ? src.innerText : c.dataset.copy); toast("Copied"); } catch (_) { toast("Select the text to copy it"); } }
      const s = e.target.closest("[data-share]");
      if (s) { const data = { title: document.title, url: location.href.split("#")[0] }; if (navigator.share) { try { await navigator.share(data); } catch (_) {} } else { try { await navigator.clipboard.writeText(data.url); toast("Link copied"); } catch (_) { toast(data.url); } } }
    });
  }

  function boot() {
    setupFold(); dropCaps(); setupRunhead(); readingTime(); setupOverlays(); setupPopovers();
    setupFigures(); revealHeads(); countUps(); setupCopy(); waitMath();
    booted = true; requestAnimationFrame(frame);
  }

  window.Press = { fig, plate: fig, scrolly, reactive, onScroll, toast, isCalm, settings, formats, $, $$ };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

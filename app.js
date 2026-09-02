/*
  abhnv.in runtime. One file, no build step.

  Sections:
    1. helpers and routing
    2. rendering from window.PORTFOLIO (cards, case studies, lists)
    3. shared interactions (menu, intro, transitions, reveal, rail)
    4. command engine (terminal page + global palette)
    5. page-specific: contact form, credentials, security page, home hero
*/
(function () {
  "use strict";

  const data = window.PORTFOLIO;
  const caseStudies = window.CASE_STUDIES || [];
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  /* ------------------------------------------------------------------ */
  /* 1. Helpers                                                          */
  /* ------------------------------------------------------------------ */

  const isExternal = (url) => /^https?:\/\//.test(url);
  const linkAttrs = (url) => (isExternal(url) ? 'target="_blank" rel="noopener"' : "");
  const withBase = (url) => {
    if (!url) return url;
    if (isExternal(url) || url.startsWith("/") || url.startsWith("#") || url.startsWith("mailto:")) return url;
    return `/${url}`;
  };
  const cleanRoute = (url) => {
    if (!url || isExternal(url)) return url;
    const abs = withBase(url);
    if (abs === "/index.html") return "/";
    return abs.replace(/\.html$/, "");
  };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
  const pad = (n) => String(n).padStart(2, "0");
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const ROUTES = {
    index: "/",
    security: "/security",
    work: "/work",
    credentials: "/credentials",
    api: "/api",
    terminal: "/terminal",
    contact: "/contact"
  };

  /* ------------------------------------------------------------------ */
  /* 2. Rendering                                                        */
  /* ------------------------------------------------------------------ */

  function createProjectCard(project, index) {
    const caseUrl = cleanRoute(project.caseStudyUrl || project.url);
    const liveUrl = project.liveUrl || caseUrl;
    const points = (project.points || []).slice(0, 6);
    const card = document.createElement("article");
    card.className = "project-card reveal";
    card.style.setProperty("--delay", `${index * 70}ms`);
    card.innerHTML = `
      <a class="project-main" href="${esc(caseUrl)}" aria-label="${esc(project.title)} case study">
        <header>
          <span>${esc(project.label)}</span>
          <img src="${esc(withBase(project.logo))}" alt="" loading="lazy">
        </header>
        <h3>${esc(project.title)}</h3>
        <div class="project-image">
          <img src="${esc(withBase(project.detailedImage || project.shortImage))}" alt="${esc(project.title)} poster" loading="lazy">
        </div>
        <div class="project-points">
          <strong>What it does</strong>
          <p>${esc(project.description)}</p>
          ${project.detail ? `<p class="project-detail-note">${esc(project.detail)}</p>` : ""}
          <div class="project-point-list">
            ${points.map((point) => `<span>${esc(point)}</span>`).join("")}
          </div>
        </div>
        <footer>
          <p>${esc(project.type)}</p>
          <span aria-hidden="true">${pad(index + 1)}</span>
        </footer>
      </a>
      <a class="card-visit" href="${esc(liveUrl)}" ${linkAttrs(liveUrl)} aria-label="Open ${esc(project.title)} at ${esc(liveUrl.replace(/^https?:\/\//, ""))}">Open ${esc(project.title)}</a>
    `;
    return card;
  }

  function createDetailedWorkCard(project, index) {
    const caseUrl = cleanRoute(project.caseStudyUrl || project.url);
    const liveUrl = project.liveUrl || caseUrl;
    const card = document.createElement("article");
    card.className = `work-detail-card work-${project.slug || "item"} reveal`;
    card.style.setProperty("--delay", `${index * 60}ms`);
    const noteId = `secnote-${project.slug}`;
    card.innerHTML = `
      <div class="work-detail-main">
        <a class="detail-poster" href="${esc(caseUrl)}" aria-label="${esc(project.title)} case study">
          <img src="${esc(withBase(project.detailedImage))}" alt="${esc(project.title)} poster" loading="lazy">
        </a>
        <div class="detail-copy">
          <div class="kicker detail-label">${esc(project.label)}</div>
          <h2>${esc(project.title)}</h2>
          <p>${esc(project.description)}</p>
          <div class="tag-row" aria-label="Tags">
            ${(project.tags || []).map((tag, ti) => `<span style="--i:${ti}">${esc(tag)}</span>`).join("")}
          </div>
          ${project.securityNote ? `
          <div class="security-note">
            <button type="button" class="security-note-toggle" aria-expanded="false" aria-controls="${noteId}">
              <span class="security-note-mark" aria-hidden="true"></span>
              <span>Security lens</span>
            </button>
            <p class="security-note-body" id="${noteId}" hidden>${esc(project.securityNote)}</p>
          </div>` : ""}
          <div class="detail-actions">
            <a href="${esc(caseUrl)}">Read the case study</a>
            <a href="${esc(liveUrl)}" ${linkAttrs(liveUrl)}>Open ${esc(project.title)}</a>
          </div>
        </div>
      </div>
    `;
    return card;
  }

  function createResearchCard(item, index) {
    const card = document.createElement("article");
    card.className = "work-detail-card research-card reveal";
    card.style.setProperty("--delay", `${index * 60}ms`);
    card.innerHTML = `
      <div class="work-detail-main">
        <a class="detail-poster" href="${esc(item.url)}" aria-label="Read ${esc(item.title)}">
          <img src="${esc(withBase(item.detailedImage))}" alt="${esc(item.title)} poster" loading="lazy">
        </a>
        <div class="detail-copy">
          <div class="detail-label">${esc(item.label)}</div>
          <h2>${esc(item.title)}</h2>
          <p>${esc(item.description)}</p>
          <div class="tag-row" aria-label="Tags">
            ${(item.tags || []).map((tag, ti) => `<span style="--i:${ti}">${esc(tag)}</span>`).join("")}
          </div>
          <div class="detail-actions">
            <a href="${esc(item.url)}">Read the paper</a>
          </div>
        </div>
      </div>
    `;
    return card;
  }

  function renderProjects() {
    const rail = $("#projectRail");
    if (rail) {
      rail.innerHTML = "";
      data.projects.forEach((project, index) => rail.appendChild(createProjectCard(project, index)));
    }
    const workGrid = $("#workPageGrid");
    if (workGrid) {
      workGrid.innerHTML = "";
      data.projects.forEach((project, index) => workGrid.appendChild(createDetailedWorkCard(project, index)));
    }
    const researchGrid = $("#researchPageGrid");
    if (researchGrid && data.researchPapers) {
      researchGrid.innerHTML = "";
      data.researchPapers.forEach((item, index) => researchGrid.appendChild(createResearchCard(item, index)));
    }
    $$(".security-note-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        const open = button.getAttribute("aria-expanded") === "true";
        const body = document.getElementById(button.getAttribute("aria-controls"));
        button.setAttribute("aria-expanded", String(!open));
        if (body) body.hidden = open;
        button.closest(".security-note")?.classList.toggle("is-open", !open);
      });
    });
  }

  function renderStats() {
    $$("[data-stat]").forEach((el) => {
      const key = el.dataset.stat;
      const values = {
        projects: data.projects.length,
        certifications: data.certifications.length,
        research: data.researchPapers.length,
        areas: data.security.areas.length,
        steps: data.security.method.length
      };
      if (values[key] != null) el.textContent = String(values[key]);
    });
  }

  function renderTimeline() {
    const target = $("[data-timeline]");
    if (!target) return;
    target.innerHTML = data.timeline.map((item) => `
      <article>
        <span>${esc(item.when)}</span>
        <div>
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.body)}</p>
        </div>
      </article>
    `).join("");
  }

  function renderNotes() {
    $$("[data-notes-list]").forEach((notes) => {
      notes.innerHTML = data.notes.map((note) => `
        <article class="note-row">
          <span>${esc(note.number)}</span>
          <div>
            <h3>${esc(note.title)}</h3>
            <p>${esc(note.body)}</p>
          </div>
        </article>
      `).join("");
    });
    $$("[data-principles]").forEach((target) => {
      target.innerHTML = data.principles.map((item) => `
        <article>
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.body)}</p>
        </article>
      `).join("");
    });
  }

  function renderCaseStudy() {
    const target = $("#caseStudy");
    if (!target) return;

    const slug = document.body.dataset.caseStudy;
    const studyIndex = caseStudies.findIndex((item) => item.slug === slug);
    const study = caseStudies[studyIndex];
    if (!study) {
      target.innerHTML = `
        <section class="case-missing">
          <h1>No file with that name</h1>
          <p>The case study you asked for is not in the archive.</p>
          <a class="text-link hover-cut" href="/work"><span>Back to the builds</span></a>
        </section>
      `;
      return;
    }

    const previous = caseStudies[(studyIndex - 1 + caseStudies.length) % caseStudies.length];
    const next = caseStudies[(studyIndex + 1) % caseStudies.length];
    const project = data.projects.find((p) => p.slug === slug) || {};
    target.style.setProperty("--case-accent", study.accent || "var(--red)");
    const supportingImages = study.supportingImages || [];
    const figCounter = { val: 2 };

    const renderEvidenceNotes = (label, index) => {
      const sourceSets = [
        { title: "What the screen shows", points: study.blueprint.features.slice(0, 4), flow: study.blueprint.flow.slice(0, 5) },
        { title: "How it holds up", points: study.anatomy.map((item) => `${item.title}: ${item.body}`).slice(0, 3), flow: study.blueprint.modules.slice(0, 5) },
        { title: "Why it matters", points: study.challenges.map((item) => `${item.title}: ${item.result}`).slice(0, 3), flow: study.impact.slice(0, 4) }
      ];
      const notes = sourceSets[index % sourceSets.length];
      return `
        <aside class="evidence-notes" aria-label="${esc(label)} notes">
          <div class="kicker">From the file</div>
          <h3>${esc(notes.title)}</h3>
          <ul>${notes.points.map((point) => `<li>${esc(point)}</li>`).join("")}</ul>
          <div class="mini-flow" aria-label="Flow">${notes.flow.map((step) => `<span>${esc(step)}</span>`).join("")}</div>
        </aside>
      `;
    };
    const renderImageSpread = (image, label, index) => image ? `
        <section class="case-section case-visual-spread ${index % 2 ? "is-reversed" : ""} reveal" aria-label="${esc(label)}">
          <div class="case-section-label">${esc(label)}</div>
          <div class="evidence-spread">
            <figure class="case-image-card wide">
              <img src="${esc(withBase(image.src))}" alt="${esc(image.alt)}" loading="${index === 0 ? "eager" : "lazy"}">
              <figcaption class="editorial-caption"><span class="caption-number">Fig. ${figCounter.val++}</span> ${esc(image.caption)}</figcaption>
            </figure>
            ${renderEvidenceNotes(label, index)}
          </div>
        </section>
    ` : "";
    const renderImageGrid = (images, label) => images.length ? `
        <section class="case-section case-gallery reveal" aria-label="${esc(label)}">
          <div class="case-section-label">${esc(label)}</div>
          <div class="case-image-grid">
            ${images.map((image) => `
              <figure class="case-image-card">
                <img src="${esc(withBase(image.src))}" alt="${esc(image.alt)}" loading="lazy">
                <figcaption class="editorial-caption"><span class="caption-number">Fig. ${figCounter.val++}</span> ${esc(image.caption)}</figcaption>
              </figure>
            `).join("")}
          </div>
        </section>
    ` : "";

    const pageNum = studyIndex + 1;
    const extras = (window.CASE_STUDY_EXTRAS && window.CASE_STUDY_EXTRAS[study.slug]) || {};
    const pullQuoteText = extras.pullQuote || study.lead[0];
    const diagramNodes = [...(study.blueprint.modules || []).slice(0, 4), ...(study.stack || []).slice(0, 3)].slice(0, 7);
    const linkedInUrl = data.socials.find((item) => item.label === "LinkedIn")?.url;
    const githubUrl = data.socials.find((item) => item.label === "GitHub")?.url;
    const numericRe = /\b(\d[\d.,]*(?:\s*[-–—]\s*\d[\d.,]*)?(?:\s*(?:ms|MB|GB|KB|x|×|%|\+))?)\b/i;
    const numbers = study.impact.map((item) => {
      const match = String(item).match(numericRe);
      if (!match) return null;
      return { headline: match[1].trim(), label: String(item).replace(match[1], "").trim().replace(/^[-–—\s]+/, "") };
    }).filter(Boolean).slice(0, 4);

    target.innerHTML = `
      <article class="case-study">
        <div class="folio-strip" aria-hidden="true">
          <span class="folio-section">${esc(study.label)}</span>
          <span class="volume-mark">Case file ${pad(pageNum)} of ${pad(caseStudies.length)}</span>
          <span class="folio-page">${esc(study.issue)}</span>
        </div>

        <header class="case-hero">
          <div class="case-kicker">
            <span>${esc(study.issue)}</span>
            <span>${esc(study.label)}</span>
            <span>${esc(study.version)}</span>
          </div>
          <div class="case-title-grid">
            <div>
              <div class="kicker">${esc(project.type || "Case study")}</div>
              <h1>${esc(study.title)}</h1>
              <h2>${esc(study.headline)}</h2>
              <p class="deck">${esc(study.subtitle)}</p>
              <div class="byline">By <strong>Abhinav Raj</strong> &middot; Built and maintained by me</div>
            </div>
            <aside>
              <span>Live</span>
              <a class="text-link hover-cut" href="${esc(study.liveUrl)}" ${linkAttrs(study.liveUrl)}><span>Open ${esc(study.title)}</span></a>
              ${study.repoUrl ? `<a class="text-link hover-cut" href="${esc(study.repoUrl)}" ${linkAttrs(study.repoUrl)}><span>Source on GitHub</span></a>` : ""}
            </aside>
          </div>
          <figure class="case-hero-image">
            <img src="${esc(withBase(study.heroImage.src))}" alt="${esc(study.heroImage.alt)}">
            <figcaption class="editorial-caption"><span class="caption-number">Fig. 1</span> ${esc(study.heroImage.caption)}</figcaption>
          </figure>
          <div class="case-stack" aria-label="Stack">
            ${study.stack.map((item) => `<span>${esc(item)}</span>`).join("")}
          </div>
        </header>

        <section class="case-section case-lead reveal" aria-label="The story">
          <div class="case-section-label">The story</div>
          <div class="case-lead-copy">
            ${study.lead.map((paragraph, index) => `<p class="${index === 0 ? "dropcap" : ""}">${esc(paragraph)}</p>`).join("")}
          </div>
          <div class="ornament" aria-hidden="true">&loz;</div>
        </section>

        <aside class="pull-quote reveal">
          <p>${esc(pullQuoteText)}</p>
          <div class="attribution">In one sentence</div>
        </aside>

        ${extras.vision ? `
        <section class="case-section case-vision reveal" aria-label="Direction">
          <div class="case-section-label">Direction</div>
          <div class="case-vision-copy">
            <p class="dropcap">${esc(extras.vision)}</p>
            ${extras.longTerm ? `<p class="long-term">${esc(extras.longTerm)}</p>` : ""}
            ${(extras.differentiators && extras.differentiators.length) ? `
              <div class="case-differentiators">
                <h4>Compared with what exists</h4>
                <ul>${extras.differentiators.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
              </div>
            ` : ""}
          </div>
        </section>
        ` : ""}

        ${study.deepDive ? `
        <section class="case-section case-deep-dive reveal" aria-label="How it works">
          <div class="case-section-label">How it works</div>
          <div class="case-deep-dive-copy">
            ${study.deepDive.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
          </div>
          <div class="jump-line" aria-hidden="true">Continued below</div>
        </section>
        ` : ""}

        ${renderImageSpread(supportingImages[0], "On screen", 0)}

        <section class="case-section case-blueprint reveal" aria-label="Blueprint">
          <div class="case-section-label">Blueprint</div>
          <div class="blueprint-grid">
            <article>
              <h3>Features</h3>
              <ul>${study.blueprint.features.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
            </article>
            <article>
              <h3>User flow</h3>
              <ol>${study.blueprint.flow.map((item) => `<li>${esc(item)}</li>`).join("")}</ol>
            </article>
            <article>
              <h3>Modules</h3>
              <ul>${study.blueprint.modules.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
            </article>
          </div>
        </section>

        <section class="case-section case-diagram reveal" aria-label="System map">
          <div class="case-section-label">System map</div>
          <div class="diagram-board">
            <div class="diagram-core">
              <span>${esc(study.title)}</span>
              <strong>${esc(study.issue)}</strong>
            </div>
            <div class="diagram-nodes">
              ${diagramNodes.map((node, index) => `
                <div class="diagram-node">
                  <span>${pad(index + 1)}</span>
                  <strong>${esc(node)}</strong>
                </div>
              `).join("")}
            </div>
          </div>
        </section>

        <section class="case-section case-anatomy reveal" aria-label="How it is built">
          <div class="case-section-label">How it is built</div>
          <div class="anatomy-grid">
            ${study.anatomy.map((item, index) => `
              <article>
                <span>${pad(index + 1)}</span>
                <h3>${esc(item.title)}</h3>
                <p>${esc(item.body)}</p>
              </article>
            `).join("")}
          </div>
        </section>

        ${renderImageSpread(supportingImages[1], "Under the hood", 1)}

        <section class="case-section case-challenges reveal" aria-label="The hard parts">
          <div class="case-section-label">The hard parts</div>
          <div class="challenge-list">
            ${study.challenges.map((item) => `
              <article>
                <h3>${esc(item.title)}</h3>
                <p><strong>Problem</strong> ${esc(item.problem)}</p>
                <p><strong>Fix</strong> ${esc(item.solution)}</p>
                <p><strong>Result</strong> ${esc(item.result)}</p>
              </article>
            `).join("")}
          </div>
        </section>

        ${study.securityLens ? `
        <section class="case-section case-security-lens reveal" aria-label="Security lens">
          <div class="case-section-label">Security lens</div>
          <div>
            <p class="case-lens-intro">What building ${esc(study.title)} taught me that I now test for on other people's systems.</p>
            <div class="case-lens-grid">
              ${study.securityLens.map((item, index) => `
                <article>
                  <span class="case-lens-num">${pad(index + 1)}</span>
                  <h3>${esc(item.title)}</h3>
                  <p>${esc(item.body)}</p>
                </article>
              `).join("")}
            </div>
            <a class="text-link hover-cut case-lens-link" href="/security"><span>How I test systems</span></a>
          </div>
        </section>
        ` : ""}

        ${renderImageSpread(supportingImages[2], "Field notes", 2)}
        ${renderImageGrid(supportingImages.slice(3), "More screens")}

        <section class="case-section case-impact reveal" aria-label="What shipped">
          <div class="case-section-label">What shipped</div>
          <div class="impact-strip">
            ${study.impact.map((item) => `<span>${esc(item)}</span>`).join("")}
          </div>
          ${numbers.length >= 2 ? `
            <div class="case-by-the-numbers" aria-label="By the numbers">
              ${numbers.map((c) => `<article><strong>${esc(c.headline)}</strong><span>${esc(c.label || "Outcome")}</span></article>`).join("")}
            </div>
          ` : ""}
        </section>

        <section class="case-section case-closing reveal" aria-label="Closing note">
          <div class="case-section-label">Closing note</div>
          <div>
            ${study.closing.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
            <div class="sign-off">
              <span>Abhinav Raj</span>
              ${linkedInUrl ? `<a href="${esc(linkedInUrl)}" target="_blank" rel="noopener" aria-label="Abhinav Raj on LinkedIn">${SOCIAL_ICONS.LinkedIn}</a>` : ""}
              ${githubUrl ? `<a href="${esc(githubUrl)}" target="_blank" rel="noopener" aria-label="Abhinav Raj on GitHub">${SOCIAL_ICONS.GitHub}</a>` : ""}
            </div>
          </div>
        </section>

        ${(extras.lessons && extras.lessons.length) ? `
        <section class="case-section case-lessons reveal" aria-label="Lessons">
          <div class="case-section-label">Lessons</div>
          <div class="case-lessons-grid">
            ${extras.lessons.map((lesson) => `
              <article class="case-lesson">
                <div class="lesson-cat">${esc(lesson.category)}</div>
                <p>${esc(lesson.body)}</p>
              </article>
            `).join("")}
          </div>
        </section>
        ` : ""}

        <section class="case-end-card reveal" aria-label="End of file">
          <h3>${esc(study.headline)}</h3>
          <div class="end-card-cta">
            <a href="${esc(study.liveUrl)}" ${linkAttrs(study.liveUrl)}>Open ${esc(study.title)}</a>
            ${study.repoUrl ? `<a href="${esc(study.repoUrl)}" ${linkAttrs(study.repoUrl)}>Source on GitHub</a>` : ""}
            <a href="/contact">Write to me</a>
          </div>
        </section>

        <nav class="case-next reveal" aria-label="Other case studies">
          <a class="hover-cut" href="/work/${esc(previous.slug)}/"><span>Previous: ${esc(previous.title)}</span></a>
          <a class="hover-cut" href="/work"><span>All builds</span></a>
          <a class="hover-cut" href="/work/${esc(next.slug)}/"><span>Next: ${esc(next.title)}</span></a>
        </nav>
      </article>
    `;
  }

  const SOCIAL_ICONS = {
    LinkedIn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.98 3.5a2.5 2.5 0 1 1 .02 5 2.5 2.5 0 0 1-.02-5ZM3 9.75h4v11.25H3V9.75ZM10 9.75h3.83v1.55h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.51 4.78 5.78V21H18.6v-5.07c0-1.21-.02-2.77-1.78-2.77-1.78 0-2.05 1.31-2.05 2.67V21H10V9.75Z"/></svg>',
    GitHub: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1.01.07 1.54 1.04 1.54 1.04.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.6 9.6 0 0 1 12 6.84c.85 0 1.71.11 2.51.34 1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.86v2.76c0 .26.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>',
    Instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="4.4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.65" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16.75" cy="7.25" r="1.15"/></svg>',
    X: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.53 3H20.5l-6.49 7.42L21.5 21h-5.94l-4.66-6.06L5.5 21H2.5l6.95-7.94L2.5 3h6.06l4.21 5.56L17.53 3Zm-1.04 16.2h1.65L7.6 4.7H5.84l10.65 14.5Z"/></svg>',
    Bugcrowd: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.2c-1.6 0-2.9 1.1-3.2 2.6h6.4c-.3-1.5-1.6-2.6-3.2-2.6Zm-4.9 3.9a1 1 0 0 0-1.3 1.5l1.6 1.1C7.1 10.4 7 11.2 7 12H4.5a1 1 0 1 0 0 2H7c.1.9.3 1.7.7 2.4l-1.9 1.3a1 1 0 1 0 1.1 1.7l1.8-1.2c.8.9 1.9 1.5 3.3 1.7V9.5h-2.3l-2.6-2.4Zm9.8 0-2.6 2.4H12v10.4c1.4-.2 2.5-.8 3.3-1.7l1.8 1.2a1 1 0 1 0 1.1-1.7l-1.9-1.3c.4-.7.6-1.5.7-2.4h2.5a1 1 0 1 0 0-2H17c0-.8-.1-1.6-.4-2.3l1.6-1.1a1 1 0 1 0-1.3-1.5Z"/></svg>'
  };

  function getSocialIcon(label) {
    return SOCIAL_ICONS[label] || `<span aria-hidden="true">${esc(label.slice(0, 1))}</span>`;
  }

  function renderSocials() {
    $$("[data-social-icons]").forEach((target) => {
      target.innerHTML = "";
      target.classList.add("brand-socials");
      const withBugcrowd = target.hasAttribute("data-with-bugcrowd");
      const list = withBugcrowd
        ? [{ label: "Bugcrowd", url: data.profile.bugcrowd.url }, ...data.socials]
        : data.socials;
      list.forEach((social) => {
        const link = document.createElement("a");
        link.className = "brand-social";
        link.href = social.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.setAttribute("aria-label", `${social.label} (opens in a new tab)`);
        link.innerHTML = `${getSocialIcon(social.label)}<span class="brand-social-label">${esc(social.label)}</span>`;
        target.appendChild(link);
      });
    });
  }

  function renderMarquees() {
    const phrases = Array.isArray(data.marquee) && data.marquee.length ? data.marquee : ["Email me"];
    const email = data.profile.email;
    $$("[data-marquee]").forEach((target) => {
      const renderSet = () => phrases.map((phrase) => {
        const text = String(phrase);
        if (/\bemail me\b/i.test(text)) {
          const [before, after] = text.split(/\bemail me\b/i);
          return `<span class="marquee-help">${esc(before)}<a class="marquee-email" href="mailto:${esc(email)}">Email me</a>${esc(after || "")}</span>`;
        }
        return `<span>${esc(text)}</span>`;
      }).join("");
      target.innerHTML = `
        <div class="marquee-track">
          <div class="marquee-set">${renderSet()}</div>
          <div class="marquee-set" aria-hidden="true">${renderSet()}</div>
        </div>
      `;
    });
  }

  function renderSkills() {
    const grid = $("#skillsGrid");
    if (!grid) return;
    grid.innerHTML = (data.skills || []).map((group, gi) => `
      <article class="skill-group reveal" style="--delay:${gi * 80}ms">
        <header class="skill-group-head">
          <span class="skill-group-num">${pad(gi + 1)}</span>
          <h3>${esc(group.group)}</h3>
        </header>
        <ul class="skill-list">
          ${(group.items || []).map((skill, si) => `<li class="skill-chip" style="--chip-delay:${si * 28}ms"><span class="skill-dot" aria-hidden="true"></span>${esc(skill)}</li>`).join("")}
        </ul>
      </article>
    `).join("");
  }

  function renderCertifications() {
    const grid = $("#certsGrid");
    if (!grid) return;
    const list = Array.isArray(data.certifications) ? data.certifications : [];
    const filterRow = $("#certsFilters");
    const emptyEl = $("#certsEmpty");
    const countEl = $("#certsCount");
    const statTotal = $("#certsStatTotal");
    const statIssuers = $("#certsStatIssuers");
    const statSecurity = $("#certsStatSecurity");

    const allTags = Array.from(new Set(list.flatMap((c) => (c.tags || []).map(String)))).sort((a, b) => a.localeCompare(b));
    const issuers = new Set(list.map((c) => c.issuer).filter(Boolean));
    if (statTotal) statTotal.textContent = String(list.length);
    if (statIssuers) statIssuers.textContent = String(issuers.size);
    if (statSecurity) statSecurity.textContent = String(list.filter((c) => (c.tags || []).includes("Security")).length);

    const priority = ["Security", "Cryptography", "AI"];
    const rank = (cert) => {
      const tags = cert.tags || [];
      const idx = priority.findIndex((t) => tags.includes(t));
      return idx === -1 ? priority.length : idx;
    };
    const sorted = list.slice().sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));

    const writeCards = (filterTag) => {
      grid.innerHTML = "";
      const visible = filterTag === "All" ? sorted : sorted.filter((c) => (c.tags || []).includes(filterTag));
      if (emptyEl) emptyEl.hidden = visible.length > 0;
      if (countEl) countEl.textContent = filterTag === "All" ? `${visible.length} credentials` : `${visible.length} of ${list.length} credentials tagged ${filterTag}`;
      visible.forEach((cert, index) => {
        const tags = (cert.tags || []).slice(0, 3);
        const el = document.createElement(cert.url ? "a" : "div");
        el.className = "cert-card reveal visible";
        el.style.setProperty("--delay", `${index * 24}ms`);
        if (cert.url) {
          el.href = cert.url;
          el.target = "_blank";
          el.rel = "noopener";
          el.setAttribute("aria-label", `${cert.title}, ${cert.issuer}. Verify certificate (opens in a new tab)`);
        }
        el.innerHTML = `
          <span class="cert-fold" aria-hidden="true"></span>
          <span class="cert-issuer">${esc(cert.issuer || "")}</span>
          <h3 class="cert-title">${esc(cert.title)}</h3>
          <div class="cert-foot">
            <div class="cert-tags">${tags.map((t) => `<span class="cert-tag">${esc(t)}</span>`).join("")}</div>
            <span class="cert-verify" aria-hidden="true">${cert.url ? "Verify ↗" : ""}</span>
          </div>
        `;
        grid.appendChild(el);
      });
    };

    if (filterRow) {
      filterRow.innerHTML = "";
      ["All", ...allTags].forEach((tag, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "certs-filter" + (i === 0 ? " is-active" : "");
        btn.setAttribute("aria-pressed", i === 0 ? "true" : "false");
        btn.textContent = tag;
        btn.addEventListener("click", () => {
          $$(".certs-filter", filterRow).forEach((b) => {
            b.classList.remove("is-active");
            b.setAttribute("aria-pressed", "false");
          });
          btn.classList.add("is-active");
          btn.setAttribute("aria-pressed", "true");
          writeCards(tag);
        });
        filterRow.appendChild(btn);
      });
    }
    writeCards("All");
  }

  /* ------------------------------------------------------------------ */
  /* 3. Shared interactions                                              */
  /* ------------------------------------------------------------------ */

  function setupMenu() {
    const button = $("#menuButton");
    const curtain = $("#menuCurtain");
    if (!button || !curtain) return;

    const masthead = $(".masthead");
    if (masthead && button.parentElement !== masthead) masthead.appendChild(button);
    button.classList.add("menu-toggle");
    button.setAttribute("aria-controls", "menuCurtain");

    const currentRoute = ROUTES[document.body.dataset.page] || "";
    const isProjectPage = Boolean(document.body.dataset.caseStudy);
    $$(".menu-panel > a").forEach((link, idx) => {
      const href = link.getAttribute("href") || "";
      const isCurrent = href === currentRoute || (isProjectPage && href === ROUTES.work);
      link.classList.toggle("is-current", isCurrent);
      if (isCurrent) link.setAttribute("aria-current", "page");
      link.setAttribute("data-num", pad(idx + 1));
      link.style.setProperty("--menu-i", String(idx));
    });

    const syncCloseTarget = () => {
      const rect = button.getBoundingClientRect();
      curtain.style.setProperty("--menu-close-x", `${rect.left}px`);
      curtain.style.setProperty("--menu-close-y", `${rect.top}px`);
      curtain.style.setProperty("--menu-close-w", `${rect.width}px`);
      curtain.style.setProperty("--menu-close-h", `${rect.height}px`);
    };

    let isOpen = false;
    let lastFocus = null;
    const setMenu = (open) => {
      if (open) {
        syncCloseTarget();
        lastFocus = document.activeElement;
      }
      isOpen = open;
      curtain.classList.toggle("active", open);
      curtain.classList.toggle("closing", !open);
      curtain.setAttribute("aria-hidden", String(!open));
      if (open) curtain.removeAttribute("inert"); else curtain.setAttribute("inert", "");
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      button.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
      if (open) {
        window.setTimeout(() => $(".menu-panel > a", curtain)?.focus(), 120);
      } else {
        window.setTimeout(() => curtain.classList.remove("closing"), 520);
        if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
      }
    };

    setMenu(false);
    curtain.classList.remove("closing");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      setMenu(!isOpen);
    });
    button.addEventListener("pointermove", (event) => {
      const rect = button.getBoundingClientRect();
      button.style.setProperty("--ripple-x", `${event.clientX - rect.left}px`);
      button.style.setProperty("--ripple-y", `${event.clientY - rect.top}px`);
    });
    $$("[data-menu-close]").forEach((el) => {
      if (el === button) return;
      el.addEventListener("click", () => setMenu(false));
    });
    window.addEventListener("resize", () => { if (isOpen) syncCloseTarget(); }, { passive: true });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen) setMenu(false);
      if (event.key === "Tab" && isOpen) {
        const focusables = $$("a[href], button", curtain).filter((el) => !el.hidden);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }

  function setupHeroSplit() {
    $$(".profile-head h1, .page-headline-title").forEach((heading) => {
      if (heading.dataset.split === "true" || heading.querySelector("*")) return;
      const text = heading.textContent || "";
      heading.setAttribute("aria-label", text.trim());
      heading.textContent = "";
      heading.dataset.split = "true";
      heading.classList.add("split-title");
      let charIndex = 0;
      text.split(/(\s+)/).forEach((word) => {
        if (/^\s+$/.test(word)) { heading.appendChild(document.createTextNode(word)); return; }
        const wordSpan = document.createElement("span");
        wordSpan.className = "hero-letter-word";
        wordSpan.setAttribute("aria-hidden", "true");
        Array.from(word).forEach((ch) => {
          const span = document.createElement("span");
          span.className = "hero-letter";
          span.style.setProperty("--letter-delay", `${charIndex * 34}ms`);
          span.textContent = ch;
          wordSpan.appendChild(span);
          charIndex += 1;
        });
        heading.appendChild(wordSpan);
      });
    });
  }

  function setupMagneticButtons() {
    if (coarsePointer) return;
    $$("[data-rail-prev], [data-rail-next], .card-visit, .contact-form button[type=submit]").forEach((target) => {
      target.addEventListener("pointermove", (event) => {
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--mx", `${(event.clientX - rect.left - rect.width / 2) * 0.18}px`);
        target.style.setProperty("--my", `${(event.clientY - rect.top - rect.height / 2) * 0.22}px`);
      });
      target.addEventListener("pointerleave", () => {
        target.style.setProperty("--mx", "0px");
        target.style.setProperty("--my", "0px");
      });
    });
  }

  function setupLiquidButtons() {
    if (coarsePointer) return;
    const selector = [".brand-social", ".card-visit", ".detail-actions a", ".end-card-cta a", ".case-study-page .text-link", ".contact-send-button", ".drag-arrows button", ".bugcrowd-seal", ".palette-open"].join(", ");
    $$(selector).forEach((target) => {
      target.classList.add("liquid-link");
      if (!$(".liquid-content", target)) {
        Array.from(target.childNodes).forEach((node) => {
          if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) return;
          const span = document.createElement("span");
          span.className = "liquid-content";
          span.textContent = node.textContent;
          target.replaceChild(span, node);
        });
      }
      target.addEventListener("pointermove", (event) => {
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--ripple-x", `${event.clientX - rect.left}px`);
        target.style.setProperty("--ripple-y", `${event.clientY - rect.top}px`);
      });
      target.addEventListener("pointerleave", () => {
        target.style.removeProperty("--ripple-x");
        target.style.removeProperty("--ripple-y");
      });
    });
  }

  function setupRail() {
    const rail = $("#projectRail");
    if (!rail) return;
    const cards = $$(".project-card", rail);
    const status = $("[data-rail-status]");
    let activeIndex = 0;
    let isDown = false;
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;
    let activePointerId = null;
    let suppressNextClick = false;
    let wheelTimer = 0;
    let wheelLocked = false;
    const DRAG_THRESHOLD = 6;

    const getClosestIndex = () => {
      if (!cards.length) return 0;
      const railCenter = rail.scrollLeft + rail.clientWidth / 2;
      return cards.reduce((closest, card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const closestCenter = cards[closest].offsetLeft + cards[closest].offsetWidth / 2;
        return Math.abs(cardCenter - railCenter) < Math.abs(closestCenter - railCenter) ? index : closest;
      }, 0);
    };
    const setActiveCard = (index) => {
      activeIndex = Math.max(0, Math.min(cards.length - 1, index));
      cards.forEach((card, cardIndex) => card.classList.toggle("is-selected", cardIndex === activeIndex));
      if (status) status.textContent = `${activeIndex + 1} of ${cards.length}: ${data.projects[activeIndex]?.title || ""}`;
    };
    const getTargetLeft = (card) => {
      const railRect = rail.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const rawLeft = rail.scrollLeft + cardRect.left - railRect.left - (rail.clientWidth - cardRect.width) / 2;
      return Math.max(0, Math.min(Math.max(0, rail.scrollWidth - rail.clientWidth), rawLeft));
    };
    const scrollToIndex = (index, behavior = "smooth") => {
      if (!cards.length) return;
      setActiveCard(index);
      rail.classList.add("wheel-scrolling");
      rail.scrollTo({ left: getTargetLeft(cards[activeIndex]), behavior: reducedMotion ? "auto" : behavior });
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        rail.classList.remove("wheel-scrolling");
        wheelLocked = false;
      }, reducedMotion ? 80 : 520);
    };
    const scrollRail = (direction) => {
      setActiveCard(getClosestIndex());
      scrollToIndex(Math.max(0, Math.min(cards.length - 1, activeIndex + direction)));
    };

    setActiveCard(0);

    rail.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      isDown = true;
      isDragging = false;
      activePointerId = event.pointerId;
      startX = event.clientX;
      scrollLeft = rail.scrollLeft;
    });
    rail.addEventListener("pointermove", (event) => {
      if (!isDown || event.pointerId !== activePointerId) return;
      const delta = event.clientX - startX;
      if (!isDragging && Math.abs(delta) >= DRAG_THRESHOLD) {
        isDragging = true;
        rail.classList.add("dragging");
        try { rail.setPointerCapture(event.pointerId); } catch (_) { /* noop */ }
      }
      if (isDragging) rail.scrollLeft = scrollLeft - delta;
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((name) => {
      rail.addEventListener(name, (event) => {
        if (event.pointerId !== activePointerId) return;
        if (isDragging) suppressNextClick = true;
        if (rail.hasPointerCapture && rail.hasPointerCapture(event.pointerId)) {
          try { rail.releasePointerCapture(event.pointerId); } catch (_) { /* noop */ }
        }
        isDown = false;
        isDragging = false;
        activePointerId = null;
        rail.classList.remove("dragging");
      });
    });
    rail.addEventListener("click", (event) => {
      if (suppressNextClick) {
        event.preventDefault();
        event.stopPropagation();
        suppressNextClick = false;
      }
    }, true);
    rail.addEventListener("scroll", () => {
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        setActiveCard(getClosestIndex());
        rail.classList.remove("wheel-scrolling");
        wheelLocked = false;
      }, 140);
    }, { passive: true });
    rail.addEventListener("wheel", (event) => {
      if (event.defaultPrevented) return;
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      const wheelDelta = horizontal || event.shiftKey ? (event.deltaX || event.deltaY) : event.deltaY;
      if (Math.abs(wheelDelta) < 8) return;
      const direction = wheelDelta > 0 ? 1 : -1;
      const currentIndex = wheelLocked ? activeIndex : getClosestIndex();
      const atEdge = (currentIndex <= 0 && direction < 0) || (currentIndex >= cards.length - 1 && direction > 0);
      if (atEdge) return; // let the page scroll on
      event.preventDefault();
      if (wheelLocked) return;
      wheelLocked = true;
      scrollToIndex(currentIndex + direction);
    }, { passive: false });
    rail.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") { event.preventDefault(); scrollRail(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); scrollRail(-1); }
    });
    $("[data-rail-prev]")?.addEventListener("click", () => scrollRail(-1));
    $("[data-rail-next]")?.addEventListener("click", () => scrollRail(1));
  }

  function setupReveal() {
    const elements = $$(".reveal, .reveal-slide-left, .reveal-slide-right, .reveal-scale");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -32px 0px" });
    elements.forEach((el) => observer.observe(el));

    const staggerTargets = [...$$(".thought-list"), ...$$(".profile-timeline"), ...$$(".footer-socials.brand-socials"), ...$$(".home-work"), ...$$(".method-list"), ...$$(".notes-panel")];
    const stagger = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible", "visible");
        stagger.unobserve(entry.target);
      });
    }, { threshold: 0.05, rootMargin: "0px 0px 12% 0px" });
    staggerTargets.forEach((el) => stagger.observe(el));
  }

  function setupClock() {
    const clock = $("#clock");
    if (!clock) return;
    if (!clock.nextElementSibling || !clock.nextElementSibling.classList.contains("topline-meta")) {
      const meta = document.createElement("div");
      meta.className = "topline-meta";
      meta.innerHTML = `Desk open &middot; <button type="button" class="palette-open" data-palette-open aria-label="Open the command desk (press slash)">Type <kbd>/</kbd> for commands</button>`;
      clock.insertAdjacentElement("afterend", meta);
    }
    const update = () => {
      const now = new Date();
      const date = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "2-digit", month: "short" }).format(now);
      const time = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true }).format(now);
      clock.textContent = `${date} / ${time} IST`;
    };
    update();
    setInterval(update, 30000);
  }

  const BURN_EDGE_HTML = `
    <div class="burn-char" aria-hidden="true"></div>
    <div class="burn-glow" aria-hidden="true"></div>
    ${Array.from({ length: 10 }, (_, i) => `<span class="burn-ember" style="--i:${i}"></span>`).join("")}
    ${Array.from({ length: 4 }, (_, i) => `<span class="burn-smoke" style="--i:${i}"></span>`).join("")}
  `;

  const readHandoff = () => {
    try {
      const flag = sessionStorage.getItem("bj-handoff") === "1";
      sessionStorage.removeItem("bj-handoff");
      return flag;
    } catch (_) {
      return false;
    }
  };

  function setupIntro() {
    const intro = $(".intro");
    if (!intro) return;
    const finish = () => {
      document.body.classList.add("loaded", "intro-complete");
      intro.remove();
    };
    if (reducedMotion) { finish(); return; }

    const titleHTML = $(".intro-title", intro)?.innerHTML || "The Build Journal";
    const handoff = readHandoff();
    intro.innerHTML = `
      <div class="intro-carrier">
        <div class="intro-sheet">
          <div class="intro-sheet-face">
            <div class="intro-masthead">The Build Journal</div>
            <div class="intro-bar"></div>
            <div class="intro-title">${titleHTML}</div>
            <div class="intro-line"></div>
            <div class="intro-folio">
              <span>Abhinav Raj</span>
              <span>Security research &middot; Products</span>
              <span>abhnv.in</span>
            </div>
            <div class="intro-stamp">Filed</div>
          </div>
        </div>
        <div class="burn-flames burn-flames--intro" aria-hidden="true"></div>
        <div class="intro-burn-edge">${BURN_EDGE_HTML}</div>
      </div>
    `;
    intro.classList.add("intro--armed", handoff ? "intro--handoff" : "intro--fresh");
    // Timings mirror the CSS keyframes: burn-off starts at `reveal`, the
    // sheet is gone by `done`. Kept short so the page is never blank for long.
    const reveal = handoff ? 120 : 520;
    const done = handoff ? 960 : 1480;
    window.setTimeout(() => document.body.classList.add("loaded"), reveal);
    window.setTimeout(finish, done);
    // Safety: never trap a visitor behind the sheet.
    window.setTimeout(finish, 2600);
  }

  function setupNavTransitions() {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const id = link.getAttribute("href");
        if (id.length < 2) return;
        const target = document.getElementById(id.slice(1));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      });
    });
  }

  function setupPageTransitions() {
    const cover = document.createElement("div");
    cover.className = "page-cover";
    cover.setAttribute("aria-hidden", "true");
    cover.innerHTML = `
      <div class="page-cover-carrier">
        <div class="page-cover-sheet"></div>
        <div class="burn-flames burn-flames--cover" aria-hidden="true"></div>
        <div class="page-cover-edge">${BURN_EDGE_HTML}</div>
      </div>
    `;
    document.body.appendChild(cover);

    let leaving = false;
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a[href]");
      if (!link) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || isExternal(href) || link.target === "_blank" || link.hasAttribute("download")) return;
      e.preventDefault();
      if (leaving) return;
      leaving = true;
      try { sessionStorage.setItem("bj-handoff", "1"); } catch (_) { /* noop */ }
      if (reducedMotion) { window.location.href = href; return; }
      cover.classList.add("is-covering");
      window.setTimeout(() => { window.location.href = href; }, 540);
    });
    window.addEventListener("pageshow", (event) => {
      if (!event.persisted) return;
      leaving = false;
      cover.classList.remove("is-covering");
      document.body.classList.add("loaded", "intro-complete");
      $(".intro")?.remove();
    });
  }

  function setupCardTilt() {
    if (coarsePointer) return;
    const selector = [
      ".home-work .project-card", ".work-detail-card", ".pattern-card", ".api-card", ".cert-card",
      ".contact-brief-grid article", ".skill-group", ".case-lens-grid article", ".thought-list article",
      ".hero-roles article", ".blueprint-grid article", ".anatomy-grid article", ".secbuild", ".api-why-grid article",
      ".bugcrowd-ranks li", ".profile-stats li"
    ].join(", ");
    $$(selector).forEach((card) => {
      card.classList.add("tilt");
      if (!$(".card-glare", card)) {
        const glare = document.createElement("span");
        glare.className = "card-glare";
        glare.setAttribute("aria-hidden", "true");
        card.appendChild(glare);
      }
      card.addEventListener("pointermove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty("--tilt-x", `${x * 8}deg`);
        card.style.setProperty("--tilt-y", `${y * -6}deg`);
        card.style.setProperty("--glare-x", `${(x + 0.5) * 100}%`);
        card.style.setProperty("--glare-y", `${(y + 0.5) * 100}%`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  function setupCountUp() {
    const targets = $$("[data-count]");
    if (!targets.length || !("IntersectionObserver" in window) || reducedMotion) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const match = (el.textContent || "").trim().match(/^(\d+)(.*)$/);
        observer.unobserve(el);
        if (!match) return;
        const target = parseInt(match[1], 10);
        const suffix = match[2] || "";
        if (!Number.isFinite(target) || target <= 1) return;
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / 900);
          el.textContent = `${Math.round((1 - Math.pow(1 - t, 3)) * target)}${suffix}`;
          if (t < 1) window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    targets.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------ */
  /* 4. Command engine                                                   */
  /* ------------------------------------------------------------------ */

  function createCommandEngine() {
    const p = data.profile;
    const s = data.security;
    const productNames = data.projects.map((x) => x.title);
    const routes = {
      home: "/", profile: "/", about: "/",
      security: "/security", research: "/security", sec: "/security",
      builds: "/work", work: "/work", products: "/work", projects: "/work",
      papers: "/work#research",
      credentials: "/credentials", creds: "/credentials", certs: "/credentials",
      api: "/api", docs: "/api",
      contact: "/contact", write: "/contact",
      desk: "/terminal", terminal: "/terminal"
    };
    const lines = {
      help: [
        "Pages: home, security, builds, credentials, api, contact.",
        "About me: whoami, bugcrowd, method, scope, focus, skills, socials, email.",
        `Products: open clex, open clex-ai, open driped, open trgt, open modih-mail.`,
        "Also: clear. Type a page name to go there."
      ],
      whoami: [
        `${p.name}. ${p.role}.`,
        `Security research since ${p.researchSince}. Products: ${productNames.join(", ")}.`,
        `Open to: ${p.openTo.join("; ")}.`
      ],
      bugcrowd: [
        `Bugcrowd: ${p.bugcrowd.url}`,
        ...p.bugcrowd.ranks.map((r) => `${r.label}, ${r.period}.`)
      ],
      method: s.method.map((m, i) => `${pad(i + 1)} ${m.title}: ${m.body}`),
      scope: [
        "Areas: " + s.areas.map((a) => a.title).join(", ") + ".",
        "Rules: controlled accounts, synthetic data, minimum-impact proof, state restored, nothing out of scope."
      ],
      focus: data.notes.map((n) => `${n.number} ${n.title}: ${n.body}`),
      skills: data.skills.map((g) => `${g.group}: ${(g.items || []).join(", ")}`),
      socials: [`Bugcrowd: ${p.bugcrowd.url}`, ...data.socials.map((social) => `${social.label}: ${social.url}`)],
      email: [`Opening mail to ${p.email}.`],
      sudo: ["Nice try. Authorization is checked on the server."],
      rm: ["State restoration is step five. Nothing gets deleted here."],
      ls: ["home  security  builds  credentials  api  contact  terminal"],
      pwd: [window.location.pathname]
    };

    async function run(rawCommand, io) {
      const command = rawCommand.trim().toLowerCase().replace(/\s+/g, " ");
      if (!command) return;
      await io.echo(command);

      if (command === "clear") { io.clear(); await io.say("Cleared. Type help to start again."); return; }

      const [verb, ...rest] = command.split(" ");
      if ((verb === "open" || verb === "go" || verb === "cd") && rest.length) {
        const key = rest.join("-").replace(/^\//, "");
        const project = data.projects.find((x) => x.slug === key || x.title.toLowerCase() === rest.join(" "));
        if (project) {
          await io.say(`Opening the ${project.title} case study.`);
          io.go(cleanRoute(project.caseStudyUrl));
          return;
        }
        if (routes[key]) { await io.say(`Opening ${key}.`); io.go(routes[key]); return; }
        await io.say(`Nothing called ${rest.join(" ")}. Try: ${productNames.map((n) => `open ${n.toLowerCase().replace(/\s+/g, "-")}`).join(", ")}.`, "error");
        return;
      }
      if (verb === "sudo") { await io.sayMany(lines.sudo); return; }
      if (verb === "rm") { await io.sayMany(lines.rm); return; }
      if (lines[command]) {
        await io.sayMany(lines[command]);
        if (command === "email") io.go(`mailto:${p.email}`);
        return;
      }
      if (routes[command]) { await io.say(`Opening ${command}.`); io.go(routes[command]); return; }
      const project = data.projects.find((x) => x.slug === command || x.title.toLowerCase() === command);
      if (project) { await io.say(`Opening the ${project.title} case study.`); io.go(cleanRoute(project.caseStudyUrl)); return; }
      await io.say(`No command called ${command}. Type help.`, "error");
    }

    const suggestions = ["help", "whoami", "security", "method", "bugcrowd", "builds", "open clex", "credentials", "api", "contact", "email", "clear"];
    return { run, suggestions, welcome: ["Command desk open. Type help, or a page name, and press Enter."] };
  }

  const engine = createCommandEngine();

  function makeAudioTick() {
    let audioContext = null;
    return () => {
      if (reducedMotion) return;
      try {
        audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === "suspended") audioContext.resume();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "square";
        oscillator.frequency.value = 980 + Math.random() * 260;
        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.018, audioContext.currentTime + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.03);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.034);
      } catch (_) { /* audio is optional */ }
    };
  }

  function makeConsoleIO(output, options = {}) {
    const tick = options.tick || (() => {});
    const typed = !reducedMotion && options.typed !== false;
    const print = async (kind, text, animate) => {
      const row = document.createElement("div");
      row.className = `terminal-line terminal-line--${kind}`;
      output.appendChild(row);
      output.scrollTop = output.scrollHeight;
      if (!animate) { row.textContent = text; return; }
      row.classList.add("is-typing");
      const pieces = String(text).match(/\S+\s*/g) || [String(text)];
      for (const piece of pieces) {
        row.textContent += piece;
        output.scrollTop = output.scrollHeight;
        tick();
        await sleep(Math.min(70, 22 + piece.length * 3));
      }
      row.classList.remove("is-typing");
    };
    return {
      echo: (command) => print("input", `${options.prompt || "abhinav@desk:~$"} ${command}`, false),
      say: (text, kind = "system") => print(kind, text, typed),
      sayMany: async (list) => { for (const line of list) await print("system", line, typed); },
      clear: () => { output.innerHTML = ""; },
      go: (href) => { window.setTimeout(() => { window.location.href = href; }, 260); }
    };
  }

  function setupTerminal() {
    const form = $("#terminalForm");
    const input = $("#terminalInput");
    const output = $("#terminalOutput");
    if (!form || !input || !output) return;
    const tick = makeAudioTick();
    const io = makeConsoleIO(output, { tick, prompt: "abhinav@desk:~$" });
    let queue = Promise.resolve();
    const history = [];
    let historyIndex = -1;

    output.innerHTML = "";
    queue = queue.then(() => io.sayMany(engine.welcome));
    let demoSeen = false;
    try { demoSeen = sessionStorage.getItem("bj-desk-demo") === "1"; } catch (_) { /* noop */ }
    if (!demoSeen && !reducedMotion) {
      try { sessionStorage.setItem("bj-desk-demo", "1"); } catch (_) { /* noop */ }
      queue = queue.then(async () => {
        await sleep(900);
        if (input.value.trim()) return;
        await engine.run("whoami", io);
      });
    }

    const execute = () => {
      const command = input.value;
      input.value = "";
      if (command.trim()) { history.unshift(command); historyIndex = -1; }
      queue = queue.then(() => engine.run(command, io));
    };
    form.addEventListener("submit", (event) => { event.preventDefault(); execute(); });
    input.addEventListener("keydown", (event) => {
      if (event.key.length === 1 || event.key === "Backspace") tick();
      if (event.key === "ArrowUp" && history.length) { event.preventDefault(); historyIndex = Math.min(history.length - 1, historyIndex + 1); input.value = history[historyIndex]; }
      if (event.key === "ArrowDown") { event.preventDefault(); historyIndex = Math.max(-1, historyIndex - 1); input.value = historyIndex === -1 ? "" : history[historyIndex]; }
    });
    const chips = $("[data-command-chips]");
    if (chips) {
      chips.innerHTML = engine.suggestions.map((cmd) => `<button type="button">${esc(cmd)}</button>`).join("");
      $$("button", chips).forEach((chip) => chip.addEventListener("click", () => {
        input.value = chip.textContent || "";
        input.focus();
        execute();
      }));
    }
  }

  function setupCommandPalette() {
    if (document.body.dataset.page === "terminal") {
      $$("[data-palette-open]").forEach((btn) => btn.addEventListener("click", () => $("#terminalInput")?.focus()));
      return;
    }
    const palette = document.createElement("div");
    palette.className = "palette";
    palette.id = "commandPalette";
    palette.setAttribute("role", "dialog");
    palette.setAttribute("aria-modal", "true");
    palette.setAttribute("aria-label", "Command desk");
    palette.hidden = true;
    palette.innerHTML = `
      <div class="palette-sheet">
        <div class="palette-top">
          <span class="palette-title">Command desk</span>
          <span class="palette-hint">Esc closes &middot; Enter runs</span>
          <button type="button" class="palette-close" aria-label="Close the command desk">&times;</button>
        </div>
        <div class="palette-output terminal-output" id="paletteOutput" aria-live="polite"></div>
        <form class="palette-form terminal-form" autocomplete="off">
          <label for="paletteInput">abhinav@desk:~$</label>
          <input id="paletteInput" name="command" type="text" spellcheck="false" autocomplete="off" placeholder="help, security, open clex, email">
          <button type="submit">Run</button>
        </form>
        <div class="palette-chips" aria-label="Suggested commands"></div>
      </div>
    `;
    document.body.appendChild(palette);
    const input = $("#paletteInput", palette);
    const output = $("#paletteOutput", palette);
    const form = $("form", palette);
    const chips = $(".palette-chips", palette);
    const io = makeConsoleIO(output, { prompt: "abhinav@desk:~$", typed: false });
    let queue = Promise.resolve();
    let open = false;
    let lastFocus = null;
    let welcomed = false;

    chips.innerHTML = engine.suggestions.slice(0, 9).map((cmd) => `<button type="button">${esc(cmd)}</button>`).join("");
    $$("button", chips).forEach((chip) => chip.addEventListener("click", () => {
      input.value = chip.textContent || "";
      submit();
    }));

    const setOpen = (next) => {
      open = next;
      palette.hidden = !next;
      document.body.classList.toggle("palette-open", next);
      if (next) {
        lastFocus = document.activeElement;
        if (!welcomed) { welcomed = true; queue = queue.then(() => io.sayMany(engine.welcome)); }
        window.setTimeout(() => input.focus(), 30);
      } else if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      }
    };
    const submit = () => {
      const command = input.value;
      input.value = "";
      queue = queue.then(() => engine.run(command, io));
    };
    form.addEventListener("submit", (event) => { event.preventDefault(); submit(); });
    $(".palette-close", palette).addEventListener("click", () => setOpen(false));
    palette.addEventListener("click", (event) => { if (event.target === palette) setOpen(false); });
    document.addEventListener("keydown", (event) => {
      const tag = (event.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || event.target.isContentEditable;
      if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false); return; }
      if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") || (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey)) {
        event.preventDefault();
        setOpen(!open);
      }
    });
    $$("[data-palette-open]").forEach((btn) => btn.addEventListener("click", () => setOpen(true)));
  }

  /* ------------------------------------------------------------------ */
  /* 5. Page-specific                                                    */
  /* ------------------------------------------------------------------ */

  function setupContactForm() {
    const form = $("#contactForm");
    if (!form) return;
    const submit = form.querySelector('button[type="submit"]');
    const submitLabel = submit?.querySelector(".contact-send-label");
    const idleLabel = submitLabel?.textContent || "Send";
    const status = $("#contactFormStatus");
    const topicInputs = $$('input[name="topic"]', form);
    const messageField = form.querySelector('textarea[name="message"]');
    const prompts = {
      "security-research": "What is the system, what access is on the table, and what would a useful outcome look like?",
      "product-security": "What are you building, when does it launch, and which parts worry you most?",
      "vulnerability-report": "Which product, what you found, and how to reproduce it. Thank you for reporting responsibly.",
      "build": "What exists today, what is stuck, and what shipped would look like.",
      "other": "Whatever it is, a few plain sentences are enough."
    };
    topicInputs.forEach((radio) => radio.addEventListener("change", () => {
      if (messageField && prompts[radio.value]) messageField.placeholder = prompts[radio.value];
      $$(".contact-topic", form).forEach((label) => label.classList.toggle("is-active", label.contains(radio)));
    }));

    const writeStatus = (text, state) => {
      if (!status) return;
      status.textContent = text;
      if (state) status.dataset.state = state; else delete status.dataset.state;
    };
    const writeLabel = (text) => { if (submitLabel) submitLabel.textContent = text; };
    const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    let pulseTimer = 0;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        topic: String(formData.get("topic") || "other"),
        message: String(formData.get("message") || "").trim(),
        website: String(formData.get("website") || "").trim()
      };
      if (!payload.name || !payload.email || !payload.message) {
        writeStatus("Add your name, an email address and a message.", "error");
        return;
      }
      if (!isEmail(payload.email)) {
        writeStatus("That email address does not look right.", "error");
        return;
      }
      if (submit) {
        submit.classList.remove("is-pulsing");
        void submit.offsetWidth;
        submit.classList.add("is-pulsing");
        window.clearTimeout(pulseTimer);
        pulseTimer = window.setTimeout(() => submit.classList.remove("is-pulsing"), 520);
        submit.disabled = true;
      }
      writeStatus("Sending.", "pending");
      writeLabel("Sending");
      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok === false) throw new Error(result.error || "The message could not be sent.");
        form.reset();
        $$(".contact-topic", form).forEach((label) => label.classList.remove("is-active"));
        writeStatus("Sent. I reply within a day, usually sooner.", "success");
        writeLabel("Sent");
        window.setTimeout(() => writeLabel(idleLabel), 3200);
      } catch (error) {
        writeStatus(error?.message || "The message could not be sent. Email hello@abhnv.in directly.", "error");
        writeLabel("Try again");
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  }

  function setupRedaction() {
    const bars = $$("[data-redact]");
    if (!bars.length) return;
    bars.forEach((el) => {
      el.classList.add("redact");
      el.setAttribute("title", "Declassify");
      const clear = () => el.classList.add("is-clear");
      el.addEventListener("pointerenter", clear);
      el.addEventListener("click", clear);
      el.addEventListener("focus", clear);
    });
    // Everything declassifies on its own shortly after the page arrives, so
    // nothing stays hidden from anyone who does not hover.
    const start = reducedMotion ? 0 : 1500;
    bars.forEach((el, i) => window.setTimeout(() => el.classList.add("is-clear"), start + i * 260));
  }

  function setupSecurityPage() {
    if (document.body.dataset.page !== "security") return;
    const s = data.security;

    // --- Research area explorer (tabs) ---------------------------------
    const tabs = $("[data-area-tabs]");
    const panel = $("[data-area-panel]");
    if (tabs && panel) {
      tabs.innerHTML = s.areas.map((area, i) => `
        <button type="button" role="tab" id="tab-${esc(area.id)}" aria-selected="${i === 0}" aria-controls="areaPanel" tabindex="${i === 0 ? 0 : -1}" data-area="${esc(area.id)}">
          <span class="area-num">${pad(i + 1)}</span>
          <span class="area-name">${esc(area.title)}</span>
          <span class="area-short">${esc(area.short)}</span>
        </button>
      `).join("");
      const buttons = $$("[role=tab]", tabs);
      let current = 0;
      const show = (index, focus) => {
        current = (index + s.areas.length) % s.areas.length;
        const area = s.areas[current];
        buttons.forEach((b, i) => {
          b.setAttribute("aria-selected", String(i === current));
          b.setAttribute("tabindex", i === current ? "0" : "-1");
          b.classList.toggle("is-active", i === current);
        });
        panel.classList.remove("is-in");
        void panel.offsetWidth;
        panel.setAttribute("aria-labelledby", `tab-${area.id}`);
        panel.innerHTML = `
          <div class="area-panel-head">
            <span class="kicker">${pad(current + 1)} / ${pad(s.areas.length)}</span>
            <h3>${esc(area.title)}</h3>
            <p class="deck">${esc(area.short)}</p>
          </div>
          <dl class="area-facts">
            <div><dt>What I look for</dt><dd>${esc(area.what)}</dd></div>
            <div><dt>Why it matters</dt><dd>${esc(area.why)}</dd></div>
            <div><dt>How I test it safely</dt><dd>${esc(area.how)}</dd></div>
          </dl>
          <div class="area-panel-nav">
            <button type="button" class="area-step" data-area-step="-1">&larr; Previous</button>
            <button type="button" class="area-step" data-area-step="1">Next &rarr;</button>
          </div>
        `;
        panel.classList.add("is-in");
        $$("[data-area-step]", panel).forEach((b) => b.addEventListener("click", () => show(current + Number(b.dataset.areaStep), false)));
        if (focus) buttons[current].focus();
        if (history.replaceState) history.replaceState(null, "", `#${area.id}`);
      };
      buttons.forEach((b, i) => {
        b.addEventListener("click", () => show(i, false));
        b.addEventListener("keydown", (event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); show(i + 1, true); }
          if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); show(i - 1, true); }
          if (event.key === "Home") { event.preventDefault(); show(0, true); }
          if (event.key === "End") { event.preventDefault(); show(s.areas.length - 1, true); }
        });
      });
      const hashIndex = s.areas.findIndex((a) => `#${a.id}` === window.location.hash);
      show(hashIndex >= 0 ? hashIndex : 0, false);
    }

    // --- Methodology fuse ------------------------------------------------
    const method = $("[data-method]");
    if (method) {
      method.innerHTML = s.method.map((step, i) => `
        <li class="method-step">
          <span class="method-num" aria-hidden="true">${pad(i + 1)}</span>
          <div>
            <h3>${esc(step.title)}</h3>
            <p>${esc(step.body)}</p>
          </div>
        </li>
      `).join("");
      if ("IntersectionObserver" in window) {
        const steps = $$(".method-step", method);
        const io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-lit");
            io.unobserve(entry.target);
          });
        }, { threshold: 0.35 });
        steps.forEach((step) => io.observe(step));
      } else {
        $$(".method-step", method).forEach((step) => step.classList.add("is-lit"));
      }
    }

    // --- Report patterns -----------------------------------------------
    const patterns = $("[data-patterns]");
    if (patterns) {
      patterns.innerHTML = s.patterns.map((item, i) => `
        <article class="pattern-card reveal" style="--delay:${i * 60}ms">
          <div class="pattern-head">
            <span class="pattern-cls">${esc(item.cls)}</span>
            <span class="pattern-idx">${pad(i + 1)}</span>
          </div>
          <h3>${esc(item.title)}</h3>
          <dl>
            <div><dt>Found</dt><dd>${esc(item.found)}</dd></div>
            <div><dt>Proof</dt><dd>${esc(item.proof)}</dd></div>
            <div><dt>Fix</dt><dd>${esc(item.fix)}</dd></div>
          </dl>
        </article>
      `).join("");
    }

    // --- Report anatomy (typewriter) -----------------------------------
    const report = $("[data-report]");
    if (report) {
      report.innerHTML = s.report.map((row) => `
        <div class="report-row">
          <dt>${esc(row.field)}</dt>
          <dd data-full="${esc(row.value)}"><span class="report-text">${reducedMotion ? esc(row.value) : ""}</span></dd>
        </div>
      `).join("");
      if (!reducedMotion && "IntersectionObserver" in window) {
        let started = false;
        const io = new IntersectionObserver(async (entries) => {
          if (started || !entries.some((e) => e.isIntersecting)) return;
          started = true;
          io.disconnect();
          for (const dd of $$("dd", report)) {
            const text = dd.dataset.full || "";
            const span = $(".report-text", dd);
            dd.classList.add("is-typing");
            for (const piece of text.match(/\S+\s*/g) || []) {
              span.textContent += piece;
              await sleep(Math.min(60, 16 + piece.length * 2));
            }
            dd.classList.remove("is-typing");
          }
          report.classList.add("is-done");
        }, { threshold: 0.3 });
        io.observe(report);
      } else {
        report.classList.add("is-done");
      }
    }

    // --- Security in the builds ----------------------------------------
    const builds = $("[data-security-builds]");
    if (builds) {
      builds.innerHTML = s.builds.map((item) => {
        const project = data.projects.find((p) => p.slug === item.slug) || {};
        return `
          <a class="secbuild reveal" href="/work/${esc(item.slug)}/">
            <img src="${esc(withBase(project.logo || ""))}" alt="" loading="lazy">
            <span class="secbuild-title">${esc(item.title)}</span>
            <span class="secbuild-note">${esc(item.note)}</span>
            <span class="secbuild-link">Read the case study &rarr;</span>
          </a>
        `;
      }).join("");
    }

    // --- Authorization lab ---------------------------------------------
    const lab = $("[data-authlab]");
    if (lab) setupAuthLab(lab);
  }

  function setupAuthLab(lab) {
    const accounts = [
      { id: "ava", name: "Ava", session: "s_ava_7f21" },
      { id: "ben", name: "Ben", session: "s_ben_3c09" }
    ];
    const records = [
      { id: "1041", owner: "ava", label: "Invoice 1041", body: { id: 1041, customer: "Ava Sharma (test)", total: "₹1,250.00", address: "12 Example Lane" } },
      { id: "1042", owner: "ben", label: "Invoice 1042", body: { id: 1042, customer: "Ben Iyer (test)", total: "₹640.00", address: "48 Sample Road" } }
    ];
    const state = { who: "ben", what: "1041", check: true, runs: 0 };
    const whoRow = $("[data-lab-who]", lab);
    const whatRow = $("[data-lab-what]", lab);
    const checkBtn = $("[data-lab-check]", lab);
    const runBtn = $("[data-lab-run]", lab);
    const req = $("[data-lab-request]", lab);
    const res = $("[data-lab-response]", lab);
    const verdict = $("[data-lab-verdict]", lab);
    const code = $("[data-lab-code]", lab);
    const counter = $("[data-lab-count]", lab);

    whoRow.innerHTML = accounts.map((a) => `<button type="button" data-who="${a.id}" aria-pressed="${state.who === a.id}">${esc(a.name)}<small>session ${esc(a.session)}</small></button>`).join("");
    whatRow.innerHTML = records.map((r) => `<button type="button" data-what="${r.id}" aria-pressed="${state.what === r.id}">${esc(r.label)}<small>owner: ${esc(accounts.find((a) => a.id === r.owner).name)}</small></button>`).join("");

    const sync = () => {
      $$("[data-who]", whoRow).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.who === state.who)));
      $$("[data-what]", whatRow).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.what === state.what)));
      checkBtn.setAttribute("aria-checked", String(state.check));
      checkBtn.querySelector(".lab-switch-label").textContent = state.check ? "Ownership check: on" : "Ownership check: off";
      const account = accounts.find((a) => a.id === state.who);
      req.textContent = `GET /api/invoices/${state.what} HTTP/1.1\nHost: example.test\nCookie: session=${account.session}`;
    };
    const run = async () => {
      const account = accounts.find((a) => a.id === state.who);
      const record = records.find((r) => r.id === state.what);
      const owns = record.owner === account.id;
      const allowed = owns || !state.check;
      state.runs += 1;
      lab.classList.remove("is-ok", "is-blocked", "is-leak");
      res.textContent = "";
      code.textContent = "…";
      verdict.textContent = "";
      await sleep(reducedMotion ? 0 : 260);
      if (allowed) {
        code.textContent = "200 OK";
        res.textContent = JSON.stringify(record.body, null, 2);
        if (owns) {
          lab.classList.add("is-ok");
          verdict.textContent = `${account.name} read ${account.name}'s own invoice. That is the intended behaviour.`;
        } else {
          lab.classList.add("is-leak");
          verdict.textContent = `${account.name} read ${accounts.find((a) => a.id === record.owner).name}'s invoice with a valid session and a different number. That is an IDOR, and it is the most common thing I report.`;
        }
      } else {
        code.textContent = "403 Forbidden";
        res.textContent = JSON.stringify({ error: "forbidden", reason: "invoice.owner_id != session.user_id" }, null, 2);
        lab.classList.add("is-blocked");
        verdict.textContent = `The server compared the invoice's owner with the session's user and refused. One line of code, and the bug does not exist.`;
      }
      if (counter) counter.textContent = `${state.runs} request${state.runs === 1 ? "" : "s"} sent to nowhere. All accounts and records here are invented.`;
    };
    whoRow.addEventListener("click", (e) => { const b = e.target.closest("[data-who]"); if (!b) return; state.who = b.dataset.who; sync(); });
    whatRow.addEventListener("click", (e) => { const b = e.target.closest("[data-what]"); if (!b) return; state.what = b.dataset.what; sync(); });
    checkBtn.addEventListener("click", () => { state.check = !state.check; sync(); });
    runBtn.addEventListener("click", run);
    sync();
    res.textContent = "Press \"Send the request\" to see what the server answers.";
    verdict.textContent = "Start with Ben asking for Ava's invoice and the check switched on. Then switch it off.";
    if ("IntersectionObserver" in window && !reducedMotion) {
      let fired = false;
      const io = new IntersectionObserver((entries) => {
        if (fired || !entries.some((e) => e.isIntersecting)) return;
        fired = true;
        io.disconnect();
        window.setTimeout(run, 700);
      }, { threshold: 0.5 });
      io.observe(lab);
    }
  }


  function setupLetterPreview() {
    const form = $("#contactForm");
    const preview = $("[data-letter]");
    if (!form || !preview) return;
    const name = form.querySelector('input[name="name"]');
    const email = form.querySelector('input[name="email"]');
    const message = form.querySelector('textarea[name="message"]');
    const topicLabels = {
      "security-research": "Security research",
      "product-security": "Product security review",
      "vulnerability-report": "Vulnerability report",
      "build": "Build work",
      "other": "A note"
    };
    const out = {
      topic: $("[data-letter-topic]", preview),
      from: $("[data-letter-from]", preview),
      body: $("[data-letter-body]", preview),
      count: $("[data-letter-count]", preview)
    };
    const update = () => {
      const topic = form.querySelector('input[name="topic"]:checked')?.value || "other";
      const who = name.value.trim();
      const addr = email.value.trim();
      const text = message.value.trim();
      if (out.topic) out.topic.textContent = topicLabels[topic] || topicLabels.other;
      if (out.from) out.from.textContent = who || addr ? `${who || "Someone"}${addr ? ` <${addr}>` : ""}` : "Your name <you@example.com>";
      if (out.body) {
        out.body.textContent = text || "Your message shows up here as you type, the way it will arrive in my inbox.";
        out.body.classList.toggle("is-empty", !text);
      }
      if (out.count) out.count.textContent = `${text.length} / 4000`;
      preview.classList.toggle("is-live", Boolean(who || addr || text));
    };
    ["input", "change"].forEach((evt) => form.addEventListener(evt, update));
    form.addEventListener("reset", () => window.setTimeout(update, 0));
    update();
  }

  function setupParallax() {
    const targets = $$("[data-parallax], .case-hero-image img");
    if (!targets.length || reducedMotion) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      targets.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) return;
        const progress = (rect.top + rect.height / 2 - innerHeight / 2) / innerHeight;
        el.style.setProperty("--parallax", `${(progress * -28).toFixed(2)}px`);
      });
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }

  function setupStamps() {
    // Numbered elements get a stamp press as they enter the viewport.
    const targets = $$(".profile-timeline article, .note-row, .api-why-grid article, .contact-brief-grid article, .anatomy-grid article, .diagram-node, .case-lens-grid article, .bugcrowd-ranks li, .profile-stats li, .certs-stat, .api-stat");
    if (!targets.length) return;
    targets.forEach((el) => el.classList.add("stamp-target"));
    if (!("IntersectionObserver" in window) || reducedMotion) {
      targets.forEach((el) => el.classList.add("is-stamped"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        window.setTimeout(() => entry.target.classList.add("is-stamped"), (i % 6) * 90);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.3, rootMargin: "0px 0px 8% 0px" });
    targets.forEach((el) => io.observe(el));
  }

  function setupHomeHero() {
    if (document.body.dataset.page !== "index") return;
    const clip = $(".clipping");
    if (!clip || coarsePointer) return;
    clip.addEventListener("pointermove", (e) => {
      const rect = clip.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      clip.style.setProperty("--clip-rx", `${y * -4}deg`);
      clip.style.setProperty("--clip-ry", `${x * 6}deg`);
      clip.style.setProperty("--clip-gx", `${(x + 0.5) * 100}%`);
      clip.style.setProperty("--clip-gy", `${(y + 0.5) * 100}%`);
    });
    clip.addEventListener("pointerleave", () => {
      clip.style.setProperty("--clip-rx", "0deg");
      clip.style.setProperty("--clip-ry", "0deg");
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  renderProjects();
  renderCaseStudy();
  renderStats();
  renderTimeline();
  renderNotes();
  renderSocials();
  renderMarquees();
  renderCertifications();
  renderSkills();
  setupSecurityPage();
  setupMenu();
  setupRail();
  setupReveal();
  setupClock();
  setupIntro();
  setupNavTransitions();
  setupTerminal();
  setupCommandPalette();
  setupContactForm();
  setupLetterPreview();
  setupHeroSplit();
  setupMagneticButtons();
  setupLiquidButtons();
  setupCountUp();
  setupCardTilt();
  setupRedaction();
  setupHomeHero();
  setupParallax();
  setupStamps();
  setupPageTransitions();
})();

(function () {
  "use strict";

  const data = window.PORTFOLIO;
  const caseStudies = window.CASE_STUDIES || [];
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const isExternal = (url) => /^https?:\/\//.test(url);
  const linkAttrs = (url) => isExternal(url) ? 'target="_blank" rel="noopener"' : "";
  const getBasePrefix = () => document.body.dataset.depth === "project" ? "../../" : "";
  const withBase = (url) => {
    if (!url || isExternal(url) || url.startsWith("#") || url.startsWith("mailto:")) return url;
    return `${getBasePrefix()}${url}`;
  };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));

  function createProjectCard(project, index) {
    const caseUrl = project.caseStudyUrl || project.url;
    const liveUrl = project.liveUrl || project.url;
    const points = Array.isArray(project.points) && project.points.length
      ? project.points.slice(0, 6)
      : [
        project.description,
        ...(Array.isArray(project.tags) ? project.tags.slice(0, 3).map((tag) => `${tag} layer`) : [])
      ].filter(Boolean).slice(0, 6);
    const card = document.createElement("article");
    card.className = "project-card reveal";
    card.style.setProperty("--delay", `${index * 70}ms`);
    card.innerHTML = `
      <a class="project-main" href="${caseUrl}" ${linkAttrs(caseUrl)}>
        <header>
          <span>${project.label}</span>
          <img src="${project.logo}" alt="" loading="lazy">
        </header>
        <h3>${project.title}</h3>
        <div class="project-image">
          <img src="${project.detailedImage || project.shortImage}" alt="${project.description}" loading="lazy">
        </div>
        <div class="project-points" aria-label="${esc(project.title)} highlights">
          <strong>What it does</strong>
          <p>${esc(project.description)}</p>
          ${project.detail ? `<p class="project-detail-note">${esc(project.detail)}</p>` : ""}
          <div class="project-point-list">
            ${points.map((point) => `<span>${esc(point)}</span>`).join("")}
          </div>
        </div>
        <footer>
          <p>${project.type}</p>
          <span>${project.title.slice(0, 1)}</span>
        </footer>
      </a>
      <a class="card-visit" href="${liveUrl}" ${linkAttrs(liveUrl)}>Visit Site</a>
    `;
    return card;
  }

  function createDetailedWorkCard(project, index) {
    const caseUrl = project.caseStudyUrl || project.url;
    const liveUrl = project.liveUrl || project.url;
    const card = document.createElement("article");
    card.className = `work-detail-card work-${project.slug || "item"} reveal`;
    card.style.setProperty("--delay", `${index * 60}ms`);
    card.innerHTML = `
      <div class="work-detail-main">
        <a class="detail-poster" href="${caseUrl}" ${linkAttrs(caseUrl)}>
          <img src="${project.detailedImage}" alt="${project.description}" loading="lazy">
        </a>
        <div class="detail-copy">
          <div class="kicker detail-label">${project.label}</div>
          <h2>${project.title}</h2>
          <div class="byline">By <strong>Abhinav Raj</strong></div>
          <p>${project.description}</p>
          <div class="tag-row">
            ${project.tags.map((tag) => `<span>${tag}</span>`).join("")}
          </div>
          <div class="detail-actions">
            <a href="${caseUrl}" ${linkAttrs(caseUrl)}>Read Case Study</a>
            <a href="${liveUrl}" ${linkAttrs(liveUrl)}>Visit Site</a>
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
        <a class="detail-poster" href="${item.url}" ${linkAttrs(item.url)}>
          <img src="${item.detailedImage}" alt="${item.description}" loading="lazy">
        </a>
        <div class="detail-copy">
          <div class="detail-label">${item.label}</div>
          <h2>${item.title}</h2>
          <p>${item.description}</p>
          <div class="tag-row">
            ${item.tags.map((tag) => `<span>${tag}</span>`).join("")}
          </div>
          <div class="detail-actions">
            <a href="${item.url}" ${linkAttrs(item.url)}>Read Paper</a>
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
      rail.classList.remove("project-rail--stack");
      data.projects.forEach((project, index) => {
        rail.appendChild(createProjectCard(project, index));
      });
    }

    const workGrid = $("#workPageGrid");
    if (workGrid) {
      workGrid.innerHTML = "";
      data.projects.forEach((project, index) => {
        workGrid.appendChild(createDetailedWorkCard(project, index));
      });
    }

    const researchGrid = $("#researchPageGrid");
    if (researchGrid && data.researchPapers) {
      researchGrid.innerHTML = "";
      data.researchPapers.forEach((item, index) => {
        researchGrid.appendChild(createResearchCard(item, index));
      });
    }
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
          <h1>Case Study Missing</h1>
          <p>This editorial file could not be found.</p>
          <a class="text-link hover-cut" href="work.html"><span>Back to work</span></a>
        </section>
      `;
      return;
    }

    const previous = caseStudies[(studyIndex - 1 + caseStudies.length) % caseStudies.length];
    const next = caseStudies[(studyIndex + 1) % caseStudies.length];
    target.style.setProperty("--case-accent", study.accent || "var(--red)");
    document.title = `${study.title} - Case Study`;
    const supportingImages = study.supportingImages || [];
    const figCounter = { val: 2 };
    const renderEvidenceNotes = (label, index) => {
      const sourceSets = [
        {
          title: "What this proves",
          points: study.blueprint.features.slice(0, 4),
          flow: study.blueprint.flow.slice(0, 5)
        },
        {
          title: "How the system holds",
          points: study.anatomy.map((item) => `${item.title}: ${item.body}`).slice(0, 3),
          flow: study.blueprint.modules.slice(0, 5)
        },
        {
          title: "Why it matters",
          points: study.challenges.map((item) => `${item.title}: ${item.result}`).slice(0, 3),
          flow: study.impact.slice(0, 4)
        }
      ];
      const notes = sourceSets[index % sourceSets.length];
      return `
        <aside class="evidence-notes" aria-label="${esc(label)} notes">
          <div class="kicker">From the case-study file</div>
          <h3>${esc(notes.title)}</h3>
          <ul>
            ${notes.points.map((point) => `<li>${esc(point)}</li>`).join("")}
          </ul>
          <div class="mini-flow" aria-label="Project flow">
            ${notes.flow.map((step) => `<span>${esc(step)}</span>`).join("")}
          </div>
        </aside>
      `;
    };
    const renderImageSpread = (image, label, index) => image ? `
        <section class="case-section case-visual-spread ${index % 2 ? "is-reversed" : ""} reveal" aria-label="${esc(label)}">
          <div class="case-section-label">${esc(label)}</div>
          <div class="evidence-spread">
            <figure class="case-image-card wide">
              <img src="${withBase(image.src)}" alt="${esc(image.alt)}" loading="${index === 0 ? "eager" : "lazy"}">
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
                <img src="${withBase(image.src)}" alt="${esc(image.alt)}" loading="lazy">
                <figcaption class="editorial-caption"><span class="caption-number">Fig. ${figCounter.val++}</span> ${esc(image.caption)}</figcaption>
              </figure>
            `).join("")}
          </div>
        </section>
    ` : "";

    const pageNum = studyIndex + 1;
    const extras = (window.CASE_STUDY_EXTRAS && window.CASE_STUDY_EXTRAS[study.slug]) || {};
    const pullQuoteText = extras.pullQuote
      || (study.deepDive ? study.deepDive[0].slice(0, 140) + "…" : study.lead[0].slice(0, 140) + "…");
    const diagramNodes = [
      ...(study.blueprint.modules || []).slice(0, 4),
      ...(study.stack || []).slice(0, 3)
    ].slice(0, 7);
    const linkedInUrl = data.socials.find((item) => item.label === "LinkedIn")?.url || "https://www.linkedin.com/in/abhnv8/";
    const githubUrl = data.socials.find((item) => item.label === "GitHub")?.url || "https://github.com/Abhinavv-007";

    target.innerHTML = `
      <article class="case-study">
        <div class="folio-strip" aria-hidden="true">
          <span class="folio-section">${esc(study.label)}</span>
          <span class="volume-mark">Vol. 1 &middot; No. ${pageNum}</span>
          <span class="folio-page">Page ${pageNum}</span>
        </div>

        <header class="case-hero">
          <div class="case-kicker">
            <span>${esc(study.issue)}</span>
            <span>${esc(study.label)}</span>
            <span>${esc(study.version)}</span>
          </div>
          <div class="case-title-grid">
            <div>
              <div class="kicker">${esc(study.label)}</div>
              <h1>${esc(study.title)}</h1>
              <h2>${esc(study.headline)}</h2>
              <p class="deck">${esc(study.subtitle)}</p>
              <div class="byline">By <strong>Abhinav Raj</strong> &middot; Product Engineer</div>
              <div class="dateline">Filed under ${esc(study.issue)} &middot; Compiled April 2026</div>
            </div>
            <aside>
              <span>Live File</span>
              <a class="text-link hover-cut" href="${study.liveUrl}" ${linkAttrs(study.liveUrl)}><span>Visit Site</span></a>
              ${study.repoUrl ? `<a class="text-link hover-cut" href="${study.repoUrl}" ${linkAttrs(study.repoUrl)}><span>GitHub</span></a>` : ""}
            </aside>
          </div>
          <figure class="case-hero-image">
            <img src="${withBase(study.heroImage.src)}" alt="${esc(study.heroImage.alt)}">
            <figcaption class="editorial-caption"><span class="caption-number">Fig. 1</span> ${esc(study.heroImage.caption)}</figcaption>
          </figure>
          <div class="case-stack" aria-label="Project stack">
            ${study.stack.map((item) => `<span>${esc(item)}</span>`).join("")}
          </div>
        </header>

        <section class="case-section case-lead reveal" aria-label="Lead story">
          <div class="case-section-label">Lead Story</div>
          <div class="case-lead-copy">
            ${study.lead.map((paragraph, index) => `<p class="${index === 0 ? "dropcap" : ""}">${esc(paragraph)}</p>`).join("")}
          </div>
          <div class="ornament" aria-hidden="true">&loz;</div>
        </section>

        <aside class="pull-quote reveal" aria-label="Pull quote">
          <p>${esc(pullQuoteText)}</p>
          <div class="attribution">&mdash; From the ${esc(study.label)} file</div>
        </aside>

        ${extras.vision ? `
        <section class="case-section case-vision reveal" aria-label="Product direction">
          <div class="case-section-label">Product Direction</div>
          <div class="case-vision-copy">
            <p class="dropcap">${esc(extras.vision)}</p>
            ${extras.longTerm ? `<p class="long-term">${esc(extras.longTerm)}</p>` : ""}
            ${(extras.differentiators && extras.differentiators.length) ? `
              <div class="case-differentiators" aria-label="What makes it different">
                <h4>What it is — and what it isn't</h4>
                <ul>
                  ${extras.differentiators.map((item) => `<li>${esc(item)}</li>`).join("")}
                </ul>
              </div>
            ` : ""}
          </div>
        </section>
        ` : ""}

        ${study.deepDive ? `
        <section class="case-section case-deep-dive reveal" aria-label="Deep dive">
          <div class="case-section-label">Deep Dive</div>
          <div class="case-deep-dive-copy">
            ${study.deepDive.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
          </div>
          <div class="jump-line" aria-hidden="true">Continued below</div>
        </section>
        ` : ""}

        ${renderImageSpread(supportingImages[0], "Visual Evidence", 0)}

        <section class="case-section case-blueprint reveal" aria-label="Product blueprint">
          <div class="case-section-label">Product Blueprint</div>
          <div class="blueprint-grid">
            <article>
              <h3>Key Features</h3>
              <ul>${study.blueprint.features.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
            </article>
            <article>
              <h3>User Flow</h3>
              <ol>${study.blueprint.flow.map((item) => `<li>${esc(item)}</li>`).join("")}</ol>
            </article>
            <article>
              <h3>System Modules</h3>
              <ul>${study.blueprint.modules.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
            </article>
          </div>
        </section>

        <section class="case-section case-diagram reveal" aria-label="Project diagram">
          <div class="case-section-label">System Diagram</div>
          <div class="diagram-board">
            <div class="diagram-core">
              <span>${esc(study.title)}</span>
              <strong>${esc(study.issue)}</strong>
            </div>
            <div class="diagram-nodes">
              ${diagramNodes.map((node, index) => `
                <div class="diagram-node">
                  <span>${String(index + 1).padStart(2, "0")}</span>
                  <strong>${esc(node)}</strong>
                </div>
              `).join("")}
            </div>
          </div>
        </section>

        <section class="case-section case-anatomy reveal" aria-label="Technical anatomy">
          <div class="case-section-label">Technical Anatomy</div>
          <div class="anatomy-grid">
            ${study.anatomy.map((item, index) => `
              <article>
                <span>${String(index + 1).padStart(2, "0")}</span>
                <h3>${esc(item.title)}</h3>
                <p>${esc(item.body)}</p>
              </article>
            `).join("")}
          </div>
        </section>

        ${renderImageSpread(supportingImages[1], "System Proof", 1)}

        <section class="case-section case-challenges reveal" aria-label="Engineering challenges">
          <div class="case-section-label">The Hard Parts</div>
          <div class="challenge-list">
            ${study.challenges.map((item) => `
              <article>
                <h3>${esc(item.title)}</h3>
                <p><strong>Problem:</strong> ${esc(item.problem)}</p>
                <p><strong>Fix:</strong> ${esc(item.solution)}</p>
                <p><strong>Result:</strong> ${esc(item.result)}</p>
              </article>
            `).join("")}
          </div>
        </section>

        ${renderImageSpread(supportingImages[2], "Field Notes", 2)}
        ${renderImageGrid(supportingImages.slice(3), "More Evidence")}

        <section class="case-section case-impact reveal" aria-label="Proof and impact">
          <div class="case-section-label">Proof / Impact</div>
          <div class="impact-strip">
            ${study.impact.map((item) => `<span>${esc(item)}</span>`).join("")}
          </div>
          ${(() => {
            const numericRe = /\b(\d[\d.,]*(?:\s*[-\u2013\u2014]\s*\d[\d.,]*)?(?:\s*(?:ms|MB|GB|KB|x|×|%|\+))?)\b/i;
            const candidates = study.impact
              .map((item) => {
                const match = String(item).match(numericRe);
                if (!match) return null;
                return {
                  headline: match[1].trim(),
                  label: String(item).replace(match[1], "").trim().replace(/^[-\u2013\u2014\s]+/, "")
                };
              })
              .filter(Boolean)
              .slice(0, 4);
            if (candidates.length < 2) return "";
            return `
              <div class="case-by-the-numbers" aria-label="By the numbers">
                ${candidates.map((c) => `
                  <article>
                    <strong>${esc(c.headline)}</strong>
                    <span>${esc(c.label || "Outcome")}</span>
                  </article>
                `).join("")}
              </div>
            `;
          })()}
        </section>

        <section class="case-section case-closing reveal" aria-label="Closing column">
          <div class="case-section-label">Closing Column</div>
          <div>
            ${study.closing.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
            <div class="sign-off">
              <span>Abhinav Raj</span>
              <a href="${linkedInUrl}" target="_blank" rel="noopener" aria-label="Abhinav Raj on LinkedIn">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.34 8h4.32v14H.34V8Zm7.2 0h4.14v1.91h.06c.58-1.09 1.99-2.24 4.1-2.24 4.38 0 5.19 2.88 5.19 6.63V22h-4.31v-6.82c0-1.63-.03-3.72-2.27-3.72-2.27 0-2.62 1.77-2.62 3.6V22H7.54V8Z"/></svg>
              </a>
              <a href="${githubUrl}" target="_blank" rel="noopener" aria-label="Abhinav Raj on GitHub">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.15c-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18A11 11 0 0 1 12 6.02c.98 0 1.95.13 2.87.39 2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.42.36.79 1.07.79 2.16v3.15c0 .31.21.67.8.56A11.52 11.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
              </a>
            </div>
          </div>
        </section>

        ${(extras.lessons && extras.lessons.length) ? `
        <section class="case-section case-lessons reveal" aria-label="Lessons learned">
          <div class="case-section-label">Lessons Learned</div>
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

        <section class="case-end-card reveal" aria-label="End card">
          <h3>${esc(study.headline)}</h3>
          <div class="end-card-cta">
            <a href="${study.liveUrl}" ${linkAttrs(study.liveUrl)}>Visit ${esc(study.title)}</a>
            ${study.repoUrl ? `<a href="${study.repoUrl}" ${linkAttrs(study.repoUrl)}>Source on GitHub</a>` : ""}
            <a href="../../contact.html">Start a conversation</a>
          </div>
        </section>

        <nav class="case-next reveal" aria-label="Project navigation">
          <a class="hover-cut" href="../${previous.slug}/"><span>Previous: ${esc(previous.title)}</span></a>
          <a class="hover-cut" href="../../work.html"><span>Build Archive</span></a>
          <a class="hover-cut" href="../${next.slug}/"><span>Next: ${esc(next.title)}</span></a>
        </nav>
      </article>
    `;
  }

  function renderNotes() {
    $$("[data-notes-list]").forEach((notes) => {
      notes.innerHTML = "";
      data.notes.forEach((note) => {
        const item = document.createElement("article");
        item.className = "note-row";
        item.innerHTML = `
          <span>${note.number}</span>
          <div>
            <h3>${note.title}</h3>
            <p>${note.body}</p>
          </div>
        `;
        notes.appendChild(item);
      });
    });
  }

  const SOCIAL_ICONS = {
    LinkedIn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.98 3.5a2.5 2.5 0 1 1 .02 5 2.5 2.5 0 0 1-.02-5ZM3 9.75h4v11.25H3V9.75ZM10 9.75h3.83v1.55h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.51 4.78 5.78V21H18.6v-5.07c0-1.21-.02-2.77-1.78-2.77-1.78 0-2.05 1.31-2.05 2.67V21H10V9.75Z"/></svg>',
    GitHub: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1.01.07 1.54 1.04 1.54 1.04.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.6 9.6 0 0 1 12 6.84c.85 0 1.71.11 2.51.34 1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.86v2.76c0 .26.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>',
    Instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="4.4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.65" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16.75" cy="7.25" r="1.15"/></svg>',
    X: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.53 3H20.5l-6.49 7.42L21.5 21h-5.94l-4.66-6.06L5.5 21H2.5l6.95-7.94L2.5 3h6.06l4.21 5.56L17.53 3Zm-1.04 16.2h1.65L7.6 4.7H5.84l10.65 14.5Z"/></svg>'
  };

  function getSocialIcon(label) {
    return SOCIAL_ICONS[label] || `<span aria-hidden="true">${esc(label.slice(0, 1))}</span>`;
  }

  function renderSocials() {
    $$("[data-socials]").forEach((target) => {
      target.innerHTML = "";
      data.socials.forEach((social) => {
        const link = document.createElement("a");
        link.className = "hover-cut";
        link.href = social.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.innerHTML = `<span>${social.label}</span>`;
        target.appendChild(link);
      });
    });

    $$("[data-social-icons]").forEach((target) => {
      target.innerHTML = "";
      target.classList.add("brand-socials");
      data.socials.forEach((social) => {
        const link = document.createElement("a");
        link.className = "brand-social";
        link.href = social.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.setAttribute("aria-label", social.label);
        link.title = social.label;
        link.innerHTML = `${getSocialIcon(social.label)}<span class="brand-social-label">${esc(social.label)}</span>`;
        target.appendChild(link);
      });
    });
  }

  function renderMarquees() {
    const phrases = Array.isArray(data.marquee) && data.marquee.length
      ? data.marquee
      : ["Available for thoughtful product builds and technical collaboration"];
    const sep = '<i aria-hidden="true">&nbsp;&nbsp;✕&nbsp;&nbsp;</i>';
    $$("[data-marquee]").forEach((target) => {
      const renderSet = (linkFirst) => {
        return phrases.map((phrase, i) => {
          const text = String(phrase);
          const email = data.profile.email;
          const tail = i < phrases.length - 1 ? sep : "";
          if (text.includes(email)) {
            const [before, after] = text.split(email);
            return `<span>${esc(before)}<a class="marquee-email" href="mailto:${email}">${esc(email)}</a>${esc(after)}</span>${tail}`;
          }
          if (/\bemail me\b/i.test(text)) {
            const [before, after] = text.split(/\bemail me\b/i);
            return `<span class="marquee-help">${esc(before)}<a class="marquee-email" href="mailto:${email}">Email me</a>${esc(after || "")}</span>${tail}`;
          }
          if (/\bemail\b/i.test(text)) {
            const [before, after] = text.split(/\bemail\b/i);
            return `<span class="marquee-help">${esc(before)}<a class="marquee-email" href="mailto:${email}">email</a>${esc(after || "")}</span>${tail}`;
          }
          return `<span>${esc(text)}</span>${tail}`;
        }).join("");
      };
      target.innerHTML = `
        <div class="marquee-track">
          <div class="marquee-set">${renderSet(true)}</div>
          <div class="marquee-set" aria-hidden="true">${renderSet(false)}</div>
        </div>
      `;
    });
  }

  function setupMenu() {
    const button = $("#menuButton");
    const curtain = $("#menuCurtain");
    if (!button || !curtain) return;

    const masthead = $(".masthead");
    if (masthead && button.parentElement !== masthead) {
      masthead.appendChild(button);
    }

    button.classList.add("menu-toggle");
    button.setAttribute("aria-controls", "menuCurtain");

    const currentPage = document.body.dataset.page;
    const base = getBasePrefix();

    $$(".menu-panel > a").forEach((link) => {
      const href = link.getAttribute("href") || "";
      const route = href.split("/").pop()?.replace(".html", "");
      const isCurrent = route === currentPage;
      link.classList.toggle("is-current", isCurrent);
      if (isCurrent) link.setAttribute("aria-current", "page");
    });

    if (base) {
      $$('a[href]:not([href^="http"]):not([href^="mailto:"]):not([href^="#"])').forEach((link) => {
        const href = link.getAttribute("href");
        if (!href || href.startsWith("../")) return;
        link.setAttribute("href", `${base}${href}`);
      });
    }

    // Tag each menu link with an editorial numeral (01, 02 ...) and a stagger index
    $$(".menu-panel > a").forEach((link, idx) => {
      const n = String(idx + 1).padStart(2, "0");
      link.setAttribute("data-num", n);
      link.style.setProperty("--menu-i", String(idx));
    });

    const closeButton = $(".menu-close", curtain);
    const syncCloseTarget = () => {
      const rect = button.getBoundingClientRect();
      curtain.style.setProperty("--menu-close-x", `${rect.left}px`);
      curtain.style.setProperty("--menu-close-y", `${rect.top}px`);
      curtain.style.setProperty("--menu-close-w", `${rect.width}px`);
      curtain.style.setProperty("--menu-close-h", `${rect.height}px`);
      // Iris reveal origin sits at the centre of the menu button.
      const cx = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
      const cy = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
      curtain.style.setProperty("--menu-iris-x", `${cx.toFixed(2)}%`);
      curtain.style.setProperty("--menu-iris-y", `${cy.toFixed(2)}%`);
    };

    let isOpen = false;
    const setMenu = (open) => {
      if (open) syncCloseTarget();
      isOpen = open;
      curtain.classList.toggle("active", open);
      curtain.classList.toggle("closing", !open);
      curtain.setAttribute("aria-hidden", String(!open));
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      button.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
      button.classList.remove("igniting");
      if (!open) {
        window.setTimeout(() => curtain.classList.remove("closing"), 520);
      }
    };

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
    window.addEventListener("resize", () => {
      if (isOpen) syncCloseTarget();
    }, { passive: true });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen) setMenu(false);
    });
  }

  function setupScrollProgress() {
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = (doc.scrollHeight - doc.clientHeight) || 1;
      const ratio = Math.min(1, Math.max(0, window.scrollY / max));
      bar.style.transform = `scaleX(${ratio})`;
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }

  function setupHeroSplit() {
    const headings = $$(".hero-word h1, .profile-head h1, .page-headline-title");
    headings.forEach((heading) => {
      if (heading.dataset.split === "true" || heading.querySelector("*")) return;
      const text = heading.textContent || "";
      heading.textContent = "";
      heading.dataset.split = "true";
      heading.classList.add("split-title");
      const words = text.split(/(\s+)/);
      let charIndex = 0;
      words.forEach((word) => {
        if (/^\s+$/.test(word)) {
          heading.appendChild(document.createTextNode(word));
          return;
        }
        const wordSpan = document.createElement("span");
        wordSpan.className = "hero-letter-word";
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
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
    const targets = $$("[data-rail-prev], [data-rail-next], .card-visit, .contact-form button[type=submit]");
    targets.forEach((target) => {
      target.addEventListener("pointermove", (event) => {
        const rect = target.getBoundingClientRect();
        const mx = event.clientX - rect.left - rect.width / 2;
        const my = event.clientY - rect.top - rect.height / 2;
        target.style.setProperty("--mx", `${mx * 0.18}px`);
        target.style.setProperty("--my", `${my * 0.22}px`);
      });
      target.addEventListener("pointerleave", () => {
        target.style.setProperty("--mx", `0px`);
        target.style.setProperty("--my", `0px`);
      });
    });
  }

  function setupLiquidButtons() {
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
    const targets = $$([
      ".brand-social",
      ".card-visit",
      ".detail-actions a",
      ".end-card-cta a",
      ".case-study-page .text-link",
      ".contact-send-button",
      ".contact-form button[type='submit']",
      ".drag-arrows button"
    ].join(", "));
    targets.forEach((target) => {
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
    const section = rail.closest(".home-work") || rail;
    const cards = $$(".project-card", rail);
    const stacked = rail.classList.contains("project-rail--stack");
    let activeIndex = 0;

    const scrollToCard = (direction = 1) => {
      if (!cards.length) return;
      activeIndex = (activeIndex + direction + cards.length) % cards.length;
      cards[activeIndex].scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      cards.forEach((card, index) => card.classList.toggle("is-selected", index === activeIndex));
    };

    if (stacked) {
      cards[0]?.classList.add("is-selected");
      $("[data-rail-prev]")?.addEventListener("click", () => scrollToCard(-1));
      $("[data-rail-next]")?.addEventListener("click", () => scrollToCard(1));
      return;
    }

    let isDown = false;
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;
    let activePointerId = null;
    let suppressNextClick = false;
    const DRAG_THRESHOLD = 6;
    let autoTimer = 0;
    let isAutoPaused = false;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let wheelTimer = 0;
    let wheelLocked = false;

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
    };

    const getTargetLeft = (card) => {
      const railRect = rail.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const rawLeft = rail.scrollLeft + cardRect.left - railRect.left - (rail.clientWidth - cardRect.width) / 2;
      const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
      return Math.max(0, Math.min(maxScroll, rawLeft));
    };

    const scrollToIndex = (index, behavior = "smooth") => {
      if (!cards.length) return;
      setActiveCard(index);
      const card = cards[activeIndex];
      const left = getTargetLeft(card);
      rail.classList.add("wheel-scrolling");
      rail.scrollTo({ left, behavior: prefersReducedMotion ? "auto" : behavior });
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        rail.classList.remove("wheel-scrolling");
        wheelLocked = false;
      }, prefersReducedMotion ? 80 : 520);
    };

    const scrollRail = (direction = 1) => {
      if (!cards.length) return;
      setActiveCard(getClosestIndex());
      const nextIndex = Math.max(0, Math.min(cards.length - 1, activeIndex + direction));
      scrollToIndex(nextIndex);
    };

    const stopAuto = () => {
      if (!autoTimer) return;
      window.clearInterval(autoTimer);
      autoTimer = 0;
    };

    const startAuto = () => {
      return;
    };

    const pauseAuto = () => {
      isAutoPaused = true;
      stopAuto();
    };

    const resumeAuto = () => {
      isAutoPaused = false;
    };

    setActiveCard(0);

    rail.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      isDown = true;
      isDragging = false;
      activePointerId = event.pointerId;
      pauseAuto();
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
      if (isDragging) {
        rail.scrollLeft = scrollLeft - delta;
      }
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
        resumeAuto();
      });
    });

    rail.addEventListener("click", (event) => {
      if (suppressNextClick) {
        event.preventDefault();
        event.stopPropagation();
        suppressNextClick = false;
      }
    }, true);

    rail.addEventListener("mouseenter", pauseAuto);
    rail.addEventListener("mouseleave", resumeAuto);
    rail.addEventListener("focusin", pauseAuto);
    rail.addEventListener("focusout", resumeAuto);
    rail.addEventListener("scroll", () => {
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        setActiveCard(getClosestIndex());
        rail.classList.remove("wheel-scrolling");
        wheelLocked = false;
      }, 140);
    }, { passive: true });

    const handleWheel = (event) => {
      if (event.defaultPrevented) return;
      const isHorizontalSwipe = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      const isShiftScroll = event.shiftKey && Math.abs(event.deltaY) > 0;
      const wheelDelta = isHorizontalSwipe || isShiftScroll ? event.deltaX || event.deltaY : event.deltaY;
      if (Math.abs(wheelDelta) < 8) return;
      const direction = wheelDelta > 0 ? 1 : -1;
      const currentIndex = wheelLocked ? activeIndex : getClosestIndex();
      const atStart = currentIndex <= 0 && direction < 0;
      const atEnd = currentIndex >= cards.length - 1 && direction > 0;
      event.preventDefault();
      event.stopPropagation();
      if (atStart || atEnd) {
        rail.classList.remove("wheel-scrolling");
        wheelLocked = false;
        return;
      }
      if (wheelLocked) return;
      wheelLocked = true;
      pauseAuto();
      scrollToIndex(currentIndex + direction);
      resumeAuto();
    };

    rail.addEventListener("wheel", handleWheel, { passive: false, capture: true });

    $("[data-rail-prev]")?.addEventListener("click", () => {
      pauseAuto();
      scrollRail(-1);
      resumeAuto();
    });
    $("[data-rail-next]")?.addEventListener("click", () => {
      pauseAuto();
      scrollRail(1);
      resumeAuto();
    });

    window.addEventListener("resize", () => {
      stopAuto();
      startAuto();
    });
    startAuto();
  }

  function setupReveal() {
    const elements = $$(".reveal");
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
  }

  function setupClock() {
    const clock = $("#clock");
    if (!clock) return;
    if (!clock.nextElementSibling || !clock.nextElementSibling.classList.contains("topline-meta")) {
      const meta = document.createElement("div");
      meta.className = "topline-meta";
      meta.textContent = "Desk / Live";
      clock.insertAdjacentElement("afterend", meta);
    }
    const update = () => {
      const now = new Date();
      const date = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "2-digit",
        month: "short"
      }).format(now);
      const time = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }).format(now);
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.body.classList.add("loaded", "intro-complete");
      intro.remove();
      return;
    }

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
              <span>Vol. 1</span>
              <span>Fresh off the press</span>
              <span>abhnv.in</span>
            </div>
            <div class="intro-stamp">Cleared<br>for print</div>
          </div>
        </div>
        <div class="burn-flames burn-flames--intro" aria-hidden="true"></div>
        <div class="intro-burn-edge">${BURN_EDGE_HTML}</div>
      </div>
    `;
    intro.classList.add("intro--armed", handoff ? "intro--handoff" : "intro--fresh");

    // Timings mirror the Pass 50 CSS keyframes: burn starts at `reveal`,
    // the carrier is fully off-screen by `done`.
    const reveal = handoff ? 300 : 900;
    const done = handoff ? 1420 : 2260;
    window.setTimeout(() => document.body.classList.add("loaded"), reveal);
    window.setTimeout(() => {
      document.body.classList.add("intro-complete");
      intro.remove();
    }, done);
  }

  function setupNavTransitions() {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const target = $(link.getAttribute("href"));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function setupTerminal() {
    const form = $("#terminalForm");
    const input = $("#terminalInput");
    const output = $("#terminalOutput");
    if (!form || !input || !output) return;

    const routes = {
      about: "index.html",
      home: "index.html",
      builds: "work.html",
      work: "work.html",
      projects: "work.html",
      w: "work.html",
      selected: "index.html#selected-work",
      portfolio: "index.html#selected-work",
      credentials: "credentials.html",
      creds: "credentials.html",
      cred: "credentials.html",
      contact: "contact.html",
      c: "contact.html"
    };

    const skillsLines = (() => {
      const groups = Array.isArray(data.skills) ? data.skills : [];
      if (!groups.length) {
        return ["Core stack: HTML, CSS, JavaScript, Cloudflare, APIs, AI workflows."];
      }
      return groups.map((g) => `${g.group}: ${(g.items || []).join(", ")}`);
    })();

    const messages = {
      help: [
        "Available files: about, builds, credentials, contact.",
        "Shortcuts: w opens builds, c opens contact, email opens mail, socials prints links, skills lists the toolbox, clear resets the desk."
      ],
      skills: skillsLines,
      socials: data.socials.map((social) => `${social.label}: ${social.url}`),
      email: [`Opening mail to ${data.profile.email}.`]
    };

    const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let audioContext = null;
    let commandQueue = Promise.resolve();

    const typeTick = () => {
      if (reducedMotion) return;
      try {
        audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === "suspended") audioContext.resume();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "square";
        oscillator.frequency.value = 980 + Math.random() * 260;
        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.022, audioContext.currentTime + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.032);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.036);
      } catch (_) {
        // Audio is a progressive enhancement; typing should still work if blocked.
      }
    };

    const print = async (kind, text, options = {}) => {
      const row = document.createElement("div");
      row.className = `terminal-line terminal-line--${kind}`;
      output.appendChild(row);
      output.scrollTop = output.scrollHeight;
      if (!options.typed || reducedMotion) {
        row.textContent = text;
        return;
      }
      row.classList.add("is-typing");
      const pieces = String(text).match(/\S+\s*/g) || [String(text)];
      for (const piece of pieces) {
        row.textContent += piece;
        output.scrollTop = output.scrollHeight;
        typeTick();
        await sleep(Math.min(95, 34 + piece.length * 5));
      }
      row.classList.remove("is-typing");
    };

    const printMany = async (kind, lines) => {
      for (const line of lines) {
        await print(kind, line, { typed: true });
      }
    };

    const run = async (rawCommand) => {
      const command = rawCommand.trim().toLowerCase();
      if (!command) return;
      await print("input", `abhinav@journal:~$ ${command}`, { typed: true });

      if (command === "clear") {
        output.innerHTML = "";
        await print("system", "Desk cleared. Type help to rebuild the index.", { typed: true });
        return;
      }

      if (messages[command]) {
        await printMany("system", messages[command]);
        if (command === "email") {
          window.setTimeout(() => {
            window.location.href = `mailto:${data.profile.email}`;
          }, 220);
        }
        return;
      }

      if (routes[command]) {
        await print("system", `Opening ${command}.`, { typed: true });
        window.setTimeout(() => {
          const destination = routes[command];
          const hash = destination.includes("#") ? destination.slice(destination.indexOf("#")) : "";
          const localTarget = !getBasePrefix() && hash ? $(hash) : null;
          if (localTarget) {
            localTarget.scrollIntoView({ behavior: "smooth", block: "start" });
          } else {
            window.location.href = withBase(destination);
          }
        }, 220);
        return;
      }

      await print("error", `Command not filed: ${command}. Try help.`, { typed: true });
    };

    output.innerHTML = "";
    commandQueue = commandQueue
      .then(() => print("system", "The Build Journal terminal is live.", { typed: true }))
      .then(() => print("system", "Type help, builds, credentials, contact, email, socials, skills, or clear.", { typed: true }));

    const executeCurrentCommand = () => {
      const command = input.value;
      input.value = "";
      commandQueue = commandQueue.then(() => run(command));
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      executeCurrentCommand();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key.length === 1 || event.key === "Backspace") typeTick();
      if (event.key !== "Enter") return;
      event.preventDefault();
      executeCurrentCommand();
    });

    form.querySelector('button[type="submit"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      executeCurrentCommand();
    });

    $$(".terminal-command-list button").forEach((chip) => {
      chip.addEventListener("click", () => {
        input.value = chip.textContent || "";
        input.focus();
        typeTick();
      });
    });
  }

  function setupContactForm() {
    const form = $("#contactForm");
    if (!form) return;

    const submit = form.querySelector('button[type="submit"]');
    const submitLabel = submit?.querySelector(".contact-send-label");
    const idleLabel = submitLabel?.textContent || submit?.textContent || "Send message";

    let pulseTimer = 0;
    const pulseSubmit = () => {
      if (!submit) return;
      submit.classList.remove("is-pulsing");
      // Force reflow so the animation restarts on each click.
      void submit.offsetWidth;
      submit.classList.add("is-pulsing");
      if (pulseTimer) window.clearTimeout(pulseTimer);
      pulseTimer = window.setTimeout(() => submit.classList.remove("is-pulsing"), 520);
    };

    const writeStatus = (text, state) => {
      const status = $("#contactFormStatus");
      if (!status) return;
      status.textContent = text;
      if (state) {
        status.dataset.state = state;
      } else {
        delete status.dataset.state;
      }
    };

    const writeLabel = (text) => {
      if (submitLabel) {
        submitLabel.textContent = text;
      } else if (submit) {
        submit.textContent = text;
      }
    };

    const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const payload = {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        message: String(formData.get("message") || "").trim(),
        website: String(formData.get("website") || "").trim()
      };

      if (!payload.name || !payload.email || !payload.message) {
        writeStatus("Add your name, email, and message so I can reply.", "error");
        return;
      }
      if (!isEmail(payload.email)) {
        writeStatus("That email address looks off — give it another go.", "error");
        return;
      }

      pulseSubmit();
      writeStatus("Sending through abhnv.in…", "pending");
      if (submit) submit.disabled = true;
      writeLabel("Sending…");

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok === false) {
          const error = result.error || `Message failed (HTTP ${response.status}).`;
          throw new Error(error);
        }
        form.reset();
        writeStatus("Sent — thanks, I will reply within 24 hours.", "success");
        writeLabel("Sent");
        window.setTimeout(() => writeLabel(idleLabel), 3200);
      } catch (error) {
        const message = error?.message ||
          "Message failed. Email me directly at hello@abhnv.in.";
        writeStatus(message, "error");
        writeLabel("Try again");
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  }

  function renderSkills() {
    const grid = $("#skillsGrid");
    if (!grid) return;
    const groups = Array.isArray(data.skills) ? data.skills : [];
    if (!groups.length) return;
    grid.innerHTML = groups.map((group, gi) => {
      const chips = (group.items || []).map((skill, si) =>
        `<li class="skill-chip" style="--chip-delay:${si * 28}ms"><span class="skill-dot" aria-hidden="true"></span>${esc(skill)}</li>`
      ).join("");
      return `
        <article class="skill-group reveal" style="--delay:${gi * 80}ms">
          <header class="skill-group-head">
            <span class="skill-group-num">${String(gi + 1).padStart(2, "0")}</span>
            <h3>${esc(group.group)}</h3>
          </header>
          <ul class="skill-list">${chips}</ul>
        </article>
      `;
    }).join("");
  }

  function setupCountUp() {
    const targets = $$(".certs-stat-num");
    if (!targets.length) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const text = (el.textContent || "0").trim();
        const match = text.match(/^(\d+)(.*)$/);
        if (!match) {
          observer.unobserve(el);
          return;
        }
        const target = parseInt(match[1], 10);
        const suffix = match[2] || "";
        if (!Number.isFinite(target) || target <= 1) {
          observer.unobserve(el);
          return;
        }
        const duration = 1100;
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = `${Math.round(eased * target)}${suffix}`;
          if (t < 1) window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
        observer.unobserve(el);
      });
    }, { threshold: 0.4 });
    targets.forEach((el) => observer.observe(el));
  }

  function renderCertifications() {
    const grid = $("#certsGrid");
    if (!grid) return;
    const list = Array.isArray(data.certifications) ? data.certifications : [];

    const statTotal = $("#certsStatTotal");
    const statIssuers = $("#certsStatIssuers");
    const statTags = $("#certsStatTags");
    const filterRow = $("#certsFilters");
    const emptyEl = $("#certsEmpty");

    if (statTotal) statTotal.textContent = String(list.length);
    if (statIssuers) {
      const set = new Set(list.map((c) => (c.issuer || "").trim()).filter(Boolean));
      statIssuers.textContent = String(set.size);
    }
    const allTags = Array.from(
      new Set(list.flatMap((c) => (c.tags || []).map((t) => String(t).trim()).filter(Boolean)))
    ).sort((a, b) => a.localeCompare(b));
    if (statTags) statTags.textContent = String(allTags.length);

    const sortByTitle = (a, b) =>
      String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" });

    const writeCards = (filterTag) => {
      grid.classList.remove("is-empty");
      grid.innerHTML = "";
      const filtered = filterTag === "All"
        ? list.slice()
        : list.filter((c) => (c.tags || []).map((t) => String(t)).includes(filterTag));
      const visible = filtered.sort(sortByTitle);
      if (!visible.length) {
        if (emptyEl) emptyEl.hidden = false;
        return;
      }
      if (emptyEl) emptyEl.hidden = true;
      visible.forEach((cert, index) => {
        const tags = (cert.tags || []).slice(0, 3);
        const card = document.createElement("a");
        card.className = "cert-card reveal visible";
        card.style.setProperty("--delay", `${index * 24}ms`);
        if (cert.url) {
          card.href = cert.url;
          card.target = "_blank";
          card.rel = "noopener";
        }
        card.innerHTML = `
          <span class="cert-fold" aria-hidden="true"></span>
          <span class="cert-issuer">${esc(cert.issuer || "")}${cert.year ? ` &middot; ${esc(cert.year)}` : ""}</span>
          <h3 class="cert-title">${esc(cert.title || "Untitled credential")}</h3>
          <div class="cert-foot">
            <div class="cert-tags" aria-label="Disciplines">
              ${tags.map((t) => `<span class="cert-tag">${esc(t)}</span>`).join("")}
            </div>
            <span class="cert-verify">${cert.url ? "Verify ↗" : ""}</span>
          </div>
        `;
        grid.appendChild(card);
      });
    };

    if (!list.length) {
      grid.classList.add("is-empty");
      grid.textContent = "Credentials will be reprinted here once links are filed.";
      return;
    }

    if (filterRow) {
      filterRow.innerHTML = "";
      const tagsForFilter = ["All", ...allTags];
      tagsForFilter.forEach((tag, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "certs-filter" + (i === 0 ? " is-active" : "");
        btn.dataset.filter = tag;
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
        btn.textContent = tag;
        btn.addEventListener("click", () => {
          $$(".certs-filter", filterRow).forEach((b) => {
            b.classList.remove("is-active");
            b.setAttribute("aria-selected", "false");
          });
          btn.classList.add("is-active");
          btn.setAttribute("aria-selected", "true");
          writeCards(tag);
        });
        filterRow.appendChild(btn);
      });
    }

    writeCards("All");
  }

  function setupCardTilt() {
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
    const cards = $$(".home-work .project-card, .work-detail-card");
    cards.forEach((card) => {
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

  function setupStaggerObservers() {
    if (!("IntersectionObserver" in window)) return;
    const staggerTargets = [
      ...$$(".thought-list"),
      ...$$(".profile-timeline"),
      ...$$(".footer-socials.brand-socials"),
      ...$$(".home-work")
    ];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible", "visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    staggerTargets.forEach((el) => observer.observe(el));

    // Enhanced reveals: assign varied animation classes to different sections
    const sections = $$(".profile-copy.reveal, .scratch-panel.reveal, .notes-panel.reveal");
    sections.forEach((el, i) => {
      const types = ["reveal", "reveal-slide-left", "reveal-slide-right", "reveal-scale"];
      const type = types[i % types.length];
      if (type !== "reveal") {
        el.classList.remove("reveal");
        el.classList.add(type);
      }
    });

    // Observe the new reveal types
    const enhancedReveals = $$(".reveal-slide-left, .reveal-slide-right, .reveal-scale, .reveal-rotate, .reveal-clip");
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -32px 0px" });
    enhancedReveals.forEach((el) => revealObserver.observe(el));
  }

  function setupPageTransitions() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    const internalLinks = $$('a[href]:not([href^="http"]):not([href^="mailto:"]):not([href^="#"]):not([target="_blank"])');
    internalLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        // Leave new-tab and modified clicks to the browser.
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const href = link.getAttribute("href");
        if (!href || href === "#") return;
        e.preventDefault();
        if (leaving) return;
        leaving = true;
        try { sessionStorage.setItem("bj-handoff", "1"); } catch (_) { /* noop */ }
        if (reducedMotion) {
          window.location.href = href;
          return;
        }
        cover.classList.add("is-covering");
        window.setTimeout(() => {
          window.location.href = href;
        }, 600);
      });
    });

    // Back/forward cache restores the page mid-transition — reset the stage.
    window.addEventListener("pageshow", (event) => {
      if (!event.persisted) return;
      leaving = false;
      cover.classList.remove("is-covering");
      document.body.classList.add("loaded", "intro-complete");
      $(".intro")?.remove();
    });
  }

  renderProjects();
  renderCaseStudy();
  renderNotes();
  renderSocials();
  renderMarquees();
  renderCertifications();
  renderSkills();
  setupMenu();
  setupRail();
  setupReveal();
  setupClock();
  setupIntro();
  setupNavTransitions();
  setupTerminal();
  setupContactForm();
  setupHeroSplit();
  setupMagneticButtons();
  setupLiquidButtons();
  setupCountUp();
  setupCardTilt();
  setupStaggerObservers();
  setupPageTransitions();
})();

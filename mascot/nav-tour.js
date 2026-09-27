/*
  Miko, the journal's guide: the tour, one short script per page.

  Each script shows a few things on its page and ends with T.onward(),
  which takes him (and you) to the next page through the real menu. He
  gets things wrong on purpose now and then: a jump that falls short of
  the menu, a poke that misses the arrow. Scripts skip anything missing.
*/
(function () {
  "use strict";

  const TOURS = {};

  TOURS.index = async (T) => {
    const { N, rig, $ } = T;

    await T.show(".profile-portrait", "This is Abhinav! He hunts security bugs for a living, and builds his own products too.", { face: "happy", side: 1 });

    // The menu is up high. First he tries to climb the page edge for it,
    // slips, lands in a heap, and only then remembers the cape. The gag
    // plays once and always ends on the floor, so he never gets stuck.
    const btn = $("#menuButton");
    if (btn && btn.getBoundingClientRect().bottom > 0) {
      await N.go(N.vw() - 190, N.ground());
      rig.look = { x: btn.getBoundingClientRect().left, y: btn.getBoundingClientRect().top };
      rig.setFace("curious");
      await N.say("See that button up there? Every page lives behind it. Let me just... climb up...", { hold: 1400 });
      N.hush();
      rig.setFace("determined");
      await N.climbFail({ x: N.vw() - Math.max(56, 70 * N.k()) });
      rig.do("rub");
      rig.setFace("embarrassed");
      await N.say("...too high. Nobody saw that, okay?", { hold: 1500 });
      rig.do("think");
      rig.setFace("thinking");
      await N.pause(700);
      rig.emote("idea", 1200);
      rig.setFace("excited");
      await N.say("Oh wait! My cape can fly!", { hold: 1100 });
      N.hush();
      await T.openMenu();
      rig.setFace("happy");
      const panel = $(".menu-panel");
      if (panel) {
        N.pointAt(panel);
        await N.say("Ta-da! Security, Builds, Credentials, API and Contact. It's all in here.", { hold: 2200 });
        N.spotOff();
      }
      await T.closeMenu();
    }

    await T.show(".profile-stats", "Bugcrowd's global Top 50 in June, July AND September. Three times!", { face: "excited", emote: "sparkles", side: 1 });
    // The EXTRA spins in on scroll: roll the press all the way until the
    // sheet lies flat and stamped, and only then point at it.
    const extra = $(".extra-spin");
    if (extra && !extra.classList.contains("is-static")) {
      const travel = extra.offsetHeight - N.vh();
      const top = extra.getBoundingClientRect().top + window.scrollY;
      await N.scrollTo(top + Math.max(0, travel) * 0.72, { fast: true });
      await N.pause(450);
      await T.show(".extra-paper", "Scroll through here and the press prints a special EXTRA edition. Hot off the press!", { face: "smile", scroll: false, side: 1 });
    } else {
      await T.show(".extra-paper", "Scroll through here and the press prints a special EXTRA edition.", { face: "smile", offset: 40 });
    }
    await T.show(".reel-section figure", "This whole film is drawn live, frame by frame. Tap it to pause!", { face: "happy" });

    // The product rail: he misses the arrow the first time.
    const next = $("[data-rail-next]");
    if (next) {
      await N.scrollTo($(".home-work") || next);
      const spot = N.beside(next, 1);
      await N.go(spot.x, spot.y);
      await N.click(next, { miss: true });
      rig.setFace("shocked");
      rig.emote("q", 900);
      await N.say("Huh? I missed?!", { hold: 800 });
      rig.setFace("determined");
      await N.pause(300);
      await N.click(next);
      rig.setFace("happy");
      await N.say("There we go! Five real products, all live. Flip through them.", { hold: 1900 });
    }

    await T.show("#closeTitle", "Building something that has to hold up? Abhinav is the one to write to.", { face: "smile" });
    const go = await N.ask("Want to see the rest of the journal?", ["Yes, take me along!", "I'll explore on my own"], { face: "excited" });
    if (go === 0) await T.onward();
    else if (go === 1) window.MIKO.endTour();
  };

  TOURS.security = async (T) => {
    const { N, rig, $ } = T;
    rig.facing = -1;
    N.place(N.vw() + 70, N.vh() * 0.3);
    rig.do("fly");
    await T.show("#securityTitle", "Welcome to the security desk! This is where the bug hunting happens.", { face: "excited", side: 1 });
    await T.show(".bugcrowd-band h2", "Three months in the global Top 50, after starting in March. Not bad at all!", { face: "happy" });
    const tabs = $("[data-area-tabs]");
    const idor = $("[data-area-tabs] [data-area='idor']") || $("[data-area-tabs] [role=tab]:nth-child(2)");
    if (tabs && idor) {
      await N.scrollTo(tabs, { offset: 120 });
      const spot = N.beside(idor, 1);
      await N.go(spot.x, spot.y);
      await N.click(idor);
      rig.setFace("smile");
      N.pointAt($("[data-area-panel]") || idor);
      await N.say("Nine kinds of bugs he looks for. Pick one and it explains how he tests it safely.", { hold: 2300 });
      N.spotOff();
    }
    await T.show("#methodTitle", "His rules: only his own test accounts, only made-up data, and he always cleans up after.", { face: "proud" });
    await T.show("#reportTitle", "And this is what a report from him looks like. Clear enough to fix fast!", { face: "smile" });
    await T.onward();
  };

  TOURS.work = async (T) => {
    const { N, rig, $ } = T;
    rig.facing = -1;
    N.place(N.vw() + 70, N.vh() * 0.3);
    rig.do("fly");
    await T.show("#workPageTitle", "The builds desk! Five products and three research papers.", { face: "excited", side: 1 });
    const card = $(".work-page-grid .work-detail-card");
    if (card) await T.show(card.querySelector(".pr-poster, img") || card, "Every poster here is drawn live, right in your browser. Watch them move!", { face: "happy", offset: 90 });
    await T.show("#research .research-card", "And the research: voting you can verify, data that's for sale, even the energy cost of attention.", { face: "curious", offset: 80 });
    await T.onward();
  };

  TOURS.credentials = async (T) => {
    const { N, rig } = T;
    rig.facing = -1;
    N.place(N.vw() + 70, N.vh() * 0.3);
    rig.do("fly");
    await T.show("#credentialsPageTitle", "The records office! Everything Abhinav has studied lives here.", { face: "smile", side: 1 });
    await T.show(".skills-page .skill-group", "What he works with, sorted into little luggage tags.", { face: "happy", offset: 110 });
    await T.show("#certificates .cert-card", "And 27 verified certificates. He never stops learning!", { face: "excited", emote: "sparkles", offset: 110 });
    await T.onward();
  };

  TOURS.api = async (T) => {
    const { N, rig, $ } = T;
    rig.facing = -1;
    N.place(N.vw() + 70, N.vh() * 0.3);
    rig.do("fly");
    await T.show("#apiPageTitle", "The wire! Everything on this site is also a free JSON API.", { face: "excited", side: 1 });
    const cmd = $('[data-api-cmd="projects"]');
    if (cmd) {
      await N.scrollTo($("#api-quickstart") || cmd, { offset: 60 });
      const spot = N.beside(cmd, 1);
      await N.go(spot.x, spot.y);
      await N.click(cmd);
      await N.pause(500);
      const out = $(".api-console");
      if (out) N.pointAt(out);
      rig.setFace("happy");
      await N.say("Click a command and the live answer lands right here. Real data!", { hold: 2000 });
      N.spotOff();
    }
    await T.onward();
  };

  TOURS.contact = async (T) => {
    const { N, rig } = T;
    rig.facing = -1;
    N.place(N.vw() + 70, N.vh() * 0.3);
    rig.do("fly");
    await T.show("#contactTitle", "Last stop: the post desk!", { face: "excited", side: 1 });
    await T.show("#contactForm", "Write Abhinav a note right here. He reads everything the day it arrives.", { face: "smile", offset: 100 });
    await T.onward();
  };

  window.NAV_TOURS = TOURS;
})();

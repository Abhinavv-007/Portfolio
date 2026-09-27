/*
  Miko, the portfolio guide: sprite-mounted SVG motion skeleton.

  The original named SVG pieces remain as an invisible geometry rig so the
  stage can keep its motion, targeting and effects. High-fidelity transparent
  sprites provide the visible character. Feet remain at (0, 0).
*/
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const P = {
    line: "#2e241f",
    hair: "#2e241e", hairLit: "#6e4b39", hairWarm: "#4a3028",
    skin: "#f8dcc8", skinShade: "#efbda3",
    cape: "#d75a2e", capeLit: "#ed7540", capeDark: "#9e321b",
    shirt: "#f7f1e8", shirtShade: "#ded4c7",
    shorts: "#7a8f4f", shortsDark: "#536438",
    boot: "#d9a758", bootDark: "#a97531",
    eye: "#fffdf8", pupil: "#2b1a12", pupilGlow: "#d9912d",
    blush: "#f39b92", mouth: "#bd493f", mouthLine: "#7e2d2d", tongue: "#f59493",
    tear: "#80ccef", star: "#ffd569", starLine: "#e39517"
  };
  const BODY_C = [0, -105];
  const MOUTH_Y = -84;

  let uid = 0;
  const el = (tag, attrs = {}, parent) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (parent) parent.appendChild(node);
    return node;
  };
  const g = (parent, attrs) => el("g", attrs, parent);

  function starPath(cx, cy, r, inner = 0.45, rot = -Math.PI / 2) {
    let d = "";
    for (let i = 0; i < 10; i += 1) {
      const angle = rot + (i * Math.PI) / 5;
      const radius = i % 2 ? r * inner : r;
      d += `${i ? "L" : "M"}${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`;
    }
    return `${d}Z`;
  }

  const EYE = {
    happy: "M-11,2 Q0,-8 11,2",
    closed: "M-11,-1 Q0,6 11,-1",
    squeeze: "M-9,-7 L7,0 L-9,7",
    sleepy: "M-11,2 Q0,5 11,2"
  };
  const MOUTH = {
    smile: { d: "M-6,-1 Q0,5 6,-1", fill: false },
    grin: { d: "M-9,-2.5 Q0,-3.5 9,-2.5 Q8,10 0,11 Q-8,10 -9,-2.5Z", fill: true, tongue: [0, 6.8, 4.8, 3] },
    open: { d: "M-6.5,-1.5 Q0,-2.5 6.5,-1.5 Q6,8 0,8.5 Q-6,8 -6.5,-1.5Z", fill: true, tongue: [0, 5.2, 3.5, 2.1] },
    o: { d: "M0,-3.5 C3.6,-3.5 4,5.5 0,5.5 C-4,5.5 -3.6,-3.5 0,-3.5Z", fill: true },
    shock: { d: "M0,-5 C5.4,-5 6,8.5 0,8.5 C-6,8.5 -5.4,-5 0,-5Z", fill: true },
    wobble: { d: "M-7.5,2.5 Q-5,-0.5 -2.2,2.2 Q0.5,4.8 3.2,2.2 Q5.8,-0.5 8,2.5", fill: false },
    cry: { d: "M-10.5,-1.5 Q0,-5.5 10.5,-1.5 Q9.5,12.5 0,13 Q-9.5,12.5 -10.5,-1.5Z", fill: true, tongue: [0, 9, 5.2, 2.8] },
    cat: { d: "M-8,-0.5 Q-4,4.2 0,-0.2 Q4,4.2 8,-0.5", fill: false },
    flat: { d: "M-5,1 Q0,0.4 5,1", fill: false },
    tongue: { d: "M-8,-0.5 Q-4,4.2 0,-0.2 Q4,4.2 8,-0.5", fill: false, tongue: [3.2, 4.4, 3, 3.6] },
    yawn: { d: "M0,-5.5 C5.6,-5.5 6,9.5 0,9.5 C-6,9.5 -5.6,-5.5 0,-5.5Z", fill: true }
  };

  function eye(parent, side, ids) {
    const root = g(parent, { transform: `translate(${side * 23},-112) scale(1.08)` });
    const clipId = `${ids.clip}${side < 0 ? "L" : "R"}`;
    const clip = el("clipPath", { id: clipId }, ids.defs);
    el("ellipse", { cx: 0, cy: 0, rx: 14, ry: 17.5 }, clip);
    const open = g(root);
    el("ellipse", { cx: 0, cy: 0, rx: 14, ry: 17.5, fill: P.eye, stroke: P.line, "stroke-width": 1.4 }, open);
    const inner = g(open, { "clip-path": `url(#${clipId})` });
    el("ellipse", { cx: 0, cy: 12, rx: 14, ry: 7, fill: "#f3dfc8", opacity: 0.75 }, inner);
    const iris = g(inner);
    el("ellipse", { cx: 0, cy: 1.5, rx: 10.3, ry: 13, fill: `url(#${ids.pupil})` }, iris);
    el("ellipse", { cx: 0, cy: 8.5, rx: 6.4, ry: 3.6, fill: P.pupilGlow, opacity: 0.9 }, iris);
    const hi = g(iris);
    el("ellipse", { cx: -3.8, cy: -4.2, rx: 4.8, ry: 5.4, fill: "#fff" }, hi);
    el("circle", { cx: 4.3, cy: 5.6, r: 2.1, fill: "#fff" }, hi);
    el("circle", { cx: -4.6, cy: 7.2, r: 1.1, fill: "#fff", opacity: 0.9 }, hi);
    const sparkle = el("path", { d: starPath(3.2, -2.5, 4.2, 0.34), fill: "#fff", opacity: 0 }, iris);
    const teary = g(inner, { opacity: 0 });
    el("path", { d: "M-14,6 Q0,19 14,6 L14,18 L-14,18Z", fill: P.tear, opacity: 0.58 }, teary);
    el("ellipse", { cx: 5.5, cy: 10, rx: 2.6, ry: 1.5, fill: "#fff" }, teary);
    const lid = el("path", { d: "M-20,-40 L20,-40 L20,-16 L-20,-16Z", fill: P.skin, transform: "translate(0,-12)" }, inner);
    const spiral = el("path", { d: "M0,0 m-1,0 a1,1 0 1,1 2,0 a3,3 0 1,1 -6,0 a5,5 0 1,1 10,0 a7,7 0 1,1 -14,0", fill: "none", stroke: P.hair, "stroke-width": 2.2, opacity: 0 }, root);
    const shut = el("path", { d: EYE.happy, fill: "none", stroke: P.hair, "stroke-width": 3.4, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0, transform: side < 0 ? "scale(-1,1)" : "" }, root);
    return { root, open, iris, hi, sparkle, teary, lid, spiral, shut, side };
  }

  function arm(parent, side) {
    const shoulder = [side * 43, -76];
    const root = g(parent);
    const upper = g(root);
    el("rect", { x: -6.4, y: -3.5, width: 12.8, height: 17, rx: 6.4, fill: P.shirt, stroke: P.line, "stroke-width": 1.4 }, upper);
    el("path", { d: "M-3,-1 L-3,10", stroke: "#fff", "stroke-width": 2, "stroke-linecap": "round", opacity: 0.7 }, upper);
    const fore = g(upper);
    el("rect", { x: -5.2, y: 9, width: 10.4, height: 12, rx: 5.2, fill: P.skin, stroke: P.line, "stroke-width": 1.3 }, fore);
    const hand = g(fore);
    el("circle", { cx: 0, cy: 22, r: 7.8, fill: P.skin, stroke: P.line, "stroke-width": 1.4 }, hand);
    el("circle", { cx: -2.5, cy: 19.4, r: 2.5, fill: "#fff2e7", opacity: 0.9 }, hand);
    const finger = el("rect", { x: -2, y: 24, width: 4, height: 10, rx: 2, fill: P.skin, stroke: P.line, "stroke-width": 1.1, opacity: 0 }, hand);
    return { root, upper, fore, hand, finger, shoulder, elbow: 11, reach: 22 };
  }

  function leg(parent, side) {
    const hip = [side * 18, -28];
    const root = g(parent);
    const inner = g(root, { transform: `translate(${hip[0]},${hip[1]})` });
    el("path", { d: "M-10,-7 Q0,-11 10,-7 L9,7 Q0,11 -9,7Z", fill: P.shorts, stroke: P.line, "stroke-width": 1.5 }, inner);
    el("rect", { x: -5.1, y: 5, width: 10.2, height: 14, rx: 5.1, fill: P.skin, stroke: P.line, "stroke-width": 1.2 }, inner);
    el("path", { d: "M-9,14 C-11,22 -8,27 -1,28 L12,28 C18,28 19,22 15,18 C12,15 7,14 3,14Z", fill: P.boot, stroke: P.line, "stroke-width": 1.6, "stroke-linejoin": "round" }, inner);
    el("path", { d: "M-9,24 Q0,28 16,24", fill: "none", stroke: P.bootDark, "stroke-width": 2, "stroke-linecap": "round" }, inner);
    el("path", { d: "M-4,17 L7,17 M-5,20 L8,20", stroke: "#f2cf86", "stroke-width": 1.4, "stroke-linecap": "round" }, inner);
    return { root, hip };
  }

  function capeWing(parent, side) {
    const root = g(parent);
    const wing = g(root);
    el("path", {
      d: "M0,0 C13,-20 34,-28 49,-22 C43,-13 45,-5 53,3 C39,5 30,13 22,20 C15,13 8,6 0,0Z",
      fill: P.cape, stroke: P.line, "stroke-width": 1.5, "stroke-linejoin": "round",
      transform: side < 0 ? "scale(-1,1)" : ""
    }, wing);
    el("path", { d: "M8,3 Q24,-10 44,-16 M14,10 Q30,2 48,2", fill: "none", stroke: P.capeLit, "stroke-width": 2, "stroke-linecap": "round", opacity: 0.9, transform: side < 0 ? "scale(-1,1)" : "" }, wing);
    el("path", { d: starPath(33, -5, 5.5, 0.44), fill: P.star, transform: side < 0 ? "scale(-1,1)" : "" }, wing);
    return { root, w: wing, pivot: [side * 30, -90], side };
  }

  function create() {
    uid += 1;
    const defs = document.createElementNS(NS, "defs");
    const ids = { defs, pupil: `mikoPupil${uid}`, cape: `mikoCape${uid}`, hair: `mikoHair${uid}`, glow: `mikoGlow${uid}`, clip: `mikoEye${uid}` };
    const svg = el("svg", { viewBox: "-100 -220 200 240", class: "nav-svg", "aria-hidden": "true", focusable: "false" });
    svg.appendChild(defs);

    const pupilGradient = el("linearGradient", { id: ids.pupil, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    [[0, P.pupil], [0.5, "#704116"], [1, P.pupilGlow]].forEach(([offset, color]) => el("stop", { offset, "stop-color": color }, pupilGradient));
    const capeGradient = el("linearGradient", { id: ids.cape, x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
    [[0, P.capeLit], [0.55, P.cape], [1, P.capeDark]].forEach(([offset, color]) => el("stop", { offset, "stop-color": color }, capeGradient));
    const hairGradient = el("linearGradient", { id: ids.hair, x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
    [[0, P.hairLit], [0.45, P.hairWarm], [1, P.hair]].forEach(([offset, color]) => el("stop", { offset, "stop-color": color }, hairGradient));
    const glow = el("radialGradient", { id: ids.glow }, defs);
    el("stop", { offset: 0, "stop-color": "#fff8c9" }, glow);
    el("stop", { offset: 1, "stop-color": P.star, "stop-opacity": 0 }, glow);

    const shadow = el("ellipse", { cx: 0, cy: 3, rx: 38, ry: 6.5, fill: "rgba(64,40,28,0.2)" }, svg);
    const flip = g(svg);
    const body = g(flip);

    const capeBack = g(body);
    el("path", { d: "M-39,-88 C-67,-80 -73,-49 -63,-15 C-51,-25 -42,-19 -29,-8 C-23,-30 -12,-50 0,-65 C12,-50 23,-30 29,-8 C42,-19 51,-25 63,-15 C73,-49 67,-80 39,-88 C23,-99 -23,-99 -39,-88Z", fill: `url(#${ids.cape})`, stroke: P.line, "stroke-width": 1.8, "stroke-linejoin": "round" }, capeBack);
    el("path", { d: "M-57,-24 Q-43,-34 -28,-18 M57,-24 Q43,-34 28,-18", fill: "none", stroke: P.star, "stroke-width": 1.4, "stroke-dasharray": "4 4", "stroke-linecap": "round", opacity: 0.9 }, capeBack);
    el("path", { d: starPath(-49, -43, 5, 0.45), fill: P.star }, capeBack);
    el("path", { d: starPath(49, -43, 5, 0.45), fill: P.star }, capeBack);

    const wingsG = g(body, { opacity: 0 });
    const wings = [capeWing(wingsG, -1), capeWing(wingsG, 1)];
    const armB = arm(body, -1);
    const legB = leg(body, -1);
    const legF = leg(body, 1);

    const blob = g(body);
    el("path", { d: "M-38,-84 Q-31,-96 0,-96 Q31,-96 38,-84 L35,-48 Q24,-39 0,-40 Q-24,-39 -35,-48Z", fill: P.shirt, stroke: P.line, "stroke-width": 1.8, "stroke-linejoin": "round" }, blob);
    el("path", { d: "M-30,-52 Q0,-44 30,-52 L28,-35 Q0,-27 -28,-35Z", fill: P.shorts, stroke: P.line, "stroke-width": 1.5 }, blob);
    el("path", { d: "M-29,-50 Q0,-44 29,-50", fill: "none", stroke: P.shortsDark, "stroke-width": 3, "stroke-linecap": "round" }, blob);
    el("path", { d: "M-28,-84 Q0,-74 28,-84", fill: "none", stroke: P.shirtShade, "stroke-width": 2, "stroke-linecap": "round" }, blob);

    const scarf = g(body);
    el("path", { d: "M-41,-86 Q0,-104 41,-86 Q34,-72 0,-75 Q-34,-72 -41,-86Z", fill: P.cape, stroke: P.line, "stroke-width": 1.7 }, scarf);
    el("path", { d: "M24,-81 C42,-78 51,-68 55,-54 C43,-58 35,-54 28,-47 C28,-59 25,-70 24,-81Z", fill: P.capeLit, stroke: P.line, "stroke-width": 1.5 }, scarf);

    const head = g(body);
    el("ellipse", { cx: -54, cy: -111, rx: 10, ry: 15, fill: P.skin, stroke: P.line, "stroke-width": 1.5 }, head);
    el("ellipse", { cx: 54, cy: -111, rx: 10, ry: 15, fill: P.skin, stroke: P.line, "stroke-width": 1.5 }, head);
    el("ellipse", { cx: 0, cy: -112, rx: 56, ry: 52, fill: P.skin, stroke: P.line, "stroke-width": 2 }, head);
    el("path", { d: "M-48,-99 Q-57,-82 -42,-75 M48,-99 Q57,-82 42,-75", fill: "none", stroke: P.skinShade, "stroke-width": 2, "stroke-linecap": "round", opacity: 0.7 }, head);

    const face = g(head);
    const blush = g(face, { opacity: 0.6 });
    el("ellipse", { cx: -42, cy: -91, rx: 9.5, ry: 5, fill: P.blush }, blush);
    el("ellipse", { cx: 42, cy: -91, rx: 9.5, ry: 5, fill: P.blush }, blush);
    const blushLines = g(face, { opacity: 0, stroke: "#d97978", "stroke-width": 1.3, "stroke-linecap": "round" });
    [-46, -42, -38, 38, 42, 46].forEach((x) => el("path", { d: `M${x + 1.5},-95 L${x - 1.5},-88` }, blushLines));
    const eyes = [eye(face, -1, ids), eye(face, 1, ids)];
    const mouthG = g(face, { transform: `translate(0,${MOUTH_Y})` });
    const mouth = el("path", { d: MOUTH.smile.d, fill: "none", stroke: P.mouthLine, "stroke-width": 2.4, "stroke-linecap": "round", "stroke-linejoin": "round" }, mouthG);
    const tongue = el("ellipse", { cx: 0, cy: 6, rx: 4, ry: 2.5, fill: P.tongue, opacity: 0 }, mouthG);
    const bubbleSleep = el("circle", { cx: 13, cy: MOUTH_Y - 2, r: 0, fill: "rgba(170,220,255,.45)", stroke: "rgba(255,255,255,.9)", "stroke-width": 1.2 }, face);
    const tears = g(face, { opacity: 0 });
    const tearStreams = [-1, 1].map((side) => el("path", { d: `M${side * 20},-99 Q${side * 28},-78 ${side * 34},-57`, fill: "none", stroke: P.tear, "stroke-width": 5.5, "stroke-linecap": "round", opacity: 0.9, "stroke-dasharray": "7 5" }, tears));
    const tearDrops = [0, 1, 2, 3].map(() => el("path", { d: "M0,-4 Q3,0 0,3 Q-3,0 0,-4Z", fill: P.tear, stroke: "#4ba6d1", "stroke-width": 0.8, opacity: 0 }, face));
    const sweat = el("path", { d: "M50,-153 Q58,-139 53,-133 Q46,-131 45,-139 Q45,-145 50,-153Z", fill: P.tear, stroke: "#4ba6d1", "stroke-width": 1.2, opacity: 0 }, head);

    // Hair is the spring-loaded part of the rig: the long curl and bangs bounce on landings.
    const hat = g(head);
    el("path", { d: "M-55,-126 C-61,-158 -37,-179 -5,-176 C24,-184 54,-163 57,-132 C48,-146 38,-150 27,-152 C18,-138 4,-130 -12,-125 C-27,-121 -43,-121 -55,-126Z", fill: `url(#${ids.hair})`, stroke: P.line, "stroke-width": 2, "stroke-linejoin": "round" }, hat);
    el("path", { d: "M-45,-142 C-59,-139 -65,-126 -63,-112 C-53,-119 -47,-126 -45,-142Z M46,-145 C60,-138 64,-124 60,-109 C51,-119 47,-130 46,-145Z", fill: P.hair, stroke: P.line, "stroke-width": 1.5 }, hat);
    el("path", { d: "M-40,-151 Q-22,-177 4,-170 Q-10,-158 -17,-139 Q2,-160 28,-158 Q17,-143 3,-132 Q24,-147 43,-137 Q25,-119 5,-112 Q-10,-124 -20,-120 Q-29,-125 -40,-151Z", fill: `url(#${ids.hair})`, stroke: P.line, "stroke-width": 1.6, "stroke-linejoin": "round" }, hat);
    el("path", { d: "M-23,-156 Q-12,-166 1,-166 M9,-165 Q24,-164 34,-151", fill: "none", stroke: P.hairLit, "stroke-width": 3, "stroke-linecap": "round", opacity: 0.8 }, hat);
    el("path", { d: "M2,-172 C-6,-192 5,-207 19,-198 C29,-190 18,-179 10,-186 C1,-194 17,-212 34,-205", fill: "none", stroke: P.hair, "stroke-width": 8, "stroke-linecap": "round", "stroke-linejoin": "round" }, hat);
    el("path", { d: "M2,-172 C-5,-190 5,-202 17,-196", fill: "none", stroke: P.hairLit, "stroke-width": 2.2, "stroke-linecap": "round", opacity: 0.8 }, hat);
    el("path", { d: starPath(42, -143, 6, 0.43), fill: P.cape, stroke: P.capeDark, "stroke-width": 1 }, hat);

    const armF = arm(body, 1);

    // The articulated vector underneath remains as the motion skeleton, but the
    // visible character is a high-fidelity transparent sprite. Keeping the
    // skeleton lets the existing interaction engine retain its squash, tilt,
    // facing, shadow, hit target, emotes and screen-space hand calculations.
    Array.from(body.children).forEach((part) => part.setAttribute("display", "none"));
    const sprite = el("image", {
      x: -100,
      y: -220,
      width: 200,
      height: 240,
      href: "/mascot/assets/miko/idle.webp?v=63",
      preserveAspectRatio: "xMidYMid meet",
      class: "miko-sprite"
    }, body);

    const fx = g(svg);
    const txt = (x, y, size, fill, extra = {}) => el("text", Object.assign({ x, y, "font-size": size, "font-weight": 700, fill, stroke: "#fff", "stroke-width": 3, "paint-order": "stroke", "font-family": "Georgia, serif", opacity: 0 }, extra), fx);
    const emote = {
      q: txt(50, -174, 34, P.cape),
      bang: txt(50, -174, 36, P.cape, { "font-weight": 900 }),
      zzz: txt(50, -167, 20, "#5d8ec9", { "stroke-width": 2.5 }),
      anger: el("path", { d: "M52,-182 q6,6 0,12 M58,-176 q6,-6 12,0 M64,-170 q-6,-6 0,-12 M58,-164 q-6,6 -12,0", fill: "none", stroke: "#e0453a", "stroke-width": 3.2, "stroke-linecap": "round", opacity: 0 }, fx),
      heart: el("path", { d: "M56,-176 c-4,-6 -12,-2 -9,4 c2,4 9,8 9,8 c0,0 7,-4 9,-8 c3,-6 -5,-10 -9,-4z", fill: "#f06b7d", stroke: "#fff", "stroke-width": 1.6, opacity: 0 }, fx),
      note: txt(50, -174, 28, P.cape, { "stroke-width": 2.5, "font-weight": 400 }),
      idea: g(fx, { opacity: 0 }),
      sparkles: g(fx, { opacity: 0 }),
      dizzy: g(fx, { opacity: 0 })
    };
    emote.q.textContent = "?";
    emote.bang.textContent = "!";
    emote.zzz.textContent = "z Z";
    emote.note.textContent = "♪";
    el("circle", { cx: 0, cy: -207, r: 13, fill: `url(#${ids.glow})` }, emote.idea);
    el("path", { d: starPath(0, -207, 8, 0.45), fill: P.star, stroke: P.starLine, "stroke-width": 1 }, emote.idea);
    [[-72, -142, 7], [67, -158, 9], [76, -80, 5.5], [-74, -75, 6]].forEach(([x, y, radius]) => el("path", { d: starPath(x, y, radius, 0.3), fill: P.star, stroke: P.starLine, "stroke-width": 0.8 }, emote.sparkles));
    const dizzyStars = [0, 1, 2].map(() => el("path", { d: starPath(0, 0, 6.5, 0.45), fill: P.star, stroke: P.starLine, "stroke-width": 1 }, emote.dizzy));

    const glowStar = g(armF.hand, { opacity: 0 });
    el("circle", { cx: 0, cy: 28, r: 25, fill: `url(#${ids.glow})` }, glowStar);
    el("path", { d: starPath(0, 28, 14, 0.46), fill: P.star, stroke: P.starLine, "stroke-width": 1.6, "stroke-linejoin": "round" }, glowStar);

    return {
      svg, shadow, flip, body, sprite, blob, head, face, hat, eyes, blush, blushLines, sweat,
      mouth, tongue, tears, tearStreams, tearDrops, bubbleSleep, armB, armF, legB, legF, wingsG, wings, glowStar,
      emote, dizzyStars, EYE, MOUTH, MOUTH_Y, starPath, palette: P,
      view: { x: -100, y: -220, w: 200, h: 240 }, center: BODY_C, hatPivot: [0, -160], top: -210
    };
  }

  window.NavBody = { create };
})();

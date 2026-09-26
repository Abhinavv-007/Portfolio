/*
  Motion posters: every product and paper image on the site, redrawn as a
  living paper-cut poster.

  Loaded right after app.js, so the <img> tags it rendered are swapped
  before the browser fetches them. Each image keeps its place, size and alt
  text; a transparent stand-in holds the layout and a canvas is laid over
  it. Posters only draw while they are on screen, and drift with the pointer.
*/
(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.createElement("canvas").getContext) return;

  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(",")})`; };
  const PAPER = "#efe6d6", INK = "#171612", WHITE = "#fbf6ec";
  const disp = (s, w = 900) => `${w} ${Math.max(1, s).toFixed(1)}px "Playfair Display", Georgia, serif`;
  const mono = (s, w = 700) => `${w} ${Math.max(1, s).toFixed(1)}px "Courier New", Courier, monospace`;

  /* ---------------------------------------------------------------- */
  /* Catalogue: which image becomes which poster                       */
  /* ---------------------------------------------------------------- */

  const ACCENT = {
    clex: "#d15a35", "clex-ai": "#2f5670", driped: "#4f6b3c", trgt: "#c0321f", "modih-mail": "#8a5a2b",
    "data-for-sale": "#6d3b56", "hidden-watts": "#b37a12", "glass-ballot": "#2f6468"
  };
  const NAME = { clex: "Clex", "clex-ai": "Clex AI", driped: "Driped", trgt: "trgt", "modih-mail": "Modih Mail", "data-for-sale": "Data for Sale", "hidden-watts": "Hidden Watts", "glass-ballot": "Glass Ballot" };
  const DOMAIN = { clex: "clex.in", "clex-ai": "ai.clex.in", driped: "driped.in", trgt: "trgt.in", "modih-mail": "modih.in", "data-for-sale": "research · paper 01", "hidden-watts": "research · paper 02", "glass-ballot": "research · paper 03" };

  const CASE = {
    "clex/workspace": ["The workspace", "sheets"], "clex/chain": ["The chain", "chain"], "clex/vault": ["The vault", "vault"], "clex/share-anywhere": ["Share anywhere", "planes"],
    "clex-ai/overview": ["Overview", "hub"], "clex-ai/routing-layer": ["Routing layer", "routes"], "clex-ai/api-playground": ["Playground", "terminal"], "clex-ai/model-catalog": ["Model catalog", "cards"],
    "driped/dashboard": ["Dashboard", "gauges"], "driped/receipt-pipeline": ["Receipt pipeline", "conveyor"], "driped/mobile-command": ["On the phone", "phone"], "driped/analytics-forecast": ["Forecast", "bars"],
    "trgt/f1-intelligence": ["Race intel", "lights"], "trgt/grid-report": ["Grid report", "grid"], "trgt/predict-race": ["Predict", "podium"], "trgt/circuit-intelligence": ["Circuits", "circuit"],
    "modih-mail/temporary-inbox": ["Temp inbox", "timer"], "modih-mail/mail-routing": ["Mail routing", "mailroutes"], "modih-mail/otp-inbox": ["OTP inbox", "otp"], "modih-mail/developer-mailroom": ["Dev mailroom", "brackets"]
  };
  const PRODUCT_MOTIF = { clex: "planes", "clex-ai": "hub", driped: "drops", trgt: "lights", "modih-mail": "envelope", "data-for-sale": "tag", "hidden-watts": "bolt", "glass-ballot": "ballot" };
  const FILE_SLUG = { clex: "clex", "clex-ai": "clex-ai", driped: "driped", trgt: "trgt", modih: "modih-mail", "data-for-sale": "data-for-sale", "hidden-watts": "hidden-watts", "glass-ballot": "glass-ballot" };

  function specFor(src) {
    let m = src.match(/assets\/case-studies\/([a-z-]+)\/([a-z0-9-]+)\./);
    if (m) {
      const key = `${m[1]}/${m[2]}`;
      const c = CASE[key];
      if (!c) return null;
      return { slug: m[1], title: c[0], motif: c[1], kicker: `${NAME[m[1]]} · fig`, ratio: [4, 3] };
    }
    m = src.match(/assets\/projects\/(?:short|detailed)\/([a-z-]+)\./);
    if (m) {
      const slug = FILE_SLUG[m[1]];
      if (!slug) return null;
      return { slug, title: NAME[slug], motif: PRODUCT_MOTIF[slug], kicker: DOMAIN[slug], ratio: [1, 1] };
    }
    return null;
  }

  /* ---------------------------------------------------------------- */
  /* Shared drawing                                                    */
  /* ---------------------------------------------------------------- */

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  function shadowed(ctx, path, fill, dx, dy) {
    ctx.save();
    ctx.translate(dx, dy);
    path();
    ctx.fillStyle = "rgba(20, 16, 12, 0.22)";
    ctx.fill();
    ctx.restore();
    path();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function hills(ctx, w, h, t, accent, px) {
    const tones = [mix(accent, INK, 0.55), mix(accent, INK, 0.2), accent, mix(accent, PAPER, 0.45)];
    tones.forEach((tone, i) => {
      const base = h * (0.66 + i * 0.085);
      const amp = h * (0.05 - i * 0.006);
      const freq = 1.6 + i * 0.7;
      const drift = t * (0.12 + i * 0.05) * (i % 2 ? -1 : 1) + px * (i + 1) * 0.25;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(-10, h + 10);
        for (let x = -10; x <= w + 10; x += w / 40) {
          const y = base + Math.sin((x / w) * freq * TAU + drift + i) * amp + Math.sin((x / w) * freq * 2.7 * TAU - drift * 1.3) * amp * 0.35;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w + 10, h + 10);
        ctx.closePath();
      };
      shadowed(ctx, path, tone, 0, -h * 0.012);
    });
  }

  function sticker(ctx, str, x, y, size, color, align = "left") {
    ctx.save();
    ctx.font = disp(size);
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.fillStyle = "rgba(20, 16, 12, 0.22)";
    ctx.fillText(str, x + size * 0.05, y + size * 0.07);
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = size * 0.14;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  function envelope(ctx, x, y, s, fill, line) {
    rr(ctx, x - s / 2, y - s * 0.32, s, s * 0.64, s * 0.05);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = line;
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.44, y - s * 0.26);
    ctx.lineTo(x, y + s * 0.06);
    ctx.lineTo(x + s * 0.44, y - s * 0.26);
    ctx.stroke();
  }

  function plane(ctx, x, y, s, ang, fill) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.7, -s * 0.55);
    ctx.lineTo(-s * 0.35, 0);
    ctx.lineTo(-s * 0.7, s * 0.55);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "rgba(20,16,12,0.35)";
    ctx.lineWidth = s * 0.06;
    ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.35, 0); ctx.stroke();
    ctx.restore();
  }

  /* ---------------------------------------------------------------- */
  /* Motifs: drawn inside the cut-out disc (cx, cy, R)                 */
  /* ---------------------------------------------------------------- */

  const M = {
    planes(ctx, cx, cy, R, t, a) {
      ctx.setLineDash([R * 0.05, R * 0.06]);
      ctx.strokeStyle = "rgba(251,246,236,0.5)";
      ctx.lineWidth = R * 0.02;
      ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.62, R * 0.36, -0.3, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 3; i += 1) {
        const ang = t * 0.9 + (i * TAU) / 3;
        const x = cx + Math.cos(ang) * R * 0.62 * Math.cos(-0.3) - Math.sin(ang) * R * 0.36 * Math.sin(-0.3);
        const y = cy + Math.cos(ang) * R * 0.62 * Math.sin(-0.3) + Math.sin(ang) * R * 0.36 * Math.cos(-0.3);
        plane(ctx, x, y, R * 0.13, ang + Math.PI / 2 - 0.3, WHITE);
      }
    },
    sheets(ctx, cx, cy, R, t, a) {
      for (let i = 3; i >= 0; i -= 1) {
        const o = Math.sin(t * 1.4 + i) * R * 0.08;
        const path = () => rr(ctx, cx - R * 0.32 + i * R * 0.06 + o, cy - R * 0.42 + i * R * 0.07, R * 0.56, R * 0.7, R * 0.03);
        shadowed(ctx, path, i === 0 ? WHITE : mix(PAPER, a, 0.15 * i), R * 0.02, R * 0.03);
      }
      ctx.fillStyle = a;
      for (let k = 0; k < 4; k += 1) ctx.fillRect(cx - R * 0.2 + Math.sin(t) * R * 0.08, cy - R * 0.22 + k * R * 0.12, R * (0.36 - k * 0.05), R * 0.04);
    },
    chain(ctx, cx, cy, R, t, a) {
      const n = 4;
      const off = (t * R * 0.2) % (R * 0.46);
      ctx.font = mono(R * 0.09);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = -1; i < n + 1; i += 1) {
        const x = cx - R * 0.9 + i * R * 0.46 + off;
        const path = () => rr(ctx, x - R * 0.2, cy - R * 0.14, R * 0.4, R * 0.28, R * 0.08);
        shadowed(ctx, path, i % 2 ? WHITE : mix(PAPER, a, 0.25), R * 0.02, R * 0.03);
        ctx.fillStyle = a;
        ctx.fillText(["#a3f9", "#07c1", "#e41b", "#5d20", "#9b0e", "#44af"][(i + 6) % 6], x, cy);
        ctx.strokeStyle = WHITE;
        ctx.lineWidth = R * 0.03;
        ctx.beginPath(); ctx.moveTo(x + R * 0.2, cy); ctx.lineTo(x + R * 0.26, cy); ctx.stroke();
      }
    },
    vault(ctx, cx, cy, R, t, a) {
      const path = () => rr(ctx, cx - R * 0.42, cy - R * 0.2, R * 0.84, R * 0.62, R * 0.08);
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = R * 0.1;
      ctx.beginPath(); ctx.arc(cx, cy - R * 0.2, R * 0.28, Math.PI, 0); ctx.stroke();
      shadowed(ctx, path, WHITE, R * 0.02, R * 0.04);
      ctx.save();
      ctx.translate(cx, cy + R * 0.1);
      ctx.rotate(Math.sin(t * 0.8) * 2.2);
      ctx.fillStyle = a;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.18, 0, TAU); ctx.fill();
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = R * 0.015;
      for (let i = 0; i < 12; i += 1) {
        const g = (i / 12) * TAU;
        ctx.beginPath(); ctx.moveTo(Math.cos(g) * R * 0.12, Math.sin(g) * R * 0.12); ctx.lineTo(Math.cos(g) * R * 0.16, Math.sin(g) * R * 0.16); ctx.stroke();
      }
      ctx.restore();
    },
    hub(ctx, cx, cy, R, t, a) {
      for (let i = 0; i < 5; i += 1) {
        const ang = t * (0.5 + i * 0.12) + i * 1.3;
        const rr2 = R * (0.38 + (i % 2) * 0.2);
        const x = cx + Math.cos(ang) * rr2, y = cy + Math.sin(ang) * rr2 * 0.8;
        ctx.strokeStyle = `rgba(251,246,236,${0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 3 + i))})`;
        ctx.lineWidth = R * 0.02;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
        shadowed(ctx, () => { ctx.beginPath(); ctx.arc(x, y, R * 0.08, 0, TAU); }, WHITE, R * 0.015, R * 0.02);
      }
      shadowed(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy, R * 0.2, 0, TAU); }, WHITE, R * 0.02, R * 0.03);
      ctx.fillStyle = a;
      ctx.font = disp(R * 0.12);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("AI", cx, cy + R * 0.01);
    },
    routes(ctx, cx, cy, R, t, a) {
      const sx = cx - R * 0.7;
      const pick = Math.floor(t / 1.2) % 5;
      for (let i = 0; i < 5; i += 1) {
        const ey = cy + (i - 2) * R * 0.22;
        ctx.strokeStyle = i === pick ? WHITE : "rgba(251,246,236,0.3)";
        ctx.lineWidth = R * (i === pick ? 0.04 : 0.02);
        ctx.beginPath(); ctx.moveTo(sx, cy); ctx.bezierCurveTo(cx - R * 0.1, cy, cx - R * 0.1, ey, cx + R * 0.6, ey); ctx.stroke();
        ctx.fillStyle = i === pick ? WHITE : "rgba(251,246,236,0.4)";
        ctx.beginPath(); ctx.arc(cx + R * 0.62, ey, R * 0.05, 0, TAU); ctx.fill();
      }
      const p = (t % 1.2) / 1.2;
      const ey = cy + (pick - 2) * R * 0.22;
      const u = 1 - p;
      const x = u * u * u * sx + 3 * u * u * p * (cx - R * 0.1) + 3 * u * p * p * (cx - R * 0.1) + p * p * p * (cx + R * 0.6);
      const y = u * u * u * cy + 3 * u * u * p * cy + 3 * u * p * p * ey + p * p * p * ey;
      ctx.fillStyle = a === INK ? WHITE : mix(a, PAPER, 0.7);
      ctx.beginPath(); ctx.arc(x, y, R * 0.06, 0, TAU); ctx.fill();
    },
    terminal(ctx, cx, cy, R, t, a) {
      const path = () => rr(ctx, cx - R * 0.55, cy - R * 0.38, R * 1.1, R * 0.76, R * 0.06);
      shadowed(ctx, path, "#1c1a16", R * 0.02, R * 0.04);
      ["#d15a35", "#e3b341", "#7c9a6a"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx - R * 0.46 + i * R * 0.07, cy - R * 0.3, R * 0.025, 0, TAU); ctx.fill(); });
      const lines = [0.8, 0.55, 0.7, 0.4];
      const cyc = (t % 4) / 4;
      lines.forEach((len, i) => {
        const shown = clamp(cyc * 5 - i);
        ctx.fillStyle = i % 2 ? "rgba(251,246,236,0.55)" : WHITE;
        ctx.fillRect(cx - R * 0.46, cy - R * 0.16 + i * R * 0.13, R * 0.9 * len * shown, R * 0.05);
      });
      if (Math.floor(t * 2) % 2) { ctx.fillStyle = "#d15a35"; ctx.fillRect(cx - R * 0.46, cy + R * 0.38 - R * 0.14, R * 0.05, R * 0.07); }
    },
    cards(ctx, cx, cy, R, t, a) {
      for (let i = 0; i < 9; i += 1) {
        const gx = i % 3, gy = Math.floor(i / 3);
        const x = cx + (gx - 1) * R * 0.34, y = cy + (gy - 1) * R * 0.34;
        const flip = Math.cos(clamp(((t * 1.4 - i * 0.25) % 4) - 0.5) * Math.PI);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(Math.abs(flip) || 0.02, 1);
        rr(ctx, -R * 0.13, -R * 0.13, R * 0.26, R * 0.26, R * 0.03);
        ctx.fillStyle = flip > 0 ? WHITE : mix(a, PAPER, 0.4);
        ctx.fill();
        ctx.restore();
      }
    },
    drops(ctx, cx, cy, R, t, a) {
      for (let i = 0; i < 3; i += 1) {
        const p = ((t * 0.8 + i / 3) % 1);
        const x = cx + (i - 1) * R * 0.35;
        const y = lerp(cy - R * 0.7, cy + R * 0.25, p * p);
        ctx.fillStyle = WHITE;
        ctx.beginPath();
        ctx.moveTo(x, y - R * 0.12);
        ctx.bezierCurveTo(x + R * 0.08, y, x + R * 0.08, y + R * 0.08, x, y + R * 0.08);
        ctx.bezierCurveTo(x - R * 0.08, y + R * 0.08, x - R * 0.08, y, x, y - R * 0.12);
        ctx.fill();
        const rp = ((t * 0.8 + i / 3 + 0.02) % 1);
        ctx.strokeStyle = `rgba(251,246,236,${1 - rp})`;
        ctx.lineWidth = R * 0.02;
        ctx.beginPath(); ctx.ellipse(x, cy + R * 0.38, R * 0.3 * rp, R * 0.08 * rp, 0, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = "rgba(251,246,236,0.22)";
      ctx.fillRect(cx - R, cy + R * 0.38, R * 2, R);
    },
    conveyor(ctx, cx, cy, R, t, a) {
      ctx.fillStyle = "#1c1a16";
      ctx.fillRect(cx - R, cy + R * 0.22, R * 2, R * 0.08);
      for (let i = 0; i < 4; i += 1) {
        const x = cx - R + (((t * R * 0.35) + i * R * 0.55) % (R * 2.2)) - R * 0.1;
        const path = () => {
          ctx.beginPath();
          ctx.moveTo(x - R * 0.14, cy - R * 0.3);
          ctx.lineTo(x + R * 0.14, cy - R * 0.3);
          ctx.lineTo(x + R * 0.14, cy + R * 0.18);
          for (let k = 0; k <= 6; k += 1) ctx.lineTo(x + R * 0.14 - (k * R * 0.28) / 6, cy + R * 0.18 + (k % 2 ? R * 0.03 : 0));
          ctx.closePath();
        };
        shadowed(ctx, path, WHITE, R * 0.015, R * 0.02);
        ctx.fillStyle = a;
        for (let k = 0; k < 3; k += 1) ctx.fillRect(x - R * 0.09, cy - R * 0.2 + k * R * 0.1, R * 0.18 - k * R * 0.04, R * 0.03);
      }
      const bx = cx + Math.sin(t * 2) * R * 0.05;
      ctx.fillStyle = "rgba(255,120,80,0.8)";
      ctx.fillRect(bx - R * 0.01, cy - R * 0.5, R * 0.02, R * 0.72);
    },
    phone(ctx, cx, cy, R, t, a) {
      const path = () => rr(ctx, cx - R * 0.3, cy - R * 0.55, R * 0.6, R * 1.1, R * 0.08);
      shadowed(ctx, path, "#1c1a16", R * 0.02, R * 0.04);
      for (let i = 0; i < 5; i += 1) {
        const y = cy - R * 0.38 + i * R * 0.17;
        const on = (Math.floor(t * 1.2) % 5) === i;
        rr(ctx, cx - R * 0.22, y, R * 0.44, R * 0.12, R * 0.02);
        ctx.fillStyle = on ? a : WHITE;
        ctx.fill();
      }
    },
    bars(ctx, cx, cy, R, t, a) {
      const n = 6;
      for (let i = 0; i < n; i += 1) {
        const hgt = R * (0.2 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.2 + i * 0.8))) * clamp(t * 0.8 - i * 0.1 + 0.2);
        shadowed(ctx, () => rr(ctx, cx - R * 0.55 + i * R * 0.19, cy + R * 0.4 - hgt, R * 0.13, hgt, R * 0.02), WHITE, R * 0.015, R * 0.02);
      }
      ctx.setLineDash([R * 0.05, R * 0.04]);
      ctx.strokeStyle = mix(a, PAPER, 0.75);
      ctx.lineWidth = R * 0.03;
      ctx.beginPath();
      for (let i = 0; i <= 10; i += 1) {
        const x = cx - R * 0.55 + (i / 10) * R * 1.1;
        const y = cy + R * 0.1 - (i / 10) * R * 0.45 + Math.sin(t + i) * R * 0.03;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    },
    gauges(ctx, cx, cy, R, t, a) {
      [-1, 0, 1].forEach((k, i) => {
        const x = cx + k * R * 0.4, y = cy + (i === 1 ? -R * 0.1 : R * 0.12), r = R * (i === 1 ? 0.24 : 0.17);
        ctx.strokeStyle = "rgba(251,246,236,0.25)";
        ctx.lineWidth = r * 0.3;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = WHITE;
        ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * (0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.9 + i * 2)))); ctx.stroke();
      });
    },
    lights(ctx, cx, cy, R, t, a) {
      const cyc = t % 4.2;
      const out = cyc > 3.2;
      shadowed(ctx, () => rr(ctx, cx - R * 0.66, cy - R * 0.2, R * 1.32, R * 0.4, R * 0.06), "#1c1a16", R * 0.02, R * 0.03);
      for (let i = 0; i < 5; i += 1) {
        const lit = !out && cyc > 0.4 + i * 0.5;
        ctx.fillStyle = lit ? "#ff3b24" : "#3a342c";
        ctx.beginPath(); ctx.arc(cx - R * 0.52 + i * R * 0.26, cy, R * 0.09, 0, TAU); ctx.fill();
      }
      for (let i = 0; i < 12; i += 1) {
        ctx.fillStyle = (i + Math.floor(t * 4)) % 2 ? WHITE : "#1c1a16";
        ctx.fillRect(cx - R * 0.66 + i * R * 0.11, cy + R * 0.34, R * 0.11, R * 0.11);
      }
    },
    grid(ctx, cx, cy, R, t, a) {
      const hi = Math.floor(t * 0.9) % 8;
      for (let i = 0; i < 8; i += 1) {
        const col = i % 2, row = Math.floor(i / 2);
        const x = cx - R * 0.42 + col * R * 0.5, y = cy - R * 0.5 + row * R * 0.27 + col * R * 0.12;
        rr(ctx, x, y, R * 0.34, R * 0.18, R * 0.03);
        ctx.fillStyle = i === hi ? a : WHITE;
        ctx.fill();
        ctx.fillStyle = i === hi ? WHITE : a;
        ctx.font = mono(R * 0.09);
        ctx.textBaseline = "middle";
        ctx.fillText(`P${i + 1}`, x + R * 0.04, y + R * 0.09);
      }
    },
    podium(ctx, cx, cy, R, t, a) {
      const rise = (k) => clamp(((t % 5) - k * 0.3) / 0.8);
      [[-1, 0.42, "2"], [0, 0.62, "1"], [1, 0.3, "3"]].forEach(([k, hh, n], i) => {
        const h2 = R * hh * (1 - Math.pow(1 - rise(i), 3));
        shadowed(ctx, () => rr(ctx, cx + k * R * 0.36 - R * 0.17, cy + R * 0.42 - h2, R * 0.34, h2, R * 0.03), WHITE, R * 0.015, R * 0.03);
        ctx.fillStyle = a;
        ctx.font = disp(R * 0.16);
        ctx.textAlign = "center";
        if (h2 > R * 0.15) ctx.fillText(n, cx + k * R * 0.36, cy + R * 0.42 - h2 + R * 0.17);
      });
    },
    circuit(ctx, cx, cy, R, t, a) {
      const pt = (s) => {
        const g = s * TAU;
        return [cx + Math.cos(g) * R * 0.6 + Math.cos(g * 2) * R * 0.12, cy + Math.sin(g) * R * 0.38 + Math.sin(g * 3) * R * 0.08];
      };
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = R * 0.07;
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i <= 80; i += 1) { const [x, y] = pt(i / 80); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
      for (let k = 0; k < 8; k += 1) {
        const [x, y] = pt(((t * 0.18) - k * 0.012 + 10) % 1);
        ctx.fillStyle = k ? `rgba(255,59,36,${0.6 - k * 0.07})` : "#ff3b24";
        ctx.beginPath(); ctx.arc(x, y, R * (0.06 - k * 0.005), 0, TAU); ctx.fill();
      }
    },
    envelope(ctx, cx, cy, R, t, a) {
      const bob = Math.sin(t * 2) * R * 0.06;
      const flap = Math.sin(t * 8) * 0.5;
      [-1, 1].forEach((k) => {
        ctx.save();
        ctx.translate(cx + k * R * 0.3, cy + bob - R * 0.05);
        ctx.rotate(k * (0.3 + flap * 0.4));
        ctx.fillStyle = mix(PAPER, a, 0.2);
        ctx.beginPath(); ctx.ellipse(k * R * 0.22, -R * 0.08, R * 0.26, R * 0.09, 0, 0, TAU); ctx.fill();
        ctx.restore();
      });
      envelope(ctx, cx, cy + bob, R * 0.7, WHITE, a);
    },
    timer(ctx, cx, cy, R, t, a) {
      const p = (t % 6) / 6;
      ctx.strokeStyle = "rgba(251,246,236,0.25)";
      ctx.lineWidth = R * 0.08;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, TAU); ctx.stroke();
      ctx.strokeStyle = WHITE;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p)); ctx.stroke();
      envelope(ctx, cx, cy, R * 0.55 * (1 - p * 0.3), WHITE, a);
    },
    mailroutes(ctx, cx, cy, R, t, a) {
      const box = [cx + R * 0.5, cy];
      shadowed(ctx, () => rr(ctx, box[0] - R * 0.14, box[1] - R * 0.2, R * 0.28, R * 0.4, R * 0.04), "#1c1a16", R * 0.015, R * 0.02);
      for (let i = 0; i < 3; i += 1) {
        const sy = cy + (i - 1) * R * 0.45;
        ctx.strokeStyle = "rgba(251,246,236,0.35)";
        ctx.setLineDash([R * 0.04, R * 0.04]);
        ctx.lineWidth = R * 0.02;
        ctx.beginPath(); ctx.moveTo(cx - R * 0.8, sy); ctx.quadraticCurveTo(cx, sy, box[0] - R * 0.14, box[1]); ctx.stroke();
        ctx.setLineDash([]);
        const p = ((t * 0.5) + i / 3) % 1;
        const u = 1 - p;
        const x = u * u * (cx - R * 0.8) + 2 * u * p * cx + p * p * (box[0] - R * 0.14);
        const y = u * u * sy + 2 * u * p * sy + p * p * box[1];
        envelope(ctx, x, y, R * 0.22, WHITE, a);
      }
    },
    otp(ctx, cx, cy, R, t, a) {
      const code = "482913";
      ctx.font = disp(R * 0.3);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i < 6; i += 1) {
        const x = cx + (i - 2.5) * R * 0.22;
        shadowed(ctx, () => rr(ctx, x - R * 0.095, cy - R * 0.16, R * 0.19, R * 0.32, R * 0.03), WHITE, R * 0.015, R * 0.02);
        const settle = clamp(((t % 5) - i * 0.18) / 0.5);
        const d = settle < 1 ? String(Math.floor(t * 20 + i * 3) % 10) : code[i];
        ctx.fillStyle = settle < 1 ? mix(a, PAPER, 0.4) : a;
        ctx.fillText(d, x, cy + R * 0.02);
      }
    },
    brackets(ctx, cx, cy, R, t, a) {
      const pulse = 1 + Math.sin(t * 2.4) * 0.06;
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = R * 0.09;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      [-1, 1].forEach((k) => {
        ctx.beginPath();
        ctx.moveTo(cx + k * R * 0.45 * pulse, cy - R * 0.35);
        ctx.lineTo(cx + k * R * 0.7 * pulse, cy);
        ctx.lineTo(cx + k * R * 0.45 * pulse, cy + R * 0.35);
        ctx.stroke();
      });
      envelope(ctx, cx, cy, R * 0.55, WHITE, a);
    },
    tag(ctx, cx, cy, R, t, a) {
      for (let i = 0; i < 10; i += 1) {
        const p = ((t * 0.35) + i / 10) % 1;
        ctx.fillStyle = `rgba(251,246,236,${0.8 - p * 0.6})`;
        ctx.fillRect(lerp(cx - R * 0.95, cx - R * 0.2, p), cy - R * 0.4 + ((i * 37) % 80) / 100 * R, R * 0.04, R * 0.04);
      }
      ctx.save();
      ctx.translate(cx + R * 0.05, cy - R * 0.55);
      ctx.rotate(Math.sin(t * 1.3) * 0.25);
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = R * 0.02;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, R * 0.25); ctx.stroke();
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(-R * 0.25, R * 0.4);
        ctx.lineTo(0, R * 0.25);
        ctx.lineTo(R * 0.25, R * 0.4);
        ctx.lineTo(R * 0.25, R * 0.95);
        ctx.lineTo(-R * 0.25, R * 0.95);
        ctx.closePath();
      };
      shadowed(ctx, path, WHITE, R * 0.02, R * 0.03);
      ctx.fillStyle = a;
      for (let i = 0; i < 9; i += 1) ctx.fillRect(-R * 0.17 + i * R * 0.04, R * 0.55, R * (i % 3 ? 0.015 : 0.025), R * 0.24);
      ctx.font = disp(R * 0.1);
      ctx.textAlign = "center";
      ctx.fillText("$", 0, R * 0.48);
      ctx.restore();
    },
    bolt(ctx, cx, cy, R, t, a) {
      const flick = Math.sin(t * 13) > 0.7 ? 0.5 : 1;
      ctx.globalAlpha = flick;
      shadowed(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx + R * 0.08, cy - R * 0.62);
        ctx.lineTo(cx - R * 0.26, cy + R * 0.06);
        ctx.lineTo(cx - R * 0.02, cy + R * 0.06);
        ctx.lineTo(cx - R * 0.12, cy + R * 0.62);
        ctx.lineTo(cx + R * 0.26, cy - R * 0.1);
        ctx.lineTo(cx + R * 0.02, cy - R * 0.1);
        ctx.closePath();
      }, WHITE, R * 0.02, R * 0.03);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(251,246,236,0.4)";
      ctx.lineWidth = R * 0.03;
      ctx.beginPath(); ctx.arc(cx, cy + R * 0.2, R * 0.66, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      const g = Math.PI * (1.2 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.1)));
      ctx.strokeStyle = WHITE;
      ctx.beginPath(); ctx.moveTo(cx, cy + R * 0.2); ctx.lineTo(cx + Math.cos(g) * R * 0.66, cy + R * 0.2 + Math.sin(g) * R * 0.66); ctx.stroke();
    },
    ballot(ctx, cx, cy, R, t, a) {
      const p = (t % 3) / 3;
      const cy2 = lerp(cy - R * 0.8, cy + R * 0.05, Math.min(1, p * 1.6));
      ctx.save();
      ctx.translate(cx, cy2);
      ctx.rotate(0.12);
      shadowed(ctx, () => rr(ctx, -R * 0.2, -R * 0.26, R * 0.4, R * 0.5, R * 0.03), WHITE, R * 0.015, R * 0.02);
      ctx.strokeStyle = a;
      ctx.lineWidth = R * 0.04;
      ctx.beginPath(); ctx.moveTo(-R * 0.09, 0); ctx.lineTo(-R * 0.02, R * 0.08); ctx.lineTo(R * 0.11, -R * 0.1); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "rgba(251,246,236,0.24)";
      rr(ctx, cx - R * 0.45, cy - R * 0.05, R * 0.9, R * 0.6, R * 0.04);
      ctx.fill();
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = R * 0.03;
      ctx.stroke();
      ctx.fillStyle = "#1c1a16";
      ctx.fillRect(cx - R * 0.25, cy - R * 0.07, R * 0.5, R * 0.04);
    }
  };

  /* ---------------------------------------------------------------- */
  /* One poster                                                        */
  /* ---------------------------------------------------------------- */

  function draw(ctx, w, h, t, spec, px, py) {
    const a = ACCENT[spec.slug] || "#d15a35";
    const s = Math.min(w, h);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(23,22,18,0.05)";
    const step = s / 26;
    for (let x = step / 2; x < w; x += step) for (let y = step / 2; y < h; y += step) ctx.fillRect(x, y, s * 0.004, s * 0.004);
    // The cut-out disc, with the motif living inside it.
    const R = s * (spec.ratio[0] === 1 ? 0.3 : 0.27);
    const cx = w * 0.64 + px * s * 0.03, cy = h * 0.4 + py * s * 0.03;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx + s * 0.012, cy + s * 0.018, R, 0, TAU);
    ctx.fillStyle = "rgba(20,16,12,0.2)";
    ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = a;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = mix(a, INK, 0.25);
    ctx.beginPath(); ctx.arc(cx - R * 0.35, cy + R * 0.45, R * 0.9, 0, TAU); ctx.fill();
    ctx.fillStyle = a;
    ctx.beginPath(); ctx.arc(cx - R * 0.25, cy + R * 0.2, R * 0.78, 0, TAU); ctx.fill();
    try { (M[spec.motif] || M.planes)(ctx, cx, cy, R, t, a); } catch (_) { /* a motif never breaks the page */ }
    ctx.restore();
    // White paper ring around the disc
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = s * 0.012;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    hills(ctx, w, h, t, a, px);
    // Title set as a cut-out sticker
    const title = spec.title;
    ctx.font = disp(100);
    const tw = ctx.measureText(title).width;
    const size = Math.min(s * 0.17, (100 * w * 0.56) / tw);
    ctx.save();
    ctx.font = mono(s * 0.03);
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${s * 0.006}px`;
    ctx.fillStyle = a;
    ctx.textBaseline = "top";
    ctx.fillText(spec.kicker.toUpperCase(), w * 0.07, h * 0.08);
    ctx.restore();
    sticker(ctx, title, w * 0.07, h * 0.08 + s * 0.05 + size * 0.85, size, INK);
    // Ribbon label at the foot
    ctx.save();
    const label = `${NAME[spec.slug]} · live motion`.toUpperCase();
    ctx.font = mono(s * 0.028);
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${s * 0.005}px`;
    const lw = ctx.measureText(label).width + s * 0.06;
    ctx.translate(w * 0.07, h * 0.9);
    ctx.rotate(-0.02);
    ctx.fillStyle = "rgba(20,16,12,0.25)";
    ctx.fillRect(s * 0.008, s * 0.01, lw, s * 0.06);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, lw, s * 0.06);
    ctx.fillStyle = WHITE;
    ctx.textBaseline = "middle";
    ctx.fillText(label, s * 0.03, s * 0.031);
    ctx.restore();
  }

  /* ---------------------------------------------------------------- */
  /* Mounting and the clock                                            */
  /* ---------------------------------------------------------------- */

  const posters = [];
  const blank = (rw, rh) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${rw * 100}" height="${rh * 100}"/>`)}`;

  function mountImage(img) {
    if (img.dataset.poster) return;
    const src = img.getAttribute("src") || "";
    const spec = specFor(src);
    if (!spec) return;
    img.dataset.poster = spec.motif;
    img.removeAttribute("srcset");
    img.src = blank(spec.ratio[0], spec.ratio[1]);
    img.style.opacity = "0";
    const canvas = document.createElement("canvas");
    canvas.className = "pr-poster";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;pointer-events:none;display:block;z-index:1";
    img.insertAdjacentElement("afterend", canvas);
    const p = { img, canvas, ctx: canvas.getContext("2d"), spec, visible: false, px: 0, py: 0, tx: 0, ty: 0, seed: Math.random() * 10 };
    const host = img.closest("a, figure, article, .project-image") || img.parentElement;
    host.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      p.tx = clamp((e.clientX - r.left) / r.width, 0, 1) - 0.5;
      p.ty = clamp((e.clientY - r.top) / r.height, 0, 1) - 0.5;
    });
    host.addEventListener("pointerleave", () => { p.tx = 0; p.ty = 0; });
    posters.push(p);
    place(p);
    if ("ResizeObserver" in window) new ResizeObserver(() => place(p)).observe(img);
    if (io) io.observe(img); else p.visible = true;
  }

  function place(p) {
    const { img, canvas } = p;
    const w = img.offsetWidth, h = img.offsetHeight;
    if (!w || !h) return;
    const cs = window.getComputedStyle(img);
    canvas.style.left = `${img.offsetLeft}px`;
    canvas.style.top = `${img.offsetTop}px`;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.style.borderRadius = cs.borderRadius;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    p.w = w; p.h = h; p.dpr = dpr;
    paint(p, performance.now() / 1000);
  }

  function paint(p, t) {
    if (!p.w) return;
    p.px += (p.tx - p.px) * 0.08;
    p.py += (p.ty - p.py) * 0.08;
    p.ctx.setTransform(p.dpr, 0, 0, p.dpr, 0, 0);
    draw(p.ctx, p.w, p.h, reducedMotion ? 2.2 : t + p.seed, p.spec, p.px, p.py);
  }

  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const p = posters.find((x) => x.img === e.target);
      if (!p) return;
      p.visible = e.isIntersecting;
      if (p.visible) { place(p); wake(); }
    });
  }, { rootMargin: "80px" }) : null;

  let raf = 0;
  let flip = false;
  const loop = (now) => {
    raf = 0;
    const live = posters.filter((p) => p.visible);
    if (!live.length || reducedMotion) return;
    flip = !flip;
    // About 30 frames a second is plenty for paper.
    if (flip) live.forEach((p) => paint(p, now / 1000));
    raf = window.requestAnimationFrame(loop);
  };
  const wake = () => { if (!raf && !reducedMotion) raf = window.requestAnimationFrame(loop); };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });

  const scan = (root = document) => {
    root.querySelectorAll("img").forEach(mountImage);
  };
  scan();
  // Parts of the page are rendered later (filters, case files): keep watching.
  new MutationObserver((records) => {
    records.forEach((r) => r.addedNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      if (n.tagName === "IMG") mountImage(n); else scan(n);
    }));
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", () => posters.forEach(place));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => posters.forEach(place));
})();

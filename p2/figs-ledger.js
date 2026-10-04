/* The Glass Ballot Box · the live reader ledger */
(function () {
  "use strict";
  const { el, button, fmt, sha256, randomHex, wait, iphone, loop } = FK;
  const { API, EID } = window.GB || { API: "https://glass-ballot-box.abhnv.workers.dev", EID: "f7559217-fbc2-474e-a534-3a821f7d2ca4" };
  const OPTS = [["SECRECY", "My secret ballot", "Nobody can learn how I voted"], ["PROOF", "Public proof of the count", "Anyone can check the total"], ["SPEED", "A fast result", "Results the same night"]];
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };

  Press.fig("fig-ledger", (root) => {
    const body = root.querySelector(".fig-body");
    body.innerHTML = `<div class="ledger"><div data-phone></div><div class="tape"><div class="tape-h"><span>Public ledger</span><span data-n>loading</span></div>
      <div class="btnrow" style="margin:.7rem 0" data-b></div><div class="tape-list" aria-live="polite"><p class="tape-empty">Loading the ledger…</p></div><p class="netnote" data-net></p><p class="say" data-say>Cast a ballot on the phone, then verify the chain yourself.</p></div></div>`;
    const ph = iphone(body.querySelector("[data-phone]"), { finish: "blue", width: "17.5rem", label: "Voting app on a phone" });
    ph.content.innerHTML = `<div class="vote-app"><h5>Reader Ledger</h5><p class="sub">What should an election you can trust protect first?</p><div data-opts></div><button class="vcast" type="button" disabled>Seal and cast</button><div data-r></div><p class="vstatus" data-vs>Your choice stays on this phone.</p></div>`;
    const app = ph.content.querySelector(".vote-app"), castBtn = app.querySelector(".vcast"), list = body.querySelector(".tape-list"), say = body.querySelector("[data-say]"), net = body.querySelector("[data-net]");
    let choice = null, board = null, offline = false, verified = {};
    OPTS.forEach(([id, t, sub]) => { const b = el("button", { type: "button", class: "vopt", "aria-pressed": "false", html: `<span class="rd"></span><span>${t}<small>${sub}</small></span>` }); b.addEventListener("click", () => { choice = id; app.querySelectorAll(".vopt").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); castBtn.disabled = false; }); app.querySelector("[data-opts]").appendChild(b); });
    const mine = () => store.get("gb:mine", []);

    async function api(path, opts) {
      const r = await fetch(API + path, Object.assign({ signal: AbortSignal.timeout(8000) }, opts || {}));
      const j = await r.json().catch(() => ({ ok: false, error: "Bad response" }));
      if (r.status === 429) throw Object.assign(new Error("rate"), { rate: true, msg: j.error });
      return j;
    }
    function localLedger() { return store.get("gb:local", { election: { chain_head: "GENESIS" }, ballots: [] }); }

    async function load() {
      try { const j = await api(`/api/board?election_id=${EID}`); if (!j.ok) throw new Error(j.error); board = j; offline = false; net.textContent = "Connected to the live ledger server."; net.className = "netnote"; }
      catch (e) { board = localLedger(); offline = true; net.textContent = "The live server could not be reached, so this is a local ledger on your device. Everything else works the same."; net.className = "netnote warn"; }
      paint();
    }
    function paint() {
      const bs = board.ballots || [], mineH = new Set(mine().map((m) => m.receipt_hash));
      body.querySelector("[data-n]").textContent = fmt.int(bs.length) + (bs.length === 1 ? " ballot" : " ballots");
      list.innerHTML = bs.length ? bs.slice().reverse().slice(0, 40).map((b) => `<div class="tline ${mineH.has(b.receipt_hash) ? "mine" : ""}" data-i="${b.index}"><b>#${b.index}</b><span class="h">${b.chain_hash}</span><span class="st ${verified[b.index] === true ? "ok" : verified[b.index] === false ? "bad" : ""}"></span></div>`).join("") : `<p class="tape-empty">No ballots yet. Yours could be the first.</p>`;
    }

    castBtn.addEventListener("click", async () => {
      if (!choice) return; castBtn.disabled = true; const vs = app.querySelector("[data-vs]");
      const token = randomHex(32), nonce = randomHex(16);
      vs.textContent = "Sealing on this phone…";
      const commit = await sha256(`${EID}|${choice}|${nonce}`), receipt_hash = await sha256(token);
      await wait(300); vs.textContent = "Sending the sealed ballot…";
      let res;
      try {
        if (offline) throw new Error("offline");
        res = await api("/api/cast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ election_id: EID, commit, receipt_hash, mode: "safe" }) });
        if (!res.ok) throw new Error(res.error || "Cast failed");
      } catch (e) {
        if (e.rate) { vs.textContent = "Too many ballots from this network in the last minute. Try again shortly."; castBtn.disabled = false; return; }
        const L = localLedger(); const prev = L.ballots.length ? L.ballots[L.ballots.length - 1].chain_hash : "GENESIS"; const index = L.ballots.length + 1, cast_at = new Date().toISOString();
        const chain_hash = await sha256(`${prev}|${EID}|${index}|${commit}|${cast_at}`);
        L.ballots.push({ index, cast_at, commit, receipt_hash, prev_hash: prev, chain_hash }); L.election.chain_head = chain_hash; store.set("gb:local", L);
        res = { ok: true, index, chain_hash, cast_at }; offline = true;
      }
      const m = mine(); m.push({ token, nonce, choice, receipt_hash, index: res.index, offline }); store.set("gb:mine", m);
      app.querySelector("[data-r]").innerHTML = `<div class="vreceipt"><b>Ballot #${res.index} sealed</b>Your receipt token, saved on this phone:<code>${token.slice(0, 24)}…</code>Ledger fingerprint:<code>${res.chain_hash.slice(0, 24)}…</code></div>`;
      vs.textContent = "Cast. Now check the ledger.";
      say.innerHTML = `<b>Your ballot is #${res.index}.</b> The server stored only the sealed commitment. Press “Verify the whole chain” to recompute every fingerprint yourself, or “Find my ballot” to prove yours is there.`;
      await load();
      const ln = list.querySelector(`[data-i="${res.index}"]`); if (ln) ln.scrollIntoView({ block: "nearest" });
    });

    const bar = body.querySelector("[data-b]");
    const vBtn = button(bar, "Verify the whole chain", async () => {
      vBtn.disabled = true; await load(); const bs = board.ballots || []; verified = {};
      let prev = "GENESIS", okAll = true;
      for (const b of bs) {
        const h = await sha256(`${prev}|${EID}|${b.index}|${b.commit}|${b.cast_at}`);
        const ok = h === b.chain_hash && b.prev_hash === prev; verified[b.index] = ok; if (!ok) okAll = false; prev = b.chain_hash;
        const ln = list.querySelector(`[data-i="${b.index}"] .st`); if (ln) { ln.className = "st " + (ok ? "ok" : "bad"); await wait(bs.length > 60 ? 4 : 40); }
      }
      const headOk = prev === (board.election.chain_head || "GENESIS");
      let server = "";
      if (!offline) { try { const v = await api(`/api/verify?election_id=${EID}`); server = v.ok ? ` The server's own check agrees: chain ${v.chain_valid ? "valid" : "invalid"}, ${v.ballot_count} ballot${v.ballot_count === 1 ? "" : "s"}.` : ""; } catch (_) {} }
      paint();
      say.innerHTML = bs.length ? `<b>${okAll && headOk ? "Every link checks out." : "Something does not match."}</b> Your browser recomputed ${fmt.int(bs.length)} SHA-256 fingerprint${bs.length === 1 ? "" : "s"} from the published data and ${headOk ? "arrived at the same head the ledger reports" : "did not reach the reported head"}.${server}` : "There is nothing to verify yet. Cast the first ballot.";
      vBtn.disabled = false;
    }, "solid");
    const fBtn = button(bar, "Find my ballot", async () => {
      const m = mine(); if (!m.length) { say.textContent = "You have not cast a ballot on this device yet."; return; }
      const last = m[m.length - 1]; fBtn.disabled = true;
      let b = null;
      if (!last.offline && !offline) { try { const r = await api(`/api/receipt?election_id=${EID}&receipt_hash=${last.receipt_hash}`); b = r.found ? r.ballot : null; } catch (_) {} }
      else b = (localLedger().ballots || []).find((x) => x.receipt_hash === last.receipt_hash) || null;
      const commit = await sha256(`${EID}|${last.choice}|${last.nonce}`);
      const label = OPTS.find((o) => o[0] === last.choice)[1];
      say.innerHTML = b ? `<b>Found: ballot #${b.index}.</b> Recomputing your commitment from the choice and nonce saved on this phone gives ${commit.slice(0, 12)}…, which ${commit === b.commit ? "matches" : "does not match"} the ledger. So the sealed ballot on the public record is the one you cast: “${label}”. Nobody else can see that without your nonce.` : "Your ballot could not be found on the current ledger.";
      const ln = list.querySelector(`[data-i="${last.index}"]`); if (ln) { ln.scrollIntoView({ block: "nearest" }); ln.animate([{ background: "var(--spot)" }, { background: "transparent" }], { duration: 1200 }); }
      fBtn.disabled = false;
    });

    if (mine().length) { const l = mine()[mine().length - 1]; app.querySelector("[data-r]").innerHTML = `<div class="vreceipt"><b>You voted: ballot #${l.index}</b>Receipt token on this phone:<code>${l.token.slice(0, 24)}…</code></div>`; }
    load();
    let acc = 0; loop(root, (dt) => { acc += dt; if (acc > 20 && !vBtn.disabled) { acc = 0; load(); } }).start();
  });
})();

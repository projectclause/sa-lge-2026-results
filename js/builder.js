// Build your coalition: pick a metro, add parties, and see whether they reach a council majority and who would
// likely be mayor. Seats come from data/municipalities.geojson (the 2026 results), candidates from data/mayors.json.
(function () {
  "use strict";
  const box = document.querySelector(".bc");
  if (!box) return;
  const PC = { ANC: "#f2c40f", DA: "#1f5fc2", MK: "#2c8c4e", EFF: "#d63a3a", IFP: "#9b9b9b", ASA: "#06b616", FFP: "#f08a24", GOOD: "#f47a20", UDM: "#8b5a2b", PA: "#7a4fb5", SACP: "#a3121f", RISE: "#6d5bd0", ATM: "#4b5563",
    AIC: "#9a9590", ACDP: "#8a6cc8", AJ: "#5fa34a", PAC: "#2f6b3a", UAT: "#b0703c", NCC: "#c0392b" };
  const LOGO = { ANC: "anc", DA: "da", MK: "mk", EFF: "eff", ASA: "asa", IFP: "ifp", FFP: "ffp", SACP: "sacp", PA: "pa", UDM: "udm", ATM: "atm", RISE: "rise", GOOD: "good", ACDP: "acdp", AIC: "aic", AJ: "aj", PAC: "pac", UAT: "uat", NCC: "ncc" };
  const NAME = { ASA: "ActionSA", FFP: "VF Plus", AJ: "Al Jama-ah", MK: "MK" };
  const norm = (p) => ({ MKP: "MK", ActionSA: "ASA", "VF PLUS": "FFP", ALJAMA: "AJ" }[p] || p);
  const METROS = [["JHB", "Johannesburg"], ["TSH", "Tshwane"], ["EKU", "Ekurhuleni"], ["CPT", "Cape Town"], ["ETH", "eThekwini"], ["NMA", "Nelson Mandela Bay"], ["BUF", "Buffalo City"], ["MAN", "Mangaung"]];
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const col = (p) => PC[p] || "#8a8a8a";
  const label = (p) => NAME[p] || (p.length > 12 ? p.replace(/\b(Political|Movement|Party|of|the|and|Social)\b/g, "").replace(/\s+/g, " ").trim() : p);

  // confetti when a coalition reaches a majority: a short burst in the coalition's party colours (skipped for reduced motion)
  function confetti(colors, from) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = document.createElement("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.className = "bc-confetti"; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    document.body.appendChild(cv); const g = cv.getContext("2d"); g.scale(dpr, dpr);
    const r = from.getBoundingClientRect(), ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    const P = Array.from({ length: 140 }, () => ({ x: ox + (Math.random() - .5) * r.width * .6, y: oy, vx: (Math.random() - .5) * 11, vy: -Math.random() * 12 - 4,
      w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, a: Math.random() * 6.28, va: (Math.random() - .5) * .3, c: colors[Math.floor(Math.random() * colors.length)] }));
    let t = 0;
    (function frame() {
      g.clearRect(0, 0, innerWidth, innerHeight);
      P.forEach((p) => { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.globalAlpha = Math.max(0, 1 - t / 130); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.a * 2))); g.restore(); });
      if (++t < 140) requestAnimationFrame(frame); else cv.remove();
    })();
  }

  Promise.all([fetch("data/municipalities.geojson").then((r) => r.json()), fetch("data/mayors.json").then((r) => r.json()).catch(() => ({}))]).then(([fc, CANDS]) => {
    // parties' current nominees where they changed after the vote (mayors.json keeps the pre-election candidates for the Mayors page)
    const NOW = { EKU: { ANC: ["Mziyanda Mketsu", "ANC", "assets/faces/circ/mziyanda-mketsu.png"] } };
    Object.entries(NOW).forEach(([c, byP]) => { CANDS[c] = (CANDS[c] || []).map((x) => byP[x[1]] ? byP[x[1]].concat(x.slice(3)) : x); });
    const SEATS = {};
    fc.features.forEach((f) => { const p = f.properties; if (METROS.some(([c]) => c === p.id)) { const s = {}; (p.seats || []).forEach(([q, n]) => { s[norm(q)] = (s[norm(q)] || 0) + n; }); SEATS[p.id] = s; } });
    let code = "JHB", picked = new Set(), mayorP = null;
    let wasOk = false; // so the confetti fires each time the coalition crosses the majority line, not on every tap above it

    const own = box.classList.contains("bc-page"); // on build-your-coalition.html the page title already says it
    box.innerHTML = `${own ? "" : `<p class="bc-kick">Interactive</p>
      <h2 class="bc-h">Build your coalition</h2>`}
      <p class="bc-dek">Pick a metro and add parties until they hold a majority of council seats. The mayoral candidate of the largest party in your coalition takes the chain unless you choose another.</p>
      <div class="bc-metros" role="tablist" aria-label="Metro">${METROS.map(([c, n]) => `<button type="button" role="tab" data-c="${c}">${esc(n)}</button>`).join("")}</div>
      <div class="bc-result" aria-live="polite"></div>
      <div class="bc-bar" aria-hidden="true"><div class="bc-fill"></div><i class="bc-line"></i></div>
      <p class="bc-count" aria-live="polite"></p>
      <div class="bc-parties" role="group" aria-label="Parties in the council"></div>
      <p class="bc-foot"><button type="button" class="bc-reset">Start again</button> <span>Seats: IEC 2026 results. Candidates as announced, updated where a party has since named someone else; a coalition can elect anyone.</span></p>`;

    const $ = (s) => box.querySelector(s);
    function draw() {
      const S = SEATS[code] || {}, ss = Object.entries(S).sort((a, b) => b[1] - a[1]);
      const N = ss.reduce((a, [, n]) => a + n, 0), need = Math.floor(N / 2) + 1;
      const inC = ss.filter(([p]) => picked.has(p)), have = inC.reduce((a, [, n]) => a + n, 0), ok = have >= need;
      const crossed = ok && !wasOk; wasOk = ok;
      box.querySelectorAll(".bc-metros button").forEach((b) => b.setAttribute("aria-selected", b.dataset.c === code));
      $(".bc-fill").innerHTML = inC.map(([p, n]) => `<span style="width:${(n / N * 100).toFixed(2)}%;background:${col(p)}" title="${esc(label(p))}: ${n}"></span>`).join("");
      $(".bc-line").style.left = (need / N * 100).toFixed(2) + "%";
      $(".bc-count").innerHTML = `<b>${have}</b> of ${N} seats · <b>${need}</b> needed for a majority${ok ? ` · <span class="bc-ok">Majority</span>` : have ? ` · <span class="bc-short">${need - have} short</span>` : ""}`;
      $(".bc-parties").innerHTML = ss.map(([p, n]) => `<button type="button" class="bc-p" data-p="${esc(p)}" aria-pressed="${picked.has(p)}" style="--pc:${col(p)}">${LOGO[p] ? `<img src="assets/logos-sm/${LOGO[p]}.png" alt="">` : `<i class="bc-dot"></i>`}<span>${esc(label(p))}</span><b>${n}</b></button>`).join("");
      // the mayor: the chosen partner's candidate, else the biggest party in the coalition
      const C = CANDS[code] || [], cand = (p) => C.find((c) => c[1] === p && !/^(Not named|No mayoral candidate)$/.test(c[0]));
      if (mayorP && !picked.has(mayorP)) mayorP = null;
      const lead = mayorP || (inC[0] || [])[0];
      const m = lead && cand(lead);
      const others = inC.map(([p]) => p).filter((p) => p !== lead && cand(p));
      $(".bc-result").innerHTML = !inC.length ? `<p class="bc-hint">Tap parties below to add them to your coalition.</p>`
        : `<div class="bc-mayor${ok ? " ok" : ""}">
            ${m ? `<img src="${esc(m[2])}" alt="">` : `<i class="bc-av" style="background:${col(lead)}"></i>`}
            <div><p class="bc-mk">${ok ? "Your coalition would elect" : "Your coalition’s candidate, if it reaches a majority"}</p>
              <p class="bc-mn">${m ? esc(m[0]) : `No candidate named`} <span>${esc(label(lead))}</span></p>
              <p class="bc-ms">${esc(inC.map(([p]) => label(p)).join(" + "))} · ${have} seats</p>
              ${others.length ? `<p class="bc-alt">Or make mayor: ${others.map((p) => `<button type="button" data-m="${esc(p)}">${esc(cand(p)[0])} (${esc(label(p))})</button>`).join(" ")}</p>` : ""}</div></div>`;
      if (crossed) confetti(inC.map(([p]) => col(p)), $(".bc-bar"));
    }
    box.addEventListener("click", (e) => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.c) { code = t.dataset.c; picked = new Set(); mayorP = null; wasOk = false; }
      else if (t.dataset.p) { const p = t.dataset.p; picked.has(p) ? picked.delete(p) : picked.add(p); }
      else if (t.dataset.m) mayorP = t.dataset.m;
      else if (t.classList.contains("bc-reset")) { picked = new Set(); mayorP = null; wasOk = false; }
      draw();
    });
    draw();
  }).catch(() => { box.hidden = true; });
})();

// Results strip above the navigation bar.
// Four card slots show mayors, the national result, provinces and metro councils. Each time the 60-second
// LIVE countdown ends, one slot (picked at random) animates out and a different card (picked at random) animates in.
(function () {
  "use strict";
  const el = document.querySelector(".tk"); if (!el) return;
  const PC = { ANC: "#f2c40f", DA: "#1f5fc2", MK: "#2c8c4e", EFF: "#d63a3a", IFP: "#9b9b9b", ASA: "#06b616", FFP: "#f08a24", PA: "#7a4fb5", UDM: "#8b5a2b" };
  const col = (id) => (window.SAPARTY ? window.SAPARTY.col(id) : PC[id] || "#8a8a8a");
  const norm = (p) => ({ MKP: "MK", ActionSA: "ASA", "VF PLUS": "FFP" }[p] || p);
  const METROS = [["JHB", "JHB"], ["TSH", "TSH"], ["EKU", "EKU"], ["CPT", "CPT"], ["ETH", "ETH"], ["NMA", "NMB"], ["BUF", "BUF"], ["MAN", "MAN"]];
  const MNAME = { JHB: "Johannesburg", TSH: "Tshwane", EKU: "Ekurhuleni", CPT: "Cape Town", ETH: "eThekwini", NMA: "Nelson Mandela Bay", BUF: "Buffalo City", MAN: "Mangaung" };
  const PROVS = [["GP", "Gauteng"], ["WC", "Western Cape"], ["KZN", "KwaZulu-Natal"], ["EC", "Eastern Cape"], ["FS", "Free State"], ["LP", "Limpopo"], ["MP", "Mpumalanga"], ["NW", "North West"], ["NC", "Northern Cape"]];
  const LOGO = { ANC: "anc", DA: "da", MK: "mk", EFF: "eff", ASA: "asa", IFP: "ifp", FFP: "ffp", SACP: "sacp", PA: "pa", UDM: "udm", ATM: "atm" };
  const PNAME = { ASA: "ActionSA", FFP: "VF Plus" };
  const onHome = !!document.querySelector(".rs-grid");
  const go = (fn, arg) => { if (onHome && window.RS) window.RS[fn](arg); else location.href = "index.html" + (arg ? "#" + arg : ""); };
  const CHECK = '<i class="tk-ck" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="#121212" stroke-width="2.4" stroke-linecap="square"/></svg></i>';
  const CHEV = '<svg class="tk-ch" viewBox="0 0 8 12" aria-hidden="true"><path d="M1.5 1.5L6 6l-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

  function hemi(N) { // same layout as the council chart, compact
    const r0 = 0.5;
    for (let R = 2; R < 40; R++) {
      const d = (1 - r0) / (R - 1), radii = Array.from({ length: R }, (_, i) => r0 + i * d);
      if (radii.reduce((a, r) => a + Math.floor(Math.PI * r / d) + 1, 0) < N) continue;
      const sum = radii.reduce((a, b) => a + b, 0), raw = radii.map((r) => N * r / sum), cnt = raw.map(Math.floor);
      let rem = N - cnt.reduce((a, b) => a + b, 0);
      raw.map((c, i) => [c - cnt[i], i]).sort((a, b) => b[0] - a[0]).slice(0, rem).forEach(([, i]) => cnt[i]++);
      const pts = []; radii.forEach((r, i) => { const k = cnt[i]; for (let q = 0; q < k; q++) { const t = k === 1 ? Math.PI / 2 : Math.PI * (1 - q / (k - 1)); pts.push({ x: Math.cos(t) * r, y: Math.sin(t) * r, t, r }); } });
      pts.sort((a, b) => b.t - a.t || a.r - b.r); return { pts, dot: d * 0.42 };
    }
    return { pts: [], dot: 0.01 };
  }
  const seatsOf = (P) => { const s = {}; ((P || {}).seats || []).forEach(([p, n]) => { s[norm(p)] = (s[norm(p)] || 0) + n; }); return Object.entries(s).sort((a, b) => b[1] - a[1]); };

  Promise.all([
    fetch("data/municipalities.geojson").then((r) => r.json()),
    fetch("data/metro-pr-2026.json").then((r) => r.json()).catch(() => null)
  ]).then(([fc, PR]) => {
    const M = {}; fc.features.forEach((f) => { M[f.properties.id] = f.properties; });

    // ---- card makers ----
    const floor = (P) => {
      const ss = seatsOf(P), N = ss.reduce((a, s) => a + s[1], 0), { pts, dot } = hemi(N); let i = 0, dots = "";
      ss.forEach(([id, n]) => { for (let q = 0; q < n; q++, i++) { const p = pts[i]; dots += `<circle cx="${(1 + p.x).toFixed(3)}" cy="${(1 - p.y).toFixed(3)}" r="${dot.toFixed(3)}" fill="${col(id)}"/>`; } });
      return { ss, N, svg: `<svg class="tk-hemi" viewBox="-0.03 -0.03 2.06 1.06" aria-hidden="true">${dots}<line x1="1" x2="1" y1="-0.03" y2="0.5" stroke="#121212" stroke-width="0.025" stroke-dasharray="0.05 0.04"/></svg>` };
    };
    const mayor = (code, who, photo, party, note, label) => () => {
      const f = floor(M[code]);
      return `<span class="tk-card tk-cpt" data-kind="metro" data-code="${code}">
          <span class="tk-h">${CHECK}${MNAME[code]}${CHEV}</span>
          <span class="tk-cpt-b">${f.svg}<img class="tk-ph" src="${photo}" alt="">
            <span class="tk-who"><b>${who}</b><span>${label || "Elected Mayor of " + MNAME[code]}</span><em><i style="background:${col(party)}"></i>${note(f)}</em></span>
          </span>
        </span>`;
    };
    const winnerRows = (it) => {
      if (it.kind === "nat") return { basis: "National PR vote", rows: [["ANC", 30.76], ["DA", 24.64]] };
      if (it.kind === "metro") { const m = PR && PR[it.code]; return m ? { basis: "PR vote", rows: m.rows.slice(0, 2).map((r) => [r[0], r[1]]) } : null; }
      const a = window.DMAGG && window.DMAGG((w) => w.pv === it.code); if (!a) return null;
      return { basis: "Ward vote", rows: Object.entries(a.agg).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([id, v]) => [id, v / a.tot * 100]) };
    };
    const winner = (it) => () => {
      const d = winnerRows(it); if (!d) return null;
      const [w, r] = d.rows, wn = PNAME[w[0]] || w[0], rn = PNAME[r[0]] || r[0];
      return `<span class="tk-card tk-spot" data-kind="${it.kind}" data-code="${it.code || ""}">
          <span class="tk-h">${CHECK}${it.title}${CHEV}</span>
          <span class="tk-spot-b">
            ${LOGO[w[0]] ? `<img class="tk-spot-lg" src="assets/logos-sm/${LOGO[w[0]]}.png" alt="">` : `<i class="tk-spot-lg" style="background:${col(w[0])}"></i>`}
            <span class="tk-spot-t"><b>${wn} ${w[1] >= 50 ? "wins" : "leads"}</b><span>${d.basis}</span></span>
            <span class="tk-spot-p" style="color:${col(w[0])}">${w[1].toFixed(1)}%</span>
          </span>
          <span class="tk-spot-bar"><span style="background:${col(w[0])}" data-w="${w[1]}"></span><span class="tk-gap"></span><span style="background:${col(r[0])}" data-w="${r[1]}"></span><i></i></span>
          <span class="tk-foot"><span class="tk-tag">${wn} ${w[1].toFixed(1)}%</span><span>${rn} ${r[1].toFixed(1)}%</span></span>
        </span>`;
    };

    // ---- the pool of cards ----
    const POOL = [
      { key: "m-CPT", html: mayor("CPT", "Geordin Hill-Lewis", "assets/faces/hill-lewis.png", "DA", (f) => `DA · ${f.ss[0][1]} of ${f.N} seats`) },
      { key: "m-JHB", html: mayor("JHB", "Herman Mashaba", "assets/faces/mashaba.png", "ASA", () => "ActionSA · ANC, EFF and MK deal", "Vote Friday · tipped to be mayor") },
      { key: "m-TSH", html: mayor("TSH", "Nasiphi Moya", "assets/faces/circ/nasiphi-moya.png", "ASA", (f) => `ActionSA · ${(f.ss.find((x) => x[0] === "ASA") || [0, 0])[1]} of ${f.N} seats`, "Re-elected Mayor of Tshwane") },
      { key: "m-EKU", html: mayor("EKU", "Mziyanda Mketsu", "assets/faces/circ/mziyanda-mketsu.png", "ANC", () => "ANC · ActionSA, EFF, MK and SACP deal", "Incoming mayor · council votes Friday") },
      { key: "w-nat", html: winner({ kind: "nat", title: "South Africa" }) }
    ].concat(PROVS.map(([c, n]) => ({ key: "w-" + c, html: winner({ kind: "prov", code: c, title: n }) })))
     .concat(Object.keys(MNAME).map((c) => ({ key: "w-" + c, html: winner({ kind: "metro", code: c, title: MNAME[c] }) })));

    const metroTiles = METROS.map(([code, ab]) => {
      const s = seatsOf(M[code]), n = s.reduce((a, x) => a + x[1], 0), top = s[0] || ["", 0];
      const maj = top[1] >= Math.floor(n / 2) + 1;
      return `<button type="button" class="tk-tile" data-c="${code}" style="background:${col(top[0])}" title="${(M[code] || {}).name}: ${maj ? top[0] + " majority" : "no majority, " + top[0] + " largest"}">${ab}${maj ? CHECK : ""}</button>`;
    }).join("");
// four fixed columns: city mayors, provinces, metro councils (each rotates every 3 seconds, staggered), metro tiles
const GROUPS = [
  { label: "City", cards: POOL.filter((p) => p.key.startsWith("m-")) },
  { label: "Province", cards: POOL.filter((p) => p.key === "w-nat" || PROVS.some(([c]) => p.key === "w-" + c)) },
  { label: "Metro council", cards: POOL.filter((p) => Object.keys(MNAME).some((c) => p.key === "w-" + c)) }
];
el.innerHTML = `
  <div class="tk-row">
    ${GROUPS.map((g) => `<button type="button" class="tk-p tk-slot" aria-label="${g.label}"></button>`).join("")}
    <div class="tk-p tk-metros">
      <span class="tk-h">Metro councils</span>
      <span class="tk-tiles">${metroTiles}</span>
    </div>
  </div>`;
const slots = [...el.querySelectorAll(".tk-slot")];
const growBars = (node) => requestAnimationFrame(() => requestAnimationFrame(() => node.querySelectorAll("[data-w]").forEach((s) => { s.style.width = s.dataset.w + "%"; })));
const put = (slot, card, animate) => {
  const html = card.html(); if (!html) return false;
  const swap = () => { slot.innerHTML = html; growBars(slot); };
  if (!animate) { swap(); return true; }
  slot.classList.add("out");
  setTimeout(() => { swap(); slot.classList.remove("out"); slot.classList.add("in"); requestAnimationFrame(() => requestAnimationFrame(() => slot.classList.remove("in"))); }, 320);
  return true;
};
const pos = GROUPS.map(() => 0);
// phones show only the first two columns; the second also takes the metro council cards
const phone = window.matchMedia("(max-width: 720px)");
// phones: the Metro councils tiles become a card that rotates in the first column (spans, since the slot is a button)
const metroCard = { key: "metros", html: () => `<div class="tk-card tk-metros tk-mcard"><span class="tk-h">Metro councils</span><span class="tk-tiles">${metroTiles.replace(/<button type="button" class="tk-tile"/g, '<span class="tk-tile" role="link" tabindex="-1"').replace(/<\/button>/g, "</span>")}</span></div>` };
const cardsFor = (g) => (phone.matches && g === 1 ? GROUPS[1].cards.concat(GROUPS[2].cards) : phone.matches && g === 0 ? GROUPS[0].cards.concat(metroCard) : GROUPS[g].cards);
const step = (g, animate) => {
  const cards = cardsFor(g);
  for (let tries = 0; tries < cards.length; tries++) {
    const c = cards[pos[g] % cards.length]; pos[g] = (pos[g] + 1) % cards.length;
    if (put(slots[g], c, animate)) return;
  }
};
GROUPS.forEach((_, g) => step(g, false));
// each visible column moves on every 3 seconds, staggered so they don't all change at once
// (desktop: three columns, one per second; phone: two columns, one every 1.5 seconds)
let turn = 0;
const tick = () => {
  const n = phone.matches ? 2 : GROUPS.length;
  if (!document.hidden) step(turn % n, true);
  turn++;
  setTimeout(tick, 3000 / n);
};
setTimeout(tick, 3000 / (phone.matches ? 2 : GROUPS.length));

    // clicks: whatever card a slot is showing opens that place
    slots.forEach((s) => s.onclick = (e) => {
      const tile = e.target.closest(".tk-mcard [data-c]"); if (tile) return go("council", tile.dataset.c);
      const card = s.querySelector(".tk-card"); if (!card || card.classList.contains("tk-mcard")) return;
      const k = card.dataset.kind, c = card.dataset.code;
      if (k === "nat") go("national");
      else if (k === "metro") go("council", c);
      else if (window.DMSET) { window.DMSET({ lvl: "prov", prov: c }); const m = document.querySelector(".dm-levels") || document.getElementById("dm"); m && m.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
    el.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => { if (b.dataset.go === "cities") go("cities"); });
    el.querySelectorAll(".tk-tile").forEach((b) => b.onclick = () => go("council", b.dataset.c));
    // arriving from the maps page with a council in the link
    if (onHome && location.hash.length > 1) {
      const c = location.hash.slice(1);
      if (M[c]) setTimeout(() => window.RS && window.RS.council(c), 1200);
      else if (/^prov-/.test(c)) setTimeout(() => { if (window.DMSET) { window.DMSET({ lvl: "prov", prov: c.slice(5) }); const m = document.querySelector(".dm-levels"); m && m.scrollIntoView({ behavior: "smooth", block: "start" }); } }, 1500);
    }
  }).catch(() => { el.hidden = true; });
})();

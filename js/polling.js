// Polling: published voting-intention polls for the 2026 municipal elections and the next general election, and how
// the final polls compared with the result. Data: data/polls.json (hand-maintained, from Wikipedia's compiled tables)
// and data/metro-pr-2026.json (IEC results, PR vote by metro).
(function () {
  "use strict";
  const root = document.querySelector(".pl-page"); if (!root) return;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (v) => (v == null ? "–" : String(v));
  const tip = document.createElement("div"); tip.className = "po-tip"; tip.hidden = true; document.body.appendChild(tip);

  Promise.all([fetch("data/polls.json").then((r) => r.json()), fetch("data/metro-pr-2026.json").then((r) => r.json())]).then(([D, M]) => {
    const P = D.pollsters, NAME = D.parties;
    const legend = (orgs) => `<p class="po-legend">${orgs.map((o) => `<span><i style="background:${P[o].col}"></i>${esc(P[o].name)}</span>`).join("")}<span><b class="po-res-k"></b>Result</span></p>`;

    // a dot strip per party: each final poll a dot, the result a black tick
    function strip(parties, polls, result) {
      const vals = parties.flatMap((p) => polls.map((q) => q.v[p]).concat(result[p])).filter((v) => v != null);
      const max = Math.ceil(Math.max(...vals) / 10) * 10, x = (v) => (v / max * 100).toFixed(2) + "%";
      const ticks = []; for (let t = 0; t <= max; t += max > 40 ? 20 : 10) ticks.push(t);
      const rows = parties.filter((p) => result[p] != null && polls.some((q) => q.v[p] != null)).map((p) => {
        const dots = polls.filter((q) => q.v[p] != null).map((q) => `<button type="button" class="po-dot" style="left:${x(q.v[p])};background:${P[q.org].col}" data-t="${esc(`${P[q.org].name}, ${q.when}: ${NAME[p]} ${q.v[p]}%`)}" aria-label="${esc(`${P[q.org].name}, ${q.when}: ${NAME[p]} ${q.v[p]}%`)}"></button>`).join("");
        return `<div class="po-row"><span class="po-p">${esc(NAME[p])}</span><div class="po-track">${ticks.map((t) => `<i class="po-grid" style="left:${x(t)}"></i>`).join("")}<b class="po-res" style="left:${x(result[p])}"></b>${dots}</div><span class="po-rv">${result[p]}%</span></div>`;
      }).join("");
      return `<div class="po-strip">${rows}<div class="po-row po-axis"><span class="po-p"></span><div class="po-track">${ticks.map((t) => `<span style="left:${x(t)}">${t}%</span>`).join("")}</div><span class="po-rv po-rvh">Result</span></div></div>`;
    }

    function table(parties, polls, resultRow) {
      const head = `<tr><th>Pollster</th><th>Fieldwork</th><th class="n">Sample</th>${parties.map((p) => `<th class="n">${esc(NAME[p])}</th>`).join("")}</tr>`;
      const body = polls.map((q) => `<tr${q.flag ? ' class="po-flag"' : ""}><td><i class="po-sw" style="background:${P[q.org].col}"></i>${esc(P[q.org].name)}${q.flag ? `<sup title="${esc(q.flag)}">*</sup>` : ""}</td><td>${esc(q.when)}</td><td class="n">${q.n ? q.n.toLocaleString("en-ZA") : "–"}</td>${parties.map((p) => `<td class="n">${num(q.v[p])}</td>`).join("")}</tr>`).join("");
      const res = resultRow ? `<tr class="po-act"><td>${esc(resultRow[0])}</td><td>${esc(resultRow[1])}</td><td class="n">–</td>${parties.map((p) => `<td class="n">${num(resultRow[2][p])}</td>`).join("")}</tr>` : "";
      const notes = polls.filter((q) => q.flag).map((q) => `<p class="po-note">* ${esc(P[q.org].name)}, ${esc(q.when)}: ${esc(q.flag)}</p>`).join("");
      return `<div class="po-tw"><table class="po-t"><thead>${head}</thead><tbody>${body}${res}</tbody></table></div>${notes}`;
    }

    // the polls over time: one line per party through every national poll, by fieldwork date, ending at the result
    (function lineChart() {
      const box = root.querySelector("#po-line"); if (!box) return;
      const PC = { ANC: "#f2c40f", DA: "#1f5fc2", MK: "#2c8c4e", EFF: "#d63a3a", ASA: "#06b616" };
      const LP = ["ANC", "DA", "MK", "EFF", "ASA"];
      const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      // fieldwork midpoint from text like "Sep–Oct 2026", "Dec 2025–Jan 2026" or "Mar 2026"
      const when = (t) => {
        const ms = [...String(t).matchAll(/([A-Z][a-z]{2})[a-z]*(?:\s+(\d{4}))?/g)].map((m) => [MO.indexOf(m[1]), m[2] ? +m[2] : null]).filter((m) => m[0] >= 0);
        const yr = (String(t).match(/\d{4}/g) || []).map(Number);
        if (!ms.length || !yr.length) return null;
        const a = ms[0], b = ms[ms.length - 1];
        const ya = a[1] || yr[0], yb = b[1] || yr[yr.length - 1];
        const t0 = Date.UTC(ya, a[0], 1), t1 = Date.UTC(yb, b[0], 28);
        return new Date((t0 + t1) / 2);
      };
      const polls = D.municipal.map((q) => ({ q, t: when(q.when) })).filter((x) => x.t).sort((a, b) => a.t - b.t);
      const ELECT = new Date(Date.UTC(2026, 10, 4));
      const W = Math.round(Math.max(340, Math.min(720, box.clientWidth || 720))), H = W < 560 ? 300 : 360, m = { t: 16, r: W < 560 ? 112 : 122, b: 34, l: 40 }; // drawn at the box's own width, so text stays at its real size on phones
      const t0 = polls[0].t, span = ELECT - t0;
      const X = (t) => m.l + ((t - t0) / span) * (W - m.l - m.r), Y = (v) => m.t + (1 - v / 45) * (H - m.t - m.b);
      let g = "";
      for (let v = 0; v <= 40; v += 10) g += `<line class="po-lgrid" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="po-lax" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v}%</text>`;
      // month ticks: the first of each quarter, and election day
      for (let d = new Date(Date.UTC(t0.getUTCFullYear(), t0.getUTCMonth() + 1, 1)); d < ELECT; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
        if (d.getUTCMonth() % 3 || X(ELECT) - X(d) < 44) continue; // skip a month label that would collide with "4 Nov"
        g += `<text class="po-lax" x="${X(d)}" y="${H - m.b + 18}" text-anchor="middle">${MO[d.getUTCMonth()]}${d.getUTCMonth() === 0 ? " " + d.getUTCFullYear() : ""}</text>`;
      }
      g += `<line class="po-lelect" x1="${X(ELECT)}" x2="${X(ELECT)}" y1="${m.t}" y2="${H - m.b}"/><text class="po-lax po-lax-b" x="${X(ELECT)}" y="${H - m.b + 18}" text-anchor="middle">4 Nov</text>`;
      const R = D.result2026, labels = [];
      LP.forEach((p) => {
        const pts = polls.filter((x) => x.q.v[p] != null).map((x) => [X(x.t), Y(x.q.v[p]), x]);
        if (!pts.length) return;
        g += `<polyline class="po-lline" points="${pts.map((a) => a[0].toFixed(1) + "," + a[1].toFixed(1)).join(" ")}" stroke="${PC[p]}"/>`;
        if (R[p] != null) g += `<line class="po-lto" x1="${pts[pts.length - 1][0]}" y1="${pts[pts.length - 1][1]}" x2="${X(ELECT)}" y2="${Y(R[p])}" stroke="${PC[p]}"/>`;
        pts.forEach(([x, y, o]) => { g += `<circle class="po-ldot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${PC[p]}" data-t="${esc(`${P[o.q.org].name}, ${o.q.when}: ${NAME[p]} ${o.q.v[p]}%`)}" tabindex="0"/>`; });
        if (R[p] != null) {
          const x = X(ELECT), y = Y(R[p]);
          g += `<path class="po-ldot po-lres" d="M${x} ${y - 6.5}l6.5 6.5-6.5 6.5-6.5-6.5z" fill="${PC[p]}" data-t="${esc(`Result, 4 Nov 2026: ${NAME[p]} ${R[p]}%`)}" tabindex="0"/>`;
          labels.push({ p, y, v: R[p] });
        }
      });
      // direct labels at the result, nudged apart so they don't overlap
      labels.sort((a, b) => a.y - b.y);
      for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 15) labels[i].y = labels[i - 1].y + 15;
      labels.forEach((l) => { g += `<text class="po-llab" x="${X(ELECT) + 12}" y="${l.y + 4}"><tspan class="po-llab-p">${esc(NAME[l.p])}</tspan> ${l.v}%</text>`; });
      const leg = `<p class="po-legend">${LP.map((p) => `<span><i style="background:${PC[p]}"></i>${esc(NAME[p])}</span>`).join("")}<span><b class="po-ldia"></b>Result</span></p>`;
      box.innerHTML = leg + `<div class="po-lwrap"><svg class="po-lsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="National poll shares for the ANC, DA, MK, EFF and ActionSA from ${polls[0].q.when} to the result on 4 November 2026">${g}</svg></div>`;
    })();

    // national
    const NATP = ["ANC", "DA", "MK", "EFF", "ASA", "IFP", "FFP", "PA"];
    const finals = D.municipal.filter((q) => q.final);
    root.querySelector("#po-nat-chart").innerHTML = legend([...new Set(finals.map((q) => q.org))]) + strip(NATP, finals, D.result2026);
    root.querySelector("#po-nat-table").innerHTML = table(NATP, D.municipal, ["Result, 4 Nov 2026", "IEC, PR vote", D.result2026]);

    // metros
    const MP = ["DA", "ANC", "ASA", "MK", "EFF", "IFP", "FFP", "PA"];
    const codes = Object.keys(D.metros), chips = root.querySelector(".po-chips");
    chips.innerHTML = codes.map((c, i) => `<button type="button" role="tab" data-m="${c}" aria-selected="${i === 0}">${esc(D.metros[c].name)}</button>`).join("");
    function metro(code) {
      const m = D.metros[code], res = {}; (M[code] ? M[code].rows : []).forEach((r) => { if (MP.includes(r[0])) res[r[0]] = r[1]; });
      const fin = m.polls.filter((q) => q.final);
      chips.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", b.dataset.m === code));
      root.querySelector("#po-metro-chart").innerHTML = legend([...new Set(fin.map((q) => q.org))]) + strip(MP, fin, res);
      root.querySelector("#po-metro-table").innerHTML = table(MP, m.polls, [`Result, 4 Nov 2026`, "IEC, PR vote", res]);
    }
    chips.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) metro(b.dataset.m); });
    metro(codes[0]);

    // general election
    const GP = ["ANC", "DA", "MK", "EFF", "IFP", "PA"];
    root.querySelector("#po-ge-table").innerHTML = table(GP, D.general.polls, ["Result, 29 May 2024", "IEC", D.general.result2024]);

    // hover and tap tooltips on the dots
    const show = (b) => { const r = b.getBoundingClientRect(); tip.textContent = b.dataset.t; tip.hidden = false; const w = tip.offsetWidth; tip.style.left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8)) + scrollX + "px"; tip.style.top = r.top + scrollY - tip.offsetHeight - 8 + "px"; };
    root.addEventListener("mouseover", (e) => { const b = e.target.closest(".po-dot, .po-ldot"); if (b) show(b); });
    root.addEventListener("mouseout", (e) => { if (e.target.closest(".po-dot, .po-ldot")) tip.hidden = true; });
    root.addEventListener("click", (e) => { const b = e.target.closest(".po-dot, .po-ldot"); if (b) show(b); else tip.hidden = true; });
  }).catch(() => { root.querySelector("#po-nat-chart").innerHTML = '<p class="po-note">Could not load the polls.</p>'; });
})();

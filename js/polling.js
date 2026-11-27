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
    root.addEventListener("mouseover", (e) => { const b = e.target.closest(".po-dot"); if (b) show(b); });
    root.addEventListener("mouseout", (e) => { if (e.target.closest(".po-dot")) tip.hidden = true; });
    root.addEventListener("click", (e) => { const b = e.target.closest(".po-dot"); if (b) show(b); else tip.hidden = true; });
  }).catch(() => { root.querySelector("#po-nat-chart").innerHTML = '<p class="po-note">Could not load the polls.</p>'; });
})();

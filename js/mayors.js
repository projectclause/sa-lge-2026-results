// Mayors page: pick a metro; see who leads it after 2026 and every previous mayor, newest first.
(function () {
  "use strict";
  const PC = { ANC: "#f2c40f", DA: "#1f5fc2", MK: "#2c8c4e", EFF: "#d63a3a", IFP: "#9b9b9b", ASA: "#06b616", FFP: "#f08a24", GOOD: "#f47a20", UDM: "#8b5a2b", PA: "#7a4fb5", SACP: "#a3121f", RISE: "#6d5bd0", ATM: "#4b5563",
    AIC: "#9a9590", NA: "#3f9a6b", COPE: "#e07a95", NNP: "#e08a3c", NP: "#e08a3c", ACDP: "#8a6cc8", AJ: "#5fa34a" };
  const PN = { ANC: "African National Congress", DA: "Democratic Alliance", MK: "Umkhonto Wesizwe Party", EFF: "Economic Freedom Fighters", ASA: "ActionSA", IFP: "Inkatha Freedom Party", FFP: "VF Plus",
    UDM: "United Democratic Movement", PA: "Patriotic Alliance", AIC: "African Independent Congress", NA: "Northern Alliance", COPE: "Congress of the People", NNP: "New National Party", NP: "National Party", ACDP: "African Christian Democratic Party", AJ: "Al Jama-ah" };
  const col = (id) => PC[id] || "#8a8a8a";
  const short = (id) => (id === "ASA" ? "ActionSA" : id === "FFP" ? "VF Plus" : id);
  const norm = (p) => ({ MKP: "MK", ActionSA: "ASA", "VF PLUS": "FFP" }[p] || p);
  const LOGO = { ANC: "anc", DA: "da", MK: "mk", EFF: "eff", ASA: "asa", IFP: "ifp", FFP: "ffp", SACP: "sacp", PA: "pa", UDM: "udm", ATM: "atm", RISE: "rise" };
  const CHECK = '<i class="tk-ck" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="#121212" stroke-width="2.4" stroke-linecap="square"/></svg></i>';
  // mayors elected by the new councils after the 2026 election (as confirmed so far)
  const NEW = {
    CPT: { n: "Geordin Hill-Lewis", p: "DA", same: true, how: "Re-elected. The DA won Cape Town outright." },
    JHB: { n: "Herman Mashaba", p: "ASA", img: "assets/mayors/johannesburg/herman-mashaba.jpg", expected: true, how: "Expected to be elected by the new council with ANC and MK support. He was mayor before, from 2016 to 2019." },
    TSH: { n: "Nasiphi Moya", p: "ASA", same: true, expected: true, how: "Expected to be elected Mayor of Tshwane (Pretoria) by the new council. She has been mayor since September 2024." }
  };
  const ini = (n) => n.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const photo = (img, n, p, cls) => img ? `<img class="${cls}" src="${img}" alt="" loading="lazy">` : `<span class="${cls} my-ini" style="background:${col(p)}">${ini(n)}</span>`;

  function hemi(N) {
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

  Promise.all([
    fetch("data/mayors-history.json").then((r) => r.json()),
    fetch("data/municipalities.geojson").then((r) => r.json()),
    fetch("data/mayors.json").then((r) => r.json()).catch(() => ({}))
  ]).then(([HIST, fc, CANDS]) => {
    const M = {}; fc.features.forEach((f) => { M[f.properties.id] = f.properties; });
    const chips = document.querySelector(".my-chips"), box = document.querySelector(".my-city");
    const pick = () => { const h = location.hash.slice(1); return HIST.find((c) => c.slug === h) || HIST[0]; };

    function council(code) {
      const seats = {}; ((M[code] || {}).seats || []).forEach(([p, n]) => { seats[norm(p)] = (seats[norm(p)] || 0) + n; });
      const ss = Object.entries(seats).sort((a, b) => b[1] - a[1]), N = ss.reduce((a, s) => a + s[1], 0), need = Math.floor(N / 2) + 1;
      const { pts, dot } = hemi(N); let i = 0, dots = "";
      ss.forEach(([id, n]) => { for (let q = 0; q < n; q++, i++) { const p = pts[i]; dots += `<circle cx="${(1 + p.x).toFixed(3)}" cy="${(1 - p.y).toFixed(3)}" r="${dot.toFixed(3)}" fill="${col(id)}"/>`; } });
      const top = ss[0] || ["", 0];
      return { N, need, top, maj: top[1] >= need, svg: `<svg class="my-hemi" viewBox="-0.03 -0.03 2.06 1.06" aria-hidden="true">${dots}<line x1="1" x2="1" y1="-0.03" y2="0.5" stroke="#121212" stroke-width="0.012" stroke-dasharray="0.04 0.03"/></svg>` };
    }

// timeline: one stretch per mayor, as long as their time in office, coloured by party
function timeline(C) {
  const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const span = (y) => {
    const part = y.split("·")[0];
    const [a, b] = part.split("–");
    const when = (t, fallbackYear) => { const yr = (t.match(/\d{4}/) || [fallbackYear])[0], mo = (t.match(/[A-Za-z]{3}/) || [""])[0].toLowerCase(); return +yr + (MON[mo] != null ? MON[mo] / 12 : 0); };
    const endYear = (b || a).match(/\d{4}/) ? (b || a).match(/\d{4}/)[0] : 2026.9;
    const start = when(a, endYear), end = !b ? start + 0.5 : /now/.test(b) ? 2026.9 : when(b, endYear) + (/[A-Za-z]{3}/.test(b) ? 0.08 : 0);
    return [start, Math.max(end, start + 0.25)];
  };
  const rows = C.list.map((r) => ({ r, s: span(r.y) }));
  const t0 = Math.floor(Math.min(...rows.map((x) => x.s[0]))), t1 = 2027, W = t1 - t0;
  const x = (t) => ((t - t0) / W * 100).toFixed(2) + "%";
  const ticks = []; for (let y = Math.ceil(t0 / 5) * 5; y <= 2025; y += 5) ticks.push(y);
  // stack photos on extra rows wherever terms are too close together to sit side by side
  const tlW = Math.max(900, ((document.querySelector(".my-city") || {}).clientWidth || 900) - 36), GAP = 92 / tlW * 100, lastAt = [];
  rows.forEach((o) => { o.mid = ((o.s[0] + o.s[1]) / 2 - t0) / W * 100; let k = 0; while (lastAt[k] != null && o.mid - lastAt[k] < GAP) k++; o.row = k; lastAt[k] = o.mid; });
  const nRows = Math.max(...rows.map((o) => o.row)) + 1, RH = 70, pinsH = nRows * RH + 8;
  return `<div class="my-tl" aria-label="Timeline of ${C.list.length} mayors">
    <div class="my-tl-pins" style="height:${pinsH}px">${rows.map(({ r, s, row }, i) => `<span class="my-tl-pin" style="left:calc(${x((s[0] + s[1]) / 2)} - 44px);top:${row * RH}px;--stem:${(nRows - 1 - row) * RH + 6}px" title="${r.n} · ${r.y}">${photo(r.img, r.n, r.p, "my-tl-ph")}<b>${i + 1} ${r.n.split(" ").slice(1).join(" ") || r.n}</b></span>`).join("")}</div>
    <div class="my-tl-bar">${rows.map(({ r, s }) => `<span style="left:${x(s[0])};width:${((s[1] - s[0]) / W * 100).toFixed(2)}%;background:${col(r.p)}" title="${r.n} · ${short(r.p)} · ${r.y}"></span>`).join("")}</div>
    <div class="my-tl-ticks">${ticks.map((y) => `<span style="left:${x(y)}">${y}</span>`).join("")}<span style="left:${x(2026)}">2026</span></div>
  </div>`;
}
function render() {
      const C = pick(), cur = C.list.find((r) => r.cur), nw = NEW[C.code], k = council(C.code);
      chips.innerHTML = HIST.map((c) => `<a class="my-chip" role="tab" href="#${c.slug}" aria-selected="${c === C}">${c.city}</a>`).join("");
      const now = nw
        ? `<div class="my-now">${photo(nw.same ? cur && cur.img : nw.img, nw.n, nw.p, "my-ph")}
             <div><p class="my-lab">${nw.expected ? "Expected mayor · council vote pending" : CHECK + "Mayor after the 2026 election"}</p><p class="my-name">${nw.n}</p>
             <p class="my-party"><i style="background:${col(nw.p)}"></i>${PN[nw.p] || nw.p}</p><p class="my-how">${nw.how}</p></div></div>`
        : `<div class="my-now my-tbc"><div><p class="my-lab">Council vote pending</p>
             <p class="my-how">The new council elects the mayor at its first sitting.${cur ? ` <b>${cur.n}</b> (${short(cur.p)}) stays in office until then.` : ""} Leading mayoral candidates by party vote:</p>
             <div class="my-cands">${(CANDS[C.code] || []).filter((c) => c[3] >= 0 && !/^(No mayoral|Not named)/i.test(c[0])).slice(0, 3).map(([n, id, img, v]) => `<span class="my-cand">${img ? `<img src="${img}" alt="">` : `<span class="my-ini" style="background:${col(norm(id))}">${ini(n)}</span>`}<b>${n}</b><em>${short(norm(id))} · ${v.toFixed(1)}%</em></span>`).join("")}</div></div></div>`;
      // previous mayors, newest first; a re-elected mayor's own entry stays as "in office"
      const past = C.list.slice().reverse().map((r, i, arr) => {
        const num = C.list.length - i;
        let tag = "", end = r.end ? r.end[1] : "", ok = r.end ? r.end[0] : 1;
        if (r.cur) {
          if (nw && nw.same && nw.n === r.n) { tag = "In office"; end = nw.expected ? "Expected to be elected again by the new council" : "Re-elected after the 2026 election"; ok = nw.expected ? 2 : 1; }
          else if (nw && !nw.expected) { tag = "Previous"; end = `Succeeded by ${nw.n} after the 2026 election`; ok = 1; }
          else { tag = "Outgoing"; end = "In office until the new council elects a mayor"; ok = 2; }
        }
        return `<li class="my-tile${r.cur ? " cur" : ""}">
            <span class="my-num">${String(num).padStart(2, "0")}</span>
            ${photo(r.img, r.n, r.p, "my-tph")}
            <span class="my-tt"><b>${r.n}</b><span class="my-tp"><i style="background:${col(r.p)}"></i>${short(r.p)} · ${r.y.replace("now", nw && !nw.same && !nw.expected && r.cur ? "Nov 2026" : "now")}</span>
              ${end ? `<span class="my-end ${ok === 1 ? "ok" : ok === 2 ? "wait" : "no"}">${ok === 1 ? "✓" : ok === 2 ? "•" : "✕"} ${end}</span>` : ""}
              ${tag ? `<em class="my-tag">${tag}</em>` : ""}</span>
          </li>`;
      }).join("");
      const parties = [...new Set(C.list.map((r) => r.p))];
      box.innerHTML = `
        <header class="my-ch"><h2>${C.title}</h2><p>${C.prov} · ${C.list.length} mayors since the first democratic council</p></header>
        ${timeline(C)}
        <div class="my-2026">
          <div class="my-council">${k.svg}<p class="my-res">${LOGO[k.top[0]] ? `<img src="assets/logos-sm/${LOGO[k.top[0]]}.png" alt="">` : ""}${k.maj ? `${PN[k.top[0]] || k.top[0]} won a majority with ${k.top[1]} of ${k.N} seats` : `No majority · ${PN[k.top[0]] || k.top[0]} largest with ${k.top[1]} of ${k.N} seats`}</p></div>
          ${now}
        </div>
        <h3 class="my-sub">Previous mayors</h3>
        <p class="my-key">${parties.map((p) => `<span><i style="background:${col(p)}"></i>${PN[p] || p}</span>`).join("")}</p>
        <ol class="my-list">${past}</ol>
        ${C.note ? `<p class="my-note">${C.note}</p>` : ""}`;
    }
    addEventListener("hashchange", render);
    render();
  }).catch(() => { document.querySelector(".my-city").innerHTML = '<p class="dm-loading">Could not load the mayors.</p>'; });
})();

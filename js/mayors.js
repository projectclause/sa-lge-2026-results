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
    ETH: { n: "Mxolisi Phakathi", p: "MK", img: "assets/journalists/mxolisi-phakathi.jpg", how: "Elected on 27 November 2026 with the ANC’s support, in an MK, ANC and ActionSA coalition. He succeeds the ANC’s Cyril Xaba." },
    NMA: { n: "Retief Odendaal", p: "DA", img: "assets/mayors/nelson-mandela-bay/retief-odendaal.jpg", how: "Elected by the new council under the DA-led multiparty coalition. A comeback: he was mayor from 2022 to 2023, and succeeds the ANC’s Babalwa Lobishe." },
    BUF: { n: "Princess Faku", p: "ANC", same: true, how: "Re-elected by the new council on Tuesday, 24 November 2026, with the EFF’s backing, beating the UDM’s Nqabayomzi Kwankwa. She has been mayor since March 2023." },
    TSH: { n: "Nasiphi Moya", p: "ASA", same: true, how: "Re-elected by the new council on Thursday, 26 November 2026, under a coalition deal between ActionSA, the ANC, the EFF and MK." },
    EKU: { n: "Mziyanda Mketsu", p: "ANC", img: "assets/mayors/ekurhuleni/mziyanda-mketsu.png",
      how: "Elected by the new council on Friday, 27 November 2026, under a coalition deal between the ANC, ActionSA, the EFF, MK and the SACP." },
  };
  // each metro's speaker, chosen by the new council at its first sitting
  const SPK = {
    JHB: { lab: "Speaker elected", n: "Adolph Marema", p: "ANC", img: "assets/mayors/johannesburg/adolph-marema.jpg",
      how: "The ANC’s Adolph Marema was elected Speaker of Johannesburg on Friday, 27 November 2026, beating the DA’s Alex Christians." },
    CPT: { lab: "Speaker re-elected", n: "Felicity Purchase", p: "DA", img: "assets/mayors/cape-town/felicity-purchase.jpg",
      how: "The DA’s Felicity Purchase was re-elected Speaker of Cape Town by the new council." },
    ETH: { lab: "Speaker re-elected", n: "Thabani Nyawose", p: "ANC", img: "assets/mayors/ethekwini/thabani-nyawose.jpg",
      how: "The ANC’s Thabani Nyawose was re-elected Speaker of eThekwini when the new council reconvened on Friday, 27 November 2026, before it elected MK’s Mxolisi Phakathi as mayor." },
    TSH: { lab: "Speaker elected", n: "Naeem Patel", p: "ANC", img: "assets/mayors/tshwane/naeem-patel.jpg",
      how: "The ANC’s Naeem Patel was elected Speaker of Tshwane with 119 votes on Thursday, 26 November 2026." },
    EKU: { lab: "Speaker re-elected", n: "Nthabiseng Tshivhenga", p: "EFF", img: "assets/mayors/ekurhuleni/nthabiseng-tshivhenga.png",
      how: "The EFF’s Nthabiseng Tshivhenga was re-elected Speaker of Ekurhuleni by the new council under the coalition deal, with 142 votes, IOL reports." },
    NMA: { lab: "Speaker elected", n: "Marshall von Buchenroder", p: "DA",
      how: "The DA’s Marshall von Buchenroder was elected Speaker of Nelson Mandela Bay by the new council." },
    BUF: { lab: "Speaker", pending: true, how: "The new council has not yet elected its speaker." },
    MAN: { lab: "Speaker", pending: true, how: "The new council has not yet elected its speaker." }
  };
  // handover cards at the top of a city, newest change first: a new deputy mayor (previous -> new), or a mayor returned
  // by the new council. "old" is the left side, "oldSub" its caption; "lab" is the card's label.
  const DEP = {
    JHB: { lab: "Deputy mayor elected", n: "Thapelo Radebe", p: "ANC", img: "assets/mayors/johannesburg/thapelo-radebe.jpg",
      how: "The ANC’s Thapelo Radebe was elected Deputy Mayor of Johannesburg on Friday, 27 November 2026, under the coalition deal that made Herman Mashaba mayor, IOL reports." },
    NMA: { lab: "Expected deputy mayor", n: "Lance Grootboom", p: "ACDP", img: "assets/faces/grootboom-acdp.png",
      how: "The ACDP’s Lance Grootboom is expected to become Deputy Mayor of Nelson Mandela Bay under the DA-led coalition, once the council completes its vote." },
    EKU: { lab: "Deputy mayor", n: "Xolani Khumalo", star: true, p: "ASA", img: "assets/faces/circ/khumalo.png",
      how: "ActionSA leader Herman Mashaba has confirmed Xolani Khumalo as the party’s choice for Deputy Mayor of Ekurhuleni under its coalition deal, IOL reports.", foot: "* Position to be made in Johannesburg" },
    BUF: { lab: "Mayor re-elected", n: "Princess Faku", p: "ANC", img: "assets/mayors/buffalo-city/princess-faku.jpg", prev: "Princess Faku", prevSub: "Mayor since March 2023",
      how: "The new council re-elected the ANC’s Princess Faku as Mayor of Buffalo City on Tuesday, 24 November 2026, with the EFF’s backing, over the UDM’s Nqabayomzi Kwankwa." },
    CPT: { n: "Xanthea Limberg", p: "DA", img: "assets/mayors/cape-town/xanthea-limberg.jpg", prev: "Eddie Andrews",
      how: "Elected Deputy Mayor of Cape Town by the new council, succeeding the DA’s Eddie Andrews. The DA named her as its candidate on 16 November, alongside Geordin Hill-Lewis for mayor." },
    TSH: { n: "Omphile Maotwe", p: "EFF", img: "assets/faces/circ/maotwe.png", prev: "Eugene Modise",
      how: "Elected Deputy Mayor of Tshwane unopposed by the new council on Thursday, 26 November 2026, under the ActionSA, ANC, EFF and MK deal that re-elected Nasiphi Moya as mayor. She succeeds the ANC’s Eugene Modise." },
  };
  // where a hung council is leaning before its mayoral vote: a needle, like the NYT's election needle
  const ZONE = { "-2": "Likely", "-1": "Leans", "0": "Toss-up", "1": "Leans", "2": "Likely" };
  function needle(L, k) {
    const C0 = 100, R1 = 92, R0 = 60, rad = (d) => d * Math.PI / 180;
    const pt = (r, d) => `${(C0 + r * Math.cos(rad(d))).toFixed(2)} ${(C0 - r * Math.sin(rad(d))).toFixed(2)}`;
    const band = (d0, d1, fill, op) => `<path d="M${pt(R1, d0)} A${R1} ${R1} 0 0 1 ${pt(R1, d1)} L${pt(R0, d1)} A${R0} ${R0} 0 0 0 ${pt(R0, d0)} Z" fill="${fill}" fill-opacity="${op}" stroke="#fff" stroke-width="1.5"/>`;
    const ca = col(L.a.p), cb = col(L.b.p), ang = 90 - L.lean * 36;
    const bands = band(180, 144, ca, 1) + band(144, 108, ca, .42) + band(108, 72, "#c9ccd2", .55) + band(72, 36, cb, .42) + band(36, 0, cb, 1);
    const names = (b) => b.map(short), seats = (b) => b.reduce((a, id) => a + (k.seats[id] || 0), 0);
    const side = L.lean < 0 ? L.a : L.lean > 0 ? L.b : null;
    const call = side ? `${ZONE[L.lean]} ${side.label}` : "Toss-up";
    const list = (a) => a.length < 2 ? a[0] : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
    const seatLine = (b) => { const n = seats(b.bloc); return `${list(names(b.bloc))} ${b.bloc.length > 1 ? "hold" : "holds"} ${n} of ${k.N} seats${n >= k.need ? "" : ` · ${k.need} needed`}`; };
    return { call, html: `
      <svg class="my-ndl" viewBox="0 0 200 108" role="img" aria-label="Needle: ${call}">
        ${bands}
        <text x="${pt(76, 162).split(" ")[0]}" y="${pt(76, 162).split(" ")[1]}" class="my-ndl-z my-ndl-zw">LIKELY</text>
        <text x="${pt(76, 126).split(" ")[0]}" y="${pt(76, 126).split(" ")[1]}" class="my-ndl-z">LEANS</text>
        <text x="100" y="${pt(76, 90).split(" ")[1]}" class="my-ndl-z">TOSS-UP</text>
        <text x="${pt(76, 54).split(" ")[0]}" y="${pt(76, 54).split(" ")[1]}" class="my-ndl-z">LEANS</text>
        <text x="${pt(76, 18).split(" ")[0]}" y="${pt(76, 18).split(" ")[1]}" class="my-ndl-z my-ndl-zw">LIKELY</text>
        <g class="my-ndl-arm" style="--a:${(90 - ang).toFixed(1)}deg"><path d="M97.6 100 L100 14 L102.4 100 Z" fill="#121212"/></g>
        <circle cx="100" cy="100" r="6.5" fill="#121212"/><circle cx="100" cy="100" r="2.4" fill="#fff"/>
      </svg>
      <div class="my-ndl-ends"><span><i style="background:${ca}"></i>${L.a.label}</span><span>${L.b.label}<i style="background:${cb}"></i></span></div>
      <p class="my-ndl-call">${side ? `<i style="background:${col(side.p)}"></i>` : ""}${call}</p>
      <p class="my-ndl-seats">${seatLine(L.a)}<br>${seatLine(L.b)}</p>` };
  }
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
    fetch("data/mayors.json").then((r) => r.json()).catch(() => ({})),
    fetch("data/mayor-lean.json", { cache: "no-cache" }).then((r) => r.json()).catch(() => ({}))
  ]).then(([HIST, fc, CANDS, LEANS]) => {
    const M = {}; fc.features.forEach((f) => { M[f.properties.id] = f.properties; });
    const chips = document.querySelector(".my-chips"), box = document.querySelector(".my-city");
    // phones: the needle comes first, right under the LIVE line (CSS shows it only on small screens)
    const live = document.querySelector(".live"), slot = document.createElement("section");
    slot.className = "my-ndl-slot"; slot.setAttribute("aria-label", "Where the council leans");
    if (live) live.after(chips);
    chips.after(slot);
    // phones: LIVE, then the city carousel, then the needle; the intro line moves below them
    const dek = document.querySelector(".my-dek"), small = matchMedia("(max-width: 720px)");
    const order = () => { if (!dek) return; if (small.matches) slot.after(dek); else chips.before(dek); };
    order(); small.addEventListener("change", order);
    const pick = () => { const h = location.hash.slice(1); return HIST.find((c) => c.slug === h) || HIST[0]; };

    function council(code) {
      const seats = {}; ((M[code] || {}).seats || []).forEach(([p, n]) => { seats[norm(p)] = (seats[norm(p)] || 0) + n; });
      const ss = Object.entries(seats).sort((a, b) => b[1] - a[1]), N = ss.reduce((a, s) => a + s[1], 0), need = Math.floor(N / 2) + 1;
      const { pts, dot } = hemi(N); let i = 0, dots = "";
      ss.forEach(([id, n]) => { for (let q = 0; q < n; q++, i++) { const p = pts[i]; dots += `<circle cx="${(1 + p.x).toFixed(3)}" cy="${(1 - p.y).toFixed(3)}" r="${dot.toFixed(3)}" fill="${col(id)}"/>`; } });
      const top = ss[0] || ["", 0];
      return { N, need, top, seats, maj: top[1] >= need, svg: `<svg class="my-hemi" viewBox="-0.03 -0.03 2.06 1.06" aria-hidden="true">${dots}<line x1="1" x2="1" y1="-0.03" y2="0.5" stroke="#121212" stroke-width="0.012" stroke-dasharray="0.04 0.03"/></svg>` };
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
function panel(D, def, cls = "") {
  if (!D) return "";
  if (D.pending) return `<div class="my-dep my-pend ${cls}"><p class="my-lab">${D.lab || def}</p><p class="my-how">${D.how}</p></div>`;
  return `<div class="my-dep ${cls}">
          <p class="my-lab">${/^Expected/.test(D.lab || "") ? "" : CHECK}${D.lab || def}</p>
          <div class="my-dep-row">${D.prev ? `<span class="my-dep-old${D.prev === D.n ? " same" : ""}"><b>${D.prev}</b><span>${D.prevSub || "Outgoing deputy mayor"}</span></span><span class="my-dep-arw" aria-hidden="true">→</span>` : ""}
            <span class="my-dep-new">${photo(D.img, D.n, D.p, "my-ph")}<span><b class="my-name">${D.n}${D.star ? "*" : ""}</b><span class="my-party"><i style="background:${col(D.p)}"></i>${PN[D.p] || D.p}</span></span></span></div>
          <p class="my-how">${D.how}</p>${D.foot ? `<p class="my-dep-foot">${D.foot}</p>` : ""}</div>`;
}
function render() {
      const C = pick(), cur = C.list.find((r) => r.cur), nw = NEW[C.code], k = council(C.code), L = !nw && (LEANS.metros || {})[C.code], nd = L && needle(L, k);
      chips.innerHTML = HIST.map((c) => `<a class="my-chip" role="tab" href="#${c.slug}" aria-selected="${c === C}">${c.city}</a>`).join("");
      // keep the chosen city in view in the swipeable row (sideways only, the page does not jump)
      const on = chips.querySelector('[aria-selected="true"]');
      if (on && chips.scrollWidth > chips.clientWidth) chips.scrollLeft = on.offsetLeft - chips.offsetLeft - (chips.clientWidth - on.offsetWidth) / 2;
      const now = nw
        ? `<div class="my-now">${photo(nw.same ? cur && cur.img : nw.img, nw.n, nw.p, "my-ph")}
             <div><p class="my-lab">${nw.expected ? nw.label || "Expected mayor · council vote pending" : CHECK + "Mayor after the 2026 election"}</p><p class="my-name">${nw.n}</p>
             <p class="my-party"><i style="background:${col(nw.p)}"></i>${PN[nw.p] || nw.p}</p><p class="my-how">${nw.how}</p></div></div>`
        : nd
        ? `<div class="my-now my-tbc my-lean"><div><p class="my-lab">Council vote pending · Where it leans</p>
             ${nd.html}
             <p class="my-how">${L.why}${cur ? ` <b>${cur.n}</b> (${short(cur.p)}) stays in office until the vote.` : ""}</p>
             <ul class="my-ndl-src">${L.src.map(([o, d, h, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${h}</a><span>${o} · ${d}</span></li>`).join("")}</ul>
             <p class="my-ndl-note">Based on news reports, not a forecast. The needle moves as deals are reported.</p></div></div>`
        : `<div class="my-now my-tbc"><div><p class="my-lab">Council vote pending</p>
             <p class="my-how">The new council elects the mayor at its first sitting.${cur ? ` <b>${cur.n}</b> (${short(cur.p)}) stays in office until then.` : ""}</p></div></div>`;
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
      slot.innerHTML = nd ? `<div class="my-ndl-card"><p class="my-ndl-city">${C.title}</p>${now}</div>` : "";
      box.innerHTML = `
        <header class="my-ch"><h2>${C.title}</h2><p>${C.prov} · ${C.list.length} mayors since the first democratic council</p></header>

        <div class="my-2026">
          <div class="my-council">${k.svg}<p class="my-res">${LOGO[k.top[0]] ? `<img src="assets/logos-sm/${LOGO[k.top[0]]}.png" alt="">` : ""}${k.maj ? `${PN[k.top[0]] || k.top[0]} won a majority with ${k.top[1]} of ${k.N} seats` : `No majority · ${PN[k.top[0]] || k.top[0]} largest with ${k.top[1]} of ${k.N} seats`}</p></div>
          ${now}
        </div>
        ${panel(DEP[C.code], "New deputy mayor")}
        ${panel(SPK[C.code], "Speaker", "my-spk")}
        <h3 class="my-sub">Previous mayors</h3>
        <p class="my-key">${parties.map((p) => `<span><i style="background:${col(p)}"></i>${PN[p] || p}</span>`).join("")}</p>
        <ol class="my-list">${past}</ol>
        ${C.note ? `<p class="my-note">${C.note}</p>` : ""}`;
      // the Share menu's image: this city's mayors card
      window.SHARE = window.SHARE || {};
      window.SHARE.card = () => ({
        type: "mayors", file: C.slug + "-mayors", title: C.title,
        sub: `${C.prov} · ${C.list.length} mayors since the first democratic council`,
        since: (C.list[0].y.match(/\d{4}/) || [""])[0],
        now: nw
          ? { label: nw.expected ? nw.label || "Expected mayor · council vote pending" : "Mayor after the 2026 election", n: nw.n, party: PN[nw.p] || nw.p, color: col(nw.p), img: nw.same ? cur && cur.img : nw.img, how: nw.how }
          : { label: "Council vote pending", how: nd ? `${nd.call}. ${L.why}` : `The new council elects the mayor at its first sitting.${cur ? ` ${cur.n} (${short(cur.p)}) stays in office until then.` : ""}` },
        list: C.list.slice().reverse().map((r, i) => ({ num: C.list.length - i, n: r.n, party: short(r.p), color: col(r.p), y: r.y, img: r.img, cur: !!r.cur,
          tag: !r.cur ? "" : nw && nw.same && nw.n === r.n ? "In office" : nw && !nw.expected ? "Previous" : "Outgoing" }))
      });
    }
    // when Mashaba is confirmed elected (js/elected.js), Johannesburg shows him as mayor
    if (window.ELECTED_READY) window.ELECTED_READY.then((e) => { if (e.JHB && e.JHB.elected && window.ELECTED_TEXT) { NEW.JHB = window.ELECTED_TEXT.JHB(e.JHB).mayors; render(); } });
    addEventListener("hashchange", render);
    render();
  }).catch(() => { document.querySelector(".my-city").innerHTML = '<p class="dm-loading">Could not load the mayors.</p>'; });
})();

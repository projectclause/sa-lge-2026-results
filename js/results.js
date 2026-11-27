// 2026 Results page: national vote, and who won each metro / large city.
// party names are always shown in full; initials only stand in for a missing logo
window.PRETTY = (id) => {
  const t = String(id).split(" - ")[0].trim();
  return t.length > 5 && t === t.toUpperCase() ? t.toLowerCase().replace(/(^|[\s(-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/'S\b/g, "'s") : t;
};
window.INITIALS = (id) => String(id).split(/\s+/).filter((w) => !/^(of|the|for|and|de)$/i.test(w)).map((w) => w[0]).join("").toUpperCase().slice(0, 4);
(function () {
  "use strict";
  const { col, pn } = window.SAPARTY;
  const FULL = {
    ANC: "African National Congress", DA: "Democratic Alliance", MK: "Umkhonto Wesizwe Party", EFF: "Economic Freedom Fighters",
    ASA: "ActionSA", IFP: "Inkatha Freedom Party", FFP: "Freedom Front Plus", SACP: "South African Communist Party",
    PA: "Patriotic Alliance", UDM: "United Democratic Movement", RISE: "Rise Mzansi", ATM: "African Transformation Movement",
    ACDP: "African Christian Democratic Party", GOOD: "GOOD", ALJAMA: "Al Jama-ah"
  };
  const LOGO = { ANC: "anc", DA: "da", MK: "mk", EFF: "eff", ASA: "asa", IFP: "ifp", FFP: "ffp", SACP: "sacp", PA: "pa", UDM: "udm" };
  const norm = (p) => ({ MKP: "MK", ActionSA: "ASA", "VF PLUS": "FFP" }[p] || p);
  const full = (id) => FULL[id] || id;
  const fmt = (v) => Math.round(v).toLocaleString("en-ZA").replace(/[,   ]/g, " ");
  const logo = (id) => LOGO[id] ? `<span class="rs-logo"><img src="assets/logos-sm/${LOGO[id]}.png" alt=""></span>` : `<span class="rs-logo rs-logo-t" style="color:${col(id)}">${id.slice(0, 3)}</span>`;

  // National vote, IEC final (ward + PR ballots combined), with party leaders and change from 2021
  const NAT = [["ANC", 30.75, 9162166], ["DA", 24.65, 7345090], ["MK", 9.77, 2910737], ["EFF", 6.22, 1852891], ["ASA", 5.67, 1688874], ["IFP", 4.69, 1397566]];
  const OTH = [18.25, 5436501];
  const OTHERS = [["FFP", 2.97], ["SACP", 2.47], ["PA", 2.02]];
  const FACE = { ANC: "ramaphosa", DA: "hill-lewis", MK: "zuma", EFF: "malema", ASA: "mashaba", IFP: "hlabisa", FFP: "groenewald", SACP: "mapaila", PA: "gayton-mckenzie" };
  const CHG = { ANC: -14.8, DA: 2.8, MK: 9.8, EFF: -4.1, ASA: 3.4, IFP: -1.6, FFP: 0.7, SACP: null, PA: 0.6 };
  const chg = (id) => {
    if (!(id in CHG)) return "";
    const d = CHG[id];
    return d == null ? '<span class="rs-chg rs-chg-none">— no 2021 result</span>'
      : `<span class="rs-chg ${d < 0 ? "rs-chg-down" : "rs-chg-up"}">${d < 0 ? "▼" : "▲"} ${d < 0 ? "−" : "+"}${Math.abs(d).toFixed(1)} pts</span>`;
  };
  const face = (id) => FACE[id] ? `<span class="rs-face"><img src="assets/faces/${FACE[id]}.png" alt="" loading="lazy"></span>` : "";
  const row = (id, name, pct, votes, extra = "") => `
    <div class="rs-party${extra}${FACE[id] ? " rs-has-face" : ""}">
      ${id === "OTH" ? '<span class="rs-logo rs-logo-t">OTH</span>' : logo(id)}${face(id)}
      <span class="rs-pn">${name}</span>
      <span class="rs-pv"><b>${pct.toFixed(2)}%</b>${votes ? `<span>${fmt(votes)} votes</span>` : ""}${chg(id)}</span>
      <span class="rs-bar"><i style="width:${(pct / 50) * 100}%"></i></span>
    </div>`;
  // all named parties in order, then everyone else at the end
  const rest = OTH[0] - OTHERS.reduce((a, x) => a + x[1], 0);
  const pEl = document.querySelector(".rs-parties");
  const natHTML = () => NAT.map(([id, p, v]) => row(id, full(id), p, v)).join("") +
    OTHERS.map(([id, p]) => row(id, full(id), p, 0)).join("") +
    row("OTH", "Other parties and candidates", rest, 0) +
    `<p class="rs-oth-n">More than 300 other parties and independent candidates.</p>`;
  const hEl = document.getElementById("rs-nat-h"), fEl = document.querySelector(".rs-nat .rs-foot");
  const NATFOOT = fEl.innerHTML;
  let shown = "ZA";
  window.SHARE = window.SHARE || {};
  const FOOT = ["2026 Local Election Results · IEC final results, declared 8 November 2026."];
  const natShare = () => ({
    kicker: "2026 Local Elections", area: "South Africa", headline: "National results",
    note: "Declared by the IEC · 23 696 of 23 696 voting districts counted",
    rows: NAT.map(([id, p, v]) => ({ logo: `assets/logos-sm/${LOGO[id]}.png`, color: col(id), name: full(id), votes: v, pct: p }))
      .concat(OTHERS.map(([id, p]) => ({ logo: `assets/logos-sm/${LOGO[id]}.png`, color: col(id), name: full(id), pct: p })))
      .concat([{ badge: "OTH", color: "#9aa0a6", name: "Other parties and candidates", pct: OTH[0] - OTHERS.reduce((a, x) => a + x[1], 0) }]),
    foot: FOOT.concat(["Votes on the ward and party ballots added together, so each voter counts more than once."]), file: "south-africa-2026-results"
  });
  window.SHARE.panel = natShare;
  // breaking news: when set, this headline leads the home page whichever council is showing
  let BREAKING = ["Voting underway", "across metros in South Africa", "MK’s Mxolisi Phakathi has been elected Mayor of eThekwini with the ANC’s support, and councils in Johannesburg and Ekurhuleni meet today, Friday 27 November, to elect theirs. The DA’s Retief Odendaal has been elected Mayor of Nelson Mandela Bay, and ActionSA’s Nasiphi Moya was re-elected Mayor of Tshwane on Thursday. <a href=\"coalitions.html\">Follow it in the Coalitions Tracker →</a>"];
  // when Mashaba is confirmed elected (js/elected.js), "Mashaba Makes History" leads the home page
  let JHB_NOW = null;
  if (window.ELECTED_READY) window.ELECTED_READY.then((e) => {
    if (!(e.JHB && e.JHB.elected) || !window.ELECTED_TEXT) return;
    const t = window.ELECTED_TEXT.JHB(e.JHB); BREAKING = t.breaking; JHB_NOW = t.headline; putBreaking();
  });
  function putBreaking() {
    const el = document.querySelector(".rs-headline"); el.hidden = !BREAKING;
    if (BREAKING) el.innerHTML = `<span class="hl-1">${BREAKING[0]}</span><span class="hl-2">${BREAKING[1]}</span><span class="hl-3">${BREAKING[2]}</span>`;
  }
  function showNational() {
    putBreaking();
    window.SHARE.panel = natShare;
    shown = "ZA";
    hEl.innerHTML = "<b>National results</b>";
    pEl.innerHTML = natHTML();
    fEl.innerHTML = NATFOOT;
    document.dispatchEvent(new CustomEvent("council-area", { detail: null }));
    window.SHARE.council = null;
  }
  showNational();

  // one council's results: candidate (or party leader) photo, party logo, votes, share bar and seats won
  let METROPR = null;
  const SHORTN = { ASA: "ActionSA", FFP: "VF Plus", MK: "MK", ALJAMA: "Al Jama-ah", AJ: "Al Jama-ah", RISE: "Rise Mzansi", IND: "Independents" };
  const sname = (id) => SHORTN[id] || window.PRETTY(id);
  const LOGOX = Object.assign({ ATM: "atm", ACDP: "acdp", PAC: "pac", AJ: "aj", ALJAMA: "aj", RISE: "rise", GOOD: "good", AIC: "aic", NFP: "nfp", BOSA: "bosa", "NATIONAL COLOURED CONGRESS": "ncc", "National Coloured Congress": "ncc" }, LOGO);
  const clogo = (id) => LOGOX[id] ? `<span class="rs-logo"><img src="assets/logos-sm/${LOGOX[id]}.png" alt=""></span>` : `<span class="rs-logo rs-logo-t" style="color:${col(id)}">${id.length > 5 ? window.INITIALS(id) : id}</span>`;
  const PERSON = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="17" r="7.5" fill="#c9ccd1"/><path d="M8 40c1.5-8 7-12 14-12s12.5 4 14 12" fill="#c9ccd1"/></svg>';
  const crow = ({ id, name, sub, img, pct, votes, seats, nophoto }) => `
    <div class="cr-row${nophoto ? " cr-nophoto" : ""}">
      ${id === "OTH" ? '<span class="rs-logo rs-logo-t">OTH</span>' : clogo(id)}
      ${nophoto ? "" : `<span class="cr-ph">${img ? `<img src="${img}" alt="" loading="lazy">` : PERSON}</span>`}
      <span class="cr-name"><b>${name}</b><span>${id === "OTH" ? "Smaller parties and independents" : (sub ? sub + " · " : "") + sname(id)}${votes ? ` · ${fmt(votes)} votes` : ""}</span></span>
      <span class="cr-pct">${pct.toFixed(1)}%</span>
      <span class="cr-seats">${seats == null ? "—" : seats}</span>
      <span class="cr-bar"><i style="width:${Math.min(100, pct)}%;background:${id === "OTH" ? "#c9cdd4" : col(id)}"></i></span>
    </div>`;
  function showCouncil(code) {
// mayoral headline for councils where the new mayor is known
const HEADLINES = {
  CPT: ["Geordin Hill\u2011Lewis", "re\u2011elected Mayor of Cape Town", "The DA won Cape Town outright: 133 of 235 council seats."],
  JHB: ["Herman Mashaba", "expected to be elected Mayor of Johannesburg", "ActionSA\u2019s Herman Mashaba is expected to be elected by the new council under a coalition deal."],
      TSH: ["Nasiphi Moya", "re\u2011elected Mayor of Tshwane", "ActionSA’s Nasiphi Moya was re-elected Mayor of Tshwane (Pretoria) by the new council on 26 November, under a deal with the ANC, the EFF and MK."],
  EKU: ["Mziyanda Mketsu", "expected to be elected Mayor of Ekurhuleni", "The ANC’s Mziyanda Mketsu is expected to be elected by the new council on Friday under a deal with ActionSA, the EFF, MK and the SACP."]
};
const hl = document.querySelector(".rs-headline"), H = BREAKING || (code === "JHB" && JHB_NOW) || HEADLINES[code];
hl.hidden = !H;
if (H) hl.innerHTML = `<span class="hl-1">${H[0]}</span><span class="hl-2">${H[1]}</span><span class="hl-3">${H[2]}</span>`;
    if (!M) return;
    const P = M.find((p) => p.id === code); if (!P) return;
    shown = code;
    const seatOf = {}; (P.seats || []).forEach(([p, n]) => { seatOf[norm(p)] = (seatOf[norm(p)] || 0) + n; });
    const total = Object.values(seatOf).reduce((a, b) => a + b, 0);
    let rows = [], basis;
    const pr = METROPR && METROPR[code];
    const cands = (window.MAYORS || {})[code];
    if (cands && pr) {
      const vOf = {}; pr.rows.forEach(([p, , v]) => { vOf[norm(p)] = v; });
      rows = cands.filter((c) => c[3] >= 0).map(([n, id, img, pct]) => {
        id = norm(id);
        const unnamed = /^No mayoral/.test(n);
        return { id, name: unnamed ? full(id) : n, sub: unnamed ? "No mayoral candidate named" : "", img: unnamed ? "" : img, pct, votes: vOf[id], seats: seatOf[id] ?? 0 };
      });
      basis = "Mayoral candidates, with their party’s share of the PR ballot (" + fmt(pr.valid) + " valid votes) and seats won.";
    } else {
      rows = (P.parties || []).map(({ p, v, s }) => { const id = norm(p); return { id, name: full(id), img: "", pct: s, votes: v, seats: seatOf[id] ?? 0 }; });
      basis = "Each party’s share of the vote and seats won.";
    }
    rows.sort((a, b) => b.pct - a.pct);
    const restPct = Math.max(0, 100 - rows.reduce((a, r) => a + r.pct, 0));
    const restSeats = Math.max(0, total - rows.reduce((a, r) => a + (r.seats || 0), 0));
    if (restPct > 0.05 || restSeats) rows.push({ id: "OTH", name: "Other parties", img: "", pct: restPct, votes: 0, seats: restSeats });
    window.SHARE.panel = () => ({
      kicker: "2026 Local Elections", area: P.name, headline: info(P).txt,
      note: `${total} council seats · ${Math.floor(total / 2) + 1} needed for a majority`,
      rows: rows.map((r) => ({ logo: r.id !== "OTH" && LOGOX[r.id] ? `assets/logos-sm/${LOGOX[r.id]}.png` : "", badge: r.id === "OTH" ? "OTH" : window.INITIALS(r.id), color: r.id === "OTH" ? "#9aa0a6" : col(r.id), name: r.name === full(r.id) || r.id === "OTH" ? r.name : `${r.name} (${sname(r.id)})`, pct: r.pct, extra: `${r.seats ?? 0} seats` })),
      foot: FOOT.concat([basis]), file: P.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-2026-results"
    });
    if (!(cands && pr)) {
      const wards = window.DMWARDS ? window.DMWARDS((w) => w.code === code) : null;
      document.dispatchEvent(new CustomEvent("council-area", { detail: {
        lvl: "council", code, area: P.name, tot: 100,
        rows: (P.parties || []).map(({ p, v, s }) => [norm(p), v, s]).sort((a, b) => b[2] - a[2]),
        avail: wards ? wards.declared : 0, n: wards ? wards.total : 0
      } }));
    }
    window.SHARE.council = () => {
      const wards = window.DMWARDS ? window.DMWARDS((w) => w.code === code) : null;
      const list = Object.entries(seatOf).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, seats: n }));
      return {
        type: "council", title: P.name, file: P.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-2026-council",
        map: wards, wardsNote: wards ? `${wards.declared} of ${wards.total} wards declared` : "",
        total, need: Math.floor(total / 2) + 1,
        parties: list.map(({ id, seats }) => ({ name: sname(id), seats, color: col(id), logo: LOGOX[id] ? `assets/logos-sm/${LOGOX[id]}.png` : "", badge: id.length > 5 ? window.INITIALS(id) : id })),
        foot: ["Final results declared by the Electoral Commission on 8 November 2026.", "Seats combine ward and proportional-representation votes."]
      };
    };
    hEl.innerHTML = `<button type="button" class="cr-back">‹ National results</button><b>${P.name}</b>`;
    pEl.innerHTML = `<p class="cr-sum">${info(P).txt}. ${total} seats, ${Math.floor(total / 2) + 1} needed for a majority.</p>
      <div class="cr-th"><span>${cands && pr ? "Candidate" : "Party"}</span><span>Vote</span><span>Seats</span></div>` + rows.map((r) => crow(Object.assign({ nophoto: !(cands && pr) }, r))).join("");
    fEl.textContent = basis + " IEC final results, declared 8 November 2026.";
    hEl.querySelector(".cr-back").onclick = () => { showNational(); list.querySelectorAll(".rs-council").forEach((x) => x.classList.remove("on")); };
    list.querySelectorAll(".rs-council").forEach((x) => x.classList.toggle("on", x.dataset.code === code));
  }
  // follow the map: picking a metro there shows that metro here too
  let mapKey = "natZA";
  document.addEventListener("dm-area", (e) => {
    const k = e.detail.lvl + e.detail.code; if (k === mapKey) return; mapKey = k;
    if (e.detail.lvl === "metro") showCouncil(e.detail.code);
    else if (shown !== "ZA" && METROS.includes(shown)) showNational();
  });

  // Who won
  const METROS = ["JHB", "TSH", "EKU", "CPT", "ETH", "NMA", "BUF", "MAN"];
  const SHORT = 6;
  let kind = "metro", open = false, M = null, query = "";
  const search = document.querySelector(".rs-search");
  search.oninput = () => { query = search.value.trim().toLowerCase(); draw(); };
  const list = document.querySelector(".rs-list"), more = document.querySelector(".rs-more");

  function info(P) {
    const seats = (P.seats || []).map(([p, s]) => [norm(p), s]);
    const total = seats.reduce((a, s) => a + s[1], 0);
    const top = seats.reduce((a, s) => (s[1] > a[1] ? s : a), ["", 0]);
    const tied = seats.filter((s) => s[1] === top[1]).length > 1;
    const maj = top[1] >= Math.floor(total / 2) + 1;
    const txt = !total ? "Seat allocation not published" : maj ? `${full(top[0])} won a majority`
      : tied ? `No party won a majority. ${seats.filter((s) => s[1] === top[1]).map((s) => full(s[0])).join(" and ")} tied for the most seats`
      : `No party won a majority. ${full(top[0])} has the most seats`;
    return { id: top[0], seats: top[1], total, txt };
  }
  // mayoral candidate with the most votes (metros only)
  const top = (code) => { const L = (window.MAYORS || {})[code]; return L && L.length ? L.reduce((a, x) => (x[3] > a[3] ? x : a)) : null; };
  const mayor = (code) => {
    if (kind !== "metro") return "";
    const t = top(code);
    return `<span class="rs-mph">${t && t[2] ? `<img src="${t[2]}" alt="" loading="lazy">` : ""}</span>`;
  };
  const cand = (code) => {
    if (kind !== "metro") return "";
    const t = top(code); if (!t) return "";
    const named = t[2] && !/^No mayoral/.test(t[0]);
    return `<span class="rs-mc">${named ? `<b>${t[0]}</b> · ` : "No mayoral candidate · "}${pn(t[1])} · ${t[3].toFixed(1)}% of the vote</span>`;
  };
  // council seats as a parliament (hemicycle) chart: one dot per seat, parties in wedges
  let pendingCouncil = null;
  const SHORTP = { ASA: "ActionSA", FFP: "VF Plus", ALJAMA: "Al Jama-ah", AJ: "Al Jama-ah", RISE: "Rise Mzansi", MAYIBUYE: "Mayibuye", IND: "Independents" };
  const GREYS = ["#8a8a8a", "#b0b0b0", "#6e6e6e", "#c4c4c4", "#9c9c9c", "#7d7d7d"];
  window.HEMI = (N) => hemicycle(N);
  function hemicycle(N) {
    const r0 = 0.5;
    for (let R = 2; R < 40; R++) {
      const d = (1 - r0) / (R - 1);
      const radii = Array.from({ length: R }, (_, i) => r0 + i * d);
      if (radii.reduce((a, r) => a + Math.floor(Math.PI * r / d) + 1, 0) < N) continue;
      const sum = radii.reduce((a, b) => a + b, 0);
      const raw = radii.map((r) => N * r / sum), cnt = raw.map(Math.floor);
      let rem = N - cnt.reduce((a, b) => a + b, 0);
      raw.map((c, i) => [c - cnt[i], i]).sort((a, b) => b[0] - a[0]).slice(0, rem).forEach(([, i]) => cnt[i]++);
      const pts = [];
      radii.forEach((r, i) => { const k = cnt[i]; for (let q = 0; q < k; q++) { const t = k === 1 ? Math.PI / 2 : Math.PI * (1 - q / (k - 1)); pts.push({ x: Math.cos(t) * r, y: Math.sin(t) * r, t, r }); } });
      pts.sort((a, b) => b.t - a.t || a.r - b.r);
      return { pts, dot: d * 0.42 };
    }
    return { pts: [], dot: 0.01 };
  }
  window.drawCouncil = (code, box) => {
    if (!M) { pendingCouncil = [code, box]; box.innerHTML = '<p class="dm-loading">Loading council…</p>'; return; }
    pendingCouncil = null;
    const P = M.find((p) => p.id === code);
    const seats = P ? (P.seats || []).map(([p, s]) => [norm(p), s]).sort((a, b) => b[1] - a[1]) : [];
    const N = seats.reduce((a, s) => a + s[1], 0);
    if (!N) { box.innerHTML = '<p class="dm-loading">Seat allocation not published.</p>'; return; }
    let g = 0;
    const colour = (id) => (window.SAPARTY && col(id) !== "#8a8a8a") ? col(id) : null;
    const pal = seats.map(([id]) => colour(id) || GREYS[g++ % GREYS.length]);
    const { pts, dot } = hemicycle(N);
    let i = 0, dots = "";
    seats.forEach(([id, s], pi) => { for (let q = 0; q < s; q++, i++) { const p = pts[i]; dots += `<circle cx="${(1 + p.x).toFixed(4)}" cy="${(1 - p.y).toFixed(4)}" r="${dot.toFixed(4)}" fill="${pal[pi]}"><title>${id}: ${s}</title></circle>`; } });
    const need = Math.floor(N / 2) + 1, I = info(P);
    const name = (id) => SHORTP[id] || window.PRETTY(id);
    box.innerHTML = `
      <p class="dc-h"><b>${P.name}</b> · ${N} council seats</p>
      <svg class="dc-svg" viewBox="-0.04 -0.2 2.08 1.28" role="img" aria-label="${P.name} council: ${seats.map(([id, s]) => name(id) + " " + s).join(", ")}">
        ${dots}
        <line x1="1" x2="1" y1="-0.07" y2="0.47" class="dc-line"/>
        <text x="1" y="-0.1" text-anchor="middle" class="dc-lt">${need} seats needed for a majority</text>
        <text x="1" y="0.9" text-anchor="middle" class="dc-n">${N}</text>
        <text x="1" y="1.0" text-anchor="middle" class="dc-m">seats</text>
      </svg>
      <p class="dc-s">${I.txt}.</p>
      <div class="dc-leg">${seats.map(([id, s], pi) => `<span title="${id}"><i style="background:${pal[pi]}"></i>${name(id)} <b>${s}</b></span>`).join("")}</div>
      <p class="dc-f">Seats won in the new council, ward and PR seats together. Each dot is one seat.</p>`;
  };
  function draw() {
    if (!M) return;
    const items = M.filter((P) => (kind === "metro" ? METROS.includes(P.id) : !METROS.includes(P.id)))
      .map((P) => ({ P, I: info(P) })).filter((x) => x.I.total).sort((a, b) => b.I.total - a.I.total)
      .filter((x) => kind === "metro" || !query || (x.P.name + " " + (x.P.alt || "")).toLowerCase().includes(query));
    const vis = open || query ? items : items.slice(0, SHORT);
    list.innerHTML = (vis.length ? "" : '<p class="rs-foot">No council matches that name.</p>') + vis.map(({ P, I }) => `
      <button type="button" data-code="${P.id}" class="rs-council${kind === "metro" ? " rs-has-ph" : ""}${shown === P.id ? " on" : ""}">
        ${logo(I.id)}
        ${mayor(P.id)}<span class="rs-cn"><span class="rs-cn-top"><b>${P.name}</b><b class="rs-cs">${I.seats} of ${I.total}</b></span>${cand(P.id)}<span class="rs-ct">${I.txt}</span></span>
      </button>`).join("");
    const rest = query ? 0 : items.length - SHORT;
    more.hidden = rest <= 0;
    more.innerHTML = `${open ? "Show fewer" : `Show ${rest} more`}<svg viewBox="0 0 12 8" aria-hidden="true" style="transform:rotate(${open ? 180 : 0}deg)"><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;
    list.querySelectorAll("[data-code]").forEach((b) => b.onclick = () => {
      const c = b.dataset.code;
      showCouncil(c);
      if (METROS.includes(c) && window.openMetroMap) window.openMetroMap(c);
      else if (window.DMSET) window.DMSET({ lvl: "muni", muni: c });
      if (METROS.includes(c)) return;
      else if (matchMedia("(max-width: 720px)").matches) document.querySelector(".rs-nat").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
more.onclick = () => { open = !open; draw(); };
// used by the results strip at the top of the page
// results by municipality: one drop-down per province (with its coat of arms), councils inside
function buildByMuni() {
  const box = document.querySelector(".bm-list"); if (!box || !M) return;
  const PROVS = [["ZA", "South Africa"], ["GP", "Gauteng"], ["WC", "Western Cape"], ["KZN", "KwaZulu-Natal"], ["EC", "Eastern Cape"], ["FS", "Free State"], ["LP", "Limpopo"], ["MP", "Mpumalanga"], ["NW", "North West"], ["NC", "Northern Cape"]];
  box.innerHTML = PROVS.map(([code, name]) => {
    const za = code === "ZA";
    const all = M.filter((P) => za || P.prov === name).map((P) => ({ P, I: info(P) })).filter((x) => x.I.total);
    const won = (x) => !/^No party/.test(x.I.txt) && / won a majority/.test(x.I.txt);
    // South Africa lists the eight metros; each province lists all its councils
    const list = (za ? all.filter((x) => METROS.includes(x.P.id)) : all).sort((a, b) => b.I.total - a.I.total);
    const maj = all.filter(won).length;
    return `<details class="bm-prov">
      <summary><img class="bm-arms" src="assets/arms/${code.toLowerCase()}.png" alt=""><span class="bm-pn">${name}</span><span class="bm-meta">${all.length} councils · ${maj} won outright${za ? " · metros below" : ""}</span><i class="bm-pm" aria-hidden="true"></i></summary>
      <div class="bm-rows">${list.map(({ P, I }) => `<button type="button" class="bm-row" data-code="${P.id}">
        ${logo(I.id)}<span class="bm-name"><b>${P.name}</b><span>${I.txt}</span></span><span class="bm-seats">${I.seats} of ${I.total}</span></button>`).join("")}</div>
    </details>`;
  }).join("");
  box.querySelectorAll(".bm-row").forEach((b) => b.onclick = () => window.RS.council(b.dataset.code));
}
  window.RS = {
  council: (code) => { showCouncil(code); if (METROS.includes(code) && window.openMetroMap) window.openMetroMap(code); else { if (window.DMSET) window.DMSET({ lvl: "muni", muni: code }); } if (!METROS.includes(code)) document.querySelector(".rs-nat").scrollIntoView({ behavior: "smooth", block: "start" }); },
  national: () => { showNational(); if (window.DMSET) window.DMSET({ lvl: "nat" }); document.querySelector(".rs-grid").scrollIntoView({ behavior: "smooth", block: "start" }); },
  cities: () => { document.querySelector(".rs-seg [data-k=city]").click(); document.querySelector(".rs-won").scrollIntoView({ behavior: "smooth", block: "start" }); }
};
  document.querySelectorAll(".rs-seg button").forEach((b) => b.onclick = () => {
    kind = b.dataset.k; open = false; query = ""; search.value = ""; search.hidden = kind !== "city";
    document.querySelectorAll(".rs-seg button").forEach((x) => x.setAttribute("aria-selected", x === b));
    draw();
  });
  Promise.all([d3.json("data/municipalities.geojson"), d3.json("data/metro-pr-2026.json").catch(() => null), new Promise((r) => window.MAYORS ? r() : document.addEventListener("mayors-ready", r, { once: true }))]).then(([fc, mpr]) => { M = fc.features.map((f) => f.properties); METROPR = mpr; draw(); buildByMuni(); if (mapKey.startsWith("metro")) showCouncil(mapKey.slice(5)); if (pendingCouncil) window.drawCouncil(...pendingCouncil); })
    .catch(() => { list.innerHTML = '<p class="rs-foot">Could not load council results.</p>'; });
})();

// Final results header (top of the map card): follows the area shown on the map
(function () {
  "use strict";
  const { col } = window.SAPARTY;
  const el = document.querySelector(".rs-final"); if (!el) return;
  const fmt = (v) => Math.round(v).toLocaleString("en-ZA").replace(/[,   ]/g, " ");
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // party codes and names as they appear in the ward and metro data → logo file and display name
  const LOGOF = { ANC: "anc", DA: "da", MK: "mk", EFF: "eff", ASA: "asa", IFP: "ifp", FFP: "ffp", SACP: "sacp", PA: "pa", UDM: "udm", ATM: "atm", ACDP: "acdp", PAC: "pac", AJ: "aj", ALJAMA: "aj", RISE: "rise", GOOD: "good", AIC: "aic", NFP: "nfp", BOSA: "bosa", UAT: "uat", APC: "apc", "National Coloured Congress": "ncc", "NATIONAL COLOURED CONGRESS": "ncc", "Afrika Mayibuye Movement": "amm", "United Africans Transformation": "uat", "African People's Convention": "apc", "Pan Africanist Congress Of Azania": "pac", "African Independent Congress": "aic", "National Freedom Party": "nfp" };
  const NAME = { ASA: "ActionSA", FFP: "VF Plus", IND: "Independents", AJ: "Al Jama-ah", ALJAMA: "Al Jama-ah", RISE: "Rise Mzansi", "National Coloured Congress": "NCC", "NATIONAL COLOURED CONGRESS": "NCC", "Afrika Mayibuye Movement": "AMM" };
  const label = (id) => {
    if (NAME[id]) return NAME[id];
    return window.PRETTY(id);
  };
  const colour = (id) => (id === "OTH" ? "#e1e4ec" : col(id));
  const badge = (id) => LOGOF[id]
    ? `<img class="rf-logo" src="assets/logos-sm/${LOGOF[id]}.png" alt="">`
    : `<span class="rf-badge" style="background:${colour(id)}">${esc(id.length > 5 ? window.INITIALS(id) : id)}</span>`;

  // national figures (IEC final, national PR vote)
  const NATROWS = [["ANC", 9160614], ["DA", 7338021], ["MK", 2909597], ["EFF", 1852374], ["ASA", 1688579], ["IFP", 1399704], ["FFP", 884494], ["SACP", 735589], ["PA", 601575]];
  const NATSHARE = { ANC: 30.76, DA: 24.64, MK: 9.77, EFF: 6.22, ASA: 5.67, IFP: 4.70, FFP: 2.97, SACP: 2.47, PA: 2.02 };
  let METRO = null;
  fetch("data/metro-pr-2026.json").then((r) => r.json()).then((m) => { METRO = m; if (last && last.lvl === "metro") draw(last); }).catch(() => {});

  function rowsFor(d) {
    if (d && d.lvl === "council") return { rows: d.rows, basis: "vote in " + d.area };
    if (!d || d.lvl === "nat") return { rows: NATROWS.map(([id, v]) => [id, v, NATSHARE[id]]), basis: "national PR vote" };
    if (d.lvl === "metro" && METRO && METRO[d.code]) {
      const m = METRO[d.code];
      return { rows: m.rows.map(([id, p, v]) => [id, v, p]), basis: "PR vote in " + d.area };
    }
    const tot = d.tot || Object.values(d.agg).reduce((a, b) => a + b, 0);
    return { rows: Object.entries(d.agg).sort((a, b) => b[1] - a[1]).map(([id, v]) => [id, v, tot ? v / tot * 100 : 0]), basis: "ward vote in " + d.area };
  }

  let last = null;
  function draw(d) {
    last = d;
    const { rows, basis } = rowsFor(d);
    const top = rows.slice(0, 9);
    const oth = Math.max(0, 100 - top.reduce((a, x) => a + x[2], 0));
    const bar = top.map(([id, , p]) => [id, label(id), p]).concat(oth > 0.05 ? [["OTH", "Others", oth]] : []);
    const nat = !d || d.lvl === "nat";
    const foot = nat
      ? `<div><b>23 696 of 23 696</b><span>voting districts in</span></div>
         <div><div class="rf-dots"><span>100%</span></div><span>Counted · turnout 52.25% · IEC final</span></div>`
      : `<div><b>${fmt(d.avail)} of ${fmt(d.n)}</b><span>wards with results</span></div>
         <div><div class="rf-dots"><span>${Math.round(d.avail / d.n * 100)}%</span></div><span>${d.lvl === "metro" ? "PR ballot · IEC final" : d.lvl === "council" ? "Council results · IEC final" : "Ward ballot · IEC final"}</span></div>`;
    window.SHARE = window.SHARE || {};
    window.SHARE.race = () => {
      const LEADER = { ANC: ["Cyril Ramaphosa", "ramaphosa-card"], DA: ["Geordin Hill-Lewis", "hill-lewis"], MK: ["Jacob Zuma", "zuma"], EFF: ["Julius Malema", "malema-card"], ASA: ["Herman Mashaba", "mashaba"] };
      const mayors = d && d.lvl === "metro" ? ((window.MAYORS || {})[d.code] || []).filter((m) => m[3] >= 0).slice(0, 5) : null;
      const cands = nat
        ? top.slice(0, 5).map(([id, v, p]) => ({ name: (LEADER[id] || [label(id)])[0], photo: LEADER[id] ? `assets/faces/${LEADER[id][1]}.png` : "", logo: LOGOF[id] ? `assets/logos-sm/${LOGOF[id]}.png` : "", votes: fmt(v), pct: p.toFixed(2) + "%", color: colour(id) }))
        : mayors && mayors.length
          ? mayors.map(([n, id, img, p]) => { const pr = top.find((x) => x[0] === id) || []; const unnamed = /^No mayoral/.test(n); return { name: unnamed ? label(id) : n, photo: unnamed ? "" : img, logo: LOGOF[id] ? `assets/logos-sm/${LOGOF[id]}.png` : "", votes: pr[1] ? fmt(pr[1]) : "", pct: p.toFixed(2) + "%", color: colour(id), badge: id }; })
          : top.slice(0, 5).map(([id, v, p]) => ({ name: label(id), photo: "", logo: LOGOF[id] ? `assets/logos-sm/${LOGOF[id]}.png` : "", votes: fmt(v), pct: p.toFixed(2) + "%", color: colour(id), badge: id.length > 5 ? window.INITIALS(id) : id }));
      const lead = top[0];
      const filter = nat ? (() => true) : d.lvl === "prov" ? ((w) => w.pv === d.code) : ((w) => w.code === d.code);
      const map = window.DMWARDS ? window.DMWARDS(filter) : null;
      return {
        type: "race", file: (nat ? "south-africa" : d.area.toLowerCase().replace(/[^a-z0-9]+/g, "-")) + "-2026-results",
        dateLine: "8 Nov 2026 · Final results", region: nat ? "South Africa · all municipalities" : d.area,
        headline: nat ? "ANC Suffers Historic Decline to 30.76%. DA, MK, and ActionSA Shape a New Coalition Era." : `${label(lead[0])} leads ${d.area} with ${lead[2].toFixed(2)}% of the ${basis.split(" in ")[0].replace(/^national /, "")}.`,
        sub: "Final results · declared by the IEC on 8 Nov 2026", cands,
        shareLabel: `Share of the ${nat ? "national PR vote" : basis.split(" in ")[0]} · 50% majority line`,
        segs: bar.map(([id, l, p]) => ({ label: l, pct: p, color: colour(id) })),
        prog: nat ? { big: "23 696 of 23 696", small: "voting districts in", pct: "100%", w: 1, note: "Counted · turnout 52.25% · IEC final" }
          : { big: `${fmt(d.avail)} of ${fmt(d.n)}`, small: "wards with results", pct: Math.round(d.avail / d.n * 100) + "%", w: d.avail / d.n, note: "Counted · IEC final" },
        mapLabel: "LEADING PARTY · WARD WINNERS", mapNote: map ? `${fmt(map.total)} wards · darker = won` : "",
        map, source: "Data: Independent Electoral Commission · Final results declared 8 Nov 2026"
      };
    };
    window.SHARE.area = () => ({
      kicker: "2026 Local Elections", area: nat ? "South Africa" : d.area,
      headline: nat ? "Share of the national PR vote" : "Share of the " + basis.replace(" in " + d.area, ""),
      note: nat ? "Declared by the IEC · turnout 52.25%" : `Declared by the IEC · ${fmt(d.avail)} of ${fmt(d.n)} wards with results`,
      rows: top.map(([id, v, p]) => ({ logo: LOGOF[id] ? `assets/logos-sm/${LOGOF[id]}.png` : "", badge: id.length > 5 ? window.INITIALS(id) : id, color: colour(id), name: label(id), votes: v, pct: p }))
        .concat(oth > 0.05 ? [{ badge: "OTH", color: "#9aa0a6", name: "Others", pct: oth }] : []),
      foot: ["2026 Local Election Results · IEC final results, declared 8 November 2026."],
      file: (nat ? "south-africa" : d.area.toLowerCase().replace(/[^a-z0-9]+/g, "-")) + "-2026-vote-share"
    });
    el.innerHTML = `
      <p class="rf-h">${nat ? "Final results" : `<b>${esc(d.area)}</b>`} · declared by the IEC on 8 Nov 2026</p>
      <div class="rf-car">
        <div class="rf-leads noscroll" tabindex="0" aria-label="Party results, scroll for more">${top.map(([id, v, p]) => `
          <div class="rf-lead" title="${esc(id)}">
            ${badge(id)}
            <span class="rf-n">${esc(label(id))}</span>
            <span class="rf-p">${p.toFixed(2)}%</span>
            <span class="rf-v">${fmt(v)}<br>votes</span>
          </div>`).join("")}</div>
        <button type="button" class="rf-arrow rf-prev" aria-label="Previous parties" hidden><svg viewBox="0 0 10 16" aria-hidden="true"><path d="M8 1.5L2 8l6 6.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
        <button type="button" class="rf-arrow rf-next" aria-label="More parties"><svg viewBox="0 0 10 16" aria-hidden="true"><path d="M2 1.5L8 8l-6 6.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
      </div>
      <p class="rf-sh">Share of the ${esc(basis)} · 50% majority line</p>
      <div class="rf-bar" role="img" aria-label="${esc(bar.map((x) => x[1] + " " + x[2].toFixed(1) + "%").join(", "))}">${bar.map(([id, , p]) => `<span style="width:${p}%;background:${colour(id)}"></span>`).join("")}<i></i></div>
      <div class="rf-leg">${bar.map(([id, l, p]) => `<span><i style="background:${colour(id)}"></i>${esc(l)} ${p.toFixed(1)}%</span>`).join("")}</div>
      <div class="rf-foot">${foot}</div>`;

    // carousel: swipe or scroll the row; faint arrows show there is more
    const row = el.querySelector(".rf-leads"), prev = el.querySelector(".rf-prev"), next = el.querySelector(".rf-next");
    const maxS = () => row.scrollWidth - row.clientWidth;
    const step = () => row.querySelector(".rf-lead").offsetWidth + 18;
    const sync = () => { prev.hidden = row.scrollLeft < 4; next.hidden = row.scrollLeft > maxS() - 4; };
    row.addEventListener("scroll", sync, { passive: true });
    prev.onclick = () => row.scrollBy({ left: -step(), behavior: "smooth" });
    next.onclick = () => row.scrollBy({ left: step(), behavior: "smooth" });
    sync();
  }
  addEventListener("resize", () => { const n = el.querySelector(".rf-next"), r = el.querySelector(".rf-leads"); if (n && r) n.hidden = r.scrollLeft > r.scrollWidth - r.clientWidth - 4; });
  let mapArea = null;
  document.addEventListener("council-area", (e) => {
    if (e.detail) { draw(e.detail); return; }
    const d = mapArea; if (!d || d.lvl === "nat") { draw(null); last = { lvl: "nat", code: "ZA" }; } else draw(d);
  });
  document.addEventListener("dm-area", (e) => {
    if (e.detail.lvl === "muni") return; // a single council: the carousel keeps that council's own results
    const d = e.detail; mapArea = d;
    const key = d.lvl + d.code;
    if (last && (last.lvl + (last.code || "ZA")) === key) return; // same area (zoom, mode, ward clicks): keep the carousel where it is
    draw(d.lvl === "nat" ? null : d);
    if (d.lvl === "nat") last = { lvl: "nat", code: "ZA" };
  });
  draw(null); last = { lvl: "nat", code: "ZA" };
})();

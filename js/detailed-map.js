// Detailed ward maps — follows the "Detailed Maps of the 2026 Local Election Results"
// section of the South Africa Elections App Design.
(function () {
  "use strict";

  // ---------- Parties (design palette) ----------
  const PCOL = {
    ANC: "#f2c40f", DA: "#1f5fc2", MK: "#2c8c4e", EFF: "#d63a3a", IFP: "#9b9b9b",
    ASA: "#06b616", FFP: "#f08a24", GOOD: "#f47a20", UDM: "#8b5a2b", PA: "#7a4fb5",
    SACP: "#a3121f", RISE: "#6d5bd0", ATM: "#4b5563", IND: "#5f6b73"
  };
  const PNAME = { ASA: "ActionSA", FFP: "FF+", MK: "MK", IND: "Independent", RISE: "Rise Mzansi" };
  const col = (id) => PCOL[id] || "#8a8a8a";
  const pn = (id) => PNAME[id] || id;
  window.SAPARTY = { col, pn };

  const PROV = { GP: "Gauteng", WC: "Western Cape", KZN: "KwaZulu-Natal", EC: "Eastern Cape", FS: "Free State", LP: "Limpopo", MP: "Mpumalanga", NW: "North West", NC: "Northern Cape" };
  const PRE = { EC: "EC", FS: "FS", GT: "GP", KZN: "KZN", LIM: "LP", MP: "MP", NW: "NW", NC: "NC", WC: "WC" };
  const MET = { JHB: "GP", TSH: "GP", EKU: "GP", CPT: "WC", ETH: "KZN", NMA: "EC", BUF: "EC", MAN: "FS" };
  const MNAME = { JHB: "Johannesburg", TSH: "Pretoria", EKU: "Ekurhuleni", CPT: "Cape Town", ETH: "Durban", NMA: "Gqeberha", BUF: "East London", MAN: "Bloemfontein" };
  const provOf = (c) => MET[c] || PRE[(c.match(/^[A-Z]+/) || [""])[0]] || null;

  // Metros: two leading mayoral candidates' parties (from the design)
  const DM = [
    ["JHB", "Johannesburg", "City of Johannesburg", ["DA", "ANC"]],
    ["TSH", "Tshwane", "City of Tshwane", ["DA", "ASA"]],
    ["EKU", "Ekurhuleni", "City of Ekurhuleni", ["DA", "ANC"]],
    ["CPT", "Cape Town", "City of Cape Town", ["DA", "ANC"]],
    ["ETH", "eThekwini", "eThekwini", ["MK", "DA"]],
    ["NMA", "Nelson Mandela Bay", "Nelson Mandela Bay", ["DA", "ANC"]],
    ["BUF", "Buffalo City", "Buffalo City", ["ANC", "UDM"]],
    ["MAN", "Mangaung", "Mangaung", ["ANC", "DA"]]
  ];

  // National PR ballot, IEC final (8 Nov 2026), with party leaders
  const NAT = [["ANC", 30.76], ["DA", 24.64], ["MK", 9.77], ["EFF", 6.22], ["ASA", 5.67], ["IFP", 4.7], ["FFP", 2.97], ["SACP", 2.47], ["PA", 2.02]];
  const LEAD = {
    ANC: ["Cyril Ramaphosa", "assets/faces/ramaphosa.png"], DA: ["Geordin Hill-Lewis", "assets/faces/hill-lewis.png"],
    MK: ["Jacob Zuma", "assets/faces/zuma.png"], EFF: ["Julius Malema", "assets/faces/malema.png"],
    ASA: ["Herman Mashaba", "assets/faces/mashaba.png"], IFP: ["Velenkosini Hlabisa", "assets/faces/hlabisa.png"],
    FFP: ["Pieter Groenewald", "assets/faces/groenewald.png"], RISE: ["Songezo Zibi", "assets/faces/zibi.png"]
  };
  const LOGO = { SACP: "assets/logos-sm/sacp.png", PA: "assets/logos-sm/pa.png", UDM: "assets/logos-sm/udm.png", ANC: "assets/logos-sm/anc.png", DA: "assets/logos-sm/da.png", MK: "assets/logos-sm/mk.png", EFF: "assets/logos-sm/eff.png", IFP: "assets/logos-sm/ifp.png", ASA: "assets/logos-sm/asa.png", FFP: "assets/logos-sm/ffp.png" };
  // party logos for the ward candidate list (codes and names as they appear in the ward data)
  const PLOGO = { ANC: "anc", DA: "da", MK: "mk", EFF: "eff", ASA: "asa", IFP: "ifp", FFP: "ffp", SACP: "sacp", PA: "pa", UDM: "udm", ATM: "atm", ACDP: "acdp", PAC: "pac", AJ: "aj", ALJAMA: "aj", RISE: "rise", GOOD: "good", AIC: "aic", NFP: "nfp", BOSA: "bosa", UAT: "uat", APC: "apc", "National Coloured Congress": "ncc", "Afrika Mayibuye Movement": "amm", "United Africans Transformation": "uat", "African People's Convention": "apc", "Pan Africanist Congress Of Azania": "pac", "African Independent Congress": "aic", "National Freedom Party": "nfp" };
  const plogo = (id) => PLOGO[id]
    ? `<img class="dm-sel-logo" src="assets/logos-sm/${PLOGO[id]}.png" alt="">`
    : `<em class="dm-sel-badge" style="background:${id === "IND" ? "#5f6b73" : col(id)}">${id === "IND" ? "IND" : String(id).split(/\s+/).filter((w) => !/^(of|the|for|and)$/i.test(w)).map((w) => w[0]).join("").toUpperCase().slice(0, 4)}</em>`;
  // 2024 provincial-legislature ballot, leading parties
  const P24 = { GP: { ANC: 34.76, DA: 27.44, EFF: 13.18, MK: 10.11 }, WC: { DA: 55.3, ANC: 19.55, PA: 7.76, EFF: 5.63 }, KZN: { MK: 45.35, IFP: 18.07, ANC: 16.99, DA: 13.36 }, EC: { ANC: 62.16, DA: 14.97, EFF: 8.22 }, FS: { ANC: 51.87, DA: 21.69, EFF: 12.58 }, LP: { ANC: 73.3, EFF: 13.15, DA: 6.48 }, MP: { ANC: 51.32, MK: 17.09, EFF: 12.71, DA: 9.4 }, NW: { ANC: 57.73, EFF: 13.46, DA: 11.84 }, NC: { ANC: 49.34, DA: 21.44, EFF: 13.15 } };
  const P26 = [["EC", "ANC", 45.2], ["FS", "ANC", 36.9], ["GP", "DA", 34.1], ["KZN", "MK", 34.0], ["LP", "ANC", 54.0], ["MP", "ANC", 43.7], ["NW", "ANC", 43.8], ["NC", "ANC", 41.6], ["WC", "DA", 53.7]];

  const fmtN = (v) => Math.round(v).toLocaleString("en-ZA").replace(/[, ]/g, " ");
  const lab = (a, b, t) => d3.interpolateLab(a, b)(Math.max(0, Math.min(1, t)));

  const S = { lvl: "nat", prov: "GP", metro: "JHB", muni: null, mode: "share", sel: null };
  const MN = {}; // municipality code -> short name
  let G = null, F = null;
  const root = document.getElementById("dm");
  // the 2026 Results page shows stronger party colours, matching its vote-share bar
  const STRONG = root.classList.contains("rs-dm");

  Promise.all([d3.json("data/sa-wards-v2.json"), d3.json("data/wards-final-2026.json"), d3.json("data/mayors.json")]).then(([W, R, M]) => {
    F = R; window.MAYORS = M;
    document.dispatchEvent(new CustomEvent("mayors-ready"));
    G = [];
    const nums = (d) => (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    // ward outlines are stored compactly (about half the download): numbers are hundredths, the first point of each
    // ring is absolute and the rest are steps from the previous point; ";" ends a closed ring, "!" an open one.
    // Rebuild the usual SVG path ("M x,y L x,y … Z"); the result is identical to the original outline.
    const unpack = (e) => {
      if (e[0] === "M") return e;
      let out = "";
      e.replace(/([^;!]*)([;!])/g, (_, body, end) => {
        const v = body.split(","); let x = 0, y = 0;
        for (let j = 0; j + 1 < v.length; j += 2) { x += +v[j]; y += +v[j + 1]; out += (j ? "L" : "M") + x / 100 + "," + y / 100; }
        if (end === ";") out += "Z";
        return "";
      });
      return out;
    };
    Object.values(W).forEach((dist) => Object.entries(dist).forEach(([code, m]) => {
      const pv = provOf(code); if (!pv || !m.w) return;
      const mn = String(m.n || code).replace(/ (Local|Metropolitan) Municipality$/, "").replace(/^City of /, "");
      m.w.forEach(([no, packed]) => {
        const d = unpack(packed);
        const n = nums(d); let a = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (let q = 0; q + 3 < n.length; q += 2) a += n[q] * n[q + 3] - n[q + 2] * n[q + 1];
        for (let q = 0; q + 1 < n.length; q += 2) { const x = n[q], y = n[q + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        MN[code] = mn; G.push({ code, pv, mn, no: String(no), d, area: Math.max(Math.abs(a) / 2, 1e-9), x0, x1, y0, y1 });
      });
    }));
    render();
    renderCompare();
  }).catch((e) => { console.error(e); root.querySelector(".dm-map").innerHTML = '<p class="dm-loading">Could not load ward results.</p>'; });

  function res(w) {
    const r = F[w.code] && F[w.code][w.no];
    if (!r || !r.k || !r.k.length) return null;
    const k = r.k.slice().sort((a, b) => (b[3] || 0) - (a[3] || 0));
    const sum = k.reduce((a, x) => a + (x[3] || 0), 0);
    const sumPct = k.reduce((a, x) => a + (x[2] || 0), 0);
    // some wards list only the top candidates: recover the full valid-vote total from the leader's share
    const partial = sumPct > 0 && sumPct < 99.5 && k[0][2] > 0;
    const tot = partial ? Math.round(k[0][3] * 100 / k[0][2]) : sum;
    return tot > 0 ? { k, tot, r, partial } : null;
  }

  function set(p) { Object.assign(S, p); render(); }

  // ---------- Render ----------
  let zoom, svgSel, gSel, labelSel, curK = 1, view = null;

  function render() {
    if (S.mode === "council" && !(S.lvl === "metro" && STRONG)) S.mode = "share";
    const lvl = S.lvl;
    const dm = DM.find((x) => x[0] === S.metro) || DM[0];
    const [A, B] = dm[3];
    const area = lvl === "nat" ? "South Africa" : lvl === "prov" ? PROV[S.prov] : lvl === "muni" ? (MN[S.muni] || S.muni) : dm[2];

    // levels + tabs
    root.querySelector(".dm-levels").innerHTML = [["nat", "National"], ["prov", "Provincial"], ["metro", "Metros"]]
      .map(([id, l]) => `<button type="button" data-lvl="${id}" aria-pressed="${S.lvl === id}">${l}</button>`).join("");
    const tabs = lvl === "prov" ? Object.keys(PROV).map((k) => [k, PROV[k], S.prov === k]) : lvl === "metro" ? DM.map((x) => [x[0], x[1], S.metro === x[0]]) : [];
    const tabEl = root.querySelector(".dm-tabs");
    tabEl.hidden = !tabs.length;
    tabEl.innerHTML = tabs.map(([k, l, on]) => `<button type="button" data-tab="${k}" aria-pressed="${on}">${l}</button>`).join("");

    // legend
    const leg = root.querySelector(".dm-legend");
    if (S.mode === "lead") leg.innerHTML = "";
    else if (lvl === "metro" && !STRONG) {
      leg.innerHTML = `<div class="dm-grad"><div><div class="dm-grad-bar" style="background:linear-gradient(90deg,${col(A)},${col(B)})"></div><div class="dm-grad-l"><span>More ${pn(A)}</span><span>More ${pn(B)}</span></div></div><div class="dm-nores"><i></i>No results</div></div><p class="dm-dens">Lighter areas have lower voter density.</p>`;
    } else {
      leg.innerHTML = `<div class="dm-wins"><span class="dm-wins-h">Ward won by</span>${["ANC", "DA", "MK", "EFF", "IFP", "ASA", "UDM", "PA"].map((id) => `<span><i style="background:${col(id)}"></i>${pn(id)}</span>`).join("")}<span><i style="background:#e5e5e5"></i>No results</span></div><p class="dm-dens">Lighter areas have lower voter density.</p>`;
    }

    if (!G) return;
    const W = G.filter((w) => lvl === "nat" ? true : lvl === "prov" ? w.pv === S.prov : lvl === "muni" ? w.code === S.muni : w.code === S.metro);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, avail = 0, totAll = 0; const agg = {};
    const RR = W.map((w) => {
      if (w.x0 < x0) x0 = w.x0; if (w.x1 > x1) x1 = w.x1; if (w.y0 < y0) y0 = w.y0; if (w.y1 > y1) y1 = w.y1;
      const r = res(w); if (r) { avail++; totAll += r.tot; r.k.forEach((x) => { agg[x[1]] = (agg[x[1]] || 0) + (x[3] || 0); }); } return r;
    });
    const dens = RR.map((r, q) => (r ? r.tot / W[q].area : null)).filter((v) => v != null).sort((a, b) => a - b);
    const rk = (v) => { let lo = 0, hi = dens.length; while (lo < hi) { const m = (lo + hi) >> 1; if (dens[m] < v) lo = m + 1; else hi = m; } return dens.length > 1 ? lo / (dens.length - 1) : 1; };

    // viewBox (aspect 1.05 as in the design)
    const cw = x1 - x0, ch = y1 - y0, ar = 1.05; let vw = cw * 1.04, vh = ch * 1.04;
    if (vw / vh < ar) vw = vh * ar; else vh = vw / ar;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    view = { x: cx - vw / 2, y: cy - vh / 2, w: vw, h: vh };

    const LM = S.mode === "lead";
    const sw = lvl === "nat" ? 0.25 : 0.6;
    const leads = [], lcount = {};
    let paths = "";
    W.forEach((w, q) => {
      const r = RR[q]; let fill = "#e5e5e5";
      if (LM) {
        fill = r ? "#efefef" : "#f7f7f7";
        if (r) { const ld = (r.k[0][3] || 0) - ((r.k[1] || [])[3] || 0); leads.push({ w, id: r.k[0][1], ld }); lcount[r.k[0][1]] = (lcount[r.k[0][1]] || 0) + 1; }
      } else if (r) {
        const lt = STRONG ? 0.8 + 0.2 * rk(r.tot / w.area) : 0.22 + 0.78 * rk(r.tot / w.area); let base;
        if (lvl === "metro" && !STRONG) {
          const va = (r.k.find((x) => x[1] === A) || [])[3] || 0, vb = (r.k.find((x) => x[1] === B) || [])[3] || 0;
          base = va + vb > 0 ? lab(col(B), col(A), va / (va + vb)) : "#cfcfcf";
        } else {
          const sh = r.k[0][3] / r.tot;
          base = lab("#d9d9d9", col(r.k[0][1]), STRONG ? 0.85 + 0.15 * Math.min(1, Math.max(0, (sh - 0.3) / 0.4)) : 0.45 + 0.55 * Math.min(1, Math.max(0, (sh - 0.3) / 0.4)));
        }
        fill = lab("#ffffff", base, lt);
      }
      paths += `<path class="ward" data-i="${q}" d="${w.d}" fill="${fill}" stroke="${LM ? "#d4d4d4" : "#ffffff"}" stroke-width="${sw}"/>`;
    });

    let circles = "";
    if (LM && leads.length) {
      const mxL = Math.max(...leads.map((x) => x.ld), 1);
      const R = Math.max(cw, ch) * (lvl === "nat" ? 0.011 : lvl === "prov" ? 0.022 : 0.04);
      leads.sort((a, b) => b.ld - a.ld).forEach((x) => {
        const c = col(x.id);
        circles += `<circle cx="${(x.w.x0 + x.w.x1) / 2}" cy="${(x.w.y0 + x.w.y1) / 2}" r="${Math.max(R * Math.sqrt(x.ld / mxL), R * 0.06)}" fill="${lab("#ffffff", c, 0.45)}" fill-opacity="0.85" stroke="${c}" stroke-width="0.8"/>`;
      });
    }

    // labels: metros nationally, top 7 municipalities in a province
    const box = {};
    if (lvl !== "metro") W.forEach((w, q) => {
      const b = box[w.code] || (box[w.code] = { code: w.code, mn: w.mn, x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, v: 0 });
      if (w.x0 < b.x0) b.x0 = w.x0; if (w.x1 > b.x1) b.x1 = w.x1; if (w.y0 < b.y0) b.y0 = w.y0; if (w.y1 > b.y1) b.y1 = w.y1;
      if (RR[q]) b.v += RR[q].tot;
    });
    let L = Object.values(box);
    L = lvl === "nat" ? L.filter((b) => MET[b.code]) : L.sort((a, b) => b.v - a.v).slice(0, 7);
    const fs = 12.5 * vw / Math.max(300, root.querySelector(".dm-map").clientWidth || 700);
    // a single municipality is labelled with its ward numbers
    const labels = lvl === "muni" ? W.map((w) => ({ x: (w.x0 + w.x1) / 2, y: (w.y0 + w.y1) / 2, t: w.no, b: { code: w.code } })) : L.map((b) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, t: lvl === "nat" ? MNAME[b.code] : b.mn, b }));

    const mt = root.querySelector(".dm-mtitle");
    if (mt) { mt.hidden = !(lvl === "muni" || lvl === "metro"); mt.textContent = area + " wards"; }
    const mapEl = root.querySelector(".dm-map");
    mapEl.innerHTML = `<svg viewBox="${view.x} ${view.y} ${view.w} ${view.h}" role="img" aria-label="Ward map of ${area} 2026 local election results"><g class="dm-z"><g class="dm-wards">${paths}</g><g class="dm-circles">${circles}</g><g class="dm-labels"></g></g></svg>`;
    svgSel = d3.select(mapEl).select("svg");
    gSel = svgSel.select(".dm-z");
    labelSel = gSel.select(".dm-labels").selectAll("g").data(labels).join("g").attr("class", "dm-lab");
    labelSel.append("circle").attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    // keep Johannesburg and Ekurhuleni labels apart nationally
    const anchor = (d) => lvl === "nat" && d.b.code === "JHB" ? "end" : lvl === "nat" && d.b.code === "EKU" ? "start" : "middle";
    labelSel.append("text").attr("x", (d) => d.x).attr("y", (d) => d.y).style("text-anchor", anchor).text((d) => d.t);
    sizeLabels(1, fs);

    zoom = d3.zoom().scaleExtent([1, lvl === "nat" ? 40 : 14])
      .extent([[view.x, view.y], [view.x + view.w, view.y + view.h]])
      .translateExtent([[view.x, view.y], [view.x + view.w, view.y + view.h]])
      .on("zoom", (ev) => { curK = ev.transform.k; gSel.attr("transform", ev.transform); sizeLabels(curK, fs); });
    svgSel.call(zoom).on("dblclick.zoom", null);
    curK = 1;

    // selection highlight
    const selIdx = S.sel ? W.findIndex((w) => w.code === S.sel.code && w.no === S.sel.no) : -1;
    if (selIdx >= 0) {
      const p = gSel.select(`path[data-i="${selIdx}"]`).attr("stroke", "#121212").attr("stroke-width", 2.2).classed("on", true);
      p.raise();
    }

    // interactions
    const tip = root.querySelector(".dm-tip");
    const wardsG = gSel.select(".dm-wards");
    wardsG.on("pointermove", (ev) => {
      const el = ev.target.closest("path.ward"); if (!el) { tip.hidden = true; return; }
      const w = W[+el.dataset.i], r = RR[+el.dataset.i];
      tip.innerHTML = `<b>Ward ${w.no}, ${w.mn}</b>` + (r ? r.k.slice(0, 3).map((x, i) => `<div class="dm-tip-r${i === 0 ? " lead" : ""}"><i style="background:${col(x[1])}"></i><span>${pn(x[1])}</span><span>${Math.round(x[3] / r.tot * 100)}%</span></div>`).join("") : `<div class="muted">No results</div>`);
      tip.hidden = false;
      const rc = mapEl.getBoundingClientRect();
      let x = ev.clientX - rc.left + 12, y = ev.clientY - rc.top + 12;
      if (x + 190 > rc.width) x -= 214; if (y + tip.offsetHeight > rc.height) y -= tip.offsetHeight + 24;
      tip.style.left = Math.max(4, x) + "px"; tip.style.top = Math.max(4, y) + "px";
    }).on("pointerleave", () => { tip.hidden = true; })
      .on("click", (ev) => { const el = ev.target.closest("path.ward"); if (!el) return; const w = W[+el.dataset.i]; S.sel = { code: w.code, no: w.no }; renderSel(W, RR, lvl); highlight(+el.dataset.i); });

    function highlight(i) {
      wardsG.selectAll("path.on").attr("stroke", LM ? "#d4d4d4" : "#ffffff").attr("stroke-width", sw).classed("on", false);
      wardsG.select(`path[data-i="${i}"]`).attr("stroke", "#121212").attr("stroke-width", 2.2).classed("on", true).raise();
    }

    root.querySelector(".dm-zin").onclick = () => svgSel.transition().duration(300).call(zoom.scaleBy, 1.6);
    root.querySelector(".dm-zout").onclick = () => svgSel.transition().duration(300).call(zoom.scaleBy, 1 / 1.6);

    // lead legend + modes
    const leadLeg = Object.entries(lcount).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const ll = root.querySelector(".dm-leadleg");
    ll.hidden = !LM;
    ll.innerHTML = LM ? `<div class="dm-leadleg-h">LEADER</div><div class="dm-leadleg-i">${leadLeg.map(([id]) => `<span><i style="background:${col(id)}"></i>${pn(id)}</span>`).join("")}</div><p>Circle size is proportional to the number of votes each ward’s leading candidate is ahead by.</p>` : "";
    root.querySelector(".dm-modes").innerHTML = [["share", "Vote share"], ["lead", "Size of lead"]].concat(lvl === "metro" && STRONG ? [["council", "Council"]] : [])
      .map(([id, l]) => `<button type="button" data-mode="${id}" aria-pressed="${S.mode === id}">${l}</button>`).join("");

    renderSel(W, RR, lvl);

    // jump to
    const jump = lvl === "metro" || lvl === "muni" ? [] : L.slice(0, 4);
    const jEl = root.querySelector(".dm-jump");
    jEl.hidden = !jump.length;
    jEl.innerHTML = jump.length ? `<span>Jump to:</span>` + jump.map((b, i) => `<button type="button" data-j="${i}">${lvl === "nat" ? MNAME[b.code] : b.mn}</button>`).join("") : "";
    jEl.querySelectorAll("button").forEach((btn) => btn.onclick = () => {
      const b = jump[+btn.dataset.j]; zoomTo((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, lvl === "nat" ? 7 : 3);
    });

    // headline results strip
    let hdr, cands, src;
    if (lvl === "nat") {
      hdr = "National results"; src = "Share of the PR ballot, IEC final results declared 8 Nov 2026.";
      cands = NAT.map(([id, v]) => ({ id, v, n: LEAD[id] ? LEAD[id][0] : pn(id), img: LEAD[id] ? LEAD[id][1] : LOGO[id], logo: !LEAD[id] }));
    } else if (lvl === "prov" || lvl === "muni") {
      hdr = area + " results"; const tot = Object.values(agg).reduce((a, b) => a + b, 0);
      src = "Share of ward-ballot votes across " + avail + " wards in " + area + ".";
      cands = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, v]) => ({ id, v: tot ? v / tot * 100 : 0, n: LEAD[id] ? LEAD[id][0] : pn(id), img: LEAD[id] ? LEAD[id][1] : LOGO[id], logo: !LEAD[id] }));
    } else {
      hdr = "Metro-wide results"; src = "Share of the PR ballot, IEC final. The mayor is elected by the new council.";
      cands = ((window.MAYORS || {})[S.metro] || []).map(([n, id, img, v, role]) => ({ id, n, img: img || LOGO[id], v: v < 0 ? 0 : v, role, logo: !img }));
    }
    const mx = Math.max(...cands.map((c) => c.v), 0);
    root.querySelector(".dm-res-h").innerHTML = hdr + (lvl === "metro" && STRONG ? ' <span class="dm-res-sub">(Who won the most votes)</span>' : "");
// each person gets their party's logo as a small badge; a party without a photo shows its logo in the circle
const plogoSrc = (id) => PLOGO[id] ? `assets/logos-sm/${PLOGO[id]}.png` : "";
root.querySelector(".dm-cands").innerHTML = cands.map((c) => {
  const party = c.logo || !c.img;
  const img = party ? (plogoSrc(c.id) || c.img) : c.img;
  const inner = img ? `<img src="${img}" alt="" loading="lazy">` : `<em>${String(pn(c.id)).split(/\s+/).map((w) => w[0]).join("").slice(0, 3)}</em>`;
  const badge = !party && plogoSrc(c.id) ? `<img class="dm-cand-lg" src="${plogoSrc(c.id)}" alt="">` : "";
  const name = party ? pn(c.id) : String(c.n).split(" ").slice(-1)[0];
  return `<div class="dm-cand"><span class="dm-phw"><span class="dm-ph${party ? " logo" : ""}" style="--pc:${col(c.id)}">${inner}</span>${badge}</span><span class="dm-cand-t"><span class="dm-cand-n">${name}${c.v === mx && mx > 0 ? ' <b aria-label="Leading">✓</b>' : ""}</span><b class="dm-cand-p">${c.v.toFixed(lvl === "metro" ? 1 : 0)}%</b>${party ? "" : `<span class="dm-cand-party">${pn(c.id)}</span>`}</span></div>`;
}).join("");
    root.querySelector(".dm-note").textContent = `Map shows ward results for ${avail} of ${W.length} wards in ${area}. ${src} Each ward is shaded by ${lvl === "metro" && !STRONG ? "the two leading mayoral candidates’ parties’ share of the ward ballot" : "the winning ward candidate’s party, darker where the win was bigger"}; lighter wards cast fewer votes per square kilometre.`;
    // council seats chart replaces the map while "Council" is picked
    const cEl = root.querySelector(".dm-council");
    if (cEl) {
      const on = S.mode === "council";
      cEl.hidden = !on;
      root.querySelector(".dm-mapwrap").hidden = on;
      root.querySelector(".dm-legend").hidden = on;
      if (on && window.drawCouncil) window.drawCouncil(S.metro, cEl);
    }
    document.dispatchEvent(new CustomEvent("dm-area", { detail: { lvl, code: lvl === "prov" ? S.prov : lvl === "metro" ? S.metro : lvl === "muni" ? S.muni : "ZA", area, agg, tot: totAll, avail, n: W.length } }));
  }

  function sizeLabels(k, fs) {
    if (!labelSel) return;
    labelSel.select("circle").attr("r", (fs * 0.2) / k).attr("stroke-width", (fs * 0.07) / k);
    labelSel.select("text").attr("dy", (fs * 1.1) / k).attr("font-size", fs / k).attr("stroke-width", (fs * 0.22) / k);
  }

  function zoomTo(x, y, k) {
    const t = d3.zoomIdentity.translate(view.x + view.w / 2, view.y + view.h / 2).scale(k).translate(-x, -y);
    svgSel.transition().duration(650).call(zoom.transform, t);
  }

  function renderSel(W, RR, lvl) {
    const el = root.querySelector(".dm-sel");
    if (!S.sel) { el.hidden = true; el.innerHTML = ""; return; }
    const i = W.findIndex((w) => w.code === S.sel.code && w.no === S.sel.no);
    if (i < 0) { el.hidden = true; return; }
    const w = W[i], r = RR[i];
    el.hidden = false;
    el.innerHTML = `<div class="dm-sel-h"><span>Ward ${w.no} in ${w.mn}</span><button type="button" class="dm-sel-x" aria-label="Close ward details">×</button></div>` +
      (r ? `<div class="dm-sel-th"><span>Candidate</span><span>Votes</span><span>Pct.</span></div><div class="dm-sel-rows">${r.k.map((x) => `<div class="dm-sel-r"><span class="dm-sel-c"><i style="background:${col(x[1])}"></i>${plogo(x[1])}<em class="dm-sel-t">${x[0] || "Name not listed"}<b class="muted">, ${pn(x[1])}</b></em></span><span>${fmtN(x[3] || 0)}</span><span>${Math.round((x[3] || 0) / r.tot * 100)}%</span></div>`).join("")}</div>
        <div class="dm-sel-f"><span>${r.partial ? "Top " + r.k.length + " candidates" : r.k.length + " candidates"} · ${fmtN(r.tot)} valid votes${r.r.to ? " · turnout " + r.r.to.toFixed(1) + "%" : ""}</span><button type="button" class="dm-sel-z">Zoom to ward</button></div>`
        : `<div class="muted" style="padding:10px 0">No results for this ward in the data yet.</div>`);
    el.querySelector(".dm-sel-x").onclick = () => { S.sel = null; render(); };
    const z = el.querySelector(".dm-sel-z");
    if (z) z.onclick = () => zoomTo((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, lvl === "nat" ? 14 : 5);
  }

  // delegated controls
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.lvl) set({ lvl: b.dataset.lvl, sel: null });
    else if (b.dataset.tab) set(S.lvl === "prov" ? { prov: b.dataset.tab, sel: null } : { metro: b.dataset.tab, sel: null });
    else if (b.dataset.mode) set({ mode: b.dataset.mode });
  });

  // public: open a metro from elsewhere on the page
  // ward shapes for share cards: one council's wards (or a whole area), filled by the winning party
  window.DMWARDS = (filter) => {
    if (!G) return null;
    const W = G.filter(filter);
    if (!W.length) return null;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, n = 0;
    const paths = W.map((w) => {
      if (w.x0 < x0) x0 = w.x0; if (w.x1 > x1) x1 = w.x1; if (w.y0 < y0) y0 = w.y0; if (w.y1 > y1) y1 = w.y1;
      const r = res(w); if (r) n++;
      return { d: w.d, fill: r ? lab("#ffffff", col(r.k[0][1]), 0.88) : "#e3e6eb", id: r ? r.k[0][1] : null };
    });
    return { x0, y0, w: x1 - x0, h: y1 - y0, paths, declared: n, total: W.length };
  };
window.DMAGG = (filter) => {
  if (!G) return null;
  const agg = {}; let tot = 0;
  G.filter(filter).forEach((w) => { const r = res(w); if (!r) return; tot += r.tot; r.k.forEach((x) => { agg[x[1]] = (agg[x[1]] || 0) + (x[3] || 0); }); });
  return tot ? { agg, tot } : null;
};
window.DMSET = (p) => set(Object.assign({ sel: null }, p));
  window.DMSTATE = () => ({ lvl: S.lvl, prov: S.prov, metro: S.metro });
  window.openMetroMap = (code) => { set({ lvl: "metro", metro: code, sel: null }); root.scrollIntoView({ behavior: "smooth", block: "start" }); };

  // ---------- How votes compare with 2024 ----------
  function renderCompare() {
    if (!document.getElementById("cmp")) return;
    const votes = {};
    Object.keys(F).forEach((code) => { const pv = provOf(code); if (!pv) return; Object.values(F[code]).forEach((r) => (r.k || []).forEach((x) => { votes[pv] = (votes[pv] || 0) + (x[3] || 0); })); });
    const rows = P26.map(([k, id, v]) => { const o = (P24[k] || {})[id] || 0; const d = v - o; return { k, id, v, d, votes: votes[k] || 0 }; }).sort((a, b) => b.votes - a.votes);
    // province outlines from ward bounds: draw all wards faintly, arrows at province centres
    const cen = {}; G.forEach((w) => { const c = cen[w.pv] || (cen[w.pv] = { x: 0, y: 0, n: 0 }); c.x += (w.x0 + w.x1) / 2; c.y += (w.y0 + w.y1) / 2; c.n++; });
    const mx = Math.max(...rows.map((r) => Math.abs(r.d)), 1);
    let s = `<g>${G.map((w) => `<path d="${w.d}" fill="${S.lvl === "prov" && S.prov === w.pv ? "#dcdcdc" : "#efefef"}" stroke="#efefef" stroke-width="0.4"/>`).join("")}</g>`;
    const AB = { EC: "E. Cape", FS: "Free State", GP: "Gauteng", KZN: "KZN", LP: "Limpopo", MP: "Mpum.", NW: "N. West", NC: "N. Cape", WC: "W. Cape" };
    rows.forEach((r) => {
      const c = cen[r.k]; if (!c) return; const X = c.x / c.n, Y = c.y / c.n; const up = r.d >= 0;
      const Ln = 10 + Math.abs(r.d) / mx * 36, dx = Ln * 0.75, dy = Ln * 0.66 * (up ? -1 : 1), x1 = X - dx / 2, y1 = Y - dy / 2, x2 = x1 + dx, y2 = y1 + dy, ang = Math.atan2(y2 - y1, x2 - x1), ah = 6;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2 - Math.cos(ang) * ah * 0.6}" y2="${y2 - Math.sin(ang) * ah * 0.6}" stroke="${col(r.id)}" stroke-width="2.6" stroke-linecap="round"/>`;
      s += `<polygon points="${[[x2, y2], [x2 - Math.cos(ang - 0.45) * ah, y2 - Math.sin(ang - 0.45) * ah], [x2 - Math.cos(ang + 0.45) * ah, y2 - Math.sin(ang + 0.45) * ah]].map((q) => q.join(",")).join(" ")}" fill="${col(r.id)}"/>`;
      s += `<text x="${x1 - 2}" y="${y1 + (up ? 7 : -3)}" text-anchor="end" class="cmp-lab">${AB[r.k]}</text>`;
    });
    const el = document.getElementById("cmp");
    el.querySelector(".cmp-map").innerHTML = `<svg viewBox="-2 -2 343.1 304" role="img" aria-label="Change in the leading party’s share in each province compared with 2024">${s}</svg>`;
    el.querySelector(".cmp-leg").innerHTML = [...new Set(rows.map((r) => r.id))].map((id) => `<span><i style="background:${col(id)}"></i>${pn(id)}</span>`).join("");
    el.querySelector(".cmp-rows").innerHTML = rows.map((r) => `<button type="button" class="cmp-row" data-p="${r.k}"><span>${PROV[r.k]}</span><span><i style="background:${col(r.id)}"></i>${pn(r.id)} ${r.v.toFixed(1)}%</span><span style="color:${r.d >= 0 ? "#1f7a3a" : "#b3261e"}"><b>${r.d >= 0 ? "↗" : "↘"}</b> ${Math.abs(r.d).toFixed(1)} pts.</span><span class="num">${r.votes ? fmtN(r.votes) : "—"}</span></button>`).join("");
    el.querySelectorAll(".cmp-row").forEach((b) => b.onclick = () => { set({ lvl: "prov", prov: b.dataset.p, sel: null }); root.scrollIntoView({ behavior: "smooth", block: "start" }); });
  }

  render();
})();

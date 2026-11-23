// Map page: "An Extremely Detailed Map of the 2026 Local Elections", modelled on the NYT's precinct map.
// Every ward in South Africa, coloured by the winning ward candidate's party (darker = bigger margin), or by turnout.
// Search a place or address (or use your location) to find a ward; hover (desktop) or tap (phone) for full results.
(function () {
  "use strict";
  const PCOL = { ANC: "#f2c40f", DA: "#1f5fc2", MK: "#2c8c4e", EFF: "#d63a3a", IFP: "#9b9b9b", ASA: "#06b616", FFP: "#f08a24", GOOD: "#f47a20", UDM: "#8b5a2b", PA: "#7a4fb5",
    SACP: "#a3121f", RISE: "#6d5bd0", ATM: "#4b5563", IND: "#5f6b73", ACDP: "#8a6cc8", AJ: "#5fa34a", ALJAMA: "#5fa34a", AIC: "#9a9590", PAC: "#3d7a3a", NFP: "#c46a1d", BOSA: "#e0559a" };
  const PNAME = { ASA: "ActionSA", FFP: "VF Plus", MK: "MK", IND: "Independent", RISE: "Rise Mzansi", ALJAMA: "Al Jama-ah", AJ: "Al Jama-ah" };
  const col = (id) => PCOL[id] || "#8a8a8a";
  const pn = (id) => PNAME[id] || id;
  const PROV = { GP: "Gauteng", WC: "Western Cape", KZN: "KwaZulu-Natal", EC: "Eastern Cape", FS: "Free State", LP: "Limpopo", MP: "Mpumalanga", NW: "North West", NC: "Northern Cape" };
  const PRE = { EC: "EC", FS: "FS", GT: "GP", KZN: "KZN", LIM: "LP", MP: "MP", NW: "NW", NC: "NC", WC: "WC" };
  const MET = { JHB: "GP", TSH: "GP", EKU: "GP", CPT: "WC", ETH: "KZN", NMA: "EC", BUF: "EC", MAN: "FS" };
  const provOf = (c) => MET[c] || PRE[(c.match(/^[A-Z]+/) || [""])[0]] || null;
  const ALIAS = { JHB: ["Joburg", "Jozi", "Soweto", "Sandton"], TSH: ["Pretoria", "Centurion"], EKU: ["East Rand", "Germiston", "Benoni", "Boksburg"], CPT: ["Cape Town"],
    ETH: ["Durban", "eThekwini"], NMA: ["Gqeberha", "Port Elizabeth"], BUF: ["East London", "Qonce"], MAN: ["Bloemfontein"] };
  const fmtN = (v) => Math.round(v).toLocaleString("en-ZA").replace(/[, ]/g, " ");

  // ward outlines are drawn in a Mercator projection fitted to South Africa (checked against Cape Agulhas and the
  // country's western, eastern and northern edges): latitude/longitude → map units
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const project = (lon, lat) => [20.6146 * lon - 339.19, -1181.1345 * merc(lat) - 467.8323];

  // basemap labels: provinces when zoomed out, cities and towns as you zoom in (tier = zoom level they appear at)
  const PLACES = [
    ["Johannesburg", -26.2041, 28.0473, 1], ["Pretoria", -25.7479, 28.2293, 1], ["Durban", -29.8587, 31.0218, 1], ["Cape Town", -33.9249, 18.4241, 1],
    ["Gqeberha", -33.9608, 25.6022, 1], ["Bloemfontein", -29.0852, 26.1596, 1], ["East London", -33.0153, 27.9116, 1], ["Polokwane", -23.9045, 29.4689, 1],
    ["Mbombela", -25.4753, 30.9694, 1], ["Kimberley", -28.7282, 24.7499, 1],
    ["Mahikeng", -25.8653, 25.6442, 2.5], ["Pietermaritzburg", -29.6006, 30.3794, 2.5], ["Rustenburg", -25.6544, 27.2559, 2.5], ["Upington", -28.4478, 21.2561, 2.5],
    ["George", -33.963, 22.4617, 2.5], ["Mthatha", -31.5889, 28.7844, 2.5], ["Welkom", -27.9774, 26.7351, 2.5], ["Richards Bay", -28.7807, 32.0383, 2.5],
    ["Newcastle", -27.7577, 29.9318, 2.5], ["eMalahleni", -25.8713, 29.2332, 2.5], ["Springbok", -29.6643, 17.8865, 2.5], ["Beaufort West", -32.3567, 22.583, 2.5],
    ["Thohoyandou", -22.9456, 30.4849, 2.5], ["Komani", -31.8976, 26.875, 2.5], ["Ladysmith", -28.5597, 29.7808, 2.5], ["Mossel Bay", -34.1831, 22.146, 2.5],
    ["Soweto", -26.2485, 27.854, 6], ["Sandton", -26.1076, 28.0567, 6], ["Centurion", -25.8603, 28.1894, 6], ["Benoni", -26.1885, 28.3208, 6], ["Germiston", -26.2309, 28.1677, 6],
    ["Vereeniging", -26.6736, 27.926, 6], ["Krugersdorp", -26.0855, 27.7754, 6], ["Tembisa", -25.9964, 28.2268, 6], ["Soshanguve", -25.5206, 28.0981, 6],
    ["Mamelodi", -25.7167, 28.3833, 6], ["Stellenbosch", -33.9321, 18.8602, 6], ["Paarl", -33.7342, 18.9621, 6], ["Khayelitsha", -34.0403, 18.6778, 6],
    ["Mitchells Plain", -34.0469, 18.6203, 6], ["Bellville", -33.9022, 18.6276, 6], ["Worcester", -33.6465, 19.4485, 6], ["Umlazi", -29.9708, 30.8833, 6],
    ["KwaMashu", -29.7459, 30.9822, 6], ["Pinetown", -29.8167, 30.85, 6], ["Umhlanga", -29.7262, 31.0844, 6], ["Mdantsane", -32.9506, 27.7389, 6],
    ["Klerksdorp", -26.8521, 26.6667, 6], ["Potchefstroom", -26.7145, 27.097, 6], ["Makhanda", -33.3042, 26.5328, 6], ["Knysna", -34.0363, 23.0471, 6],
    ["Musina", -22.3485, 30.0413, 6], ["Kuruman", -27.4524, 23.4325, 6], ["Vryburg", -26.9566, 24.7284, 6], ["Port Shepstone", -30.7414, 30.4547, 6],
    ["Bethlehem", -28.2308, 28.3071, 6], ["Hermanus", -34.4187, 19.2345, 6], ["Oudtshoorn", -33.5927, 22.2015, 6], ["Kroonstad", -27.6504, 27.2349, 6]
  ];
  const PHONE_LATER = ["Pretoria", "Mbombela", "Kimberley"];
  const PROVLAB = [["Northern Cape", -29.6, 21.6], ["Western Cape", -33.15, 20.9], ["Eastern Cape", -32.1, 26.4], ["Free State", -28.25, 27.35], ["North West", -26.55, 25.2],
    ["Mpumalanga", -26.45, 29.85], ["Limpopo", -22.95, 28.55], ["KwaZulu-Natal", -28.55, 30.95]];

  const stage = document.querySelector(".xm-stage"), mapEl = stage.querySelector(".xm-map"), tip = stage.querySelector(".xm-tip"), card = stage.querySelector(".xm-card");
  const msg = stage.querySelector(".xm-msg"), legEl = stage.querySelector(".xm-legend"), form = stage.querySelector(".xm-search"), input = form.querySelector("input"), sug = form.querySelector(".xm-sug");
  const phone = matchMedia("(max-width: 720px)");
  const W = [], MUNI = {};
  let F = null, svg, g, paths, zoom, k = 1, k0 = 1, mode = "win";

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
  const rings = (w) => w.r || (w.r = w.d.split("M").filter(Boolean).map((s) => s.replace(/Z/g, "").split("L").map((p) => p.split(",").map(Number))));
  const inside = (w, x, y) => {
    let c = false;
    rings(w).forEach((ring) => { for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } });
    return c;
  };
  const wardAt = (x, y) => W.findIndex((w) => x >= w.x0 && x <= w.x1 && y >= w.y0 && y <= w.y1 && inside(w, x, y));

  function result(w) {
    const r = F[w.code] && F[w.code][w.no];
    if (!r || !r.k || !r.k.length) return null;
    const kk = r.k.slice().sort((a, b) => (b[3] || 0) - (a[3] || 0));
    const sum = kk.reduce((a, x) => a + (x[3] || 0), 0), pct = kk.reduce((a, x) => a + (x[2] || 0), 0);
    const partial = pct > 0 && pct < 99.5 && kk[0][2] > 0;
    const tot = partial ? Math.round(kk[0][3] * 100 / kk[0][2]) : sum;
    const m = tot ? ((kk[0][3] || 0) - ((kk[1] || [])[3] || 0)) / tot * 100 : 0;
    return { k: kk, tot, m, to: r.to, partial };
  }
  const BINS = [5, 15, 30, 50];
  const shade = (id, m) => d3.interpolateLab("#ffffff", col(id))(0.3 + 0.7 * Math.min(1, m / 50));
  const TO = d3.scaleSequential(d3.interpolateRgbBasis(["#f1eef6", "#bfc9e2", "#7a9cc6", "#3b6aa6", "#0f3a75"])).domain([30, 75]).clamp(true);
  const fillOf = (w) => !w.res ? "#dcdcdc" : mode === "to" ? (w.res.to ? TO(w.res.to) : "#dcdcdc") : shade(w.res.k[0][1], w.res.m);

  Promise.all([d3.json("data/sa-wards-v2.json"), d3.json("data/wards-final-2026.json")]).then(([S, R]) => {
    F = R;
    Object.values(S).forEach((dist) => Object.entries(dist).forEach(([code, m]) => {
      const pv = provOf(code); if (!pv || !m.w) return;
      const mn = String(m.n || code).replace(/ (Local|Metropolitan) Municipality$/, "").replace(/^City of /, "");
      const mb = MUNI[code] = { code, mn, pv, x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, n: 0 };
      m.w.forEach(([no, packed]) => {
        const d = unpack(packed), n = d.match(/-?\d+(\.\d+)?/g).map(Number);
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (let q = 0; q + 1 < n.length; q += 2) { const x = n[q], y = n[q + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        const w = { code, mn, pv, no: String(no), d, x0, x1, y0, y1 };
        w.res = result(w); W.push(w); mb.n++;
        if (x0 < mb.x0) mb.x0 = x0; if (x1 > mb.x1) mb.x1 = x1; if (y0 < mb.y0) mb.y0 = y0; if (y1 > mb.y1) mb.y1 = y1;
      });
    }));
    draw(); legend(); fromHash();
  }).catch((e) => { console.error(e); mapEl.innerHTML = '<p class="xm-loading">Could not load the ward map.</p>'; });

  function draw() {
    const labs = PROVLAB.map(([t, la, lo]) => { const [x, y] = project(lo, la); return `<g class="xm-lab prov" data-t="0" transform="translate(${x},${y})"><text>${t}</text></g>`; }).join("") +
      PLACES.map(([t, la, lo, tier]) => { const [x, y] = project(lo, la); return `<g class="xm-lab" data-t="${tier}" data-n="${t}" transform="translate(${x},${y})"><circle/><text>${t}</text></g>`; }).join("");
    mapEl.innerHTML = `<svg viewBox="-6 -6 352 311" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of South Africa’s 4,468 wards and the 2026 results"><g class="xm-z"><g class="xm-wards">${W.map((w, i) => `<path data-i="${i}" d="${w.d}"/>`).join("")}</g><g class="xm-hi"></g><g class="xm-labs">${labs}</g><g class="xm-pin"></g></g></svg>`;
    svg = d3.select(mapEl).select("svg"); g = svg.select(".xm-z");
    paths = g.selectAll(".xm-wards path").data(W).attr("fill", fillOf);
    zoom = d3.zoom().scaleExtent([0.5, 700]).translateExtent([[-60, -60], [400, 360]])
      .on("zoom", (ev) => { k = ev.transform.k; g.attr("transform", ev.transform); marks(); });
    svg.call(zoom).on("dblclick.zoom", null);
    fit(); const h0 = home(); k0 = h0.k; svg.call(zoom.transform, h0);
    marks();
    const wardsG = g.select(".xm-wards").node();
    wardsG.addEventListener("pointermove", (ev) => {
      if (ev.pointerType === "touch" || phone.matches) return;
      const el = ev.target.closest("path"); if (!el) { tip.hidden = true; return; }
      tip.innerHTML = ward(W[+el.dataset.i], 4); tip.hidden = false;
      const rc = stage.getBoundingClientRect(); let x = ev.clientX - rc.left + 16, y = ev.clientY - rc.top + 16;
      if (x + 260 > rc.width) x -= 290; if (y + tip.offsetHeight > rc.height - 8) y -= tip.offsetHeight + 30;
      tip.style.left = Math.max(6, x) + "px"; tip.style.top = Math.max(6, y) + "px";
    });
    wardsG.addEventListener("pointerleave", () => { tip.hidden = true; });
    wardsG.addEventListener("click", (ev) => { const el = ev.target.closest("path"); if (el) { tip.hidden = true; choose(+el.dataset.i, false); } });
    stage.querySelector(".xm-zin").onclick = () => svg.transition().duration(300).call(zoom.scaleBy, 2);
    stage.querySelector(".xm-zout").onclick = () => svg.transition().duration(300).call(zoom.scaleBy, 0.5);
    stage.querySelector(".xm-zreset").onclick = () => svg.transition().duration(600).call(zoom.transform, home());
  }

  // phones: the map starts under the title card; desktop: South Africa sits to the right of the title card
  function fit() {
    stage.style.setProperty("--xm-top", phone.matches ? stage.querySelector(".xm-panel").offsetHeight + "px" : "0px");
    if (svg) svg.attr("preserveAspectRatio", phone.matches ? "xMidYMin meet" : "xMidYMid meet");
  }
  function home() {
    if (phone.matches) return d3.zoomIdentity;
    const panel = stage.querySelector(".xm-panel"), W0 = mapEl.clientWidth, H0 = mapEl.clientHeight, upp = Math.max(352 / W0, 311 / H0);
    const mapLeft = (W0 - 352 / upp) / 2, cover = panel.offsetLeft + panel.offsetWidth + 16 - mapLeft;
    if (cover <= 0) return d3.zoomIdentity;
    const free = W0 - (panel.offsetLeft + panel.offsetWidth + 16), s = Math.min(1, free / (352 / upp));
    return d3.zoomIdentity.translate((panel.offsetLeft + panel.offsetWidth + 16 + free / 2) * upp - 6 - 170 * s - (W0 * upp - 352) / 2, 0).scale(s);
  }
  addEventListener("resize", () => { if (svg) { fit(); marks(); } });

  // labels, outline and pin keep their size on screen at any zoom; place labels appear by tier
  function marks() {
    const fs = phone.matches ? 11 : 12.5, px = Math.max(352 / (mapEl.clientWidth || 800), 311 / (mapEl.clientHeight || 700)) / k;
    g.selectAll(".xm-lab").each(function () {
      const el = d3.select(this), t = +this.dataset.t, prov = this.classList.contains("prov");
      // phones: no province names, and fewer towns until you zoom in
      const tt = phone.matches ? (PHONE_LATER.includes(this.dataset.n) ? 2 : t > 1 ? t * 1.6 : t) : t;
      const kr = k / k0 + 1e-6;
      el.style("display", prov ? (kr < 2.2 && !phone.matches ? null : "none") : (kr >= tt ? null : "none"));
      el.select("text").attr("font-size", (prov ? fs * 0.82 : fs) * px).attr("y", prov ? 0 : -fs * 0.55 * px).attr("text-anchor", "middle").attr("stroke-width", 3 * px);
      el.select("circle").attr("r", 2.2 * px).attr("stroke-width", 1 * px);
    });
    g.selectAll(".xm-pin circle").attr("r", (d, i) => (i ? 5 : 13) * px).attr("stroke-width", 2 * px);
  }

  // one ward's results as a table (tooltip and card share it)
  function ward(w, max) {
    const r = w.res;
    const head = `<p class="xm-tip-h">Ward ${w.no}</p><p class="xm-tip-p">${w.mn}, ${PROV[w.pv]}</p>`;
    if (!r) return head + `<p class="xm-foot">No results for this ward in the data.</p>`;
    const rows = r.k.slice(0, max || r.k.length).map((x, i) => `<div class="xm-row${i ? "" : " win"}"><span class="c"><i style="background:${col(x[1])}"></i><span>${pn(x[1])}${max ? "" : x[0] ? ` <span class="xm-name">${x[0]}</span>` : ""}</span></span><span class="v">${fmtN(x[3] || 0)}</span><span class="p">${((x[3] || 0) / r.tot * 100).toFixed(0)}%</span></div>`).join("");
    const more = max && r.k.length > max ? ` · ${r.k.length - max} more` : "";
    return head + `<div class="xm-th"><span>Party</span><span>Votes</span><span>Pct.</span></div>${rows}<p class="xm-foot">${pn(r.k[0][1])} won by ${r.m.toFixed(1)} pts. · ${fmtN(r.tot)} votes${r.to ? ` · ${r.to.toFixed(0)}% turnout` : ""}${more}</p>`;
  }

  function zoomBox(x0, y0, x1, y1, max, frac) {
    const w = Math.max(x1 - x0, 0.05), h = Math.max(y1 - y0, 0.05), s = Math.min(max || 700, (frac || 0.8) / Math.max(w / 352, h / 311));
    const t = d3.zoomIdentity.translate(170, 149.5).scale(s).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    svg.transition().duration(900).call(zoom.transform, t);
  }

  function choose(i, fly) {
    const w = W[i];
    g.select(".xm-hi").html(`<path d="${w.d}" fill="none" stroke="#121212" stroke-linejoin="round" vector-effect="non-scaling-stroke" stroke-width="2.4"/>`);
    if (fly) zoomBox(w.x0, w.y0, w.x1, w.y1, 170, 0.32);
    try { history.replaceState(null, "", "#" + w.code + "-" + w.no); } catch (e) {}
    card.innerHTML = `<button type="button" class="xm-card-x" aria-label="Close">×</button>${ward(w)}${w.res && w.res.partial ? '<p class="xm-foot">Only the leading candidates are listed for this ward.</p>' : ""}<button type="button" class="xm-share">Copy link to this ward</button>`;
    card.hidden = false;
    card.querySelector(".xm-card-x").onclick = () => { card.hidden = true; g.select(".xm-hi").html(""); try { history.replaceState(null, "", location.pathname); } catch (e) {} };
    const sh = card.querySelector(".xm-share");
    sh.onclick = () => { const u = location.href; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => { sh.textContent = "Link copied"; }, () => { sh.textContent = u; }); };
  }

  function dropPin(x, y) { g.select(".xm-pin").html(`<circle cx="${x}" cy="${y}" class="xm-pin-o"/><circle cx="${x}" cy="${y}" class="xm-pin-i"/>`); marks(); }
  function say(t) { msg.textContent = t; msg.hidden = !t; if (t) setTimeout(() => { if (msg.textContent === t) msg.hidden = true; }, 5000); }
  function goTo(lon, lat, label) {
    const [x, y] = project(lon, lat), i = wardAt(x, y);
    if (i < 0) { say(`${label || "That place"} is outside South Africa’s wards.`); return; }
    dropPin(x, y); choose(i, true);
  }

  // ---------- search ----------
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  let opts = [], act = -1;
  function list() {
    sug.innerHTML = opts.map((o, i) => `<li role="option" id="xm-o${i}" data-i="${i}"${o.addr ? ' class="xm-sug-a"' : ""}><b>${o.t}</b><span>${o.s}</span></li>`).join("");
    sug.hidden = !opts.length; act = -1;
  }
  function suggest() {
    const q = norm(input.value); opts = [];
    if (q.length >= 2 && W.length) {
      const wm = q.match(/^(?:ward\s*)?(\d{1,3})\b\s*(.*)$/) || q.match(/^(.*?)\s*ward\s*(\d{1,3})$/);
      Object.values(MUNI).forEach((m) => {
        const names = [m.mn].concat(ALIAS[m.code] || []);
        if (wm) {
          const no = /^\d/.test(wm[1]) ? wm[1] : wm[2], rest = /^\d/.test(wm[1]) ? wm[2] : wm[1];
          if (rest && names.some((n) => norm(n).startsWith(rest))) { const i = W.findIndex((w) => w.code === m.code && w.no === no); if (i >= 0) opts.push({ t: `Ward ${no}, ${m.mn}`, s: PROV[m.pv], ward: i, rank: 0 }); }
          return;
        }
        const hit = names.map(norm).find((n) => n.startsWith(q) || n.includes(" " + q) || (q.length > 3 && n.includes(q)));
        if (hit) opts.push({ t: m.mn, s: `${MET[m.code] ? "Metro" : "Municipality"} · ${PROV[m.pv]} · ${m.n} wards`, muni: m.code, rank: hit.startsWith(q) ? (MET[m.code] ? 0 : 1) : 2 });
      });
      opts.sort((a, b) => a.rank - b.rank || a.t.localeCompare(b.t)); opts = opts.slice(0, 6);
      if (!wm) opts.push({ t: `Search for “${input.value.trim()}”`, s: "Addresses, suburbs, towns and places", addr: true });
    }
    list();
  }
  function pick(o) {
    sug.hidden = true; if (!o) return;
    if (o.ward != null) { input.value = o.t; g.select(".xm-pin").html(""); choose(o.ward, true); }
    else if (o.muni) { input.value = o.t; const m = MUNI[o.muni]; g.select(".xm-pin").html(""); zoomBox(m.x0, m.y0, m.x1, m.y1); }
    else if (o.addr) geocode(input.value.trim());
    else if (o.geo) { input.value = o.t; goTo(o.lon, o.lat, o.t); }
    input.blur();
  }
  let lastAsk = 0;
  function geocode(q) {
    if (!q) return;
    const now = Date.now(); if (now - lastAsk < 1100) return; lastAsk = now;
    sug.hidden = true; say("Searching…");
    fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=za&limit=5&q=" + encodeURIComponent(q), { headers: { "Accept-Language": "en" } })
      .then((r) => r.json()).then((res) => {
        msg.hidden = true;
        if (!res.length) { say(`No place called “${q}” found in South Africa.`); return; }
        if (res.length === 1) { input.value = res[0].display_name.split(",").slice(0, 2).join(","); goTo(+res[0].lon, +res[0].lat, q); input.blur(); return; }
        opts = res.map((p) => { const parts = p.display_name.split(","); return { t: parts.slice(0, 2).join(",").trim(), s: parts.slice(2, 5).join(",").trim(), geo: true, lon: +p.lon, lat: +p.lat }; });
        list();
      }).catch(() => say("Address search isn’t available right now. Try a municipality, or “Ward 12 Johannesburg”."));
  }
  input.addEventListener("input", suggest);
  input.addEventListener("focus", () => { if (input.value) suggest(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); if (!opts.length) return;
      act = (act + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length;
      sug.querySelectorAll("li").forEach((li, i) => li.classList.toggle("on", i === act));
      input.setAttribute("aria-activedescendant", "xm-o" + act);
    } else if (e.key === "Escape") sug.hidden = true;
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (act >= 0 && opts[act]) return pick(opts[act]);
    const first = opts.find((o) => !o.addr && !o.geo);
    if (first && norm(first.t) === norm(input.value)) return pick(first);
    geocode(input.value.trim());
  });
  sug.addEventListener("pointerdown", (e) => { const li = e.target.closest("li"); if (li) { e.preventDefault(); pick(opts[+li.dataset.i]); } });
  document.addEventListener("click", (e) => { if (!form.contains(e.target)) sug.hidden = true; });
  form.querySelector(".xm-loc").onclick = () => {
    if (!navigator.geolocation) return say("Your browser can’t share its location.");
    say("Finding your location…");
    navigator.geolocation.getCurrentPosition((p) => { msg.hidden = true; input.value = "Your location"; goTo(p.coords.longitude, p.coords.latitude, "Your location"); },
      () => say("Location not shared. Search for your address instead."), { enableHighAccuracy: true, timeout: 10000 });
  };

  // ---------- layer toggle + legend ----------
  stage.querySelector(".xm-modes").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.dataset.mode === mode) return;
    mode = b.dataset.mode;
    stage.querySelectorAll(".xm-modes button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    paths.attr("fill", fillOf); legend();
  });
  function legend() {
    if (mode === "to") {
      legEl.innerHTML = `<p class="xm-leg-h">Turnout</p><div class="xm-leg-ramp">${[30, 42, 53, 64, 75].map((v) => `<i style="background:${TO(v)}"></i>`).join("")}</div><div class="xm-leg-sc"><span>30%</span><span>75%+</span></div><div class="xm-leg-row"><i></i>No results</div>`;
      return;
    }
    const tally = {}; W.forEach((w) => { if (w.res) tally[w.res.k[0][1]] = (tally[w.res.k[0][1]] || 0) + 1; });
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, phone.matches ? 5 : 6).map(([id]) => id);
    legEl.innerHTML = `<p class="xm-leg-h">Ward winner’s margin</p><div class="xm-leg-g"><span></span>${["<10", "10–20", "20–40", "40+"].map((t) => `<span class="s">${t}</span>`).join("")}${top.map((id) => `<span class="n">${pn(id)}</span>${[5, 15, 30, 50].map((m) => `<i style="background:${shade(id, m)}"></i>`).join("")}`).join("")}</div><div class="xm-leg-row"><i></i>No results</div>`;
  }
  phone.addEventListener("change", () => { if (W.length) { legend(); fit(); const h0 = home(); k0 = h0.k; svg.call(zoom.transform, h0); marks(); } });

  function fromHash() {
    const m = location.hash.match(/^#([A-Z]+\d*)-(\d+)$/); if (!m) return;
    const i = W.findIndex((w) => w.code === m[1] && w.no === m[2]); if (i >= 0) setTimeout(() => choose(i, true), 250);
  }
  addEventListener("hashchange", fromHash);
})();

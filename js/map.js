// Map page: "An Extremely Detailed Map of the 2026 Local Elections".
// Every ward in South Africa, coloured by the winning ward candidate's party, darker where the margin was bigger.
// Search a place or address (or use your location) to find the ward you live in.
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
  // other names people search for a metro
  const ALIAS = { JHB: ["Joburg", "Jozi", "Soweto", "Sandton"], TSH: ["Pretoria", "Centurion"], EKU: ["East Rand", "Germiston", "Benoni", "Boksburg"], CPT: ["Cape Town"],
    ETH: ["Durban", "eThekwini"], NMA: ["Gqeberha", "Port Elizabeth"], BUF: ["East London", "Qonce"], MAN: ["Bloemfontein"] };
  const fmtN = (v) => Math.round(v).toLocaleString("en-ZA").replace(/[, ]/g, " ");

  // the ward outlines are drawn in a Mercator projection fitted to South Africa: these turn latitude and longitude
  // into map units (checked against Cape Agulhas and the country's western, eastern and northern edges)
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const project = (lon, lat) => [20.6146 * lon - 339.19, -1181.1345 * merc(lat) - 467.8323];

  const box = document.querySelector(".mp"), mapEl = box.querySelector(".mp-map"), tip = box.querySelector(".mp-tip"), msg = box.querySelector(".mp-msg");
  const panel = box.querySelector(".mp-ward"), form = box.querySelector(".mp-search"), input = form.querySelector("input"), sug = form.querySelector(".mp-sug");
  const W = [], MUNI = {};
  let F = null, svg, g, zoom, k = 1, sel = -1, pin = null;

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
  // rings as number arrays, made only when needed (finding the ward under a point)
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
    const tot = pct > 0 && pct < 99.5 && kk[0][2] > 0 ? Math.round(kk[0][3] * 100 / kk[0][2]) : sum;
    const m = tot ? ((kk[0][3] || 0) - ((kk[1] || [])[3] || 0)) / tot * 100 : 0;
    return { k: kk, tot, m, to: r.to, partial: pct > 0 && pct < 99.5 };
  }
  // white → party colour: narrow wins pale, landslides deep
  const shade = (id, m) => d3.interpolateLab("#ffffff", col(id))(0.32 + 0.68 * Math.min(1, m / 50));

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
        w.res = result(w);
        W.push(w); mb.n++;
        if (x0 < mb.x0) mb.x0 = x0; if (x1 > mb.x1) mb.x1 = x1; if (y0 < mb.y0) mb.y0 = y0; if (y1 > mb.y1) mb.y1 = y1;
      });
    }));
    draw();
    legend();
    fromHash();
  }).catch((e) => { console.error(e); mapEl.innerHTML = '<p class="dm-loading">Could not load the ward map.</p>'; });

  function draw() {
    const paths = W.map((w, i) => `<path data-i="${i}" d="${w.d}" fill="${w.res ? shade(w.res.k[0][1], w.res.m) : "#e6e7ea"}"/>`).join("");
    const cities = [["JHB", "Johannesburg"], ["TSH", "Pretoria"], ["CPT", "Cape Town"], ["ETH", "Durban"], ["NMA", "Gqeberha"], ["BUF", "East London"], ["MAN", "Bloemfontein"]]
      .map(([c, t]) => { const b = MUNI[c]; return b ? `<g class="mp-city" transform="translate(${(b.x0 + b.x1) / 2},${(b.y0 + b.y1) / 2})"><circle r="1.1"/><text y="-2.4">${t}</text></g>` : ""; }).join("");
    mapEl.innerHTML = `<svg viewBox="-4 -4 348 307" role="img" aria-label="Map of South Africa’s 4,468 wards coloured by the 2026 ward winner"><g class="mp-z"><g class="mp-wards">${paths}</g><g class="mp-hi"></g><g class="mp-cities">${cities}</g><g class="mp-pin"></g></g></svg>`;
    svg = d3.select(mapEl).select("svg"); g = svg.select(".mp-z");
    zoom = d3.zoom().scaleExtent([1, 600]).translateExtent([[-40, -40], [388, 347]])
      .on("zoom", (ev) => { k = ev.transform.k; g.attr("transform", ev.transform); scaleMarks(); });
    svg.call(zoom).on("dblclick.zoom", null);
    scaleMarks();
    const wardsG = g.select(".mp-wards").node();
    wardsG.addEventListener("pointermove", (ev) => {
      if (ev.pointerType === "touch") return;
      const el = ev.target.closest("path"); if (!el) { tip.hidden = true; return; }
      const w = W[+el.dataset.i], r = w.res;
      tip.innerHTML = `<b>Ward ${w.no} · ${w.mn}</b>` + (r ? r.k.slice(0, 3).map((x, i) => `<div class="mp-tip-r${i ? "" : " lead"}"><i style="background:${col(x[1])}"></i><span>${pn(x[1])}</span><span>${Math.round((x[3] || 0) / r.tot * 100)}%</span></div>`).join("") : '<div class="muted">No results</div>');
      tip.hidden = false;
      const rc = mapEl.getBoundingClientRect(); let x = ev.clientX - rc.left + 14, y = ev.clientY - rc.top + 14;
      if (x + 200 > rc.width) x -= 228; if (y + tip.offsetHeight > rc.height) y -= tip.offsetHeight + 28;
      tip.style.left = Math.max(4, x) + "px"; tip.style.top = Math.max(4, y) + "px";
    });
    wardsG.addEventListener("pointerleave", () => { tip.hidden = true; });
    wardsG.addEventListener("click", (ev) => { const el = ev.target.closest("path"); if (el) choose(+el.dataset.i, false); });
    box.querySelector(".mp-zin").onclick = () => svg.transition().duration(300).call(zoom.scaleBy, 2);
    box.querySelector(".mp-zout").onclick = () => svg.transition().duration(300).call(zoom.scaleBy, 0.5);
    box.querySelector(".mp-zreset").onclick = () => { svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity); };
  }

  // labels, outline and pin keep the same size on screen at any zoom
  function scaleMarks() {
    g.selectAll(".mp-city circle").attr("r", 1.6 / k).attr("stroke-width", 0.6 / k);
    g.selectAll(".mp-city text").attr("font-size", 9 / k).attr("y", -3 / k).attr("stroke-width", 2.4 / k);
    g.select(".mp-cities").style("display", k > 18 ? "none" : null);
    g.select(".mp-hi path").attr("stroke-width", 2.2 / k);
    g.selectAll(".mp-pin circle").attr("r", (d, i) => (i ? 5 : 12) / k).attr("stroke-width", 2 / k);
  }

  function zoomBox(x0, y0, x1, y1, max, frac) {
    const w = Math.max(x1 - x0, 0.05), h = Math.max(y1 - y0, 0.05), s = Math.min(max || 600, (frac || 0.8) / Math.max(w / 348, h / 307));
    const t = d3.zoomIdentity.translate(170, 149.5).scale(s).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    svg.transition().duration(800).call(zoom.transform, t);
  }

  function choose(i, fly) {
    sel = i; const w = W[i], r = w.res;
    g.select(".mp-hi").html(`<path d="${w.d}" fill="none" stroke="#121212" stroke-linejoin="round"/>`); scaleMarks();
    if (fly) zoomBox(w.x0, w.y0, w.x1, w.y1, 160, 0.35);
    try { history.replaceState(null, "", "#" + w.code + "-" + w.no); } catch (e) {}
    panel.hidden = false;
    const lead = r && r.k[0];
    panel.innerHTML = `<div class="mp-ward-h"><div><p class="mp-ward-k">${PROV[w.pv]} · ${w.mn}</p><h2>Ward ${w.no}</h2></div><button type="button" class="mp-ward-x" aria-label="Close ward results">×</button></div>` +
      (r ? `<p class="mp-ward-win"><i style="background:${col(lead[1])}"></i><b>${pn(lead[1])}</b> won by ${r.m.toFixed(1)} points${lead[0] ? ` · ${lead[0]}` : ""}</p>
        <div class="mp-ward-th"><span>Candidate</span><span>Votes</span><span>Pct.</span></div>
        ${r.k.map((x) => `<div class="mp-ward-r"><span class="mp-ward-c"><i style="background:${col(x[1])}"></i><em>${x[0] || "Name not listed"}<b>, ${pn(x[1])}</b></em></span><span>${fmtN(x[3] || 0)}</span><span>${Math.round((x[3] || 0) / r.tot * 100)}%</span></div>`).join("")}
        <p class="mp-ward-f">${r.partial ? "Top " + r.k.length + " candidates" : r.k.length + " candidates"} · ${fmtN(r.tot)} valid votes${r.to ? " · turnout " + r.to.toFixed(1) + "%" : ""}</p>`
        : `<p class="muted">No results for this ward in the data yet.</p>`);
    panel.querySelector(".mp-ward-x").onclick = () => { panel.hidden = true; sel = -1; g.select(".mp-hi").html(""); try { history.replaceState(null, "", location.pathname); } catch (e) {} };
    if (fly && matchMedia("(max-width: 720px)").matches) setTimeout(() => panel.scrollIntoView({ behavior: "smooth", block: "nearest" }), 850);
  }

  function dropPin(x, y) {
    g.select(".mp-pin").html(`<circle cx="${x}" cy="${y}" class="mp-pin-o"/><circle cx="${x}" cy="${y}" class="mp-pin-i"/>`); scaleMarks();
  }
  function say(t) { msg.textContent = t; msg.hidden = !t; if (t) setTimeout(() => { if (msg.textContent === t) msg.hidden = true; }, 5000); }

  // a point on the map (from an address or the device's location): pin it and open its ward
  function goTo(lon, lat, label) {
    const [x, y] = project(lon, lat), i = wardAt(x, y);
    if (i < 0) { say(`${label || "That place"} is outside South Africa’s wards.`); return; }
    dropPin(x, y); choose(i, true);
  }

  // ---------- search ----------
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  let opts = [], act = -1;
  function suggest() {
    const q = norm(input.value); opts = []; act = -1;
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
        if (hit) opts.push({ t: m.mn, s: `${MET[m.code] ? "Metro" : "Municipality"} · ${PROV[m.pv]} · ${m.n} wards${hit !== norm(m.mn) ? ` · ${(ALIAS[m.code] || []).find((a) => norm(a) === hit) || ""}` : ""}`, muni: m.code, rank: hit.startsWith(q) ? (MET[m.code] ? 0 : 1) : 2 });
      });
      opts.sort((a, b) => a.rank - b.rank || a.t.localeCompare(b.t)); opts = opts.slice(0, 6);
      if (!wm) opts.push({ t: `Search for “${input.value.trim()}”`, s: "Addresses, suburbs, towns and places", addr: true });
    }
    sug.innerHTML = opts.map((o, i) => `<li role="option" id="mp-o${i}" data-i="${i}"${o.addr ? ' class="mp-sug-a"' : ""}><b>${o.t}</b><span>${o.s}</span></li>`).join("");
    sug.hidden = !opts.length; input.setAttribute("aria-expanded", String(!sug.hidden));
  }
  function pick(o) {
    sug.hidden = true; if (!o) return;
    if (o.ward != null) { input.value = o.t; g.select(".mp-pin").html(""); choose(o.ward, true); }
    else if (o.muni) { input.value = o.t; const m = MUNI[o.muni]; g.select(".mp-pin").html(""); zoomBox(m.x0, m.y0, m.x1, m.y1); }
    else if (o.addr) geocode(input.value.trim());
    else if (o.geo) { input.value = o.t; goTo(o.lon, o.lat, o.t); }
  }
  // addresses and places: OpenStreetMap's search, limited to South Africa, only when asked (Enter or the last option)
  let lastAsk = 0;
  function geocode(q) {
    if (!q) return;
    const now = Date.now(); if (now - lastAsk < 1100) return; lastAsk = now;
    sug.hidden = true; say("Searching…");
    fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=za&limit=5&q=" + encodeURIComponent(q), { headers: { "Accept-Language": "en" } })
      .then((r) => r.json()).then((list) => {
        msg.hidden = true;
        if (!list.length) { say(`No place called “${q}” found in South Africa.`); return; }
        if (list.length === 1) { input.value = list[0].display_name.split(",").slice(0, 3).join(","); goTo(+list[0].lon, +list[0].lat, q); return; }
        opts = list.map((p) => { const parts = p.display_name.split(","); return { t: parts.slice(0, 2).join(",").trim(), s: parts.slice(2, 5).join(",").trim(), geo: true, lon: +p.lon, lat: +p.lat }; });
        sug.innerHTML = opts.map((o, i) => `<li role="option" id="mp-o${i}" data-i="${i}"><b>${o.t}</b><span>${o.s}</span></li>`).join("");
        sug.hidden = false; act = -1;
      }).catch(() => say("Address search isn’t available right now. Try a municipality or “Ward 12 Johannesburg”."));
  }
  input.addEventListener("input", suggest);
  input.addEventListener("focus", () => { if (input.value) suggest(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); if (!opts.length) return;
      act = (act + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length;
      sug.querySelectorAll("li").forEach((li, i) => li.classList.toggle("on", i === act));
      input.setAttribute("aria-activedescendant", "mp-o" + act);
    } else if (e.key === "Escape") { sug.hidden = true; }
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

  form.querySelector(".mp-loc").onclick = () => {
    if (!navigator.geolocation) return say("Your browser can’t share its location.");
    say("Finding your location…");
    navigator.geolocation.getCurrentPosition((p) => { msg.hidden = true; input.value = "Your location"; goTo(p.coords.longitude, p.coords.latitude, "Your location"); },
      () => say("Location not shared. Search for your address instead."), { enableHighAccuracy: true, timeout: 10000 });
  };

  function legend() {
    const tally = {}; W.forEach((w) => { if (w.res) tally[w.res.k[0][1]] = (tally[w.res.k[0][1]] || 0) + 1; });
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 8);
    box.querySelector(".mp-legend").innerHTML = `<div class="mp-leg-h">Ward winner and margin of victory</div>
      <div class="mp-leg-rows">${top.map(([id, n]) => `<div class="mp-leg-r"><span class="mp-leg-n">${pn(id)}</span><span class="mp-leg-bar">${[4, 15, 30, 50].map((m) => `<i style="background:${shade(id, m)}"></i>`).join("")}</span><span class="mp-leg-c">${fmtN(n)} wards</span></div>`).join("")}</div>
      <div class="mp-leg-scale"><span>Narrow win</span><span>Wide win</span></div>`;
  }

  // a shared link like map.html#JHB-103 opens that ward
  function fromHash() {
    const m = location.hash.match(/^#([A-Z]+\d*)-(\d+)$/); if (!m) return;
    const i = W.findIndex((w) => w.code === m[1] && w.no === m[2]); if (i >= 0) setTimeout(() => choose(i, true), 200);
  }
  addEventListener("hashchange", fromHash);
})();

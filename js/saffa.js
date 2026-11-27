// SAFFA: a globe of where South Africans live abroad and of South Africa's missions around the world.
// Data: data/saffa.json (diaspora by country, and every embassy, high commission and consulate) and
// data/saffa-world.json (Natural Earth 110m country outlines, via world-atlas). Drawn with d3 (orthographic projection).
(function () {
  "use strict";
  const root = document.querySelector(".sf"); if (!root || !window.d3) return;
  const box = root.querySelector(".sf-globe"), tip = root.querySelector(".sf-tip");
  const ORIGIN = [28.05, -26.2]; // Johannesburg: where the arcs start
  const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = d3.format(",");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const VIEWS = [["Africa", [-22, 2]], ["Europe", [-12, -48]], ["Middle East & Asia", [-75, -22]], ["Americas", [88, -18]], ["Oceania", [-150, 28]]];

  Promise.all([d3.json("data/saffa.json"), d3.json("data/saffa-world.json"), d3.json("data/saffa-states.json").catch(() => []), d3.json("data/saffa-states-map.json").catch(() => ({ features: [] }))]).then(([D, W, ST, SM]) => {
    const people = D.diaspora.slice().sort((a, b) => b.n - a.n), missions = D.missions;
    const byMap = new Map(people.map((p) => [p.map, p]));
    const isCG = (m) => /consul/i.test(m.type);
    // countries broken down by state or province (US, Australia, Canada): their census figures by region
    const STATE = new Map(ST.map((c) => [c.map, c]));
    const regOf = new Map(); ST.forEach((c) => c.regions.forEach((r) => { r.country = c; regOf.set(c.gu + "-" + r.id, r); }));

    // ---------- key figures ----------
    const nCountries = new Set(missions.map((m) => m.country)).size;
    const nCons = missions.filter(isCG).length;
    root.querySelector(".sf-stats").innerHTML = [
      [D.total.label.replace("about ", "~"), `South African-born people living abroad (${D.total.source.split(" ")[0]} ${D.total.year})`],
      [fmt(people[0].n), `in the ${people[0].name}, the largest community`],
      [String(missions.length), `missions in ${nCountries} countries, ${nCons} of them consulates`]
    ].map(([b, s]) => `<p class="sf-stat"><b>${esc(b)}</b><span>${esc(s)}</span></p>`).join("");

    // ---------- the globe ----------
    box.innerHTML = "";
    const svg = d3.select(box).append("svg").attr("role", "img").attr("aria-label", "Globe of South Africans abroad and South Africa's missions");
    const proj = d3.geoOrthographic().precision(0.3).clipAngle(90);
    const path = d3.geoPath(proj);
    const gSphere = svg.append("path").attr("class", "sf-sphere");
    const gGrat = svg.append("path").attr("class", "sf-grat").datum(d3.geoGraticule10());
    const gLand = svg.append("g");
    const gSub = svg.append("g");
    const gArc = svg.append("g");
    const gBub = svg.append("g");
    const gMis = svg.append("g");
    const gFly = svg.append("g").attr("class", "sf-fly");
    const gLbl = svg.append("g");
    const gRim = svg.append("path").attr("class", "sf-rim");

    const lands = gLand.selectAll("path").data(W.features).join("path")
      .attr("class", (f) => "sf-land" + (f.properties.n === "South Africa" ? " sf-za" : byMap.has(f.properties.n) ? " sf-has" : ""));
    const max = people[0].n;
    const shade = d3.scaleSequentialLog([people[people.length - 1].n, max], d3.interpolate("#e3efe7", "#7fbf9d"));
    lands.filter((f) => byMap.has(f.properties.n) && !STATE.has(f.properties.n)).style("fill", (f) => shade(byMap.get(f.properties.n).n));
    const allReg = [...regOf.values()];
    const shadeR = d3.scaleSequentialLog([Math.max(10, d3.min(allReg, (r) => r.n) || 10), d3.max(allReg, (r) => r.n) || 10], d3.interpolate("#eef6f1", "#3f9b6e"));
    const subs = gSub.selectAll("path").data(SM.features.filter((f) => regOf.has(f.properties.c + "-" + f.properties.id))).join("path")
      .attr("class", "sf-sub").style("fill", (f) => shadeR(Math.max(10, regOf.get(f.properties.c + "-" + f.properties.id).n)));

    const arcs = gArc.selectAll("path").data(people).join("path").attr("class", "sf-arc")
      .datum((p) => ({ p, type: "LineString", coordinates: [ORIGIN, p.ll] }));
    const bubs = gBub.selectAll("circle").data(people).join("circle").attr("class", "sf-bub");
    const mis = gMis.selectAll("circle").data(missions).join("circle").attr("class", (m) => "sf-mis" + (isCG(m) ? " sf-cg" : ""));
    const labelled = people.slice(0, 6).map((p) => ({ t: p.name, ll: p.ll })).concat([{ t: "South Africa", ll: [24.5, -29.5], za: true }]);
    const lbls = gLbl.selectAll("text").data(labelled).join("text").attr("class", (d) => "sf-lbl" + (d.za ? " sf-za-l" : "")).text((d) => d.t).attr("text-anchor", "middle");

    let R = 300, show = "both", hot = null, zoom = 1;
    const rad = d3.scaleSqrt().domain([0, max]);
    const wid = d3.scaleSqrt().domain([0, max]);
    function size() {
      const w = box.clientWidth, h = box.clientHeight || w;
      R = Math.min(w, h) / 2 - 6;
      svg.attr("viewBox", `0 0 ${w} ${h}`);
      proj.translate([w / 2, h / 2]).scale(R * zoom);
      rad.range([0, Math.max(10, R * 0.11)]);
      wid.range([0.4, Math.max(2.5, R * 0.016)]);
      draw();
    }
    const front = (ll) => d3.geoDistance(ll, [-proj.rotate()[0], -proj.rotate()[1]]) < Math.PI / 2 - 0.02;
    const xy = (ll) => proj(ll);
    function draw() {
      gSphere.attr("d", path({ type: "Sphere" }));
      gRim.attr("d", path({ type: "Sphere" }));
      gGrat.attr("d", path);
      lands.attr("d", path);
      subs.attr("d", show === "both" || show === "people" ? path : null).classed("sf-hot", (f) => hot === regOf.get(f.properties.c + "-" + f.properties.id));
      const P = show === "both" || show === "people", M = show === "both" || show === "missions"; // "flights": routes come later
      arcs.attr("d", (d) => (P ? path(d) : null)).attr("stroke-width", (d) => wid(d.p.n));
      bubs.each(function (p) {
        const on = P && front(p.ll), c = on && xy(p.ll);
        d3.select(this).attr("display", on ? null : "none").attr("cx", on ? c[0] : 0).attr("cy", on ? c[1] : 0).attr("r", rad(p.n)).classed("sf-hot", hot === p);
      });
      mis.each(function (m) {
        const on = M && front(m.ll), c = on && xy(m.ll);
        d3.select(this).attr("display", on ? null : "none").attr("cx", on ? c[0] : 0).attr("cy", on ? c[1] : 0).attr("r", R > 260 ? 3.4 : 2.8).classed("sf-hot", hot === m);
      });
      lbls.each(function (d) {
        const on = (d.za || P) && front(d.ll), c = on && xy(d.ll);
        const p = !d.za && people.find((q) => q.name === d.t);
        d3.select(this).attr("display", on ? null : "none").attr("x", on ? c[0] : 0).attr("y", on ? c[1] - (p ? rad(p.n) + 5 : -4) : 0);
      });
      lands.classed("sf-hot", (f) => !!hot && hot.map === f.properties.n);
      drawFlights();
    }

    // ---------- turning ----------
    proj.rotate([-18, -12]);
    let spin = !REDUCE, last = null;
    const timer = d3.timer((t) => {
      if (!spin) { last = t; return; }
      const dt = last == null ? 0 : t - last; last = t;
      const r = proj.rotate(); proj.rotate([r[0] + dt * 0.006, r[1]]); draw();
    });
    const stop = () => { spin = false; };
    let r0, p0;
    svg.call(d3.drag()
      .on("start", (e) => { stop(); r0 = proj.rotate(); p0 = [e.x, e.y]; hideTip(); })
      .on("drag", (e) => {
        const k = 75 / R;
        proj.rotate([r0[0] + (e.x - p0[0]) * k, Math.max(-75, Math.min(75, r0[1] - (e.y - p0[1]) * k)), r0[2]]);
        draw();
      }));
    function fly(ll, then) {
      stop();
      const from = proj.rotate(), to = [-ll[0], Math.max(-60, Math.min(60, -ll[1]))];
      if (REDUCE) { proj.rotate(to); draw(); if (then) then(); return; }
      const i = d3.interpolate(from, to);
      svg.transition().duration(1100).ease(d3.easeCubicInOut).tween("rot", () => (t) => { proj.rotate(i(t)); draw(); }).on("end", () => then && then());
    }

    // ---------- tooltips ----------
    const yearNote = (p) => `${p.source ? esc(p.source) : "Source not stated"}${p.year ? ", " + esc(p.year) : ""}`;
    function tipFor(d) {
      if (d.fl) return flightTip(d);
      if (d.country && d.country.regions) return `<b>${esc(d.name)}, ${esc(d.country.name)}</b><span class="t-n">${fmt(d.n)}</span>South African-born residents<span class="t-s">${esc(d.country.source)}, ${esc(d.country.year)}</span>`;
      if (d.n != null) return `<b>${esc(d.name)}</b><span class="t-n">${d.approx ? "~" : ""}${fmt(d.n)}</span>South African-born residents<span class="t-s">${yearNote(d)}</span>`;
      return `<b>${esc(d.city)}, ${esc(d.country)}</b>${esc(d.type)}`;
    }
    function showTip(d, x, y) {
      tip.innerHTML = tipFor(d); tip.hidden = false;
      const bw = box.parentNode.clientWidth, tw = tip.offsetWidth;
      tip.style.left = Math.max(4, Math.min(x + 14, bw - tw - 4)) + "px";
      tip.style.top = (y + box.offsetTop + 14) + "px";
    }
    function hideTip() { tip.hidden = true; }
    function pick(d, el) {
      hot = d; draw(); syncList();
      const c = proj(d.ll); if (c) showTip(d, c[0], c[1]);
    }
    [bubs, mis].forEach((sel) => sel
      .on("mouseenter", function (e, d) { const c = proj(d.ll); hot = d; draw(); showTip(d, c[0], c[1]); })
      .on("mouseleave", () => { hot = null; draw(); hideTip(); })
      .on("click", function (e, d) { e.stopPropagation(); stop(); pick(d, this); }));
    subs.on("mouseenter", function (e, f) { const r = regOf.get(f.properties.c + "-" + f.properties.id), c = proj(r.ll); if (!c) return; hot = r; draw(); showTip(r, c[0], c[1]); })
      .on("mouseleave", () => { hot = null; draw(); hideTip(); })
      .on("click", function (e, f) { e.stopPropagation(); stop(); pick(regOf.get(f.properties.c + "-" + f.properties.id)); });
    svg.on("click", () => { hot = null; draw(); hideTip(); syncList(); });

    // ---------- controls ----------
    root.querySelectorAll(".sf-seg button").forEach((b) => b.addEventListener("click", () => {
      show = b.dataset.show; root.querySelectorAll(".sf-seg button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      hot = null; hideTip(); flightsOn(show === "flights"); setKey(); draw();
    }));
    const go = root.querySelector(".sf-go");
    go.innerHTML = VIEWS.map(([n], i) => `<button type="button" data-i="${i}">${esc(n)}</button>`).join("");
    go.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; hideTip(); hot = null; const v = VIEWS[+b.dataset.i][1]; fly([-v[0], -v[1]]); });

    // ---------- flights: live aircraft into and out of South Africa ----------
    // Positions: /api/flights (netlify/functions/flights.mjs, from adsb.lol). Routes: data/flight-routes.json (Virtual
    // Radar Server standing data), which tells a flight to or from South Africa from one just passing over.
    const FL = { on: false, routes: null, ac: [], at: null, err: false, timer: null };
    const fPanel = root.querySelector('[data-panel="flights"]');
    const isZA = (icao) => icao.startsWith("FA");
    const apName = (icao) => { const a = FL.routes.airports[icao]; return a ? a[1] || a[0] : icao; };
    const apCode = (icao) => { const a = FL.routes.airports[icao]; return (a && a[2]) || icao; };
    const PLANE = "M0,-7L1.4,-2L6.5,1.5L6.5,3L1.4,1.6L1,5L2.8,6.4L2.8,7.4L0,6.6L-2.8,7.4L-2.8,6.4L-1,5L-1.4,1.6L-6.5,3L-6.5,1.5L-1.4,-2Z";
    function flightsFrom(ac) {
      const R = FL.routes.routes;
      return ac.map((a) => {
        const rt = R[a.c] || R[a.c.replace(/[A-Z]$/, "")]; if (!rt) return null;
        const legs = rt.split("-"), from = legs[0], to = legs[legs.length - 1];
        if (!FL.routes.airports[from] || !FL.routes.airports[to]) return null;
        const kind = isZA(from) && isZA(to) ? "dom" : isZA(to) ? "in" : "out";
        const A = FL.routes.airports;
        return { fl: true, ...a, from, to, kind, line: { type: "LineString", coordinates: [[A[from][5], A[from][4]], [A[to][5], A[to][4]]] },
          airline: FL.routes.airlines[a.c.slice(0, 3)] || "" };
      }).filter(Boolean).sort((x, y) => ({ in: 0, out: 1, dom: 2 }[x.kind] - { in: 0, out: 1, dom: 2 }[y.kind]) || x.c.localeCompare(y.c));
    }
    const ft = (n) => (n == null ? "" : n === 0 ? "on the ground" : `${fmt(Math.round(n / 100) * 100)} ft`);
    function flightTip(f) {
      return `<b>${esc(f.c)}${f.airline ? " · " + esc(f.airline) : ""}</b><span class="t-n">${esc(apName(f.from))} → ${esc(apName(f.to))}</span>${esc(apCode(f.from))} to ${esc(apCode(f.to))}${f.t ? " · " + esc(f.t) : ""}${f.alt != null ? " · " + ft(f.alt) : ""}<span class="t-s">Position from adsb.lol</span>`;
    }
    let flLines = gFly.append("g"), flPlanes = gFly.append("g");
    function drawFlights() {
      const on = show === "flights" && FL.routes;
      gFly.attr("display", on ? null : "none"); if (!on) return;
      flLines.selectAll("path").attr("d", (f) => path(f.line)).classed("sf-hot", (f) => hot === f);
      flPlanes.selectAll("path").each(function (f) {
        const vis = front(f.ll), c = vis && xy(f.ll);
        d3.select(this).attr("display", vis ? null : "none").attr("transform", vis ? `translate(${c[0]},${c[1]}) rotate(${f.trk || 0}) scale(${R > 260 ? 1.6 : 1.3})` : null).classed("sf-hot", hot === f);
      });
    }
    function renderFlights() {
      const list = FL.routes ? flightsFrom(FL.ac) : [];
      flLines.selectAll("path").data(list, (f) => f.c).join("path").attr("class", (f) => "sf-froute sf-f-" + f.kind);
      flPlanes.selectAll("path").data(list, (f) => f.c).join("path").attr("class", (f) => "sf-plane sf-f-" + f.kind).attr("d", PLANE)
        .on("mouseenter", function (e, f) { const c = proj(f.ll); hot = f; draw(); showTip(f, c[0], c[1]); })
        .on("mouseleave", () => { hot = null; draw(); hideTip(); })
        .on("click", function (e, f) { e.stopPropagation(); stop(); pick(f); });
      FL.list = list;
      const when = FL.at ? new Date(FL.at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" }) : "";
      const n = { in: 0, out: 0, dom: 0 }; list.forEach((f) => n[f.kind]++);
      const H = { in: "Flying in to South Africa", out: "Flying out of South Africa", dom: "Domestic" };
      fPanel.innerHTML = (FL.err && !list.length ? `<p class="sf-fnote">Live flights are not available right now. Try again in a few minutes.</p>`
        : `<p class="sf-fnote"><b>${list.length}</b> flight${list.length === 1 ? "" : "s"} in the air to or from South Africa${when ? `, as of ${when} SAST` : ""}. Updates every few minutes.</p>`) +
        ["in", "out", "dom"].filter((k) => n[k]).map((k) => `<p class="sf-reg">${H[k]} · ${n[k]}</p>` + list.map((f, i) => f.kind !== k ? "" :
          `<button type="button" class="sf-mrow sf-frow" data-i="${i}"><span><b>${esc(f.c)}</b>${f.airline ? ` <span>${esc(f.airline)}</span>` : ""}<br><span>${esc(apName(f.from))} → ${esc(apName(f.to))}</span></span><em>${f.alt === 0 ? "On the ground" : esc(ft(f.alt))}</em></button>`).join("")).join("") +
        `<p class="sf-fnote sf-fsmall">Positions from <a href="https://adsb.lol" target="_blank" rel="noopener">adsb.lol</a>’s volunteer receivers (ODbL), so planes out of their range, over most of the ocean, do not show. Routes from Virtual Radar Server’s standing data, matched by flight number.</p>`;
      draw();
    }
    function loadFlights() {
      const routes = FL.routes ? Promise.resolve(FL.routes) : d3.json("data/flight-routes.json").then((r) => (FL.routes = r));
      return Promise.all([routes, fetch("/api/flights", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))])
        .then(([, d]) => { FL.ac = d.ac || []; FL.at = d.at; FL.err = false; renderFlights(); })
        .catch(() => { FL.err = true; if (FL.routes) renderFlights(); });
    }
    // flights sit close together over South Africa, so the Flights view zooms in on it
    function zoomTo(k) {
      const z0 = zoom;
      if (REDUCE) { zoom = k; proj.scale(R * zoom); draw(); return; }
      svg.transition("zoom").duration(1100).ease(d3.easeCubicInOut).tween("zoom", () => (t) => { zoom = z0 + (k - z0) * t; proj.scale(R * zoom); draw(); });
    }
    function flightsOn(on) {
      clearInterval(FL.timer); FL.timer = null;
      root.querySelector('.sf-tabs [data-tab="flights"]').hidden = !on;
      root.classList.toggle("sf-flmode", on);
      if (!on) { if (FL.on) { root.querySelector('.sf-tabs [data-tab="people"]').click(); zoomTo(1); } FL.on = false; return; }
      FL.on = true; root.querySelector('.sf-tabs [data-tab="flights"]').click(); zoomTo(2.6);
      if (!fPanel.innerHTML) fPanel.innerHTML = '<p class="sf-fnote">Loading live flights…</p>';
      loadFlights(); FL.timer = setInterval(() => { if (!document.hidden) loadFlights(); }, 120000);
      fly([24.5, -29]);
    }
    fPanel.addEventListener("click", (e) => { const b = e.target.closest(".sf-frow"); if (!b) return; const f = FL.list[+b.dataset.i]; hot = f; hideTip(); fly(f.ll, () => pick(f)); });

    // ---------- side lists ----------
    const pPanel = root.querySelector('[data-panel="people"]'), mPanel = root.querySelector('[data-panel="missions"]');
    const TOP = 5;
    pPanel.innerHTML = people.map((p, i) => `<button type="button" class="sf-row${i >= TOP ? " sf-more" : ""}" data-i="${i}">
        <span class="r-i">${i + 1}</span><span class="r-n">${esc(p.name)}</span><span class="r-v">${p.approx ? "~" : ""}${fmt(p.n)}</span>
        <span class="r-bar"><i style="width:${(p.n / max * 100).toFixed(1)}%"></i></span><span class="r-s">${yearNote(p)}${STATE.has(p.map) ? ` · <u>By ${STATE.get(p.map).unit}</u>` : ""}</span>
      </button>${STATE.has(p.map) ? regionList(STATE.get(p.map), p) : ""}`).join("");
    pPanel.insertAdjacentHTML("beforeend", `<button type="button" class="sf-all-btn" aria-expanded="false">Show all ${people.length} countries</button>`);
    const allBtn = pPanel.querySelector(".sf-all-btn");
    const showAll = (on) => { pPanel.classList.toggle("sf-all", on); allBtn.setAttribute("aria-expanded", on); allBtn.textContent = on ? "Show top 5 only" : `Show all ${people.length} countries`; };
    allBtn.addEventListener("click", () => { const on = !pPanel.classList.contains("sf-all"); showAll(on); if (!on) pPanel.scrollTop = 0; });
    function regionList(c, p) {
      const top = c.regions[0].n;
      return `<div class="sf-regs" data-c="${c.gu}" hidden><p class="sf-regs-h">South African-born residents by ${esc(c.unit)}, ${esc(c.year)}</p>` + c.regions.map((r) => `<button type="button" class="sf-rrow" data-r="${c.gu}-${r.id}"><span>${esc(r.name)}</span><b>${fmt(r.n)}</b><span class="r-bar"><i style="width:${(r.n / top * 100).toFixed(1)}%"></i></span></button>`).join("") + `<p class="sf-regs-s">${esc(c.source)}.${c.total === p.n ? "" : ` Totals by ${esc(c.unit)} come from a different count than the national figure above, so they don’t add up to it exactly.`}</p></div>`;
    }
    const ORDER = ["Africa", "Europe", "Asia", "Americas", "Oceania"];
    const groups = d3.groups(missions.map((m, i) => ({ m, i })), (x) => x.m.region).sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));
    mPanel.innerHTML = groups.map(([reg, list]) => `<p class="sf-reg">${esc(reg)} · ${list.length}</p>` + list
      .sort((a, b) => a.m.country.localeCompare(b.m.country) || (isCG(a.m) - isCG(b.m)))
      .map(({ m, i }) => `<button type="button" class="sf-mrow" data-i="${i}"><span><b>${esc(m.city)}</b><br><span>${esc(m.country)}</span></span><em>${esc(m.type)}</em></button>`).join("")).join("");
    pPanel.addEventListener("click", (e) => {
      const rr = e.target.closest(".sf-rrow");
      if (rr) { const r = regOf.get(rr.dataset.r); if (show === "missions" || show === "flights") root.querySelector('[data-show="both"]').click(); hot = r; syncList(); hideTip(); fly(r.ll, () => pick(r)); return; }
    });
    pPanel.addEventListener("click", (e) => { const b = e.target.closest(".sf-row"); if (!b) return; const p = people[+b.dataset.i]; const st = STATE.get(p.map); if (st) { const box2 = pPanel.querySelector(`.sf-regs[data-c="${st.gu}"]`); box2.hidden = false; } if (show === "missions" || show === "flights") root.querySelector('[data-show="both"]').click(); hot = p; syncList(); hideTip(); fly(p.ll, () => pick(p)); });
    mPanel.addEventListener("click", (e) => { const b = e.target.closest(".sf-mrow"); if (!b) return; const m = missions[+b.dataset.i]; if (show === "people" || show === "flights") root.querySelector('[data-show="both"]').click(); hot = m; syncList(); hideTip(); fly(m.ll, () => pick(m)); });
    function syncList() {
      pPanel.querySelectorAll(".sf-row").forEach((b) => b.classList.toggle("sf-hot", hot === people[+b.dataset.i]));
      const hi = people.indexOf(hot), hr = hot && hot.country ? people.findIndex((q) => q.map === hot.country.map) : -1;
      if (Math.max(hi, hr) >= TOP) showAll(true); // something picked on the globe that sits below the top 5
      pPanel.querySelectorAll(".sf-rrow").forEach((b) => b.classList.toggle("sf-hot", hot === regOf.get(b.dataset.r)));
      mPanel.querySelectorAll(".sf-mrow").forEach((b) => b.classList.toggle("sf-hot", hot === missions[+b.dataset.i]));
    }
    root.querySelectorAll(".sf-tabs button").forEach((b) => b.addEventListener("click", () => {
      root.querySelectorAll(".sf-tabs button").forEach((x) => x.setAttribute("aria-selected", x === b));
      root.querySelectorAll(".sf-panel").forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.tab; });
    }));

    // ---------- key and sources ----------
    const KEY = `<span><i class="k-bub"></i>South Africans living there</span><span><i class="k-emb"></i>Embassy or high commission</span><span><i class="k-cg"></i>Consulate</span><span><i class="k-za"></i>South Africa</span>`;
    const FKEY = `<span><i class="k-fl k-in"></i>Flying in</span><span><i class="k-fl k-out"></i>Flying out</span><span><i class="k-fl k-dom"></i>Domestic</span><span><i class="k-za"></i>South Africa</span>`;
    function setKey() { root.querySelector(".sf-key").innerHTML = show === "flights" ? FKEY : KEY; }
    setKey();
    root.querySelector(".sf-src").innerHTML = `People: South African-born residents of each country, from each country's own census or statistics office where available, otherwise the UN's International Migrant Stock (2020), as compiled on Wikipedia's <a href="https://en.wikipedia.org/wiki/South_African_diaspora" target="_blank" rel="noopener">South African diaspora</a> page. Figures come from different years and some are estimates (marked ~), so they are not exactly comparable. The worldwide total is the UN's 2020 estimate. The list shows the ${people.length} countries with the largest communities. Missions: South Africa's embassies, high commissions, consulates and other offices abroad, from DIRCO's list as compiled on Wikipedia's <a href="https://en.wikipedia.org/wiki/List_of_diplomatic_missions_of_South_Africa" target="_blank" rel="noopener">list of diplomatic missions of South Africa</a>; missions to the UN are not shown. States, provinces and regions: ${ST.map((c) => `${esc(c.name)}, ${esc(c.source)} (${esc(c.year)})`).join("; ")}. Map outlines: Natural Earth (via world-atlas, sane-topojson and chizu); UK regions combined from Natural Earth’s council areas. Updated ${esc(D.updated)}.`;

    // for the ask bar: turn the globe to a country, state or mission and show its card
    window.SAFFA = {
      data: { people, missions, states: ST, total: D.total, world: W.features.map((f) => f.properties.n) },
      focus(d) { if (!d) return; if (show !== "both") root.querySelector('[data-show="both"]').click(); if (d.country && d.country.regions) { const b = pPanel.querySelector(`.sf-regs[data-c="${d.country.gu}"]`); if (b) b.hidden = false; } hot = d; syncList(); hideTip(); root.querySelector(".sf-globe").scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "center" }); fly(d.ll, () => pick(d)); }
    };
    size();
    addEventListener("resize", size);
    document.addEventListener("visibilitychange", () => { if (document.hidden) timer.stop(); });
  }).catch(() => { box.innerHTML = '<p class="sf-loading">Could not load the globe.</p>'; });
})();

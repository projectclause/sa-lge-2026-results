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

  Promise.all([d3.json("data/saffa.json"), d3.json("data/saffa-world.json")]).then(([D, W]) => {
    const people = D.diaspora.slice().sort((a, b) => b.n - a.n), missions = D.missions;
    const byMap = new Map(people.map((p) => [p.map, p]));
    const isCG = (m) => /consul/i.test(m.type);

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
    const gArc = svg.append("g");
    const gBub = svg.append("g");
    const gMis = svg.append("g");
    const gLbl = svg.append("g");
    const gRim = svg.append("path").attr("class", "sf-rim");

    const lands = gLand.selectAll("path").data(W.features).join("path")
      .attr("class", (f) => "sf-land" + (f.properties.n === "South Africa" ? " sf-za" : byMap.has(f.properties.n) ? " sf-has" : ""));
    const max = people[0].n;
    const shade = d3.scaleSequentialLog([people[people.length - 1].n, max], d3.interpolate("#e3efe7", "#7fbf9d"));
    lands.filter((f) => byMap.has(f.properties.n)).style("fill", (f) => shade(byMap.get(f.properties.n).n));

    const arcs = gArc.selectAll("path").data(people).join("path").attr("class", "sf-arc")
      .datum((p) => ({ p, type: "LineString", coordinates: [ORIGIN, p.ll] }));
    const bubs = gBub.selectAll("circle").data(people).join("circle").attr("class", "sf-bub");
    const mis = gMis.selectAll("circle").data(missions).join("circle").attr("class", (m) => "sf-mis" + (isCG(m) ? " sf-cg" : ""));
    const labelled = people.slice(0, 6).map((p) => ({ t: p.name, ll: p.ll })).concat([{ t: "South Africa", ll: [24.5, -29.5], za: true }]);
    const lbls = gLbl.selectAll("text").data(labelled).join("text").attr("class", (d) => "sf-lbl" + (d.za ? " sf-za-l" : "")).text((d) => d.t).attr("text-anchor", "middle");

    let R = 300, show = "both", hot = null;
    const rad = d3.scaleSqrt().domain([0, max]);
    const wid = d3.scaleSqrt().domain([0, max]);
    function size() {
      const w = box.clientWidth, h = box.clientHeight || w;
      R = Math.min(w, h) / 2 - 6;
      svg.attr("viewBox", `0 0 ${w} ${h}`);
      proj.translate([w / 2, h / 2]).scale(R);
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
      const P = show !== "missions", M = show !== "people";
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
    svg.on("click", () => { hot = null; draw(); hideTip(); syncList(); });

    // ---------- controls ----------
    root.querySelectorAll(".sf-seg button").forEach((b) => b.addEventListener("click", () => {
      show = b.dataset.show; root.querySelectorAll(".sf-seg button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      hot = null; hideTip(); draw();
    }));
    const go = root.querySelector(".sf-go");
    go.innerHTML = VIEWS.map(([n], i) => `<button type="button" data-i="${i}">${esc(n)}</button>`).join("");
    go.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; hideTip(); hot = null; const v = VIEWS[+b.dataset.i][1]; fly([-v[0], -v[1]]); });

    // ---------- side lists ----------
    const pPanel = root.querySelector('[data-panel="people"]'), mPanel = root.querySelector('[data-panel="missions"]');
    pPanel.innerHTML = people.map((p, i) => `<button type="button" class="sf-row" data-i="${i}">
        <span class="r-i">${i + 1}</span><span class="r-n">${esc(p.name)}</span><span class="r-v">${p.approx ? "~" : ""}${fmt(p.n)}</span>
        <span class="r-bar"><i style="width:${(p.n / max * 100).toFixed(1)}%"></i></span><span class="r-s">${yearNote(p)}</span>
      </button>`).join("");
    const ORDER = ["Africa", "Europe", "Asia", "Americas", "Oceania"];
    const groups = d3.groups(missions.map((m, i) => ({ m, i })), (x) => x.m.region).sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));
    mPanel.innerHTML = groups.map(([reg, list]) => `<p class="sf-reg">${esc(reg)} · ${list.length}</p>` + list
      .sort((a, b) => a.m.country.localeCompare(b.m.country) || (isCG(a.m) - isCG(b.m)))
      .map(({ m, i }) => `<button type="button" class="sf-mrow" data-i="${i}"><span><b>${esc(m.city)}</b><br><span>${esc(m.country)}</span></span><em>${esc(m.type)}</em></button>`).join("")).join("");
    pPanel.addEventListener("click", (e) => { const b = e.target.closest(".sf-row"); if (!b) return; const p = people[+b.dataset.i]; if (show === "missions") root.querySelector('[data-show="both"]').click(); hot = p; syncList(); hideTip(); fly(p.ll, () => pick(p)); });
    mPanel.addEventListener("click", (e) => { const b = e.target.closest(".sf-mrow"); if (!b) return; const m = missions[+b.dataset.i]; if (show === "people") root.querySelector('[data-show="both"]').click(); hot = m; syncList(); hideTip(); fly(m.ll, () => pick(m)); });
    function syncList() {
      pPanel.querySelectorAll(".sf-row").forEach((b) => b.classList.toggle("sf-hot", hot === people[+b.dataset.i]));
      mPanel.querySelectorAll(".sf-mrow").forEach((b) => b.classList.toggle("sf-hot", hot === missions[+b.dataset.i]));
    }
    root.querySelectorAll(".sf-tabs button").forEach((b) => b.addEventListener("click", () => {
      root.querySelectorAll(".sf-tabs button").forEach((x) => x.setAttribute("aria-selected", x === b));
      root.querySelectorAll(".sf-panel").forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.tab; });
    }));

    // ---------- key and sources ----------
    root.querySelector(".sf-key").innerHTML = `<span><i class="k-bub"></i>South Africans living there</span><span><i class="k-emb"></i>Embassy or high commission</span><span><i class="k-cg"></i>Consulate</span><span><i class="k-za"></i>South Africa</span>`;
    root.querySelector(".sf-src").innerHTML = `People: South African-born residents of each country, from each country's own census or statistics office where available, otherwise the UN's International Migrant Stock (2020), as compiled on Wikipedia's <a href="https://en.wikipedia.org/wiki/South_African_diaspora" target="_blank" rel="noopener">South African diaspora</a> page. Figures come from different years and some are estimates (marked ~), so they are not exactly comparable. The worldwide total is the UN's 2020 estimate. The list shows the ${people.length} countries with the largest communities. Missions: South Africa's embassies, high commissions, consulates and other offices abroad, from DIRCO's list as compiled on Wikipedia's <a href="https://en.wikipedia.org/wiki/List_of_diplomatic_missions_of_South_Africa" target="_blank" rel="noopener">list of diplomatic missions of South Africa</a>; missions to the UN are not shown. Map outlines: Natural Earth. Updated ${esc(D.updated)}.`;

    size();
    addEventListener("resize", size);
    document.addEventListener("visibilitychange", () => { if (document.hidden) timer.stop(); });
  }).catch(() => { box.innerHTML = '<p class="sf-loading">Could not load the globe.</p>'; });
})();

// Preamble News Tracker (news-tracker.html): an animated network map of how the coalition stories spread across
// outlets and voices. It reads the same live data as the Coalitions Tracker (data/coalition-feed.json joined with the
// hourly data/coalition-auto.json, via js/feed.js), so it updates every hour with the rest of the site.
//   outlet (blue)  · a publication; outlets with fewer than 3 links are merged into "Other outlets"
//   story  (orange)· one coalition story
//   piece  (pink)  · a voice piece (column, podcast, post…) by a journalist or key player, attached to a story
//   report (green) · a news report in a story's coverage list
(function () {
  "use strict";
  const root = document.getElementById("pnt");
  if (!root || !window.d3 || !window.PreambleFeed) {
    const m = root && root.querySelector(".pnt-msg"); if (m) m.textContent = "The tracker could not load. Please refresh the page.";
    return;
  }
  const $ = (s) => root.querySelector(s);
  const COL = { outlet: "#3a7bd5", story: "#f0501e", piece: "#d61fbd", report: "#1fcf8f" };
  const TYPE = { outlet: "Outlet", story: "Story", piece: "Voice piece", report: "Report" };
  const OTHER = "Other outlets";
  const REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TOUCH = window.matchMedia && matchMedia("(hover: none)").matches;
  const phone = () => window.matchMedia && matchMedia("(max-width: 620px)").matches;
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const dt = (d) => { const [y, m, dd] = d.split("-").map(Number); return new Date(Date.UTC(y, m - 1, dd)); };
  const shortDay = (d) => { const x = dt(d); return x.getUTCDate() + " " + MON[x.getUTCMonth()]; };
  const dateS = (d) => { const x = dt(d); return DOW[x.getUTCDay()] + ", " + x.getUTCDate() + " " + MON[x.getUTCMonth()]; };
  const dateL = (d) => { const x = dt(d); return DOW[x.getUTCDay()] + ", " + x.getUTCDate() + " " + MONL[x.getUTCMonth()] + " " + x.getUTCFullYear(); };
  const initials = (s) => {
    const w = String(s).replace(/&/g, " ").split(/\s+/).filter((x) => /[A-Za-z0-9]/.test(x));
    return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || "?").slice(0, 2)).toUpperCase();
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- build the network from the feed ----------
  function build(D) {
    const J = D.journalists || {};
    const BY = {}; (D.items || []).forEach((i) => { BY[i.id] = i; });
    const nodes = [], links = [], stories = [];
    (D.events || []).forEach((e) => {
      const s = { id: "s:" + e.id, type: "story", eid: e.id, h: e.h, kids: [] };
      const seen = new Set();
      (e.items || []).forEach((iid) => {
        const it = BY[iid]; if (!it || !it.d || seen.has(iid)) return; seen.add(iid);
        const p = J[it.j] || {};
        s.kids.push({ id: "p:" + e.id + ":" + iid, type: "piece", iid, story: s, jk: it.j, who: p.n || "", img: p.img || "", src: it.src || "", d: it.d, h: it.h || "", url: it.url || "" });
      });
      const seenU = new Set();
      (e.coverage || []).forEach((c, k) => {
        if (!c.d || seenU.has(c.url)) return; seenU.add(c.url);
        s.kids.push({ id: "r:" + e.id + ":" + k, type: "report", story: s, src: c.src || "", d: c.d, h: c.h || "", url: c.url || "" });
      });
      if (!s.kids.length) return;
      stories.push(s); nodes.push(s);
      s.kids.forEach((k) => { nodes.push(k); links.push({ source: s.id, target: k.id, kind: "strong", c: k.type }); });
    });
    // outlets
    const cnt = {};
    nodes.forEach((n) => { if (n.type === "piece" || n.type === "report") cnt[n.src || OTHER] = (cnt[n.src || OTHER] || 0) + 1; });
    const outlets = {};
    nodes.slice().forEach((n) => {
      if (n.type !== "piece" && n.type !== "report") return;
      const name = cnt[n.src || OTHER] >= 3 ? (n.src || OTHER) : OTHER;
      n.outlet = name;
      let o = outlets[name];
      if (!o) { o = outlets[name] = { id: "o:" + name, type: "outlet", h: name, kids: [] }; nodes.push(o); }
      o.kids.push(n);
      links.push({ source: o.id, target: n.id, kind: "weak", c: n.type });
    });
    // days: a node's day is its date; a story's or outlet's day is its earliest child's
    nodes.forEach((n) => { if (n.kids) { n.d = n.kids.reduce((a, k) => (k.d < a ? k.d : a), n.kids[0].d); n.n = n.kids.length; } });
    nodes.forEach((n) => {
      n.size = n.type === "outlet" ? 4 + Math.sqrt(n.n) * 1.6 : n.type === "story" ? 6 + Math.sqrt(n.n) * 1.5 : n.type === "piece" ? 4 : 3;
    });
    const days = [...new Set(nodes.filter((n) => !n.kids).map((n) => n.d))].sort();
    return { nodes, links, stories, outlets: Object.values(outlets), days, J };
  }

  // ---------- static force layout ----------
  function layout(G) {
    const out = G.outlets.slice().sort((a, b) => b.n - a.n || (a.h < b.h ? -1 : 1));
    const order = [];
    for (let s = 0; s < 5; s++) for (let i = s; i < out.length; i += 5) order.push(out[i]);
    order.forEach((o, k) => { const a = (k / order.length) * 2 * Math.PI - Math.PI / 2; o.fx = o.x = 170 * Math.cos(a); o.fy = o.y = 170 * Math.sin(a); });
    // start each story and child near its first outlet, so the layout settles quickly and repeatably
    G.stories.forEach((s, k) => { const a = (k / G.stories.length) * 2 * Math.PI; s.x = 330 * Math.cos(a); s.y = 330 * Math.sin(a); });
    G.nodes.forEach((n, k) => { if (n.story) { const a = Math.atan2(n.story.y, n.story.x) + ((k % 7) - 3) * 0.05; n.x = 420 * Math.cos(a); n.y = 420 * Math.sin(a); } });
    const R = (n) => (n.type === "story" ? 330 : 420);
    d3.forceSimulation(G.nodes)
      .force("link", d3.forceLink(G.links).id((n) => n.id).distance((l) => (l.kind === "strong" ? 40 : 120)).strength((l) => (l.kind === "strong" ? 0.5 : 0.02)))
      .force("charge", d3.forceManyBody().strength((n) => (n.type === "story" ? -260 : n.type === "outlet" ? 0 : -6)))
      .force("radial", d3.forceRadial(R, 0, 0).strength((n) => (n.type === "outlet" ? 0 : n.type === "story" ? 0.9 : 0.6)))
      .force("collide", d3.forceCollide((n) => n.size + 1.5).iterations(2))
      .stop()
      .tick(400);
  }

  // ---------- draw ----------
  let G, svg, gAll, gLinks, gNodes, gRings, linkSel, nodeSel, zoom;
  const vis = new Set();      // ids of nodes shown so far
  const tip = $(".pnt-tip"), panel = $(".pnt-panel"), stage = $(".pnt-stage");

  function draw() {
    svg = d3.select(root.querySelector(".pnt-svg"));
    svg.selectAll("*").remove();
    const xs = G.nodes.map((n) => n.x), ys = G.nodes.map((n) => n.y), pad = 30;
    const x0 = d3.min(xs) - pad, x1 = d3.max(xs) + pad, y0 = d3.min(ys) - pad, y1 = d3.max(ys) + pad;
    svg.attr("viewBox", [x0, y0, x1 - x0, y1 - y0].join(" ")).attr("preserveAspectRatio", "xMidYMid meet");
    gAll = svg.append("g");
    gLinks = gAll.append("g");
    gRings = gAll.append("g");
    gNodes = gAll.append("g");
    linkSel = gLinks.selectAll("line").data(G.links).join("line")
      .attr("class", (l) => "lk off " + l.kind + " c-" + l.c)
      .attr("x1", (l) => l.source.x).attr("y1", (l) => l.source.y).attr("x2", (l) => l.target.x).attr("y2", (l) => l.target.y);
    const ord = { report: 0, piece: 1, outlet: 2, story: 3 };
    nodeSel = gNodes.selectAll("circle").data(G.nodes.slice().sort((a, b) => ord[a.type] - ord[b.type])).join("circle")
      .attr("class", (n) => "nd off t-" + n.type)
      .attr("cx", (n) => n.x).attr("cy", (n) => n.y).attr("r", 0).attr("fill", (n) => COL[n.type])
      .on("mouseenter", (ev, n) => { if (!TOUCH) showTip(ev, n); })
      .on("mousemove", (ev, n) => { if (!TOUCH) showTip(ev, n); })
      .on("mouseleave", () => { if (!TOUCH) hideTip(); })
      .on("click", (ev, n) => {
        ev.stopPropagation();
        if (TOUCH) showTip(ev, n);
        if (n.type === "story") focusStory(n);
      });
    zoom = d3.zoom().scaleExtent([0.6, 8]).on("zoom", (ev) => { gAll.attr("transform", ev.transform); hideTip(); });
    svg.call(zoom).on("dblclick.zoom", null);
    svg.on("click", () => { hideTip(); unfocus(); });
  }

  function shownKids(n) { return n.kids ? n.kids.filter((k) => vis.has(k.id)).length : 0; }
  function curSize(n) {
    if (!n.kids) return n.size;
    const c = shownKids(n);
    return n.type === "outlet" ? 4 + Math.sqrt(c) * 1.6 : 6 + Math.sqrt(c) * 1.5;
  }

  function showTip(ev, n) {
    let h;
    if (n.type === "outlet") h = `<b>${TYPE.outlet}</b><span class="h">${esc(n.h)}</span><span class="m">${shownKids(n)} pieces and reports so far</span>`;
    else if (n.type === "story") {
      const k = n.kids.filter((x) => vis.has(x.id));
      h = `<b>${TYPE.story}</b><span class="h">${esc(n.h)}</span><span class="m">${k.filter((x) => x.type === "piece").length} voice pieces · ${k.filter((x) => x.type === "report").length} reports</span>`;
    } else h = `<b>${TYPE[n.type]}</b><span class="h">${esc(n.h)}</span>${n.who ? `<span class="w">${esc(n.who)}</span>` : ""}<span class="m">${esc(n.src)} · ${shortDay(n.d)}</span>`;
    tip.innerHTML = h;
    const r = stage.getBoundingClientRect();
    const px = (ev.clientX != null ? ev.clientX : r.left + r.width / 2) - r.left, py = (ev.clientY != null ? ev.clientY : r.top + r.height / 2) - r.top;
    tip.classList.add("on");
    const w = tip.offsetWidth, hh = tip.offsetHeight;
    let x = px + 14, y = py + 14;
    if (x + w > r.width - 6) x = Math.max(6, px - w - 14);
    if (y + hh > r.height - 6) y = Math.max(6, py - hh - 14);
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  function hideTip() { tip.classList.remove("on"); }

  // clicking a story lights up the story, its pieces and reports, and the outlets that carried them
  let focused = null;
  function focusStory(s) {
    focused = s;
    const ids = new Set([s.id]);
    s.kids.forEach((k) => { ids.add(k.id); ids.add("o:" + k.outlet); });
    nodeSel.classed("hl", (n) => ids.has(n.id));
    linkSel.classed("hl", (l) => l.source.id === s.id || (l.target.story === s && ids.has(l.source.id)));
    svg.classed("focus", true);
    const k = s.kids.filter((x) => vis.has(x.id));
    const outs = new Set(k.map((x) => x.outlet));
    const ds = k.map((x) => x.d).sort();
    panel.innerHTML = `<b>${esc(s.h)}</b><span>${k.filter((x) => x.type === "piece").length} voice pieces · ${k.filter((x) => x.type === "report").length} reports · ${outs.size} outlets${ds.length ? " · " + shortDay(ds[0]) + (ds[ds.length - 1] !== ds[0] ? "–" + shortDay(ds[ds.length - 1]) : "") : ""}</span><span><a href="coalitions/${encodeURIComponent(s.eid)}.html">Read the story →</a></span>`;
    panel.hidden = false;
    $(".pnt-hint").hidden = true;
  }
  function unfocus() {
    if (!focused) return;
    focused = null;
    svg.classed("focus", false);
    nodeSel.classed("hl", false); linkSel.classed("hl", false);
    panel.hidden = true; $(".pnt-hint").hidden = false;
  }

  // legend chips switch each layer on and off
  root.querySelectorAll(".pnt-chip").forEach((b) => b.addEventListener("click", () => {
    const on = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", on ? "true" : "false");
    root.querySelector(".pnt-svg").classList.toggle("hide-" + b.dataset.t, !on);
  }));

  // ---------- timeline ----------
  let days = [], info = {}, leavesByDay = {}, cur = -1, playing = false, token = 0, timer = null;
  const slider = $(".pnt-slider"), playBtn = $(".pnt-play"), feed = $(".pnt-feed");

  function prepare() {
    days = G.days;
    G.nodes.forEach((n) => { if (!n.kids) (leavesByDay[n.d] = leavesByDay[n.d] || []).push(n); });
    const uniq = days.map((d) => new Set(leavesByDay[d].filter((n) => n.type === "piece").map((n) => n.iid)).size);
    const BIG = Math.max(12, d3.quantile(uniq.slice().sort(d3.ascending), 0.75) || 0);
    days.forEach((d, i) => { info[d] = { uniq: uniq[i], big: uniq[i] >= BIG, surge: null }; });
    // a surge: a story gets at least 8 new pieces and reports in a day, and at least 1.6 times its usual daily count
    G.stories.forEach((s) => {
      const per = d3.rollup(s.kids, (v) => v.length, (k) => k.d);
      const mean = s.kids.length / per.size;
      per.forEach((c, d) => {
        if (c >= 8 && c >= 1.6 * mean && (!info[d].surge || c > info[d].surge.c)) info[d].surge = { s, c };
      });
    });
    slider.max = Math.max(0, days.length - 1); slider.value = 0;
    showDate(0);
  }

  function showDate(i) {
    const d = days[i]; if (!d) return;
    $(".pnt-date-l").textContent = dateL(d);
    $(".pnt-date-s").textContent = dateS(d);
  }

  // show everything up to day i; animate = pop the new dots in
  function setDay(i, animate) {
    const day = i >= 0 ? days[i] : "";
    const fresh = new Set();
    G.nodes.forEach((n) => {
      const on = i >= 0 && n.d <= day;
      if (on && !vis.has(n.id)) { vis.add(n.id); fresh.add(n.id); }
      if (!on) vis.delete(n.id);
    });
    nodeSel.classed("off", (n) => !vis.has(n.id));
    linkSel.classed("off", (l) => !(vis.has(l.source.id) && vis.has(l.target.id)));
    nodeSel.interrupt();
    if (animate && !REDUCED) {
      nodeSel.filter((n) => fresh.has(n.id)).attr("r", 0).transition().duration(500).ease(d3.easeBackOut).attr("r", (n) => curSize(n));
      nodeSel.filter((n) => !fresh.has(n.id) && vis.has(n.id) && n.kids).transition().duration(500).ease(d3.easeBackOut).attr("r", (n) => curSize(n));
      nodeSel.filter((n) => !fresh.has(n.id) && !n.kids).attr("r", (n) => (vis.has(n.id) ? n.size : 0));
    } else nodeSel.attr("r", (n) => (vis.has(n.id) ? curSize(n) : 0));
    cur = i;
    slider.value = Math.max(0, i);
    showDate(Math.max(0, i));
    counts();
    trending(animate);
    if (focused) focusStory(focused);
  }

  function counts() {
    let st = 0, rp = 0, ou = 0; const pc = new Set();
    G.nodes.forEach((n) => {
      if (!vis.has(n.id)) return;
      if (n.type === "story") st++; else if (n.type === "report") rp++; else if (n.type === "outlet") ou++; else pc.add(n.iid);
    });
    $(".pnt-counts").textContent = `${st} ${st === 1 ? "story" : "stories"} · ${pc.size} voice ${pc.size === 1 ? "piece" : "pieces"} · ${rp} ${rp === 1 ? "report" : "reports"} · ${ou} ${ou === 1 ? "outlet" : "outlets"}`;
  }

  // ---------- trending: top five people by pieces so far ----------
  const rows = new Map(); let prevRank = null;
  function trending(animate) {
    const per = new Map();
    G.nodes.forEach((n) => { if (n.type === "piece" && vis.has(n.id) && n.jk) { if (!per.has(n.jk)) per.set(n.jk, { jk: n.jk, who: n.who, img: n.img, s: new Set() }); per.get(n.jk).s.add(n.iid); } });
    const top = [...per.values()].map((p) => ({ ...p, c: p.s.size })).sort((a, b) => b.c - a.c || (a.who < b.who ? -1 : 1)).slice(0, 5);
    const box = $(".pnt-trend-rows");
    const empty = box.querySelector(".pnt-trend-empty");
    if (!top.length) { if (!empty) box.insertAdjacentHTML("beforeend", '<p class="pnt-trend-empty">No voice pieces yet.</p>'); }
    else if (empty) empty.remove();
    const lead = top.length ? top[0].c : 1, rank = new Map();
    top.forEach((p, r) => {
      rank.set(p.jk, r);
      let el = rows.get(p.jk);
      if (!el) {
        el = document.createElement("div"); el.className = "pnt-row"; el.style.opacity = "0";
        el.style.transform = `translateY(${(prevRank ? 5 : r) * 29}px)`;
        const ph = p.img ? `<img src="${esc(p.img)}" alt="" width="22" height="22" loading="lazy">` : esc(initials(p.who));
        el.innerHTML = `<span class="rk"></span><span class="ph">${ph}</span><span class="nm"></span><span class="br"><i></i></span><span class="ct"></span>`;
        const im = el.querySelector("img"); if (im) im.addEventListener("error", () => { im.parentNode.textContent = initials(p.who); });
        el.querySelector(".nm").textContent = p.who; el.title = p.who;
        box.appendChild(el); rows.set(p.jk, el);
        void el.offsetWidth;
      }
      el.querySelector(".rk").textContent = r + 1;
      el.querySelector(".ct").textContent = p.c;
      el.querySelector(".br i").style.width = Math.max(4, (p.c / lead) * 100) + "%";
      const was = prevRank ? prevRank.get(p.jk) : undefined;
      el.classList.toggle("up", !!(animate && prevRank && (was === undefined || was > r)));
      el.style.opacity = "1";
      el.style.transform = `translateY(${r * 29}px)`;
    });
    rows.forEach((el, jk) => { if (!rank.has(jk)) { el.style.opacity = "0"; rows.delete(jk); setTimeout(() => el.remove(), 450); } });
    prevRank = top.length ? rank : null;
  }

  // ---------- notification cards ----------
  const seenCards = new Set();
  const keep = () => (phone() ? 3 : 7);
  function card(n, surge) {
    const a = document.createElement("a");
    a.className = "pnt-card" + (surge ? " surge" : "");
    a.href = n.url; a.target = "_blank"; a.rel = "noopener";
    const com = n.type === "piece";
    a.innerHTML = `<span class="ic ${com ? "com" : "art"}">${esc(initials(n.src || "?"))}</span><span class="bd"><span class="tp"><span class="o">${esc(n.src)}</span><span class="tg">${com ? "COMMENTARY" : "ARTICLE"}</span>${surge ? '<span class="sg">🔥 Surge</span>' : ""}<span class="dt">${shortDay(n.d)}</span></span>${com && n.who ? `<span class="wh">${esc(n.who)}</span>` : ""}<span class="hd">${esc(n.h)}</span></span>`;
    return a;
  }
  function trim() { while (feed.children.length > keep()) feed.lastElementChild.remove(); }
  function dayCards(d, surgeStory) {
    const out = [];
    (leavesByDay[d] || []).forEach((n) => { const k = n.src + "|" + n.h; if (seenCards.has(k)) return; seenCards.add(k); out.push(n); });
    // the surging story's cards land last, so they end up on top
    out.sort((a, b) => (a.story === surgeStory) - (b.story === surgeStory));
    return out.map((n) => [n, !!surgeStory && n.story === surgeStory]);
  }
  function rebuildCards(i) {
    feed.textContent = ""; seenCards.clear();
    let all = [];
    for (let k = 0; k <= i; k++) all = all.concat(dayCards(days[k], info[days[k]].surge && info[days[k]].surge.s));
    all.slice(-keep()).forEach(([n, s]) => { const c = card(n, s); c.style.animation = "none"; feed.prepend(c); });
  }
  function dropCards(list, span, tok) {
    const l = list.slice(-keep());
    const step = l.length > 1 ? Math.min(160, span / l.length) : 0;
    l.forEach(([n, s], k) => setTimeout(() => { if (tok !== token) return; feed.prepend(card(n, s)); trim(); }, k * step));
  }

  // ---------- slot-reel counter, surge banner, rings, confetti ----------
  const reel = $(".pnt-reel");
  function showReel(n, d) {
    const box = reel.querySelector(".pnt-reel-n");
    const txt = String(n);
    box.innerHTML = "<span>+</span>" + txt.split("").map(() => `<span class="dg"><span class="st">${"01234567890123456789".split("").map((x) => `<span>${x}</span>`).join("")}</span></span>`).join("");
    reel.querySelector(".pnt-reel-l").textContent = "new pieces · " + dateS(d);
    stage.classList.add("dimmed"); reel.classList.add("on");
    const strips = box.querySelectorAll(".st");
    const h = strips.length ? strips[0].firstElementChild.getBoundingClientRect().height : 64;
    strips.forEach((st, k) => {
      st.style.transitionDelay = (k * 0.18) + "s";
      requestAnimationFrame(() => requestAnimationFrame(() => { st.style.transform = `translateY(${-(10 + Number(txt[k])) * h}px)`; }));
    });
    return 1000 + 180 * Math.max(0, txt.length - 1);
  }
  function hideReel() { reel.classList.remove("on"); stage.classList.remove("dimmed"); }

  function fireSurge(sg) {
    const b = $(".pnt-surge");
    b.textContent = `🔥 SURGE · ${sg.s.h} · ${sg.c} new today`;
    b.classList.add("on");
    setTimeout(() => b.classList.remove("on"), 2200);
    if (REDUCED) return;
    for (let k = 0; k < 3; k++) {
      gRings.append("circle").attr("class", "ring").attr("cx", sg.s.x).attr("cy", sg.s.y).attr("r", curSize(sg.s)).attr("opacity", 0.95)
        .transition().delay(k * 280).duration(1300).ease(d3.easeCubicOut).attr("r", curSize(sg.s) + 60).attr("opacity", 0).remove();
    }
    const box = $(".pnt-confetti"), W = box.clientWidth, H = box.clientHeight;
    const n = Math.min(70, 30 + 2 * sg.c);
    for (let k = 0; k < n; k++) {
      const e = document.createElement("span");
      e.textContent = "🔥";
      e.style.fontSize = (14 + Math.random() * 16).toFixed(0) + "px";
      const x = Math.random() * W, drift = (Math.random() - 0.5) * 160, rot = (Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 480);
      box.appendChild(e);
      const an = e.animate([{ transform: `translate(${x}px, -40px) rotate(0deg)` }, { transform: `translate(${x + drift}px, ${H + 40}px) rotate(${rot}deg)` }],
        { duration: 1500 + Math.random() * 1300, delay: Math.random() * 500, easing: "cubic-bezier(.35,.1,.65,1)", fill: "both" });
      an.onfinish = () => e.remove();
    }
  }

  // ---------- play / pause ----------
  async function playDay(i, tok) {
    const d = days[i], f = info[d];
    if (f.big) {
      const roll = showReel(f.uniq, d);
      await sleep(roll + 900);
      if (tok !== token) return false;
      hideReel();
    }
    setDay(i, true);
    const pace = f.surge ? 2000 : f.big ? 1100 : 750;
    dropCards(dayCards(d, f.surge && f.surge.s), Math.min(600, pace - 150), tok);
    if (f.surge) fireSurge(f.surge);
    await sleep(pace);
    return tok === token;
  }
  async function play() {
    if (cur >= days.length - 1) reset();
    playing = true; const tok = ++token; setBtn();
    while (playing && tok === token && cur < days.length - 1) {
      if (!(await playDay(cur + 1, tok))) return;
    }
    if (tok === token) { playing = false; setBtn(); }
  }
  function pause() { playing = false; token++; hideReel(); setBtn(); }
  function reset() { feed.textContent = ""; seenCards.clear(); prevRank = null; setDay(-1, false); }
  function setBtn() {
    playBtn.classList.toggle("on", playing);
    playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    playBtn.querySelector(".pnt-play-t").textContent = playing ? "Pause" : "Play";
  }
  playBtn.addEventListener("click", () => (playing ? pause() : play()));
  slider.addEventListener("input", () => {
    pause();
    const i = Number(slider.value);
    prevRank = null;
    setDay(i, false);
    rebuildCards(i);
  });

  // ---------- start ----------
  $(".pnt-hint").textContent = TOUCH ? "Tap a dot for details · tap a story to light it up" : "Hover a dot for details · click a story to light it up · scroll to zoom, drag to pan";
  window.PreambleFeed.load().then((D) => {
    G = build(D);
    if (!G.days.length) { $(".pnt-msg").textContent = "No coverage to show yet."; return; }
    layout(G);
    draw();
    prepare();
    setDay(-1, false);
    $(".pnt-msg").hidden = true;
  }).catch((e) => {
    $(".pnt-msg").textContent = "The tracker could not load. Please refresh the page.";
    if (window.console) console.warn("news tracker:", e);
  });
})();

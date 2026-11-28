// Madlanga Commission tracker. Fixed wording and people come from data/madlanga.json; everything that changes
// comes from data/madlanga-auto.json, written hourly by tools/madlanga-update.rb under its guardrails (trusted
// outlets only, headlines quoted word for word and credited, risky headlines held back). Nothing here writes
// claims of its own: lines are always an outlet's headline in quotation marks with a link.
(function () {
  "use strict";
  const root = document.querySelector(".pl.mc-page"); if (!root) return;
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const BG = { commission: "#cddfe9", evidence: "#f1cfcc", staff: "#d9d9d9", witness: "#f2e2a6" };
  const FIVE = 5, EIGHT = 8;
  let C = null, A = {}, picked = null;

  const ago = (t) => {
    const s = Math.max(0, Math.round((Date.now() - Date.parse(t)) / 1000));
    if (s < 60) return s + (s === 1 ? " second" : " seconds") + " ago";
    const m = Math.round(s / 60); if (m < 60) return m + (m === 1 ? " min" : " mins") + " ago";
    const h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? " hour" : " hours") + " ago";
    const d = Math.round(h / 24); if (d < 7) return d + (d === 1 ? " day" : " days") + " ago";
    const dt = new Date(t);
    return dt.toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "Africa/Johannesburg" }) + (dt.getFullYear() < new Date().getFullYear() ? " " + dt.getFullYear() : "");
  };
  const day = (t) => new Date(t).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Johannesburg" });
  const short = (t) => new Date(t).toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "Africa/Johannesburg" });
  const tip = (t) => t ? `<span class="mc-tw"><button type="button" class="mc-i" aria-label="What this means">i</button><span class="mc-tip" role="tooltip">${esc(t)} <a href="#glossary">Glossary ›</a></span></span>` : "";
  // a quoted, credited headline: the only form any automatic line takes
  const quote = (l) => `<b>${esc(l.src)}:</b> “${esc(l.h)}” <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.src)} ›</a>`;
  const sec = (cls, title, body, small = "", id = "") => `<section class="pl-sec ${cls}"${id ? ` id="${id}"` : ""}><h2 class="pl-sh">${title}${small ? ` <small class="mc-small">${small}</small>` : ""}</h2>${body}</section>`;
  const more = (n, label, extra = "") => n > 0 ? `<button type="button" class="mc-more ${extra}" data-more>${label} ▾</button>` : "";
  const P = (k) => (C.people || []).find((p) => p.k === k);
  const ini = (n) => n.replace(/^(Adv|Dr|Lt Gen|Lt-Col|Gen|Justice|Brigadier|Chief Supt)\s+/, "").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  function person(p) {
    const a = (A.people || {})[p.k] || {}, st = a.st || p.st, last = (a.lines || [])[0];
    const pill = p.g === "witness" && st ? `<span class="mc-pw"><s class="mc-st mc-st-${st}">${esc(C.status[st])}</s>${tip(C.tips[st])}</span>` : "";
    const roleTip = p.g !== "witness" ? tip(C.tips[p.role] || (p.g === "evidence" ? C.tips["Evidence leader"] : "")) : "";
    const img = p.img ? `<img class="mc-ph" src="${esc(p.img)}" alt="" style="background:${BG[p.g]}" loading="lazy">` : `<i class="mc-ini" style="background:${BG[p.g]}">${esc(ini(p.n))}</i>`;
    let said = "";
    if (p.g === "witness") {
      if (p.private && (st === "p" || st === "tp")) said = `<span class="mc-said">Evidence heard behind closed doors; we show only what is reported from public sittings.</span>`;
      else if (last) said = `<span class="mc-said">${quote(last)}</span>`;
    }
    const resp = a.resp ? `<span class="mc-resp">Response · ${quote(a.resp)}</span>` : "";
    const n7 = (a.lines || []).filter((l) => Date.now() - Date.parse(l.d) < 7 * 864e5).length;
    return `<div class="pl-voice mc-v" data-k="${esc(p.k)}" tabindex="0">${img}<span><b>${esc(p.n)}${pill}</b><span class="mc-role">${esc(p.role)}${roleTip}</span>${said}${resp}${last ? `<i class="pl-vlast mc-ago" data-t="${esc(last.d)}"></i>` : ""}</span>${p.g === "witness" ? `<em class="mc-cnt" title="Reports in the last 7 days">${n7}</em>` : ""}</div>`;
  }
  const cards = (list, shown) => `<div class="pl-voices">${list.map((p, i) => i < shown ? person(p) : person(p).replace('class="pl-voice mc-v"', 'class="pl-voice mc-v mc-x" hidden')).join("")}</div>`;

  function evidence(k) {
    const p = P(k), a = (A.people || {})[k];
    if (!p || p.private || !a || !(a.lines || []).length) return "";
    const by = {}; a.lines.forEach((l) => { const d = new Date(l.d).toISOString().slice(0, 10); (by[d] = by[d] || []).push(l); });
    return `<div class="mc-panel${picked === k ? " tapped" : ""}"><p class="mc-ph2">${esc(p.n)} · as reported, day by day</p>${Object.keys(by).sort().reverse().map((d) => `<div class="mc-day"><b>${esc(day(d + "T12:00:00Z"))}</b>${by[d].map((l) => `<p>${quote(l)}</p>`).join("")}</div>`).join("")}</div>`;
  }

  function render() {
    const paused = A.paused;
    // the archive is the authority: show its spelling and role for every witness it lists (tools/madlanga-update.rb, rule 11)
    (C.people || []).forEach((p) => { const o = (A.align || {})[p.k]; if (!o) return; if (o.n) p.n = o.n; if (o.role) p.role = o.role; });
    const ppl = C.people || [], wit = ppl.filter((p) => p.g === "witness");
    const lastOf = (p) => (((A.people || {})[p.k] || {}).lines || [])[0];
    const witSorted = wit.slice().sort((x, y) => ((lastOf(y) || {}).d || "").localeCompare((lastOf(x) || {}).d || ""));
    if (!picked || !P(picked)) picked = (witSorted.find((p) => !p.private && lastOf(p)) || {}).k;
    const T = A.today || {};
    // "Watch live" goes to SMWX's live stream of the commission (Sizwe Mpofu-Walsh's YouTube channel; /live opens
    // whatever the channel is streaming now)
    const LIVE_URL = "https://www.youtube.com/channel/UCk_qa4ssROH8aUDbgQXE5dA/live";
    // header
    const hd = (T.day || T.stand || T.live) ? `<p class="mc-hd"><span class="mc-tag">TODAY</span>${T.day ? `Day ${T.day}` : ""}${T.stand ? `${T.day ? " · " : ""}${esc(T.stand.src)}: “${esc(T.stand.h)}”` : ""}${T.day || T.live ? ` <a href="${LIVE_URL}" target="_blank" rel="noopener">Watch live on SMWX ›</a>` : ""}</p>` : "";
    const head = `<header class="pl-ed"><p class="pl-kick">Madlanga Commission Tracker · Preamble</p><h1 class="pl-date">Inside the Madlanga Commission: who is testifying, and what is being reported</h1><p class="pl-asof">Updated <time class="mc-ago-plain" data-t="${esc(A.updated || "")}"></time></p>${paused ? `<p class="mc-paused">Automatic updates are paused. Showing the page without the latest reports.</p>` : hd}<p class="m-only m-note"><b>Being named is not a finding of wrongdoing.</b> Every line is a trusted outlet’s own headline, credited. <a href="#" data-fold="m-expl">How to read this page ›</a></p><p class="m-only m-new"><a href="#" data-fold="m-expl">New here? What is the Madlanga Commission? ›</a></p><p class="mc-note"><b>How to read this page.</b> ${esc(C.legal)}</p></header>`;
    // explainer
    const expl = sec("m-expl fold", "What is the Madlanga Commission?", `<div class="mx-ex">${(C.explainer || []).map((t) => `<p>${esc(t)}</p>`).join("")}</div>`, "", "about");
    // today's reports
    const R = paused ? [] : (A.reports || []);
    const rep = sec("m-rep", "Today’s reports", R.length ? `<ul class="mc-rep">${R.map((r, i) => `<li class="${i >= 3 ? "mc-x3" : ""}${i >= EIGHT ? " mc-x" : ""}"${i >= EIGHT ? " hidden" : ""}><span class="mc-src">${esc(r.src)}</span><a href="${esc(r.url)}" target="_blank" rel="noopener">“${esc(r.h)}” ›</a><time>${esc(ago(r.d))}</time></li>`).join("")}</ul>${R.length > 3 ? `<button type="button" class="mc-more m-only" data-reps>Show all ${R.length} reports ▾</button>` : ""}${R.length > EIGHT ? more(1, `Show all ${R.length} reports`, "d-only") : ""}` : `<p class="mc-foot">No reports from our trusted outlets in the last two days.</p>`, `${R.length}`);
    // witnesses
    const wsec = sec("m-wit", "Witnesses · what is reported", `${cards(witSorted, FIVE)}<p class="m-only mc-foot">Tap a witness to see their reports day by day.</p>${paused ? "" : evidence(picked)}${more(wit.length - FIVE, `Show all ${wit.length} witnesses`)}`, "most recent first");
    // what has happened since
    const S = paused ? [] : (A.since || []);
    const cons = S.length ? sec("m-cons", "What has happened since", `<ul class="mx-cons">${S.map((s, i) => `<li class="${i >= 3 ? "mc-x" : ""}"${i >= 3 ? " hidden" : ""}><time>${esc(short(s.d))}</time><span><em class="k-${esc(s.tag)}">${esc(s.tag)}</em>${tip(C.tips[s.tag])} ${esc((P(s.k) || {}).n || "")} · <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.src)}: “${esc(s.h)}” ›</a><small>Also reported by ${esc(s.outlets.filter((o) => o !== s.src).join(", "))}</small></span></li>`).join("")}</ul>${more(S.length - 3, `Show all ${S.length}`)}<p class="mc-foot">Shown only once two or more trusted outlets report it. A charge is not a conviction.</p>`, `${S.length}`) : "";
    // storylines
    const thr = sec("m-thr", "Follow a storyline", `<div class="mx-thr">${(C.threads || []).map(([t, ks]) => `<div><b>${esc(t)}</b><span>${esc(ks.map((k) => ((P(k) || {}).n || "").replace(/^(Adv|Dr|Lt Gen|Lt-Col|Gen|Justice|Chief Supt)\s+/, "").replace(/ SC$/, "")).join(" · "))}</span></div>`).join("")}</div>`);
    // voices: latest piece first
    const VA = A.voices || {};
    const vs = (C.voices || []).slice().sort((x, y) => ((x.late ? "" : (VA[y.k] || {}).last || "")).localeCompare(x.late ? "" : ((VA[x.k] || {}).last || "")) || 0);
    vs.sort((x, y) => (y.late ? "" : ((VA[y.k] || {}).last || "")).localeCompare(x.late ? "" : ((VA[x.k] || {}).last || "")));
    // a card with articles opens a list of them underneath (the newest articles naming that voice, last 7 days)
    const vlist = (v, a) => (a.items || []).length ? `<div class="mc-varts" hidden><p class="mc-varts-h">Latest articles naming ${esc(v.n.split(" ")[0])}</p><ul>${a.items.map((it) => `<li><a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.h)}</a><span>${esc(it.src)} · <i class="mc-ago-plain" data-t="${esc(it.d)}"></i></span></li>`).join("")}</ul></div>` : "";
    const vcard = (v, i) => { const a = VA[v.k] || {}; const has = !v.late && (a.items || []).length; return `<div class="pl-voice${has ? " mc-vo-x" : ""}${i >= EIGHT ? " mc-x" : ""}"${i >= EIGHT ? " hidden" : ""}${has ? ` role="button" tabindex="0" aria-expanded="false"` : ""}><img src="${esc(v.img)}" alt="" loading="lazy"><span><b class="pl-nm">${esc(v.n)}${v.late ? "*" : ""}${v.logo ? `<img class="pl-vflag pl-plogo" src="assets/logos-sm/${esc(v.logo)}.png" alt="${esc(v.o)}" title="${esc(v.o)}">` : ""}</b><span>${esc(v.o)}</span>${!v.late && a.last ? `<i class="pl-vlast mc-ago" data-t="${esc(a.last)}"></i>` : ""}</span><em class="mc-cnt" title="Articles mentioning the commission, last 7 days">${v.late ? "" : (a.n7 || 0)}</em>${has ? vlist(v, a) : ""}</div>`; };
    const lateFoot = vs.slice(0, EIGHT).filter((v) => v.late && v.footnote).map((v) => `<p class="mc-foot">${esc(v.footnote)}</p>`).join("");
    const vo = sec("m-vo", "Voices · analysis and opinion", `<div class="pl-voices">${vs.map(vcard).join("")}</div>${lateFoot}${more(vs.length - EIGHT, `Show all ${vs.length} voices`)}`, "latest first · articles, last 7 days");
    // coming up
    const up = T.live ? sec("m-up", "Watch", `<p class="mx-ex"><a href="${esc(T.live.url)}" target="_blank" rel="noopener">${esc(T.live.src)}: “${esc(T.live.h)}” ›</a></p>`) : "";
    // the commission
    const g = (x) => ppl.filter((p) => p.g === x);
    const com = sec("m-com fold", "The commission", cards(g("commission"), 99), `${g("commission").length}`);
    const ev = sec("m-ev fold", "Evidence leaders", cards(g("evidence"), FIVE) + more(g("evidence").length - FIVE, `Show all ${g("evidence").length} evidence leaders`), `${g("evidence").length}`);
    const staff = sec("m-staff fold", "Commission staff", cards(g("staff"), 99), `${g("staff").length}`);
    const tl = sec("m-tl fold", "Timeline", `<ol class="mx-tl">${(C.timeline || []).map(([d, t]) => `<li><time>${esc(d)}</time>${esc(t)}</li>`).join("")}${T.day ? `<li><time>Today</time>Day ${T.day} of hearings</li>` : ""}</ol>`);
    const vsx = sec("m-vs fold", "Commission or Parliament?", `<div class="mx-vs">${(C.versus || []).map(([h, t]) => `<div><h3>${esc(h)}</h3>${esc(t)}</div>`).join("")}</div>`);
    const gl = sec("m-gl fold", "Glossary", `<dl class="mx-gl">${(C.glossary || []).map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join("")}</dl>`, "", "glossary");
    const docs = sec("m-doc fold", "Documents", `<ul class="mx-doc">${(C.documents || []).map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ›</a></li>`).join("")}</ul>`);
    const foot = `<p class="m-end mc-foot" style="margin:28px 0 40px">Every line about a person is a trusted outlet’s own headline, quoted and credited, chosen automatically under published rules. We do not report evidence heard in private or identify witnesses the commission has ordered protected. Spotted an error? Email <b>preamblehq@gmail.com</b> and we will correct it. Photos: Madlanga Commission.</p>`;
    // top strip: a dark, swipeable row of quick links (today's sitting, the newest witnesses, the latest event, sections)
    const ico = (img, bg) => img ? `<img class="mcs-ic" src="${esc(img)}" alt="" style="background:${bg || "#fff"}">` : "";
    const svg = (d) => `<svg class="mcs-ic mcs-svg" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
    const sItems = [];
    if (!paused && (T.day || T.live)) sItems.push(`<a class="mcs-i mcs-live" href="${LIVE_URL}" target="_blank" rel="noopener" title="Watch the commission live on SMWX"><i class="mcs-dot"></i>${T.day ? `Day ${T.day} · ` : ""}Watch live</a>`);
    witSorted.filter((p) => lastOf(p) && !p.private).slice(0, 3).forEach((p) => sItems.push(`<a class="mcs-i" href="#" data-wit="${esc(p.k)}">${p.img ? ico(p.img, BG.witness) : `<i class="mcs-ic mcs-ini">${esc(ini(p.n))}</i>`}${esc(p.n.replace(/^(Lt Gen|Gen|Dr|Chief Supt|Lt-Col)\s+/, ""))}</a>`));
    S.slice(0, 2).forEach((x) => { const pp = P(x.k) || {}; sItems.push(`<a class="mcs-i" href="#" data-go="m-cons">${pp.img ? ico(pp.img, BG.witness) : ""}${esc((pp.n || "").split(" ").slice(-1)[0])} ${esc(x.tag)}</a>`); });
    sItems.push(`<a class="mcs-i" href="#" data-go="m-thr">${svg('<path d="M4 6h16M4 12h10M4 18h13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>')}Storylines</a>`);
    sItems.push(`<a class="mcs-i" href="#" data-go="m-vo">${svg('<path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>')}Voices</a>`);
    sItems.push(`<a class="mcs-i" href="#" data-go="m-tl">${svg('<path d="M6 4v16M6 7h11M6 12h8M6 17h11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>')}Timeline</a>`);
    sItems.push(`<a class="mcs-i" href="#" data-go="m-gl">${svg('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 9h6M9 13h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>')}Glossary</a>`);
    const strip = `<nav class="mcs" aria-label="Madlanga Commission quick links"><button type="button" class="mcs-arw mcs-l" aria-label="Scroll left" hidden>‹</button><div class="mcs-row">${sItems.join("")}</div><button type="button" class="mcs-arw mcs-r" aria-label="Scroll right" hidden>›</button></nav>`;
    root.innerHTML = strip + head + expl + rep + thr + wsec + cons + com + ev + staff + tl + vsx + gl + docs + vo + up + foot;
    tick(); fitTips(); arrows();
    const row = root.querySelector(".mcs-row"); if (row) row.addEventListener("scroll", arrows, { passive: true });
  }
  function arrows() {
    const row = root.querySelector(".mcs-row"); if (!row) return;
    const l = root.querySelector(".mcs-l"), r = root.querySelector(".mcs-r");
    l.hidden = row.scrollLeft < 4; r.hidden = row.scrollLeft + row.clientWidth >= row.scrollWidth - 4;
  }

  function tick() {
    root.querySelectorAll(".mc-ago").forEach((e) => { e.textContent = "Latest " + ago(e.dataset.t); });
    root.querySelectorAll(".mc-ago-plain").forEach((e) => { e.textContent = e.dataset.t ? ago(e.dataset.t) : ""; });
  }
  function fitTips() { root.querySelectorAll(".mc-tip").forEach((t) => t.classList.toggle("mc-r", t.parentElement.getBoundingClientRect().left > innerWidth / 2)); }

  root.addEventListener("click", (e) => {
    const i = e.target.closest(".mc-i");
    if (i) { e.stopPropagation(); const w = i.parentElement, was = w.classList.contains("open"); root.querySelectorAll(".mc-tw.open").forEach((x) => x.classList.remove("open")); if (!was) w.classList.add("open"); fitTips(); return; }
    if (e.target.closest(".mc-tip")) return;
    root.querySelectorAll(".mc-tw.open").forEach((x) => x.classList.remove("open"));
    const m = e.target.closest("[data-more]");
    if (m) { const s = m.closest(".pl-sec"), open = m.dataset.open === "1"; s.querySelectorAll(".mc-x").forEach((x) => { x.hidden = open; }); m.dataset.open = open ? "" : "1"; m.textContent = open ? m.dataset.label : "Show fewer ▴"; if (!m.dataset.label) m.dataset.label = m.textContent; return; }
    const r = e.target.closest("[data-reps]");
    if (r) { const s = r.closest(".pl-sec"); s.classList.toggle("all"); s.querySelectorAll(".mc-x").forEach((x) => { x.hidden = !s.classList.contains("all"); }); r.textContent = s.classList.contains("all") ? "Show fewer ▴" : r.dataset.l || r.textContent; return; }
    const sw = e.target.closest("[data-wit]");
    if (sw) { e.preventDefault(); const c = root.querySelector(`.m-wit .mc-v[data-k="${sw.dataset.wit}"]`); if (c) { c.hidden = false; c.click(); c.scrollIntoView({ behavior: "smooth", block: "center" }); } return; }
    const sg = e.target.closest("[data-go]");
    if (sg) { e.preventDefault(); const sct = root.querySelector("." + sg.dataset.go); if (sct) { sct.classList.add("open"); sct.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
    const ar = e.target.closest(".mcs-arw");
    if (ar) { const row = root.querySelector(".mcs-row"); row.scrollBy({ left: (ar.classList.contains("mcs-l") ? -1 : 1) * row.clientWidth * 0.7, behavior: "smooth" }); return; }
    const f = e.target.closest("[data-fold]");
    if (f) { e.preventDefault(); const s = root.querySelector("." + f.dataset.fold); if (s) { s.classList.add("open"); s.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
    const h = e.target.closest(".fold > .pl-sh");
    if (h) { h.parentElement.classList.toggle("open"); return; }
    const c = e.target.closest(".m-wit .mc-v");
    if (c && !e.target.closest("a")) { picked = c.dataset.k; const old = root.querySelector(".m-wit .mc-panel"); const html = evidence(picked); root.querySelectorAll(".m-wit .mc-v").forEach((x) => x.classList.toggle("on", x.dataset.k === picked)); if (old) old.outerHTML = html.replace('class="mc-panel', 'class="mc-panel tapped'); else if (html) c.closest(".pl-voices").insertAdjacentHTML("afterend", html.replace('class="mc-panel', 'class="mc-panel tapped')); }
  });
  root.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.target.classList.contains("mc-v") || e.target.classList.contains("mc-vo-x"))) e.target.click(); });
  // Voices: tap a card to open or close its articles
  root.addEventListener("click", (e) => {
    const c = e.target.closest(".m-vo .mc-vo-x"); if (!c || e.target.closest("a")) return;
    const open = c.getAttribute("aria-expanded") !== "true";
    c.setAttribute("aria-expanded", open); c.querySelector(".mc-varts").hidden = !open;
  });
  addEventListener("resize", () => { fitTips(); arrows(); });
  setInterval(tick, 1000);

  const load = () => Promise.all([fetch("data/madlanga.json", { cache: "no-store" }).then((r) => r.json()), fetch("data/madlanga-auto.json", { cache: "no-store" }).then((r) => r.ok ? r.json() : {}).catch(() => ({}))]);
  let stamp = "";
  load().then(([c, a]) => { C = c; A = a; stamp = a.updated || ""; render(); })
    .catch(() => { root.innerHTML = `<p class="mc-foot">The tracker could not load. Please refresh.</p>`; });
  // pick up the hourly update without a reload
  setInterval(() => { fetch("data/madlanga-auto.json", { cache: "no-store" }).then((r) => r.json()).then((a) => { if ((a.updated || "") !== stamp) { stamp = a.updated || ""; A = a; render(); } }).catch(() => {}); }, 60000);
})();

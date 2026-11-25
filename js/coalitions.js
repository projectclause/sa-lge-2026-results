// Coalitions Tracker, built like an AI news edition: each event is one story written from several people's reporting,
// with "In brief", a timeline, sections and the pieces it was built from. Front page = edition; #<event-id> = one event.
// Data: data/coalition-feed.json (journalists, items = source pieces, events = stories built from item ids), joined with the
// hourly additions in data/coalition-auto.json by js/feed.js. The page re-checks every hour and redraws in place.
(function () {
  "use strict";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const ymd = (d) => d.split("-").map(Number);
  const day = (d) => { const [, m, dd] = ymd(d); return `${dd} ${MON[m - 1].slice(0, 3)}`; };
  const long = (d) => { const [y, m, dd] = ymd(d); return `${DAYS[new Date(y, m - 1, dd).getDay()]} ${dd} ${MON[m - 1]}`; };
  // the edition header shows today's date in South Africa (SAST), rolling over at midnight on its own
  const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date()); // YYYY-MM-DD
  // "as of 09:00" when the data was updated today, otherwise when it was last updated
  const asOf = (label, ed) => `${label} edition, ${today() === ed.date ? `as of ${ed.time}` : `last updated ${day(ed.date)} at ${ed.time}`}`;
  setInterval(() => { const t = long(today()); document.querySelectorAll(".pl-date").forEach((h) => { if (h.textContent !== t) h.textContent = t; }); }, 60000);
  const and = (a) => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  const root = document.querySelector(".pl");
  // journalists and commentators first, then the politicians negotiating the deals
  const GROUPS = [["voice", "Voices", "Journalists and commentators"], ["player", "Key players", "The politicians in the talks"]];
let D, BY = {};
// parties (key players) and outlets (voices): logo or name badge, in a fixed order
const ORG = (k) => (D.orgs || []).find((o) => o.k === k) || { k, n: k, badge: k };
const orgRank = (k) => { const i = (D.orgs || []).findIndex((o) => o.k === k); return i < 0 ? 99 : i; };
const orgMark = (k, cls) => { const o = ORG(k); return o.logo ? `<span class="${cls}"><img src="assets/logos-sm/${o.logo}.png" alt=""></span>` : `<span class="${cls} pl-ob">${esc(o.badge || o.n)}</span>`; };
const byOrg = (list) => { const m = new Map(); list.slice().sort((a, b) => orgRank(a[1].org) - orgRank(b[1].org)).forEach((x) => { const k = x[1].org; if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return [...m.entries()]; };

  const itemsOf = (e) => e.items.map((id) => BY[id]).filter(Boolean).sort((a, b) => a.d.localeCompare(b.d));
  const updated = (e) => itemsOf(e).map((i) => i.d).concat((e.coverage || []).map((c) => c.d)).sort().pop();
  const outlets = (list) => [...new Set(list.map((i) => i.src))];
// outlet coverage: articles grouped by event; the same report carried by several outlets is grouped as one
const NOTOUTLET = /^(X|YouTube|TikTok|Instagram|LinkedIn|Facebook|DA on X|MK Party on YouTube|SMWX)$/;
const isIntl = (src) => (D.outlets_intl || []).includes(src);
const reports = (e) => {
  const all = (e.coverage || []).concat(itemsOf(e).filter((i) => !NOTOUTLET.test(i.src)).map((i) => ({ src: i.src, h: i.h, d: i.d, url: i.url, intl: isIntl(i.src) })));
  const seen = new Set(), out = [];
  all.forEach((a) => { if (seen.has(a.url)) return; seen.add(a.url); out.push(a); });
  return out;
};
const key = (h) => String(h).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const grouped = (e) => {
  const g = new Map();
  reports(e).sort((a, b) => a.d.localeCompare(b.d)).forEach((a) => { const k = key(a.h); if (!g.has(k)) g.set(k, { ...a, also: [] }); else g.get(k).also.push(a); });
  return [...g.values()].sort((a, b) => b.d.localeCompare(a.d));
};
const outletsOf = (e) => [...new Set(reports(e).map((a) => a.src))];
const outletLine = (e) => { const o = outletsOf(e), intl = o.filter(isIntl); return `${o.length} outlets${intl.length ? `, including ${esc(and(intl.slice(0, 3)))}` : ""}`; };
  const people = (list) => [...new Set(list.map((i) => i.j))].map((k) => D.journalists[k]);
  // a row of faces, capped at max with a "+N" chip for the rest
  // gold star + pill for voices with a wide audience
  const WIDE = '<span class="pl-wide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>Wide Reach</span>';
  // the top-ranked voice on Preamble's influence ranking (pickup, reach, access, momentum)
  const TOP = '<span class="pl-wide pl-topv"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>Most Influential Voice</span>';
  const INF = TOP.replace("pl-topv", "pl-infv").replace("Most Influential Voice", "Influential");
  // small "i" beside a tag: opens a short note on how voices are ranked
  const INFO = '<span class="pl-i" role="button" tabindex="0" aria-label="How we rank voices" aria-haspopup="dialog">i</span>';
  // green pill for journalists at the national public broadcaster; its "i" explains what the SABC is
  const PB = '<span class="pl-wide pl-pb">Public Broadcaster</span>';
  const INFO_PB = '<span class="pl-i" data-note="pb" role="button" tabindex="0" aria-label="About the public broadcaster" aria-haspopup="dialog">i</span>';
  // Most Influential / Influential pills are hidden for now; the ranking (p.top, p.inf) stays in the data
  const SHOW_RANK = false;
  const nameTag = (p) => { const t = SHOW_RANK && p.top ? TOP : SHOW_RANK && p.inf ? INF : p.wide ? WIDE : ""; return `<b class="pl-nm">${esc(p.n)}${p.alias ? "*" : ""}${t ? `<span class="pl-tagw">${t}${INFO}</span>` : ""}${p.pb ? `<span class="pl-tagw">${PB}${INFO_PB}</span>` : ""}</b>`; };
  const HOW = `<div class="pl-how" role="dialog" aria-label="How we rank voices" hidden>
      <button type="button" class="pl-how-x" aria-label="Close">×</button>
      <div class="pl-how-pb" hidden><p class="pl-how-h">Public Broadcaster</p><p>South African Broadcasting Corporation (<a href="https://www.sabc.co.za/sabc/about-us/" target="_blank" rel="noopener">SABC</a>) is South Africa's national public broadcaster.</p></div>
      <div class="pl-how-c">
      <p class="pl-how-h">How we rank voices</p>
      <p>A score out of 100 from the last 30 days of coverage:</p>
      <ul><li><b>Pickup 40%</b> · other established outlets citing them</li>
        <li><b>Reach 30%</b> · their YouTube and X audience, or their outlet’s</li>
        <li><b>Access 20%</b> · their pieces quoting key players</li>
        <li><b>Momentum 10%</b> · pickup in the last 14 days</li></ul>
      <p><b>Most Influential Voice</b> is the top score; <b>Influential</b>, the next four. <b>Wide Reach</b> marks a large audience. International voices are ranked among themselves; wire reprints in other outlets count as pickup.</p>
      <p class="pl-how-n">Data: Google News, YouTube and X. Updated 23 Nov.</p>
      </div>
    </div>`;
  (function howSetup() {
    document.body.insertAdjacentHTML("beforeend", HOW + '<div class="pl-how-bg" hidden></div>');
    const box = document.querySelector(".pl-how"), bg = document.querySelector(".pl-how-bg");
    let from = null;
    const close = () => { box.hidden = bg.hidden = true; if (from) from.setAttribute("aria-expanded", "false"); from = null; };
    const open = (el) => {
      if (from === el) return close();
      from = el; el.setAttribute("aria-expanded", "true"); box.hidden = false;
      const pb = el.dataset.note === "pb"; box.querySelector(".pl-how-pb").hidden = !pb; box.querySelector(".pl-how-c").hidden = pb;
      box.setAttribute("aria-label", pb ? "About the public broadcaster" : "How we rank voices");
      const phone = matchMedia("(max-width: 720px)").matches; bg.hidden = !phone;
      box.classList.toggle("sheet", phone);
      if (!phone) {
        const r = el.getBoundingClientRect(), w = box.offsetWidth;
        box.style.left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 12)) + scrollX + "px";
        box.style.top = r.bottom + scrollY + 8 + "px";
      } else { box.style.left = box.style.top = ""; }
      box.querySelector(".pl-how-x").focus({ preventScroll: true });
    };
    // capture phase, so the tap does not also select the voice underneath
    document.addEventListener("click", (e) => {
      const i = e.target.closest(".pl-i");
      if (i) { e.preventDefault(); e.stopPropagation(); open(i); return; }
      if (e.target.closest(".pl-how-x") || (!box.hidden && !e.target.closest(".pl-how"))) close();
    }, true);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !box.hidden) { const f = from; close(); f && f.focus(); }
      const i = e.target.closest && e.target.closest(".pl-i");
      if (i && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.stopPropagation(); open(i); }
    }, true);
    addEventListener("hashchange", close);
  })();
  const faces = (ps, cls, max = 99) => `<span class="${cls}">${ps.slice(0, max).map((p) => `<img src="${p.img}" alt="${esc(p.n)}" title="${esc(p.n)}">`).join("")}${ps.length > max ? `<i class="pl-more-n" title="${esc(and(ps.slice(max).map((p) => p.n)))}">+${ps.length - max}</i>` : ""}</span>`;
  const piece = (it) => { const p = D.journalists[it.j]; return `
    <details class="pl-piece">
      <summary><img src="${p.img}" alt=""><span class="pl-pt"><span class="pl-pm">${day(it.d)} · ${esc(p.n)} · ${esc(it.kind)}</span><b>${esc(it.h)}</b></span><span class="pl-plus" aria-hidden="true"></span></summary>
      <div class="pl-pb"><p>${esc(it.s)}</p><a href="${esc(it.url)}" target="_blank" rel="noopener">${it.kind === "Video" ? "Watch" : "Read"} on ${esc(it.src)}${it.pay ? " · subscribers" : ""} →</a></div>
    </details>`; };

  // ---------- who matters most: ranking used to keep lists short ----------
  const ago = (d) => (Date.parse(D.edition.date) - Date.parse(d)) / 864e5;
  const cnt = (k) => D.items.filter((i) => i.j === k).length;
  const recent = (k, days = 7) => D.items.filter((i) => i.j === k && ago(i.d) <= days).length;
  const keyOf = (p) => Object.keys(D.journalists).find((x) => D.journalists[x] === p);
  // voices: active in the last two weeks first, then influence score; reporters by how much they filed this week
  const rankV = (list) => list.sort((a, b) => (recent(b[0], 14) > 0) - (recent(a[0], 14) > 0) || (b[1].beat === "reporting" ? recent(b[0]) - recent(a[0]) : 0) || (b[1].score || 0) - (a[1].score || 0) || cnt(b[0]) - cnt(a[0]));
  // key players: active this week first, then the people who decide the deals, then the most active
  const rankP = (list) => list.sort((a, b) => (recent(b[0]) > 0) - (recent(a[0]) > 0) || !!b[1].core - !!a[1].core || recent(b[0]) - recent(a[0]) || cnt(b[0]) - cnt(a[0]));
  const TOPN = 8;
  // editor's pick: anyone marked "pin" always shows in the preview (taking the last place if they ranked lower)
  const PINAT = 5; // pinned people sit no lower than sixth place
  const pinTop = (list) => { list.filter(([, p]) => p.pin).forEach((x) => { const i = list.indexOf(x); if (i > PINAT) { list.splice(i, 1); list.splice(PINAT, 0, x); } }); return list; };
  // editor's placement: "slot": n puts that voice at exactly place n of the South Africa list (even an SABC or reporting voice)
  const atSlot = (list) => { list.filter(([, p]) => p.slot).forEach((x) => { list.splice(list.indexOf(x), 1); list.splice(x[1].slot - 1, 0, x); }); return list; };
  // co-hosts sit together: anyone marked "after": "<key>" is placed right after that person
  const pairUp = (list) => { list.filter(([, p]) => p.after).forEach((x) => { const t = list.findIndex(([k]) => k === x[1].after); if (t < 0) return; list.splice(list.indexOf(x), 1); list.splice(list.findIndex(([k]) => k === x[1].after) + 1, 0, x); }); return list; };
  const card = ([k, p], n) => `<button type="button" class="pl-voice${n >= TOPN ? " pl-vx" : ""}" data-k="${k}" aria-pressed="false">${p.img ? `<img src="${p.img}" alt="">` : `<i class="pl-av" aria-hidden="true">${esc(p.n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase())}</i>`}<span>${nameTag(p)}<span>${esc(p.role || p.o)}</span></span><em>${cnt(k)}</em></button>`;
  const grid = (list, label) => `<div class="pl-vgrid"><div class="pl-voices">${list.map(card).join("")}</div>${list.length > TOPN ? `<button type="button" class="pl-vall" aria-expanded="false" data-n="${list.length}" data-l="${label}">Show all ${list.length} ${label}</button>` : ""}</div>`;
  function peopleSections() {
    const J = Object.entries(D.journalists);
    const an = atSlot(pairUp(pinTop(rankV(J.filter(([, p]) => p.group === "voice" && (p.slot || (!p.pb && p.beat !== "reporting"))))))), rp = rankV(J.filter(([, p]) => !p.pb && p.beat === "reporting"));
    // journalists at the national public broadcaster (SABC) get their own tab
    const pbv = rankV(J.filter(([, p]) => p.group === "voice" && p.pb));
    const pl = pinTop(rankP(J.filter(([, p]) => p.group === "player")));
    return `<section class="pl-sec pl-ppl"><h3 class="pl-sh">Voices</h3>
        <p class="pl-gsub">Journalists and commentators · ranked by influence, active in the last two weeks first</p>
        <div class="pl-vtabs" role="tablist"><button type="button" role="tab" data-beat="analysis" aria-selected="true">Analysis &amp; commentary <i>${an.length}</i></button><button type="button" role="tab" data-beat="reporting" aria-selected="false">Reporting <i>${rp.length}</i></button>${pbv.length ? `<button type="button" role="tab" data-beat="pb" aria-selected="false">Public Broadcaster <i>${pbv.length}</i></button>` : ""}</div>
        <div class="pl-beat" data-beat="analysis">${grid(an, "voices")}</div>
        <div class="pl-beat" data-beat="reporting" hidden>${grid(rp, "reporters")}</div>
        ${pbv.length ? `<div class="pl-beat" data-beat="pb" hidden><p class="pl-gsub pl-pbsub">Journalists at the SABC, South Africa’s national public broadcaster</p>${grid(pbv, "public broadcaster voices")}</div>` : ""}
      </section>
      <section class="pl-sec pl-ppl"><h3 class="pl-sh">Key players</h3>
        <p class="pl-gsub">The politicians in the talks · the people deciding the deals first</p>
        ${grid(pl, "key players")}
      </section>`;
  }
  function bindPeople() {
    root.querySelectorAll(".pl-vall").forEach((b) => b.onclick = () => {
      const o = b.getAttribute("aria-expanded") !== "true"; b.setAttribute("aria-expanded", o);
      b.closest(".pl-vgrid").classList.toggle("open", o);
      b.textContent = o ? "Show fewer" : `Show all ${b.dataset.n} ${b.dataset.l}`;
    });
    root.querySelectorAll(".pl-vtabs button").forEach((t) => t.onclick = () => {
      root.querySelectorAll(".pl-vtabs button").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
      root.querySelectorAll(".pl-beat").forEach((x) => { x.hidden = x.dataset.beat !== t.dataset.beat; });
      // phones: slide the chosen tab fully into view in the carousel
      const row = t.parentElement; if (row.scrollWidth > row.clientWidth) row.scrollTo({ left: Math.max(0, t.offsetLeft - row.offsetLeft - 16), behavior: "smooth" });
    });
  }
  // inside a story: the people who moved it most (decision-makers and the latest to speak first)
  function storyRank(e, ps, I) {
    const last = (k) => I.filter((i) => i.j === k).map((i) => i.d).sort().pop() || "";
    const P = ps.map((p) => [keyOf(p), p]);
    // players named in the headline lead (the story is about them), then decision-makers, then the most present and most recent
    const named = (p) => (e.h + " " + e.dek).includes(p.n.split(" ").pop());
    const inStory = (k) => I.filter((i) => i.j === k).length;
    const pw = (k, p) => (named(p) ? 1000 : 0) + (p.core ? 100 : 0) + inStory(k) * 5;
    const players = P.filter(([, p]) => p.group === "player").sort((a, b) => pw(b[0], b[1]) - pw(a[0], a[1]) || last(b[0]).localeCompare(last(a[0])));
    // the public broadcaster (SABC) gets its own place: its busiest voice on this story
    const pbs = P.filter(([, p]) => p.pb).sort((a, b) => inStory(b[0]) - inStory(a[0]) || last(b[0]).localeCompare(last(a[0])));
    const analysts = P.filter(([, p]) => p.group === "voice" && !p.pb && p.beat !== "reporting").sort((a, b) => (b[1].score || 0) - (a[1].score || 0) || last(b[0]).localeCompare(last(a[0])));
    const reporters = P.filter(([, p]) => p.beat === "reporting").sort((a, b) => last(a[0]).localeCompare(last(b[0])));
    const top = players.slice(0, 2).concat(analysts.slice(0, 1));
    [...players, ...analysts].forEach((x) => { if (top.length < 3 && !top.includes(x)) top.push(x); });
    if (pbs.length) top.push(pbs[0]);
    return { top, players: players.filter((x) => !top.includes(x)), analysts: analysts.filter((x) => !top.includes(x)), reporters: reporters.filter((x) => !top.includes(x)).concat(pbs.slice(1).filter(([, p]) => p.beat !== "reporting")) };
  }
  const outletOf = (p) => String(p.role || p.o).split(", ").pop();
  const firstLine = (t) => { t = String(t || ""); const m = t.match(/^.*?[.!?](\s|$)/); return (m ? m[0] : t).trim(); };

  function front() {
    const ev = D.events.slice().sort((a, b) => updated(b).localeCompare(updated(a)));
    const lead = ev[0], rest = ev.slice(1), L = itemsOf(lead);
    // newest first; on the same day, the piece added last comes first (the hourly job adds its pieces at the end)
    const all = D.items.slice().reverse().sort((a, b) => b.d.localeCompare(a.d));
    root.innerHTML = `
      <header class="pl-ed">
        <p class="pl-kick">Coalitions Tracker · Preamble</p>
        <h1 class="pl-date">${long(today())}</h1>
        <p class="pl-asof">${esc(asOf("Coalitions", D.edition))}</p>
        <p class="pl-intro">Preamble’s Coalitions Tracker gathers coverage of the 2026 coalition talks from established news outlets in South Africa and around the world. It groups reports on the same event into one story, writes a structured summary with AI, and links back to every original article. It also tracks what key journalists and politicians are saying. None of them write for Preamble.</p>
      </header>
      <a class="pl-lead" href="#${lead.id}">
        <p class="pl-cat">${esc(lead.cat)} <span>updated ${day(updated(lead))}</span></p>
        <h2>${esc(lead.h)}</h2>
        <p class="pl-dek">${esc(lead.dek)}</p>
        <p class="pl-src">${faces(people(L), "pl-fc", 10)}<span>Reported by ${outletLine(lead)} · ${people(L).length} voices and key players</span></p>
      </a>
      <section class="pl-sec pl-top3"><h3 class="pl-sh">Top stories</h3>
        ${rest.map((e, n) => { const I = itemsOf(e); return `<a class="pl-row${n >= 3 ? " pl-xtra" : ""}" href="#${e.id}"><span class="pl-rt"><b>${esc(e.h)}</b><span>${esc(e.cat)} · ${day(updated(e))} · ${outletsOf(e).length} outlets</span></span>${faces(people(I), "pl-fc pl-fc-s", 4)}</a>`; }).join("")}
        ${rest.length > 3 ? `<button type="button" class="pl-stmore" aria-expanded="false">Show ${rest.length - 3} more stories</button>` : ""}
      </section>
      ${peopleSections()}
      <section class="pl-sec pl-allsec"><h3 class="pl-sh">All pieces, newest first <span class="pl-filt"></span></h3><div class="pl-all">${all.map(piece).join("")}</div>${all.length > 10 ? `<button type="button" class="pl-stmore pl-allmore" aria-expanded="false">Show ${all.length - 10} more pieces</button>` : ""}</section>`;
    // phones: the ten newest pieces, the rest behind a toggle
    root.querySelectorAll(".pl-all > *").forEach((x, n) => { if (n >= 10) x.classList.add("pl-pxtra"); });
    const alm = root.querySelector(".pl-allmore");
    if (alm) alm.onclick = () => { const o = alm.getAttribute("aria-expanded") !== "true"; alm.setAttribute("aria-expanded", o); alm.closest(".pl-allsec").classList.toggle("open", o); alm.textContent = o ? "Show fewer pieces" : `Show ${all.length - 10} more pieces`; if (!o) alm.closest(".pl-allsec").scrollIntoView({ block: "start" }); };
    // phones: three top stories, the rest behind a toggle
    const stm = root.querySelector(".pl-stmore");
    if (stm) stm.onclick = () => { const o = stm.getAttribute("aria-expanded") !== "true"; stm.setAttribute("aria-expanded", o); stm.closest(".pl-top3").classList.toggle("open", o); stm.textContent = o ? "Show fewer stories" : `Show ${rest.length - 3} more stories`; };
    bindPeople();
    let who = null;
    const phone = window.matchMedia("(max-width: 720px)");
    root.querySelectorAll(".pl-voice").forEach((b) => b.onclick = () => {
      who = who === b.dataset.k ? null : b.dataset.k;
      root.querySelectorAll(".pl-voice").forEach((x) => x.setAttribute("aria-pressed", x.dataset.k === who));
      // phones: open this person's stories right under their name (one open at a time) instead of filtering the list far below
      if (phone.matches) {
        root.querySelectorAll(".pl-vlist").forEach((l) => l.remove());
        root.querySelectorAll(".pl-voice").forEach((x) => x.setAttribute("aria-expanded", x.dataset.k === who));
        if (who) {
          const list = document.createElement("div");
          list.className = "pl-vlist";
          list.innerHTML = all.filter((i) => i.j === who).map(piece).join("");
          b.after(list);
        }
        return;
      }
      root.querySelector(".pl-all").innerHTML = all.filter((i) => !who || i.j === who).map(piece).join("");
      root.querySelector(".pl-filt").textContent = who ? `· ${D.journalists[who].n}` : "";
    });
  }

  function sayCard(e, I, k, p, lead) {
    const mine = I.filter((i) => i.j === k).reverse();
    const tag = p.group === "player" ? "Key player" : p.pb ? "Public Broadcaster" : p.beat === "reporting" ? "Reporting" : "Analysis";
    return `
          <div class="pl-voicecard${lead ? " pl-lead3" : ""}" id="says-${k}">
            <div class="pl-vh"><img src="${p.img}" alt=""><span>${nameTag(p)}<span>${esc(p.role)}${lead ? ` · <i class="pl-vtag">${tag}</i>` : ""}</span></span></div>
            <p class="pl-vsays">${esc((e.voices || {})[k] || "")}</p>
            ${mine.map(piece).join("")}
          </div>`;
  }

  function event(e) {
    const I = itemsOf(e), ps = people(I), R = storyRank(e, ps, I);
    const tl = I.map((i) => `<li><time>${day(i.d)}</time><span>${esc(D.journalists[i.j].n)}: ${esc(i.h)}</span></li>`);
    const SHOW = 3;
    root.innerHTML = `
      <a class="pl-back" href="#">← All stories</a>
      <article class="pl-ev">
        <p class="pl-cat">${esc(e.cat)} · ${esc(e.place)}</p>
        <h1 class="pl-evh">${esc(e.h)}</h1>
        <p class="pl-dek pl-evdek">${esc(e.dek)}</p>
        <p class="pl-credit">Preamble’s AI summary of ${reports(e).length} reports from ${outletLine(e)}. Updated ${day(updated(e))}.</p>
        ${R.top.length ? `<section class="pl-drive" aria-label="Who’s driving this"><h2>Who’s driving this</h2><div class="pl-drv${R.top.length > 3 ? " pl-drv4" : ""}">${R.top.map(([k, p]) => `<a class="pl-drvi" href="#says-${k}"><img src="${p.img}" alt=""><span><b>${esc(p.n)}</b><em>${esc(firstLine((e.voices || {})[k]) || p.role)}</em></span></a>`).join("")}</div></section>` : ""}
        <section class="pl-brief"><h2>In brief</h2><ul>${e.brief.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></section>
        <section class="pl-tl"><h2>How it came to this</h2><ol>${tl.slice(0, SHOW).join("")}</ol>${tl.length > SHOW ? `<ol class="pl-tl-more" hidden>${tl.slice(SHOW).join("")}</ol><button type="button" class="pl-more">Show the full timeline</button>` : ""}</section>
        ${e.sec.map(([t, p]) => `<section class="pl-body"><h2>${esc(t)}</h2><p>${esc(p)}</p></section>`).join("")}
<section class="pl-sec pl-cov"><h3 class="pl-sh">Coverage <span class="pl-covn">${grouped(e).length} reports · ${outletsOf(e).length} outlets</span></h3>
  ${grouped(e).map((a) => `<a class="pl-art" href="${esc(a.url)}" target="_blank" rel="noopener"><span class="pl-am2"><b>${esc(a.src)}</b>${a.intl ? '<i class="pl-intl">International</i>' : ""}<time>${day(a.d)}</time></span><span class="pl-ah">${esc(a.h)}</span>${a.also.length ? `<span class="pl-also">Also carried by ${esc(and(a.also.map((x) => x.src)))}</span>` : ""}</a>`).join("")}
</section>
        <section class="pl-sec pl-says"><h3 class="pl-sh">What they are saying <button type="button" class="pl-xall" aria-expanded="false">Expand all</button></h3>
          ${R.top.map(([k, p]) => sayCard(e, I, k, p, true)).join("")}
          ${R.players.length + R.analysts.length + R.reporters.length ? `<button type="button" class="pl-saymore" aria-expanded="false">More voices (${R.players.length + R.analysts.length + R.reporters.length})</button>
          <div class="pl-saysrest" hidden>
            ${R.players.length ? `<h4 class="pl-gh">Key players</h4>${R.players.map(([k, p]) => sayCard(e, I, k, p)).join("")}` : ""}
            ${R.analysts.length ? `<h4 class="pl-gh">Analysis &amp; commentary</h4>${R.analysts.map(([k, p]) => sayCard(e, I, k, p)).join("")}` : ""}
            ${R.reporters.length ? `<h4 class="pl-gh">Reporting</h4><p class="pl-gsub">Reporting by ${esc(and(R.reporters.map(([, p]) => p.n + " (" + outletOf(p) + ")")))}, earliest first.</p>${R.reporters.map(([k, p]) => sayCard(e, I, k, p)).join("")}` : ""}
          </div>` : ""}
        </section>
        <p class="pl-how">Preamble summarises what each person said, using only their published pieces and interviews. Their views are their own. Read the originals for the full argument.</p>
      </article>`;
    const m = root.querySelector(".pl-more");
    if (m) m.onclick = () => { root.querySelector(".pl-tl-more").hidden = false; m.remove(); };
    const sm = root.querySelector(".pl-saymore");
    if (sm) { const lbl = sm.textContent; sm.onclick = () => { const o = sm.getAttribute("aria-expanded") !== "true"; sm.setAttribute("aria-expanded", o); root.querySelector(".pl-saysrest").hidden = !o; sm.textContent = o ? "Fewer voices" : lbl; }; }
    const x = root.querySelector(".pl-xall");
    x.onclick = () => { const o = x.getAttribute("aria-expanded") !== "true"; if (o && sm && sm.getAttribute("aria-expanded") !== "true") sm.click(); root.querySelectorAll(".pl-ev .pl-piece").forEach((d) => d.open = o); x.setAttribute("aria-expanded", o); x.textContent = o ? "Collapse all" : "Expand all"; };
  }

  // ---------- International: the same structure as the South Africa edition, built from coverage outside the country ----------
  const initials = (n) => n.split(/\s+/).map((w) => w[0]).filter((c) => /[A-Za-z]/.test(c)).slice(0, 2).join("").toUpperCase();
  const face = (v) => v.img ? `<img src="${v.img}" alt="">` : `<i class="pl-av" aria-hidden="true">${esc(initials(v.n))}</i>`;
  let IX;
  function ix() {
    if (IX) return IX;
    const X = D.intl, V = X.voices, PB = {};
    X.pieces.forEach((p) => PB[p.id] = p);
    const P = (t) => t.p.map((id) => PB[id]).filter(Boolean);
    const vOf = (list) => [...new Set(list.flatMap((p) => p.j))];
    const outs = (list) => [...new Set(list.map((p) => p.src))];
    const upd = (t) => P(t).map((p) => p.d).sort().pop();
    const n = (k) => X.pieces.filter((p) => p.j.includes(k)).length;
    const last = (k) => X.pieces.filter((p) => p.j.includes(k)).map((p) => p.d).sort().pop() || "";
    const rank = (ks) => { const r = ks.slice().sort((a, b) => (V[b].score || 0) - (V[a].score || 0) || n(b) - n(a) || last(b).localeCompare(last(a)));
      // editor’s swap: a voice can take another voice’s place in the order ("swap": "<key>")
      r.slice().forEach((k) => { const w = V[k].swap, i = r.indexOf(k), j = r.indexOf(w); if (w && j >= 0 && i > j) { r[j] = k; r[i] = w; } });
      return r; };
    const iFaces = (ks, cls, max = 99) => `<span class="${cls}">${ks.slice(0, max).map((k) => V[k].img ? `<img src="${V[k].img}" alt="${esc(V[k].n)}" title="${esc(V[k].n)}">` : `<i class="pl-avs" title="${esc(V[k].n)}">${esc(initials(V[k].n))}</i>`).join("")}${ks.length > max ? `<i class="pl-more-n">+${ks.length - max}</i>` : ""}</span>`;
    const outLine = (list) => { const o = outs(list); return `${o.length} outlet${o.length > 1 ? "s" : ""}, including ${esc(and(o.slice(0, 3)))}`; };
    const by = (p) => p.j.length ? and(p.j.map((k) => V[k].n)) : p.by || p.src;
    // country where each outlet is based, shown as a small flag after the date
    const CC = { gb: "United Kingdom", us: "United States", qa: "Qatar", fr: "France", de: "Germany", es: "Spain", ar: "Argentina", it: "Italy", nl: "Netherlands", eg: "Egypt", lb: "Lebanon", dz: "Algeria", jp: "Japan", az: "Azerbaijan" };
    const HOME = { "Financial Times": "gb", "Reuters": "gb", "Bloomberg": "us", "Bloomberg Opinion": "us", "The New York Times": "us", "AP": "us", "BBC": "gb", "Al Jazeera": "qa", "Semafor": "us", "The Washington Post": "us", "The Economist": "gb", "AFP via France 24": "fr", "The Africa Report": "fr", "African Business": "gb", "Good Authority": "us", "RFI": "fr", "Les Echos": "fr", "DW": "de", "Der Spiegel": "de", "FAZ": "de", "El País": "es", "France 24": "fr", "Infobae": "ar", "Il Post": "it", "Il Sole 24 Ore": "it", "Nigrizia": "it", "IARI": "it", "NOS": "nl", "Reformatorisch Dagblad": "nl", "Ad-Diyar": "lb", "Africa News (Algeria)": "dz", "Youm7": "eg", "Al-Bawaba News": "eg", "Newsweek Japan": "jp", "Operativ Məlumat Mərkəzi": "az" };
    const flag = (p) => { const c = HOME[p.src]; return c ? `<img class="pl-flag" src="assets/flags/${c}.png" alt="${esc(CC[c])}" title="${esc(p.src)} · ${esc(CC[c])}">` : ""; };
    const trs = (p) => p.lang && p.s ? `<span class="pl-trs${p.sfull ? "" : " pl-trs-x"}">${p.sfull ? `<b>Translated from ${esc(p.lang)}:</b> ` : ""}${esc(p.s)}</span>` : "";
    const lang = (p) => p.lang ? `<i class="pl-lang" title="Originally in ${esc(p.lang)}: ${esc(p.orig || "")}">${esc(p.lang)}</i>` : "";
    const ipiece = (p) => `
    <details class="pl-piece">
      <summary>${p.j.length ? face(V[p.j[0]]) : `<i class="pl-av" aria-hidden="true">${esc(initials(p.src))}</i>`}<span class="pl-pt"><span class="pl-pm">${day(p.d)}${flag(p)} · ${esc(by(p))}${by(p) !== p.src ? ` · ${esc(p.src)}` : ""}${lang(p)}</span><b>${esc(p.h)}</b></span><span class="pl-plus" aria-hidden="true"></span></summary>
      <div class="pl-pb">${trs(p) ? `<p>${trs(p)}</p>` : ""}${p.orig ? `<p class="pl-orig" dir="auto">Original headline: ${esc(p.orig)}</p>` : ""}<a href="${esc(p.url)}" target="_blank" rel="noopener">Read on ${esc(p.src)}${p.lang ? ` (in ${esc(p.lang)})` : ""}${p.pay ? " · subscribers" : ""} →</a></div>
    </details>`;
    const card = (k, i) => `<button type="button" class="pl-voice${i >= TOPN ? " pl-vx" : ""}" data-k="${k}" aria-pressed="false">${face(V[k])}<span>${nameTag(V[k])}<span>${esc(V[k].role)}</span></span><em>${n(k)}</em></button>`;
    const grid = (ks, label) => `<div class="pl-vgrid"><div class="pl-voices">${ks.map(card).join("")}</div>${ks.length > TOPN ? `<button type="button" class="pl-vall" aria-expanded="false" data-n="${ks.length}" data-l="${label}">Show all ${ks.length} ${label}</button>` : ""}</div>`;
    return IX = { X, V, P, vOf, outs, upd, n, rank, iFaces, outLine, ipiece, grid, lang, trs, flag };
  }

  function intl() {
    const { X, V, P, vOf, upd, rank, iFaces, outLine, ipiece, grid } = ix();
    const ev = X.stories, lead = ev[0], rest = ev.slice(1), L = P(lead);
    const all = X.pieces.slice().sort((a, b) => b.d.localeCompare(a.d));
    const ks = Object.keys(V);
    const an = rank(ks.filter((k) => V[k].beat === "analysis")), rp = rank(ks.filter((k) => V[k].beat !== "analysis"));
    root.innerHTML = `
      <header class="pl-ed">
        <p class="pl-kick">Coalitions Tracker · International</p>
        <h1 class="pl-date">${long(today())}</h1>
        <p class="pl-asof">${esc(asOf("International", D.edition))}</p>
        <p class="pl-intro">How news outlets outside South Africa are covering the 2026 coalition talks. Preamble groups their reports into stories, writes a short AI summary of the angle each one takes, and links back to every original article. ${X.brief[0]}. None of these journalists write for Preamble.</p>
      </header>
      <a class="pl-lead" href="#${lead.id}">
        <p class="pl-cat">${esc(lead.cat)} <span>updated ${day(upd(lead))}</span></p>
        <h2>${esc(lead.h)}</h2>
        <p class="pl-dek">${esc(lead.dek)}</p>
        <p class="pl-src">${iFaces(rank(vOf(L)), "pl-fc", 10)}<span>Reported by ${outLine(L)} · ${vOf(L).length} voices</span></p>
      </a>
      <section class="pl-sec pl-top3"><h3 class="pl-sh">Top stories</h3>
        ${rest.map((t, i) => { const I = P(t); return `<a class="pl-row${i >= 3 ? " pl-xtra" : ""}" href="#${t.id}"><span class="pl-rt"><b>${esc(t.h)}</b><span>${esc(t.cat)} · ${day(upd(t))} · ${new Set(I.map((p) => p.src)).size} outlets</span></span>${iFaces(rank(vOf(I)), "pl-fc pl-fc-s", 4)}</a>`; }).join("")}
        ${rest.length > 3 ? `<button type="button" class="pl-stmore" aria-expanded="false">Show ${rest.length - 3} more stories</button>` : ""}
      </section>
      <section class="pl-sec pl-ppl"><h3 class="pl-sh">Voices</h3>
        <p class="pl-gsub">Foreign correspondents and commentators · ranked by influence among international voices</p>
        <div class="pl-vtabs" role="tablist"><button type="button" role="tab" data-beat="reporting" aria-selected="true">Reporting <i>${rp.length}</i></button><button type="button" role="tab" data-beat="analysis" aria-selected="false">Analysis &amp; commentary <i>${an.length}</i></button></div>
        <div class="pl-beat" data-beat="analysis" hidden>${grid(an, "voices")}</div>
        <div class="pl-beat" data-beat="reporting">${grid(rp, "reporters")}</div>
      </section>
      <section class="pl-sec pl-allsec"><h3 class="pl-sh">All pieces, newest first <span class="pl-filt"></span></h3><div class="pl-all">${all.map(ipiece).join("")}</div>${all.length > 10 ? `<button type="button" class="pl-stmore pl-allmore" aria-expanded="false">Show ${all.length - 10} more pieces</button>` : ""}</section>`;
    const stm = root.querySelector(".pl-top3 .pl-stmore");
    if (stm) stm.onclick = () => { const o = stm.getAttribute("aria-expanded") !== "true"; stm.setAttribute("aria-expanded", o); stm.closest(".pl-top3").classList.toggle("open", o); stm.textContent = o ? "Show fewer stories" : `Show ${rest.length - 3} more stories`; };
    const mark = () => root.querySelectorAll(".pl-all > *").forEach((x, i) => x.classList.toggle("pl-pxtra", i >= 10));
    mark();
    const alm = root.querySelector(".pl-allmore");
    if (alm) alm.onclick = () => { const o = alm.getAttribute("aria-expanded") !== "true"; alm.setAttribute("aria-expanded", o); alm.closest(".pl-allsec").classList.toggle("open", o); alm.textContent = o ? "Show fewer pieces" : `Show ${all.length - 10} more pieces`; if (!o) alm.closest(".pl-allsec").scrollIntoView({ block: "start" }); };
    bindPeople();
    let who = null;
    const phone = window.matchMedia("(max-width: 720px)");
    root.querySelectorAll(".pl-voice").forEach((b) => b.onclick = () => {
      who = who === b.dataset.k ? null : b.dataset.k;
      root.querySelectorAll(".pl-voice").forEach((x) => x.setAttribute("aria-pressed", x.dataset.k === who));
      const mine = all.filter((p) => !who || p.j.includes(who));
      if (phone.matches) {
        root.querySelectorAll(".pl-vlist").forEach((l) => l.remove());
        if (who) { const list = document.createElement("div"); list.className = "pl-vlist"; list.innerHTML = mine.map(ipiece).join(""); b.after(list); }
        return;
      }
      root.querySelector(".pl-all").innerHTML = mine.map(ipiece).join("");
      if (alm) alm.hidden = !!who;
      root.querySelector(".pl-allsec").classList.toggle("open", !!who);
      root.querySelector(".pl-filt").textContent = who ? `· ${V[who].n}` : "";
      mark();
    });
  }

  function intlEvent(t) {
    const { V, P, vOf, outs, upd, rank, outLine, ipiece, lang, trs, flag } = ix();
    const I = P(t).sort((a, b) => b.d.localeCompare(a.d));
    const ks = rank(vOf(I)), top = ks.slice(0, 3), more = ks.slice(3);
    const says = (k, lead) => { const v = V[k], mine = I.filter((p) => p.j.includes(k)); return `
          <div class="pl-voicecard${lead ? " pl-lead3" : ""}" id="says-${k}">
            <div class="pl-vh">${face(v)}<span>${nameTag(v)}<span>${esc(v.role)}${lead ? ` · <i class="pl-vtag">${v.beat === "analysis" ? "Analysis" : "Reporting"}</i>` : ""}</span></span></div>
            <p class="pl-vsays">${esc((t.voices || {})[k] || "")}</p>
            ${mine.map(ipiece).join("")}
          </div>`; };
    root.innerHTML = `
      <a class="pl-back" href="#international">← All international stories</a>
      <article class="pl-ev">
        <p class="pl-cat">${esc(t.cat)} · ${esc(t.place)}</p>
        <h1 class="pl-evh">${esc(t.h)}</h1>
        <p class="pl-dek pl-evdek">${esc(t.dek)}</p>
        <p class="pl-credit">Preamble’s AI summary of ${I.length} reports from ${outLine(I)}, written from their headlines and published text. Updated ${day(upd(t))}.</p>
        ${top.length ? `<section class="pl-drive" aria-label="Who’s driving this"><h2>Who’s driving this</h2><div class="pl-drv">${top.map((k) => `<a class="pl-drvi" href="#says-${k}">${face(V[k])}<span><b>${esc(V[k].n)}</b><em>${esc(firstLine((t.voices || {})[k]) || V[k].role)}</em></span></a>`).join("")}</div></section>` : ""}
        <section class="pl-brief"><h2>In brief</h2><ul>${(t.brief || []).map((b) => `<li>${esc(b)}</li>`).join("")}</ul></section>
        ${(t.sec || []).map(([h, p]) => `<section class="pl-body"><h2>${esc(h)}</h2><p>${esc(p)}</p></section>`).join("")}
        <section class="pl-sec pl-cov"><h3 class="pl-sh">Coverage <span class="pl-covn">${I.length} reports · ${outs(I).length} outlets</span></h3>
          ${I.map((p) => `<a class="pl-art" href="${esc(p.url)}" target="_blank" rel="noopener"><span class="pl-am2"><b>${esc(p.src)}</b><i class="pl-intl">International</i>${lang(p)}<time>${day(p.d)}</time>${flag(p)}${p.pay ? '<i class="pl-pay">Subscribers</i>' : ""}</span><span class="pl-ah">${esc(p.h)}</span>${trs(p)}</a>`).join("")}
        </section>
        ${ks.length ? `<section class="pl-sec pl-says"><h3 class="pl-sh">What they are saying <button type="button" class="pl-xall" aria-expanded="false">Expand all</button></h3>
          ${top.map((k) => says(k, true)).join("")}
          ${more.length ? `<button type="button" class="pl-saymore" aria-expanded="false">More voices (${more.length})</button><div class="pl-saysrest" hidden>${more.map((k) => says(k)).join("")}</div>` : ""}
        </section>` : ""}
        <p class="pl-how">Preamble summarises what each journalist reported or argued, using only their published pieces. Their views are their own. Read the originals for the full argument.</p>
      </article>`;
    const sm = root.querySelector(".pl-saymore");
    if (sm) { const lbl = sm.textContent; sm.onclick = () => { const o = sm.getAttribute("aria-expanded") !== "true"; sm.setAttribute("aria-expanded", o); root.querySelector(".pl-saysrest").hidden = !o; sm.textContent = o ? "Fewer voices" : lbl; }; }
    const x = root.querySelector(".pl-xall");
    if (x) x.onclick = () => { const o = x.getAttribute("aria-expanded") !== "true"; if (o && sm && sm.getAttribute("aria-expanded") !== "true") sm.click(); root.querySelectorAll(".pl-ev .pl-piece").forEach((d) => d.open = o); x.setAttribute("aria-expanded", o); x.textContent = o ? "Collapse all" : "Expand all"; };
  }

  // draws whichever view the address asks for (front page, one story, international); route() also returns to the top
  function render() {
    const it = D.intl && D.intl.stories.find((x) => "#" + x.id === location.hash);
    const isI = !!D.intl && (location.hash === "#international" || !!it);
    const e = !isI && D.events.find((x) => "#" + x.id === location.hash);
    it ? intlEvent(it) : isI ? intl() : e ? event(e) : front();
    document.querySelectorAll(".pl-scope a").forEach((a) => a.toggleAttribute("aria-current", (a.dataset.s === "intl") === !!isI));
    document.querySelectorAll(".pl-scope a[aria-current]").forEach((a) => a.setAttribute("aria-current", "page"));
    document.title = it ? it.h + " · International · Coalitions Tracker" : isI ? "International · Coalitions Tracker" : e ? e.h + " · Coalitions Tracker" : "Coalitions Tracker: who will run South Africa’s metros | PREAMBLE";
  }
  function route() { render(); window.scrollTo(0, 0); }

  // ---------- data: the hand-written feed plus the hourly additions (js/feed.js), refreshed in place every hour ----------
  const loadFeed = () => window.PreambleFeed ? PreambleFeed.load() : fetch("data/coalition-feed.json", { cache: "no-cache" }).then((r) => r.json());
  let raw = "", lastCheck = Date.now();
  const use = (d) => {
    raw = JSON.stringify(d); D = d; BY = {}; d.items.forEach((i) => BY[i.id] = i); IX = null;
    document.dispatchEvent(new CustomEvent("pl-data", { detail: d })); // save.js and notify.js pick up the same data
  };
  // what the reader has open, so a refresh can put it back: chosen voice, tab, expanded lists, open pieces, scroll place
  const ANCHORS = ".pl-ed, .pl-lead, .pl-sec, .pl-ev > *";
  function snapshot() {
    const q = (x) => root.querySelector(x), qa = (x) => [...root.querySelectorAll(x)];
    const anchors = qa(ANCHORS); let ai = -1, top = 0;
    anchors.forEach((el, i) => { const t = el.getBoundingClientRect().top; if (t <= 120) { ai = i; top = t; } });
    const on = (x) => { const b = q(x); return !!b && b.getAttribute("aria-expanded") === "true"; };
    return {
      y: scrollY, ai, top, cls: ai >= 0 ? anchors[ai].className : "",
      who: (q(".pl-voice[aria-pressed='true']") || {}).dataset?.k, tab: (q(".pl-vtabs [aria-selected='true']") || {}).dataset?.beat,
      grids: qa(".pl-vall[aria-expanded='true']").map((b) => b.dataset.l),
      stories: on(".pl-top3 .pl-stmore"), all: on(".pl-allmore"), say: on(".pl-saymore"),
      tl: !!q(".pl-tl-more") && !q(".pl-tl-more").hidden,
      open: qa("details.pl-piece[open] .pl-pb a").map((a) => a.href)
    };
  }
  function restore(s) {
    const q = (x) => root.querySelector(x), click = (b) => b && b.click();
    if (s.tab) click(q(`.pl-vtabs [data-beat="${s.tab}"][aria-selected="false"]`));
    s.grids.forEach((l) => click(q(`.pl-vall[data-l="${l}"][aria-expanded="false"]`)));
    if (s.stories) click(q(".pl-top3 .pl-stmore[aria-expanded='false']"));
    if (s.all) click(q(".pl-allmore[aria-expanded='false']"));
    if (s.who) click(q(`.pl-voice[data-k="${s.who}"]`));
    if (s.say) click(q(".pl-saymore[aria-expanded='false']"));
    if (s.tl) click(q(".pl-tl .pl-more"));
    const open = new Set(s.open);
    root.querySelectorAll("details.pl-piece").forEach((d) => { const a = d.querySelector(".pl-pb a"); if (a && open.has(a.href)) d.open = true; });
    // keep the section the reader was looking at in the same place on screen, even if new stories were added above it
    const el = [...root.querySelectorAll(ANCHORS)][s.ai];
    window.scrollTo(0, el && el.className === s.cls ? scrollY + el.getBoundingClientRect().top - s.top : s.y);
  }
  function refresh() {
    lastCheck = Date.now();
    return loadFeed().then((d) => {
      if (JSON.stringify(d) === raw) return false;
      const s = snapshot(); use(d); render(); restore(s);
      return true;
    }).catch(() => false);
  }
  loadFeed().then((d) => {
    use(d); route(); addEventListener("hashchange", route);
    // every hour, and when the reader comes back to a tab left open for more than an hour
    setInterval(() => { if (!document.hidden) refresh(); }, 36e5);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - lastCheck > 36e5) refresh(); });
    document.addEventListener("pl-feed-changed", refresh); // live.js noticed the data files change
    window.plRefresh = refresh;
  }).catch(() => { root.innerHTML = '<p class="pl-none">The tracker could not load. Refresh the page to try again.</p>'; });
})();

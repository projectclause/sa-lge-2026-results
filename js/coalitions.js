// Coalitions Tracker, built like an AI news edition: each event is one story written from several people's reporting,
// with "In brief", a timeline, sections and the pieces it was built from. Front page = edition; #<event-id> = one event.
// Data: data/coalition-feed.json (journalists, items = source pieces, events = stories built from item ids).
(function () {
  "use strict";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const ymd = (d) => d.split("-").map(Number);
  const day = (d) => { const [, m, dd] = ymd(d); return `${dd} ${MON[m - 1].slice(0, 3)}`; };
  const long = (d) => { const [y, m, dd] = ymd(d); return `${DAYS[new Date(y, m - 1, dd).getDay()]} ${dd} ${MON[m - 1]}`; };
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
  const nameTag = (p) => { const t = p.top ? TOP : p.inf ? INF : p.wide ? WIDE : ""; return `<b class="pl-nm">${esc(p.n)}${t ? `<span class="pl-tagw">${t}${INFO}</span>` : ""}</b>`; };
  const HOW = `<div class="pl-how" role="dialog" aria-label="How we rank voices" hidden>
      <button type="button" class="pl-how-x" aria-label="Close">×</button>
      <p class="pl-how-h">How we rank voices</p>
      <p>A score out of 100 from the last 30 days of coverage:</p>
      <ul><li><b>Pickup 40%</b> · other established outlets citing them</li>
        <li><b>Reach 30%</b> · their YouTube and X audience, or their outlet’s</li>
        <li><b>Access 20%</b> · their pieces quoting key players</li>
        <li><b>Momentum 10%</b> · pickup in the last 14 days</li></ul>
      <p><b>Most Influential Voice</b> is the top score; <b>Influential</b>, the next four. <b>Wide Reach</b> marks a large audience.</p>
      <p class="pl-how-n">Data: Google News, YouTube and X. Updated 23 Nov.</p>
    </div>`;
  (function howSetup() {
    document.body.insertAdjacentHTML("beforeend", HOW + '<div class="pl-how-bg" hidden></div>');
    const box = document.querySelector(".pl-how"), bg = document.querySelector(".pl-how-bg");
    let from = null;
    const close = () => { box.hidden = bg.hidden = true; if (from) from.setAttribute("aria-expanded", "false"); from = null; };
    const open = (el) => {
      if (from === el) return close();
      from = el; el.setAttribute("aria-expanded", "true"); box.hidden = false;
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
  const TOPN = 6;
  // editor's pick: a voice marked "pin" always shows in the first six (taking the sixth place if it ranked lower)
  const pinTop = (list) => { list.filter(([, p]) => p.pin).forEach((x) => { const i = list.indexOf(x); if (i >= TOPN) { list.splice(i, 1); list.splice(TOPN - 1, 0, x); } }); return list; };
  const card = ([k, p], n) => `<button type="button" class="pl-voice${n >= TOPN ? " pl-vx" : ""}" data-k="${k}" aria-pressed="false"><img src="${p.img}" alt=""><span>${nameTag(p)}<span>${esc(p.role || p.o)}</span></span><em>${cnt(k)}</em></button>`;
  const grid = (list, label) => `<div class="pl-vgrid"><div class="pl-voices">${list.map(card).join("")}</div>${list.length > TOPN ? `<button type="button" class="pl-vall" aria-expanded="false" data-n="${list.length}" data-l="${label}">Show all ${list.length} ${label}</button>` : ""}</div>`;
  function peopleSections() {
    const J = Object.entries(D.journalists);
    const an = pinTop(rankV(J.filter(([, p]) => p.group === "voice" && p.beat !== "reporting"))), rp = rankV(J.filter(([, p]) => p.beat === "reporting"));
    const pl = pinTop(rankP(J.filter(([, p]) => p.group === "player")));
    return `<section class="pl-sec pl-ppl"><h3 class="pl-sh">Voices</h3>
        <p class="pl-gsub">Journalists and commentators · ranked by influence, active in the last two weeks first</p>
        <div class="pl-vtabs" role="tablist"><button type="button" role="tab" data-beat="analysis" aria-selected="true">Analysis &amp; commentary <i>${an.length}</i></button><button type="button" role="tab" data-beat="reporting" aria-selected="false">Reporting <i>${rp.length}</i></button></div>
        <div class="pl-beat" data-beat="analysis">${grid(an, "voices")}</div>
        <div class="pl-beat" data-beat="reporting" hidden>${grid(rp, "reporters")}</div>
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
    const analysts = P.filter(([, p]) => p.group === "voice" && p.beat !== "reporting").sort((a, b) => (b[1].score || 0) - (a[1].score || 0) || last(b[0]).localeCompare(last(a[0])));
    const reporters = P.filter(([, p]) => p.beat === "reporting").sort((a, b) => last(a[0]).localeCompare(last(b[0])));
    const top = players.slice(0, 2).concat(analysts.slice(0, 1));
    [...players, ...analysts].forEach((x) => { if (top.length < 3 && !top.includes(x)) top.push(x); });
    return { top, players: players.filter((x) => !top.includes(x)), analysts: analysts.filter((x) => !top.includes(x)), reporters };
  }
  const outletOf = (p) => String(p.role || p.o).split(", ").pop();
  const firstLine = (t) => { t = String(t || ""); const m = t.match(/^.*?[.!?](\s|$)/); return (m ? m[0] : t).trim(); };

  function front() {
    const ev = D.events.slice().sort((a, b) => updated(b).localeCompare(updated(a)));
    const lead = ev[0], rest = ev.slice(1), L = itemsOf(lead);
    const all = D.items.slice().sort((a, b) => b.d.localeCompare(a.d));
    root.innerHTML = `
      <header class="pl-ed">
        <p class="pl-kick">Coalitions Tracker · Preamble</p>
        <h1 class="pl-date">${long(D.edition.date)}</h1>
        <p class="pl-asof">Coalitions edition, as of ${esc(D.edition.time)}</p>
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
      <section class="pl-sec"><h3 class="pl-sh">All pieces, newest first <span class="pl-filt"></span></h3><div class="pl-all">${all.map(piece).join("")}</div></section>`;
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
    const tag = p.group === "player" ? "Key player" : p.beat === "reporting" ? "Reporting" : "Analysis";
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
        ${R.top.length ? `<section class="pl-drive" aria-label="Who’s driving this"><h2>Who’s driving this</h2><div class="pl-drv">${R.top.map(([k, p]) => `<a class="pl-drvi" href="#says-${k}"><img src="${p.img}" alt=""><span><b>${esc(p.n)}</b><em>${esc(firstLine((e.voices || {})[k]) || p.role)}</em></span></a>`).join("")}</div></section>` : ""}
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

  function route() {
    const e = D.events.find((x) => "#" + x.id === location.hash);
    e ? event(e) : front();
    document.title = e ? e.h + " · Coalitions Tracker" : "Coalitions Tracker";
    window.scrollTo(0, 0);
  }

  fetch("data/coalition-feed.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => {
    D = d; d.items.forEach((i) => BY[i.id] = i);
    route(); addEventListener("hashchange", route);
  }).catch(() => { root.innerHTML = '<p class="pl-none">The tracker could not load. Refresh the page to try again.</p>'; });
})();

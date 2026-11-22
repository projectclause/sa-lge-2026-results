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
  const nameTag = (p) => `<b class="pl-nm">${esc(p.n)}${p.wide ? WIDE : ""}</b>`;
  const faces = (ps, cls, max = 99) => `<span class="${cls}">${ps.slice(0, max).map((p) => `<img src="${p.img}" alt="${esc(p.n)}" title="${esc(p.n)}">`).join("")}${ps.length > max ? `<i class="pl-more-n" title="${esc(and(ps.slice(max).map((p) => p.n)))}">+${ps.length - max}</i>` : ""}</span>`;
  const piece = (it) => { const p = D.journalists[it.j]; return `
    <details class="pl-piece">
      <summary><img src="${p.img}" alt=""><span class="pl-pt"><span class="pl-pm">${day(it.d)} · ${esc(p.n)} · ${esc(it.kind)}</span><b>${esc(it.h)}</b></span><span class="pl-plus" aria-hidden="true"></span></summary>
      <div class="pl-pb"><p>${esc(it.s)}</p><a href="${esc(it.url)}" target="_blank" rel="noopener">${it.kind === "Video" ? "Watch" : "Read"} on ${esc(it.src)}${it.pay ? " · subscribers" : ""} →</a></div>
    </details>`; };

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
      <section class="pl-sec"><h3 class="pl-sh">Top stories</h3>
        ${rest.map((e) => { const I = itemsOf(e); return `<a class="pl-row" href="#${e.id}"><span class="pl-rt"><b>${esc(e.h)}</b><span>${esc(e.cat)} · ${day(updated(e))} · ${outletsOf(e).length} outlets</span></span>${faces(people(I), "pl-fc pl-fc-s", 4)}</a>`; }).join("")}
      </section>
${GROUPS.map(([g, title, sub]) => `<section class="pl-sec"><h3 class="pl-sh">${title}</h3><p class="pl-gsub">${sub}</p>
        <div class="pl-voices">${Object.entries(D.journalists).filter(([, p]) => p.group === g).sort((a, b) => D.items.filter((i) => i.j === b[0]).length - D.items.filter((i) => i.j === a[0]).length).map(([k, p]) => `<button type="button" class="pl-voice" data-k="${k}" aria-pressed="false"><img src="${p.img}" alt=""><span>${nameTag(p)}<span>${esc(p.role || p.o)}</span></span><em>${D.items.filter((i) => i.j === k).length}</em></button>`).join("")}</div>
</section>`).join("")}
      <section class="pl-sec"><h3 class="pl-sh">All pieces, newest first <span class="pl-filt"></span></h3><div class="pl-all">${all.map(piece).join("")}</div></section>`;
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

  function event(e) {
    const I = itemsOf(e), ps = people(I);
    const tl = I.map((i) => `<li><time>${day(i.d)}</time><span>${esc(D.journalists[i.j].n)}: ${esc(i.h)}</span></li>`);
    const SHOW = 3;
    root.innerHTML = `
      <a class="pl-back" href="#">← All stories</a>
      <article class="pl-ev">
        <p class="pl-cat">${esc(e.cat)} · ${esc(e.place)}</p>
        <h1 class="pl-evh">${esc(e.h)}</h1>
        <p class="pl-dek pl-evdek">${esc(e.dek)}</p>
        <p class="pl-credit">Preamble’s AI summary of ${reports(e).length} reports from ${outletLine(e)}. Updated ${day(updated(e))}.</p>
        <section class="pl-brief"><h2>In brief</h2><ul>${e.brief.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></section>
        <section class="pl-tl"><h2>How it came to this</h2><ol>${tl.slice(0, SHOW).join("")}</ol>${tl.length > SHOW ? `<ol class="pl-tl-more" hidden>${tl.slice(SHOW).join("")}</ol><button type="button" class="pl-more">Show the full timeline</button>` : ""}</section>
        ${e.sec.map(([t, p]) => `<section class="pl-body"><h2>${esc(t)}</h2><p>${esc(p)}</p></section>`).join("")}
<section class="pl-sec pl-cov"><h3 class="pl-sh">Coverage <span class="pl-covn">${grouped(e).length} reports · ${outletsOf(e).length} outlets</span></h3>
  ${grouped(e).map((a) => `<a class="pl-art" href="${esc(a.url)}" target="_blank" rel="noopener"><span class="pl-am2"><b>${esc(a.src)}</b>${a.intl ? '<i class="pl-intl">International</i>' : ""}<time>${day(a.d)}</time></span><span class="pl-ah">${esc(a.h)}</span>${a.also.length ? `<span class="pl-also">Also carried by ${esc(and(a.also.map((x) => x.src)))}</span>` : ""}</a>`).join("")}
</section>
        <section class="pl-sec pl-says"><h3 class="pl-sh">What they are saying <button type="button" class="pl-xall" aria-expanded="false">Expand all</button></h3>
          ${GROUPS.map(([g, title]) => { const grp = ps.filter((p) => p.group === g); return grp.length ? `<h4 class="pl-gh">${title}</h4>` + grp.map((p) => { const k = Object.keys(D.journalists).find((x) => D.journalists[x] === p); const mine = I.filter((i) => i.j === k).reverse(); return `
          <div class="pl-voicecard">
            <div class="pl-vh"><img src="${p.img}" alt=""><span>${nameTag(p)}<span>${esc(p.role)}</span></span></div>
            <p class="pl-vsays">${esc((e.voices || {})[k] || "")}</p>
            ${mine.map(piece).join("")}
          </div>`; }).join("") : ""; }).join("")}
        </section>
        <p class="pl-how">Preamble summarises what each person said, using only their published pieces and interviews. Their views are their own. Read the originals for the full argument.</p>
      </article>`;
    const m = root.querySelector(".pl-more");
    if (m) m.onclick = () => { root.querySelector(".pl-tl-more").hidden = false; m.remove(); };
    const x = root.querySelector(".pl-xall");
    x.onclick = () => { const o = x.getAttribute("aria-expanded") !== "true"; root.querySelectorAll(".pl-ev .pl-piece").forEach((d) => d.open = o); x.setAttribute("aria-expanded", o); x.textContent = o ? "Collapse all" : "Expand all"; };
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

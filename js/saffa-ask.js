// SAFFA ask bar: the same chat-style box as the rest of the site (css .ask*), but on the SAFFA page it answers
// questions about South Africans living abroad and South Africa's missions, from the page's own data (window.SAFFA,
// set by js/saffa.js). Each answer can turn the globe to the place it names.
(function () {
  "use strict";
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (n) => Number(n).toLocaleString("en-US");
  const SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const BASE = "Ask about South Africans abroad…";

  const wrap = document.createElement("div");
  wrap.className = "ask";
  wrap.innerHTML = `
    <div class="ask-thread" hidden><div class="ask-head"><span>Ask SAFFA</span><button type="button" class="ask-x" aria-label="Close conversation">×</button></div><div class="ask-msgs" aria-live="polite"></div></div>
    <ul class="ask-sug" role="listbox" hidden></ul>
    <form class="ask-bar" autocomplete="off"><input class="ask-in" type="text" placeholder="${BASE}" aria-label="Ask about South Africans abroad and South Africa's missions"><button class="ask-go" type="submit" aria-label="Send">${SEND}</button></form>`;
  document.body.appendChild(wrap);
  document.body.classList.add("has-ask");
  const form = wrap.querySelector(".ask-bar"), input = wrap.querySelector(".ask-in"), sug = wrap.querySelector(".ask-sug"), thread = wrap.querySelector(".ask-thread"), msgs = wrap.querySelector(".ask-msgs");

  // the page's data, once js/saffa.js has loaded it
  const ready = () => new Promise((res) => { const t0 = Date.now(); (function wait() { if (window.SAFFA) return res(window.SAFFA); if (Date.now() - t0 > 15000) return res(null); setTimeout(wait, 150); })(); });
  const ALIAS = { "uk": "United Kingdom", "britain": "United Kingdom", "great britain": "United Kingdom", "england": "United Kingdom", "scotland": "United Kingdom", "wales": "United Kingdom", "london": "United Kingdom",
    "us": "United States", "usa": "United States", "america": "United States", "the states": "United States", "united states of america": "United States",
    "uae": "United Arab Emirates", "emirates": "United Arab Emirates", "dubai": "United Arab Emirates", "abu dhabi": "United Arab Emirates",
    "nz": "New Zealand", "aus": "Australia", "oz": "Australia", "holland": "Netherlands", "the netherlands": "Netherlands", "republic of ireland": "Ireland", "swaziland": "Eswatini", "drc": "DR Congo", "congo": "DR Congo", "korea": "South Korea" };
  const low = (s) => s.toLowerCase();
  let IDX = null;
  function index(S) {
    if (IDX) return IDX;
    const people = new Map(S.data.people.map((p) => [low(p.name), p]));
    const WN = { "United States of America": "United States", "Dem. Rep. Congo": "DR Congo", "Congo": "Republic of the Congo", "Côte d'Ivoire": "Ivory Coast", "Eq. Guinea": "Equatorial Guinea", "Central African Rep.": "Central African Republic", "S. Sudan": "South Sudan", "eSwatini": "Eswatini", "Bosnia and Herz.": "Bosnia and Herzegovina", "Dominican Rep.": "Dominican Republic", "Solomon Is.": "Solomon Islands", "Falkland Is.": "Falkland Islands", "Fr. S. Antarctic Lands": "French Southern Lands", "N. Cyprus": "Northern Cyprus", "W. Sahara": "Western Sahara" };
    const countries = new Set([...S.data.people.map((p) => p.name), ...S.data.missions.map((m) => m.country), ...(S.data.world || []).map((n) => WN[n] || n).filter((n) => n !== "South Africa")]);
    const regions = []; S.data.states.forEach((c) => c.regions.forEach((r, i) => regions.push({ r, c, rank: i + 1 })));
    const items = [...countries].map((n) => ({ kind: "Country", label: n, n }))
      .concat(regions.map(({ r, c }) => ({ kind: c.unit === "province" ? "Province" : "State", label: r.name, sub: c.name, reg: r })))
      .concat(S.data.missions.map((m) => ({ kind: m.type, label: m.city, sub: m.country, m })));
    IDX = { people, countries: [...countries], regions, items };
    return IDX;
  }
  const has = (q, w) => new RegExp("(^|[^a-z])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z]|$)").test(q);
  function findCountry(q, I) {
    const al = Object.keys(ALIAS).sort((a, b) => b.length - a.length).find((a) => has(q, a));
    const byName = I.countries.slice().sort((a, b) => b.length - a.length).find((n) => has(q, low(n)));
    return byName || (al ? ALIAS[al] : null);
  }
  const findRegion = (q, I) => I.regions.slice().sort((a, b) => b.r.name.length - a.r.name.length).find(({ r }) => has(q, low(r.name)));
  const findCity = (q, S) => S.data.missions.slice().sort((a, b) => b.city.length - a.city.length).find((m) => has(q, low(m.city)) && !has(q, low(m.country)) || has(q, low(m.city)));
  const srcY = (c) => c.source.includes(c.year) ? c.source : `${c.source}, ${c.year}`;
  const missionsIn = (S, country) => S.data.missions.filter((m) => m.country === country);
  const art = (t) => /^[aeiou]/i.test(t) ? "an" : "a";
  const listMissions = (ms) => ms.map((m) => `${art(m.type)} ${m.type.toLowerCase().replace("consulate-general", "consulate-general")} in ${m.city}`).join(" and ");
  const peopleLine = (p) => `${p.approx ? "About " : ""}${fmt(p.n)} people born in South Africa live in ${p.name === "United Kingdom" || p.name === "United States" || p.name === "Netherlands" || p.name === "United Arab Emirates" ? "the " : ""}${p.name} (${p.source}${p.year ? ", " + p.year : ""}).`;

  function answer(text, S) {
    const I = index(S), raw = low(text).replace(/[’']/g, "'"), q = raw.replace(/[?.!,]/g, " ").replace(/\s+/g, " ").trim();
    const wantsMission = /embass|consul|high commission|mission|visa|passport|diplomat|liaison|representative office/.test(q);
    const wantsRank = /\b(most|largest|biggest|top|highest|where do|where are)\b/.test(q);
    const wantsStateRank = /\b(which|what)\b.*\b(state|province|states|provinces)\b/.test(q) || (/\b(state|province)s?\b/.test(q) && wantsRank);
    const country = findCountry(q, I), reg = findRegion(q, I);
    const P = (name) => I.people.get(low(name));
    const go = (label, d) => ({ act: ["Show " + label + " on the globe", () => S.focus(d)] });

    // a state or province
    if (reg && !wantsMission) {
      const { r, c, rank } = reg;
      const ADJ = { "United States": "US", "Australia": "Australian", "Canada": "Canadian" };
      const where = rank === 1 ? `the most of any ${ADJ[c.name] || c.name} ${c.unit}` : `the ${rank === 2 ? "second" : rank === 3 ? "third" : rank + "th"} most of any ${ADJ[c.name] || c.name} ${c.unit}`;
      return { text: `${fmt(r.n)} people born in South Africa live in ${r.name}, ${where} (${srcY(c)}).`, ...go(r.name, r) };
    }
    // which state or province in a country
    if (wantsStateRank) {
      const c = S.data.states.find((x) => x.name === (country || "")) || (/australia/.test(q) ? S.data.states.find((x) => x.name === "Australia") : /canad/.test(q) ? S.data.states.find((x) => x.name === "Canada") : S.data.states.find((x) => x.name === "United States"));
      const t = c.regions.slice(0, 3);
      return { text: `In ${c.name === "United States" ? "the United States" : c.name}, the most South African-born people live in ${t[0].name} (${fmt(t[0].n)}), then ${t[1].name} (${fmt(t[1].n)}) and ${t[2].name} (${fmt(t[2].n)}). Source: ${srcY(c)}.`, ...go(t[0].name, t[0]) };
    }
    // missions in a country or a city
    if (wantsMission) {
      const city = findCity(q, S);
      const cn = country || (city && city.country);
      const ms = cn ? missionsIn(S, cn) : [];
      if (ms.length) {
        const first = city && city.country === cn ? city : ms[0];
        return { text: `South Africa has ${listMissions(ms)} (${cn}).${P(cn) ? " " + peopleLine(P(cn)) : ""}`, ...go(first.city, first) };
      }
      if (cn) return { text: `South Africa has no embassy, high commission or consulate in ${cn} on our list. Missions in neighbouring countries often cover it: check DIRCO’s list of South African representation abroad.` };
      const n = S.data.missions.length, cg = S.data.missions.filter((m) => /consul/i.test(m.type)).length, nc = new Set(S.data.missions.map((m) => m.country)).size;
      return { text: `South Africa has ${n} missions abroad in ${nc} countries: embassies and high commissions in capitals, plus ${cg} consulates in cities such as New York, Dubai and Shanghai. Ask about a country, e.g. “Is there an embassy in Japan?”.` };
    }
    // a country
    if (country) {
      const p = P(country), ms = missionsIn(S, country), st = S.data.states.find((x) => x.name === country);
      if (p) {
        const extra = st ? ` Most live in ${st.regions[0].name} (${fmt(st.regions[0].n)}), ${st.regions[1].name} and ${st.regions[2].name}.` : "";
        const m = ms.length ? ` South Africa has ${listMissions(ms)}.` : "";
        return { text: peopleLine(p) + extra + m, ...go(country, p) };
      }
      if (ms.length) return { text: `We don’t have a figure for South Africans living in ${country}: it isn’t among the ${S.data.people.length} largest communities. South Africa has ${listMissions(ms)} there.`, ...go(ms[0].city, ms[0]) };
      return { text: `${country} isn’t among the ${S.data.people.length} largest South African communities on our list, and South Africa has no mission there.` };
    }
    // the total abroad
    if (/\b(abroad|overseas|outside|emigrat|diaspora|worldwide|world|globally|in total|altogether|total)\b/.test(q) && !wantsRank) {
      return { text: `About ${fmt(S.data.total.n)} people born in South Africa live in other countries (${S.data.total.source}, ${S.data.total.year}). The largest communities are in the UK, Australia and the United States.`, ...go("the largest community", S.data.people[0]) };
    }
    // where most live
    if (wantsRank || /\bsouth africans?\b/.test(q)) {
      const t = S.data.people.slice(0, 5);
      return { text: `The largest South African communities abroad: ${t.map((p, i) => `${i + 1}. ${p.name} (${p.approx ? "~" : ""}${fmt(p.n)})`).join(", ")}. Figures come from each country’s census or statistics office, from different years.`, ...go(t[0].name, t[0]) };
    }
    return { text: `I couldn’t find “${text.trim()}”. Try a country, state or city, e.g. “How many South Africans live in Canada?” or “Is there a South African embassy in Japan?”.` };
  }

  function bubble(cls, html) { const d = document.createElement("div"); d.className = "ask-msg " + cls; d.innerHTML = html; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; }
  function send(text) {
    if (!text.trim()) return;
    thread.hidden = false; sug.hidden = true;
    bubble("me", esc(text));
    input.value = "";
    ready().then((S) => {
      if (!S) { bubble("bot", "<p>The globe’s data hasn’t loaded. Please refresh the page.</p>"); return; }
      const a = answer(text, S);
      const d = bubble("bot", `<p>${esc(a.text)}</p>${a.act ? `<button type="button" class="ask-act">${esc(a.act[0])} ›</button>` : ""}`);
      if (a.act) d.querySelector(".ask-act").onclick = a.act[1];
    });
  }
  form.addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });
  input.addEventListener("input", () => {
    const S = window.SAFFA, q = low(input.value).replace(/[?.!,]/g, " ").replace(/\b(how|many|south|africans?|live|living|in|the|is|there|a|an|embassy|consulate|where|of)\b/g, " ").replace(/\s+/g, " ").trim();
    if (!S || q.length < 2) { sug.hidden = true; return; }
    const I = index(S);
    const sc = (it) => { const l = low(it.label); return l === q ? 0 : l.startsWith(q) ? 1 : l.split(/[\s-]+/).some((w) => w.startsWith(q)) ? 2 : l.includes(q) ? 3 : 9; };
    const top = I.items.map((it) => [sc(it), it]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0] || a[1].label.length - b[1].label.length).slice(0, 6).map(([, it]) => it);
    sug.hidden = !top.length;
    sug.innerHTML = top.map((it, i) => `<li role="option" data-i="${i}"><b>${esc(it.label)}</b><span>${esc(it.kind)}${it.sub ? " · " + esc(it.sub) : ""}</span></li>`).join("");
    sug.querySelectorAll("li").forEach((li) => li.onclick = () => {
      const it = top[+li.dataset.i];
      send(it.m ? `South African ${it.m.type.toLowerCase()} in ${it.label}` : `How many South Africans live in ${it.label}?`);
    });
  });
  wrap.querySelector(".ask-x").onclick = () => { thread.hidden = true; msgs.innerHTML = ""; };
  document.addEventListener("keydown", (e) => { if (e.key === "/" && document.activeElement !== input && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); } if (e.key === "Escape") sug.hidden = true; });

  // typewriter hints: different questions about South Africans abroad
  const EX = [
    "How many South Africans live in Australia?", "Where do most South Africans live?", "Is there a South African embassy in Japan?",
    "Which US state has the most South Africans?", "South Africans in Western Australia", "How many South Africans live abroad?",
    "South African consulate in Dubai", "How many South Africans live in Canada?", "Which Australian state has the most South Africans?",
    "South Africans in the UK", "Embassy in Brazil", "South Africans in Ontario", "How many South Africans live in New Zealand?",
    "Where is South Africa's high commission in India?", "South Africans in California", "How many South African missions are there?"
  ];
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { input.placeholder = BASE + " e.g. " + EX[0]; return; }
  let i = 0, j = 0, dir = 1, wait = 0;
  const busy = () => document.activeElement === input || input.value;
  setInterval(() => {
    if (busy()) { input.placeholder = BASE; return; }
    if (wait > 0) { wait--; return; }
    const s = EX[i];
    j += dir;
    input.placeholder = s.slice(0, j) + (j % 2 ? "▍" : "");
    if (dir === 1 && j >= s.length) { input.placeholder = s; dir = -1; wait = 28; }
    else if (dir === -1 && j <= 0) { dir = 1; i = (i + 1) % EX.length; wait = 6; }
  }, 75);
})();

// Ask bar: a chat-style box fixed at the bottom centre of every page.
// Questions are answered from the site's own data (councils, provinces, parties, mayors) — no outside service.
(function () {
  "use strict";
  const PROVS = [["GP", "Gauteng"], ["WC", "Western Cape"], ["KZN", "KwaZulu-Natal"], ["EC", "Eastern Cape"], ["FS", "Free State"], ["LP", "Limpopo"], ["MP", "Mpumalanga"], ["NW", "North West"], ["NC", "Northern Cape"]];
  const PARTY = { ANC: ["African National Congress", 30.76], DA: ["Democratic Alliance", 24.64], MK: ["Umkhonto Wesizwe Party", 9.77], EFF: ["Economic Freedom Fighters", 6.22], ASA: ["ActionSA", 5.67], IFP: ["Inkatha Freedom Party", 4.70], FFP: ["VF Plus", 2.97], SACP: ["South African Communist Party", 2.47], PA: ["Patriotic Alliance", 2.02] };
  const ALIAS = { anc: "ANC", da: "DA", mk: "MK", "mk party": "MK", eff: "EFF", actionsa: "ASA", "action sa": "ASA", ifp: "IFP", "vf plus": "FFP", "ff plus": "FFP", "freedom front": "FFP", sacp: "SACP", pa: "PA", "patriotic alliance": "PA" };
  const PNAME = { ANC: "ANC", DA: "DA", MK: "MK", EFF: "EFF", ASA: "ActionSA", IFP: "IFP", FFP: "VF Plus", SACP: "SACP", PA: "PA", UDM: "UDM" };
  const NEWMAYOR = { CPT: "Geordin Hill-Lewis (DA) was re-elected Mayor of Cape Town.", JHB: "Herman Mashaba (ActionSA) is expected to be elected Mayor of Johannesburg, with ANC and MK support.", TSH: "Nasiphi Moya (ActionSA) is expected to be elected Mayor of Tshwane by the new council." };
  const norm = (p) => ({ MKP: "MK", ActionSA: "ASA", "VF PLUS": "FFP" }[p] || p);
  const onHome = !!document.querySelector(".rs-grid");
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const wrap = document.createElement("div");
  wrap.className = "ask";
  wrap.innerHTML = `
    <div class="ask-thread" hidden><div class="ask-head"><span>Ask the results</span><button type="button" class="ask-x" aria-label="Close conversation">×</button></div><div class="ask-msgs" aria-live="polite"></div></div>
    <ul class="ask-sug" role="listbox" hidden></ul>
    <form class="ask-bar" autocomplete="off"><input class="ask-in" type="text" placeholder="Ask about the 2026 results… e.g. Who won Polokwane?" aria-label="Ask about the 2026 results"><button class="ask-go" type="submit" aria-label="Send">${SEND}</button></form>`;
  document.body.appendChild(wrap);
  document.body.classList.add("has-ask");
  const form = wrap.querySelector(".ask-bar"), input = wrap.querySelector(".ask-in"), sug = wrap.querySelector(".ask-sug"), thread = wrap.querySelector(".ask-thread"), msgs = wrap.querySelector(".ask-msgs");

  let DATA = null;
  const load = () => DATA ? Promise.resolve(DATA) : Promise.all([
    fetch("data/municipalities.geojson").then((r) => r.json()),
    fetch("data/mayors-history.json").then((r) => r.json()).catch(() => []),
    fetch("data/coalition-feed.json").then((r) => r.json()).catch(() => null)
  ]).then(([fc, hist, CF]) => {
    const M = fc.features.map((f) => f.properties);
    const items = []
      .concat(PROVS.map(([c, n]) => ({ kind: "Province", label: n, code: c })))
      .concat(M.map((p) => ({ kind: p.metro ? "Metro" : "Municipality", label: p.name, alt: p.alt || "", sub: p.prov, P: p })))
      .concat(hist.flatMap((c) => c.list.map((m) => ({ kind: "Mayor", label: m.n, sub: `${c.city} · ${m.y}`, m, c }))))
      .concat(CF ? Object.entries(CF.journalists).map(([k, p]) => ({ kind: p.group === "voice" ? "Voice" : "Key player", label: p.n.replace(/[“”"]/g, ""), alt: p.n.replace(/[“”"]/g, " "), sub: p.role || p.o, k, p })) : []);
    DATA = { M, hist, items, CF }; return DATA;
  });

  const STOP = /\b(who|whom|what|which|won|win|wins|winner|is|was|the|in|of|for|results?|show|me|tell|about|did|does|how|many|seats?|mayor|mayors|party|council|city|municipality|metro|vote|votes|2026|please|a|an)\b/g;
  const score = (it, q) => {
    const l = it.label.toLowerCase().replace(/^city of /, ""), a = (it.alt || "").toLowerCase();
    if (!q) return 9;
    if (l === q) return 0; if (l.startsWith(q)) return 1;
    if (l.split(/[\s-]+/).some((w) => w.startsWith(q))) return 2;
    if (l.includes(q) || (a && a.includes(q))) return 3;
    return 9;
  };
  const find = (q, kinds) => DATA.items.filter((it) => !kinds || kinds.includes(it.kind)).map((it) => [score(it, q), it]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0] || a[1].label.length - b[1].label.length);

  function councilLine(P) {
    const seats = {}; (P.seats || []).forEach(([p, n]) => { seats[norm(p)] = (seats[norm(p)] || 0) + n; });
    const ss = Object.entries(seats).sort((a, b) => b[1] - a[1]), N = ss.reduce((a, s) => a + s[1], 0);
    if (!N) return `${P.name}: the seat allocation has not been published.`;
    const [top, n] = ss[0], need = Math.floor(N / 2) + 1, runner = ss[1];
    return n >= need
      ? `${P.name}: the ${PNAME[top] || top} won a majority with ${n} of ${N} seats.`
      : `${P.name}: no party won a majority. The ${PNAME[top] || top} has the most seats, ${n} of ${N}${runner ? `, ahead of the ${PNAME[runner[0]] || runner[0]} with ${runner[1]}` : ""}. ${need} seats are needed to govern alone.`;
  }
  function provLine(code, name) {
    const a = window.DMAGG && window.DMAGG((w) => w.pv === code);
    if (!a) return `Open ${name} on the map to see its results.`;
    const r = Object.entries(a.agg).sort((x, y) => y[1] - x[1]);
    return `${name}: the ${PNAME[r[0][0]] || r[0][0]} won the most ward votes, ${(r[0][1] / a.tot * 100).toFixed(1)}%, ahead of the ${PNAME[r[1][0]] || r[1][0]} on ${(r[1][1] / a.tot * 100).toFixed(1)}%.`;
  }
  function goCouncil(code) { if (onHome && window.RS) window.RS.council(code); else location.href = "index.html#" + code; }
  function goProv(code) {
    if (window.DMSET) { window.DMSET({ lvl: "prov", prov: code }); const m = document.querySelector(".dm-levels") || document.getElementById("dm"); m && m.scrollIntoView({ behavior: "smooth", block: "start" }); }
    else location.href = "index.html#prov-" + code;
  }

  // Coalitions Tracker answers: what a person said, or the story on a coalition topic
  const SAYS = /\b(say|said|think|thought|view|position|stance|opinion|argu|write|wrote|comment)\w*/;
  const COAL = /\b(coalition|deal|talk|negotiat|gnu|unity|grand|kingmaker|tracker|conced|pact|hung)\w*/;
  const trackerOpen = (e) => () => { location.href = "coalitions.html" + (e ? "#" + e.id : ""); };
  const shortDay = (d) => { const [, m, dd] = d.split("-").map(Number); return dd + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]; };
  function trackerAnswer(raw, q) {
    const CF = DATA.CF; if (!CF) return null;
    const words = q.replace(new RegExp(SAYS.source, "g"), " ").replace(new RegExp(COAL.source, "g"), " ").replace(/\b(about|on|the|and|with|in|going|to|will)\b/g, " ").replace(/\s+/g, " ").trim();
    const who = words ? find(words, ["Voice", "Key player"])[0] : null;
    const mayorHit = words ? find(words, ["Mayor"])[0] : null;
    if (who && (SAYS.test(raw) || COAL.test(raw) || !mayorHit || who[0] < mayorHit[0])) {
      const { k, p } = who[1];
      const mine = CF.items.filter((i) => i.j === k).sort((a, b) => b.d.localeCompare(a.d));
      if (!mine.length) return null;
      // their own words first; second-hand reports only if that is all there is
      const it = mine.find((i) => i.kind !== "Reported") || mine[0];
      // the story that carries most of their pieces
      const ev = CF.events.filter((e) => e.voices && e.voices[k]).map((e) => [mine.filter((i) => e.items.includes(i.id)).length, e]).sort((a, b) => b[0] - a[0]).map((x) => x[1])[0] || CF.events.find((e) => e.items.includes(it.id));
      const view = ev && ev.voices && ev.voices[k];
      const more = mine.length > 1 ? " " + (mine.length - 1) + " more of their pieces are in the Coalitions Tracker." : "";
      return { text: p.n + " (" + (p.role || p.o) + ")" + (view ? ": " + view : ".") + " Latest, " + shortDay(it.d) + " on " + it.src + ": “" + it.h + "”. " + it.s + more, act: ["Open in the Coalitions Tracker", trackerOpen(ev)] };
    }
    if (!COAL.test(raw)) return null;
    // a coalition topic: the story whose words best match the question
    const terms = q.replace(new RegExp(SAYS.source, "g"), " ").replace(/\b(about|the|and|with|going|will|coalitions?|talks?|survive|fights?)\b/g, " ").split(" ").filter((w) => w.length > 2);
    const hay = (e) => [e.h, e.dek, e.cat, e.place, (e.brief || []).join(" ")].join(" ").toLowerCase();
    let best = null, top = 0;
    const head = (e) => [e.h, e.cat].join(" ").toLowerCase();
    CF.events.forEach((e, i) => { const s = terms.reduce((a, w) => a + (head(e).includes(w) ? 3 : hay(e).includes(w) ? 1 : 0), 0) - i * 0.01; if (s > top) { top = s; best = e; } });
    const e = best || CF.events[0];
    return { text: e.h + (/[?!]$/.test(e.h) ? " " : ". ") + e.dek + (e.brief && e.brief.length ? " In brief: " + e.brief.slice(0, 2).join("; ") + "." : ""), act: ["Read the story in the Coalitions Tracker", trackerOpen(e)] };
  }

  // turn a question into an answer from the data
  function answer(text) {
    const raw = text.toLowerCase().trim();
    const q = raw.replace(/[?.!,]/g, " ").replace(STOP, " ").replace(/\s+/g, " ").trim();
    const wantsMayor = /\bmayor/.test(raw);
    // a party on its own: national share
    const pk = ALIAS[q] || ALIAS[(Object.keys(ALIAS).find((a) => new RegExp("(^| )" + a + "( |$)").test(q) && q.replace(a, "").trim().split(" ").every((w) => /^(do|did|go|went|perform|performed|get|got|national|nationally)$/.test(w))) || "")];
    if (pk && PARTY[pk]) return { text: `${pk === "ASA" ? "" : "The "}${PARTY[pk][0]} won ${PARTY[pk][1].toFixed(2)}% of the national PR vote in the 2026 local elections.`, act: ["See national results", () => { if (onHome && window.RS) window.RS.national(); else location.href = "index.html"; }] };
    const tr = trackerAnswer(raw, q.replace(/\b(has|have|been|are|were|do|doing)\b/g, " ").replace(/\s+/g, " ").trim());
    if (tr) return tr;
    if (/^(national|south africa|overall|sa)$/.test(q) || (!q && /who won/.test(raw))) return { text: "Nationally, the ANC won 30.76% of the PR vote and the DA 24.64%, followed by MK on 9.77%. No party won a national majority; councils are decided one by one.", act: ["See national results", () => { if (onHome && window.RS) window.RS.national(); else location.href = "index.html"; }] };
    if (!q) return { text: "Ask about a municipality, province, party, mayor or the coalition talks, for example “Who won Polokwane?” or “What did Clement Manyathela say?”." };
    if (wantsMayor) {
      const city = find(q, ["Metro"])[0];
      if (city) {
        const code = city[1].P.id, h = DATA.hist.find((c) => c.code === code), cur = h && h.list.find((m) => m.cur);
        const t = NEWMAYOR[code] || (cur ? `The new council has not yet elected a mayor. ${cur.n} (${PNAME[cur.p] || cur.p}) stays in office until it does.` : "The new council has not yet elected a mayor.");
        return { text: t, act: ["See all mayors of " + (h ? h.city : city[1].label), () => { location.href = "mayors.html#" + (h ? h.slug : ""); }] };
      }
    }
    const person = find(q, ["Mayor"])[0];
    const place = find(q, ["Province", "Metro", "Municipality"])[0];
    if (person && (!place || person[0] < place[0])) {
      const { m, c } = person[1];
      return { text: `${m.n} (${PNAME[m.p] || m.p}) was Mayor of ${c.city}, ${m.y}.${m.end ? " " + m.end[1] + "." : ""}`, act: ["See mayors of " + c.city, () => { location.href = "mayors.html#" + c.slug; }] };
    }
    if (place) {
      const it = place[1];
      if (it.kind === "Province") return { text: provLine(it.code, it.label), act: ["Show " + it.label + " on the map", () => goProv(it.code)] };
      return { text: councilLine(it.P), act: ["Open " + it.P.name + " results", () => goCouncil(it.P.id)] };
    }
    return { text: `I couldn’t find “${text.trim()}”. Try a municipality, province, party or mayor, for example “Who won eThekwini?”.` };
  }

  function bubble(cls, html) { const d = document.createElement("div"); d.className = "ask-msg " + cls; d.innerHTML = html; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; }
  function send(text) {
    if (!text.trim()) return;
    thread.hidden = false; sug.hidden = true;
    bubble("me", esc(text));
    load().then(() => {
      const a = answer(text);
      const d = bubble("bot", `<p>${esc(a.text)}</p>${a.act ? `<button type="button" class="ask-act">${esc(a.act[0])} ›</button>` : ""}`);
      if (a.act) d.querySelector(".ask-act").onclick = a.act[1];
    });
    input.value = "";
  }
  form.addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });
  input.addEventListener("focus", load);
  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().replace(/[?.!,]/g, " ").replace(STOP, " ").replace(/\s+/g, " ").trim();
    if (!DATA || q.length < 2) { sug.hidden = true; return; }
    const top = find(q).slice(0, 5).map(([, it]) => it);
    sug.hidden = !top.length;
    sug.innerHTML = top.map((it, i) => `<li role="option" data-i="${i}"><b>${esc(it.label)}</b><span>${esc(it.kind)}${it.sub ? " · " + esc(it.sub) : ""}</span></li>`).join("");
    sug.querySelectorAll("li").forEach((li) => li.onclick = () => { const it = top[+li.dataset.i]; send(it.kind === "Voice" || it.kind === "Key player" ? "What did " + it.label + " say?" : it.kind === "Mayor" ? it.label : (/mayor/i.test(input.value) ? "Mayor of " : "Who won ") + it.label.replace(/^City of /, "")); });
  });
  wrap.querySelector(".ask-x").onclick = () => { thread.hidden = true; msgs.innerHTML = ""; };
  document.addEventListener("keydown", (e) => { if (e.key === "/" && document.activeElement !== input && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); } if (e.key === "Escape") sug.hidden = true; });
})();

// Typewriter hints inside the ask bar: types out example questions, deletes them, moves on.
(function () {
  "use strict";
  const input = document.querySelector(".ask-in"); if (!input) return;
  const EX = [
    "Who won City of Johannesburg?", "Who is the mayor of Cape Town?", "Who won eThekwini?", "How did the ANC do?",
    "Who won Gauteng?", "Who won Polokwane?", "Who was Patricia de Lille?", "Who won Nelson Mandela Bay?",
    "Mayor of Tshwane", "How many seats did the DA win in Ekurhuleni?", "Who won KwaZulu-Natal?", "Who won Stellenbosch?",
    "What did Clement Manyathela say?", "What is Julius Malema saying about coalitions?", "Coalition talks in Johannesburg", "What did MacG say?"
  ];
  const BASE = "Ask about the 2026 results…";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { input.placeholder = "Ask about the 2026 results… e.g. " + EX[0]; return; }
  let i = 0, j = 0, dir = 1, wait = 0;
  const busy = () => document.activeElement === input || input.value;
  setInterval(() => {
    if (busy()) { input.placeholder = BASE; return; }
    if (wait > 0) { wait--; return; }
    const s = EX[i];
    j += dir;
    input.placeholder = s.slice(0, j) + (j % 2 ? "▍" : "");
    if (dir === 1 && j >= s.length) { input.placeholder = s; dir = -1; wait = 28; }       // hold the full question ~2.2s
    else if (dir === -1 && j <= 0) { dir = 1; i = (i + 1) % EX.length; wait = 6; }         // short pause, next example
  }, 75);
})();

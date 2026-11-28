// A phone-style notification above the ask bar, rotating every 5 seconds: the six most recently updated
// Coalitions Tracker stories, newest first (home page; Coalitions page on phones only).
// The cards are rebuilt every hour (and whenever the tracker refreshes its data), so a page left open shows new pieces.
(function () {
  "use strict";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = (d) => { const [, m, dd] = d.split("-").map(Number); return `${dd} ${MON[m - 1]}`; };
  const onCo = !!document.querySelector(".pl"); // the Coalitions page
  const phone = window.matchMedia("(max-width: 720px)").matches;
  if (onCo && !phone) return;
  let closed = false; try { closed = sessionStorage.getItem("nt-closed") === "1"; } catch (e) {}
  if (closed) return;

  // one card per story: the six most recently updated Coalitions Tracker stories, newest first. A story's date is its
  // newest report or piece; on the same day, the story with more reports that day goes first. Rebuilt whenever the
  // data refreshes, so the cards always follow the latest stories.
  const TOP = 6;
  function build(D) {
    const byId = new Map(D.items.map((i) => [i.id, i]));
    const cards = D.events.map((e) => {
      const its = (e.items || []).map((id) => byId.get(id)).filter(Boolean);
      const dates = its.map((i) => i.d).concat((e.coverage || []).map((c) => c.d)).filter(Boolean).sort();
      const upd = dates[dates.length - 1]; if (!upd || !e.h) return null;
      const that = dates.filter((d) => d === upd).length;
      // the face on the card: whoever wrote the story's newest piece (with a photo)
      const lead = its.filter((i) => D.journalists[i.j] && D.journalists[i.j].img).sort((a, b) => b.d.localeCompare(a.d))[0];
      return { k: e.id, e, upd, that, p: lead ? D.journalists[lead.j] : null, href: "coalitions.html#" + e.id };
    }).filter(Boolean);
    cards.sort((a, b) => b.upd.localeCompare(a.upd) || b.that - a.that);
    return cards.slice(0, TOP);
  }

  function start(ask, D) {
    const cards = build(D);
    if (!cards.length) return;
    const box = document.createElement("div");
    box.className = "nt"; box.setAttribute("aria-live", "polite");
    ask.insertBefore(box, ask.firstChild);
    let i = 0, timer = null, paused = false;
    const html = (c) => `
      <a class="nt-card" href="${c.href}" data-k="${c.k}">
        ${c.p ? `<img class="nt-ph" src="${c.p.img}" alt="">` : `<img class="nt-ph nt-ph-ic" src="assets/news-tracker-icon.svg" alt="">`}
        <span class="nt-t">
          <span class="nt-top"><b>${esc(c.e.cat || "Coalitions")}</b><span>${esc(c.e.place || "")}</span><time>${day(c.upd)}</time></span>
          <span class="nt-h">${esc(c.e.h)}</span>
          <span class="nt-s">${esc(c.e.dek || "")}</span>
        </span>
      </a>
      <span class="nt-app">Coalitions Tracker · latest stories</span>
      <button type="button" class="nt-x" aria-label="Hide these updates">×</button>`;
    const show = () => {
      const old = box.querySelector(".nt-in");
      const el = document.createElement("div"); el.className = "nt-in"; el.innerHTML = html(cards[i]);
      box.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on")));
      if (old) { old.classList.remove("on"); old.classList.add("out"); setTimeout(() => old.remove(), 450); }
      el.querySelector(".nt-x").onclick = (e) => { e.preventDefault(); box.remove(); clearInterval(timer); try { sessionStorage.setItem("nt-closed", "1"); } catch (er) {} };
      i = (i + 1) % cards.length;
    };
    show();
    // on the Coalitions page: a tap opens that story in place
    if (onCo) box.addEventListener("click", (e) => {
      const card = e.target.closest(".nt-card"); if (!card) return;
      e.preventDefault(); location.hash = card.dataset.k; window.scrollTo({ top: 0 });
    });
    // phones: tuck the card away while scrolling down, bring it back on scroll up or near the top
    let lastY = window.scrollY;
    addEventListener("scroll", () => { const y = window.scrollY; if (window.innerWidth <= 720) box.classList.toggle("nt-hide", y > lastY + 4 && y > 200 ? true : y < lastY - 4 || y < 200 ? false : box.classList.contains("nt-hide")); lastY = y; }, { passive: true });
    timer = setInterval(() => { if (!paused && !document.hidden) show(); }, 5000);
    // new data: swap in the new cards and start again from the newest piece
    const swap = (d) => { const next = build(d); if (!next.length || !box.isConnected) return; const was = JSON.stringify(cards.map((c) => c.k + c.upd)); cards.splice(0, cards.length, ...next); if (JSON.stringify(next.map((c) => c.k + c.upd)) !== was) { i = 0; show(); } };
    document.addEventListener("pl-data", (e) => swap(e.detail)); // the Coalitions page refreshed
    if (!onCo) setInterval(() => { if (!document.hidden) load().then(swap).catch(() => {}); }, 36e5); // elsewhere: check hourly
    box.addEventListener("mouseenter", () => paused = true);
    box.addEventListener("mouseleave", () => paused = false);
    box.addEventListener("focusin", () => paused = true);
    box.addEventListener("focusout", () => paused = false);
  }

  const wait = (n) => { const ask = document.querySelector(".ask"); if (ask) return Promise.resolve(ask); return n > 0 ? new Promise((r) => setTimeout(r, 100)).then(() => wait(n - 1)) : Promise.reject(); };
  const load = () => window.PreambleFeed ? PreambleFeed.load() : fetch("data/coalition-feed.json", { cache: "no-cache" }).then((r) => r.json());
  Promise.all([wait(50), load()]).then(([ask, D]) => start(ask, D)).catch(() => {});
})();

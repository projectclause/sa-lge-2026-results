// A phone-style notification above the ask bar, rotating every 5 seconds (from the Coalitions Tracker).
// Home page: what MacG, Sol Phenduka, Clement Manyathela, Adriaan Basson, Sizwe Mpofu-Walsh, Alec Hogg, Prince Mashele and Samkele Maseko (SABC) are saying.
// Coalitions page, phones only: the latest piece from each "Wide Reach" voice, plus Samkele Maseko.
// The cards are rebuilt every hour (and whenever the tracker refreshes its data), so a page left open shows new pieces.
(function () {
  "use strict";
  const WHO = ["macg", "sol", "clement", "adriaan", "sizwe", "hogg", "mashele", "maseko"];
  const CO_EXTRA = ["maseko"]; // voices carded on the Coalitions page besides the Wide Reach ones
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = (d) => { const [, m, dd] = d.split("-").map(Number); return `${dd} ${MON[m - 1]}`; };
  const onCo = !!document.querySelector(".pl"); // the Coalitions page
  const phone = window.matchMedia("(max-width: 720px)").matches;
  if (onCo && !phone) return;
  let closed = false; try { closed = sessionStorage.getItem("nt-closed") === "1"; } catch (e) {}
  if (closed) return;

  // one card per person: their newest piece, newest first
  function build(D) {
    const who = onCo ? Object.keys(D.journalists).filter((k) => D.journalists[k].wide || CO_EXTRA.includes(k)) : WHO;
    const cards = who.map((k) => {
      const p = D.journalists[k]; if (!p) return null;
      // newest date; on the same day, the piece added last (pieces are listed in the order they were added)
      const it = D.items.filter((i) => i.j === k).reduce((a, b) => (!a || b.d >= a.d ? b : a), null); if (!it) return null;
      const ev = D.events.find((e) => e.items.includes(it.id));
      // phones: a tap just opens the Coalitions page; larger screens go straight to the story
      return { k, p, it, href: "coalitions.html" + (!phone && ev ? "#" + ev.id : "") };
    }).filter(Boolean);
    cards.sort((a, b) => b.it.d.localeCompare(a.it.d)); // newest first, so fresh pieces lead
    // co-hosts appear back to back (Sol Phenduka right after MacG)
    cards.slice().forEach((c) => { const t = c.p.after; if (!t) return; const ti = cards.findIndex((x) => x.k === t); if (ti < 0) return; cards.splice(cards.indexOf(c), 1); cards.splice(cards.findIndex((x) => x.k === t) + 1, 0, c); });
    return cards;
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
        <img class="nt-ph" src="${c.p.img}" alt="">
        <span class="nt-t">
          <span class="nt-top"><b>${esc(c.p.n)}</b>${onCo && c.p.wide ? '<i class="nt-wide" title="Wide Reach">★</i>' : ""}<span>${esc(c.p.role || c.p.o)}</span><time>${day(c.it.d)}</time></span>
          <span class="nt-h">${esc(c.it.h)}</span>
          <span class="nt-s">${esc(c.it.s)}</span>
        </span>
      </a>
      <span class="nt-app">${onCo ? (c.p.wide ? "Wide Reach voices" : c.p.pb ? "Public Broadcaster" : "Voices") : "Coalitions Tracker"}</span>
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
    // on the Coalitions page (phones): a tap opens that voice's stories under their name in the Voices list
    if (onCo) box.addEventListener("click", (e) => {
      const card = e.target.closest(".nt-card"); if (!card) return;
      e.preventDefault();
      const go = () => {
        const b = document.querySelector(`.pl-voice[data-k="${card.dataset.k}"]`); if (!b) return;
        if (b.getAttribute("aria-expanded") !== "true") b.click();
        window.scrollTo({ top: b.getBoundingClientRect().top + window.scrollY - 194, behavior: "smooth" }); // clear the pinned strip and navigation
      };
      if (location.hash.length > 1) { addEventListener("hashchange", () => setTimeout(go, 80), { once: true }); location.hash = ""; } else go(); // from a story, return to the front page first
    });
    // phones: tuck the card away while scrolling down, bring it back on scroll up or near the top
    let lastY = window.scrollY;
    addEventListener("scroll", () => { const y = window.scrollY; if (window.innerWidth <= 720) box.classList.toggle("nt-hide", y > lastY + 4 && y > 200 ? true : y < lastY - 4 || y < 200 ? false : box.classList.contains("nt-hide")); lastY = y; }, { passive: true });
    timer = setInterval(() => { if (!paused && !document.hidden) show(); }, 5000);
    // new data: swap in the new cards and start again from the newest piece
    const swap = (d) => { const next = build(d); if (!next.length || !box.isConnected) return; const was = JSON.stringify(cards.map((c) => c.it.id)); cards.splice(0, cards.length, ...next); if (JSON.stringify(next.map((c) => c.it.id)) !== was) { i = 0; show(); } };
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

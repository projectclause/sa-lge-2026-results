// Home page: a phone-style notification above the ask bar, rotating every 3 seconds through
// what MacG, Clement Manyathela, Adriaan Basson, Sizwe Mpofu-Walsh and Alec Hogg are saying (from the Coalitions Tracker).
(function () {
  "use strict";
  const WHO = ["macg", "clement", "adriaan", "sizwe", "hogg", "mashele"];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = (d) => { const [, m, dd] = d.split("-").map(Number); return `${dd} ${MON[m - 1]}`; };
  let closed = false; try { closed = sessionStorage.getItem("nt-closed") === "1"; } catch (e) {}
  if (closed) return;

  function start(ask, D) {
    const cards = WHO.map((k) => {
      const p = D.journalists[k]; if (!p) return null;
      const it = D.items.filter((i) => i.j === k).sort((a, b) => b.d.localeCompare(a.d))[0]; if (!it) return null;
      const ev = D.events.find((e) => e.items.includes(it.id));
      return { p, it, href: "coalitions.html" + (ev ? "#" + ev.id : "") };
    }).filter(Boolean);
    if (!cards.length) return;
    const box = document.createElement("div");
    box.className = "nt"; box.setAttribute("aria-live", "polite");
    ask.insertBefore(box, ask.firstChild);
    let i = 0, timer = null, paused = false;
    const html = (c) => `
      <a class="nt-card" href="${c.href}">
        <img class="nt-ph" src="${c.p.img}" alt="">
        <span class="nt-t">
          <span class="nt-top"><b>${esc(c.p.n)}</b><span>${esc(c.p.role || c.p.o)}</span><time>${day(c.it.d)}</time></span>
          <span class="nt-h">${esc(c.it.h)}</span>
          <span class="nt-s">${esc(c.it.s)}</span>
        </span>
      </a>
      <span class="nt-app">Coalitions Tracker</span>
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
    // phones: tuck the card away while scrolling down, bring it back on scroll up or near the top
    let lastY = window.scrollY;
    addEventListener("scroll", () => { const y = window.scrollY; if (window.innerWidth <= 720) box.classList.toggle("nt-hide", y > lastY + 4 && y > 200 ? true : y < lastY - 4 || y < 200 ? false : box.classList.contains("nt-hide")); lastY = y; }, { passive: true });
    timer = setInterval(() => { if (!paused && !document.hidden) show(); }, 3000);
    box.addEventListener("mouseenter", () => paused = true);
    box.addEventListener("mouseleave", () => paused = false);
    box.addEventListener("focusin", () => paused = true);
    box.addEventListener("focusout", () => paused = false);
  }

  const wait = (n) => { const ask = document.querySelector(".ask"); if (ask) return Promise.resolve(ask); return n > 0 ? new Promise((r) => setTimeout(r, 100)).then(() => wait(n - 1)) : Promise.reject(); };
  Promise.all([wait(50), fetch("data/coalition-feed.json").then((r) => r.json())]).then(([ask, D]) => start(ask, D)).catch(() => {});
})();

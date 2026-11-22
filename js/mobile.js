// Phone layout tweaks (NYT-style: topline first, short lists with "show all", swipe strips open at the latest item).
(function () {
  "use strict";
  const mq = window.matchMedia("(max-width: 720px)");

  // Home: on phones the "Final results" block leads, in its own card above National results
  const fin = document.querySelector(".rs-final"), nat = document.querySelector(".rs-nat");
  if (fin && nat) {
    const home = fin.parentNode, next = fin.nextSibling;
    const card = document.createElement("section");
    card.className = "rs-card rs-finalcard"; card.setAttribute("aria-label", "Final results");
    const place = () => {
      if (mq.matches && fin.parentNode !== card) { nat.parentNode.insertBefore(card, nat); card.appendChild(fin); }
      else if (!mq.matches && fin.parentNode === card) { home.insertBefore(fin, next); card.remove(); }
    };
    place(); mq.addEventListener("change", place);
  }

  // Home: national results show the top five parties on phones, with a button for the rest
  const parties = document.querySelector(".rs-parties");
  if (parties && nat) {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "rs-allp";
    parties.after(btn);
    const sync = () => {
      const rows = parties.querySelectorAll(":scope > .rs-party").length;
      btn.hidden = rows <= 5;
      btn.textContent = nat.classList.contains("rs-open") ? "Show fewer parties" : "Show all parties";
    };
    btn.onclick = () => { nat.classList.toggle("rs-open"); sync(); };
    new MutationObserver(sync).observe(parties, { childList: true }); sync();
  }

  // Mayors: the timeline swipes sideways on phones, so open it at the most recent mayor and say so
  const city = document.querySelector(".my-city");
  if (city) {
    const fix = () => {
      const tl = city.querySelector(".my-tl"); if (!tl || tl.dataset.m) return;
      tl.dataset.m = "1";
      const hint = document.createElement("p"); hint.className = "my-tl-hint"; hint.textContent = "Swipe to see earlier mayors ←";
      tl.before(hint);
      if (mq.matches) requestAnimationFrame(() => { tl.scrollLeft = tl.scrollWidth; });
    };
    new MutationObserver(fix).observe(city, { childList: true, subtree: true }); fix();
  }
})();

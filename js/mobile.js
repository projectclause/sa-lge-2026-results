// Phone layout tweaks (NYT-style: topline first, short lists with "show all", swipe strips open at the latest item).
(function () {
  "use strict";
  const mq = window.matchMedia("(max-width: 720px)");

  const nat = document.querySelector(".rs-nat");

  // Home: on phones the map card leads the page, above National results. The "Final results" block (party totals
  // and share bar) stays inside that card, so the results and the map read as one card.
  const map = document.querySelector(".rs-mapcard");
  if (map && nat) {
    const mapHome = map.parentNode, mapNext = map.nextSibling;
    const placeMap = () => {
      if (mq.matches && map.nextElementSibling !== nat) nat.parentNode.insertBefore(map, nat);
      else if (!mq.matches && map.nextSibling !== mapNext) mapHome.insertBefore(map, mapNext);
    };
    placeMap(); mq.addEventListener("change", placeMap);
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

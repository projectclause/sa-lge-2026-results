// LIVE line: "Last updated" time and a 60-second countdown. At zero it re-checks the results files;
// if they have changed the page reloads with the new results, otherwise the time is updated and the count restarts.
// On the Coalitions Tracker the tracker's own data files are checked too, but a change there does not reload the page:
// it tells js/coalitions.js to redraw in place ("pl-feed-changed"), so the reader keeps their place and selections.
(function () {
  "use strict";
  const el = document.querySelector(".live"); if (!el) return;
  const tEl = el.querySelector(".live-time"), nEl = el.querySelector(".live-n");
  const FILES = ["data/wards-final-2026.json", "data/municipalities.geojson", "data/metro-pr-2026.json"];
  const FEEDS = document.querySelector(".pl") ? ["data/coalition-feed.json", "data/coalition-auto.json"] : [];
  const stamp = () => {
    const d = new Date();
    const t = d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg", hour12: false });
    tEl.textContent = t + " SAST"; tEl.dateTime = d.toISOString();
  };
  // ask the server whether each file changed (a HEAD request: headers only, no download)
  const check = (files = FILES) => Promise.all(files.map((f) => fetch(f, { method: "HEAD", cache: "no-store" }).then((r) => r.ok ? [r.headers.get("etag"), r.headers.get("last-modified"), r.headers.get("content-length")].join("~") : "").catch(() => ""))).then((a) => a.join("|"));
  let base = null; check().then((s) => { base = s; });
  let feedBase = null; if (FEEDS.length) check(FEEDS).then((s) => { feedBase = s; });
  stamp();
  let n = 60;
  setInterval(async () => {
    n -= 1;
    document.dispatchEvent(new CustomEvent("live-count", { detail: Math.max(0, n) }));
    if (n > 0) { nEl.textContent = n; return; }
    nEl.textContent = 0;
    const now = await check();
    if (base && now && now !== base) { location.reload(); return; }
    if (FEEDS.length) { const f = await check(FEEDS); if (feedBase && f && f !== feedBase) document.dispatchEvent(new CustomEvent("pl-feed-changed")); if (f) feedBase = f; }
    stamp(); n = 60; nEl.textContent = n;
    document.dispatchEvent(new CustomEvent("live-tick"));
  }, 1000);
})();

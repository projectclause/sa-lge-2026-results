// Loads the Coalitions Tracker data: data/coalition-feed.json (written by hand) joined with
// data/coalition-auto.json (written every hour by tools/auto-update.rb: new pieces, new coverage, new stories).
// The same join as tools/feed.rb, so the live page and the static story pages agree. Anything already in the
// hand-written feed wins: a piece or report whose link is already there is skipped, and an hourly story whose
// id the editor reuses gives way to the editor's version.
// Use: PreambleFeed.load().then((D) => …)   (always fetches fresh copies, so it can be called again to refresh)
(function () {
  "use strict";
  function merge(d, a) {
    if (!a || typeof a !== "object") return d;
    const urls = new Set(), idOfUrl = {}, alias = {};
    d.items.forEach((i) => { urls.add(i.url); idOfUrl[i.url] = i.id; });
    d.events.forEach((e) => (e.coverage || []).forEach((c) => urls.add(c.url)));
    const ids = new Set(d.items.map((i) => i.id));
    (a.items || []).forEach((i) => {
      if (idOfUrl[i.url]) { alias[i.id] = idOfUrl[i.url]; return; }
      if (ids.has(i.id) || !d.journalists[i.j]) return;
      d.items.push(i); ids.add(i.id); urls.add(i.url);
    });
    const real = (id) => alias[id] || id;
    const evs = {}; d.events.forEach((e) => evs[e.id] = e);
    Object.entries(a.attach || {}).forEach(([eid, list]) => {
      const e = evs[eid]; if (!e) return;
      list.map(real).forEach((id) => { if (ids.has(id) && !e.items.includes(id)) e.items.push(id); });
    });
    Object.entries(a.coverage || {}).forEach(([eid, list]) => {
      const e = evs[eid]; if (!e) return;
      e.coverage = e.coverage || [];
      list.forEach((c) => { if (urls.has(c.url)) return; e.coverage.push(c); urls.add(c.url); });
    });
    (a.events || []).forEach((x) => {
      if (evs[x.id]) return;
      const e = Object.assign({ brief: [], sec: [], voices: {} }, x);
      e.items = [...new Set((x.items || []).map(real).filter((id) => ids.has(id)))];
      e.coverage = (x.coverage || []).filter((c) => !urls.has(c.url));
      e.coverage.forEach((c) => urls.add(c.url));
      if (!e.items.length && !e.coverage.length) return;
      d.events.push(e); evs[e.id] = e;
    });
    const ae = a.edition;
    if (ae && ae.date && (ae.date + " " + (ae.time || "")) > (d.edition.date + " " + (d.edition.time || ""))) d.edition = ae;
    return d;
  }
  const get = (f) => fetch(f, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(f + " " + r.status); return r.json(); });
  const load = () => Promise.all([get("data/coalition-feed.json"), get("data/coalition-auto.json").catch(() => null)]).then(([d, a]) => merge(d, a));
  window.PreambleFeed = { load, merge };
})();

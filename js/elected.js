// Mayors confirmed elected: tools/mayor-watch.rb checks the news hourly and writes data/mayors-elected.json when at
// least two outlets report a mayor elected. The home page headline, the ticker card, the Mayors page and search read it
// from here and switch by themselves ("mayors-elected" event), so no one has to edit the page on the day.
(function () {
  "use strict";
  window.ELECTED = {};
  window.ELECTED_READY = fetch("data/mayors-elected.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {})).catch(() => ({}))
    .then((d) => { window.ELECTED = d || {}; document.dispatchEvent(new CustomEvent("mayors-elected", { detail: window.ELECTED })); return window.ELECTED; });
  // the wording each page uses once a mayor is in (Johannesburg only for now)
  window.ELECTED_TEXT = {
    JHB: (e) => ({
      breaking: ["Mashaba Makes History", "Elected Mayor of Johannesburg",
        `ActionSA’s Herman Mashaba was elected Mayor of Johannesburg by the new council on ${e.when || "Friday"}. <a href="coalitions.html#johannesburg">Follow it in the Coalitions Tracker →</a>`],
      headline: ["Herman Mashaba", "elected Mayor of Johannesburg", `ActionSA’s Herman Mashaba was elected Mayor of Johannesburg by the new council on ${e.when || "Friday"}.`],
      card: "Elected Mayor of Johannesburg",
      mayors: { n: "Herman Mashaba", p: "ASA", img: "assets/mayors/johannesburg/herman-mashaba.jpg", how: `Elected by the new council on ${e.when || "Friday, 27 November 2026"}. He was first mayor of Johannesburg from 2016 to 2019.` },
      search: `Herman Mashaba (ActionSA) was elected Mayor of Johannesburg by the new council on ${e.when || "Friday, 27 November 2026"}.`
    })
  };
})();

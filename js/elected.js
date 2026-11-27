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
        `Herman Mashaba was elected Mayor of Johannesburg on ${e.when || "Friday, 27 November 2026"}, seven years after he resigned. He first led the city for the DA from August 2016 to November 2019, and returns as leader of ActionSA, the party he founded after leaving, under a coalition deal that puts the DA, which won the most votes, in opposition. Johannesburg has had seven mayors, and an acting mayor, since he left. <a href="coalitions.html#johannesburg">Follow it in the Coalitions Tracker →</a>`],
      headline: ["Herman Mashaba", "elected Mayor of Johannesburg", `Herman Mashaba returns as Mayor of Johannesburg, elected on ${e.when || "Friday"}. He first led the city for the DA from 2016 to 2019 and now leads ActionSA.`],
      card: "Elected Mayor of Johannesburg",
      mayors: { n: "Herman Mashaba", p: "ASA", img: "assets/mayors/johannesburg/herman-mashaba.jpg", how: `Elected by the new council on ${e.when || "Friday, 27 November 2026"}. A comeback: he was mayor for the DA from August 2016 until he resigned in November 2019, then founded ActionSA. He returns under a coalition deal that puts the DA, which won the most votes, in opposition. Johannesburg has had seven mayors, and an acting mayor, since he left.` },
      search: `Herman Mashaba (ActionSA) was elected Mayor of Johannesburg by the new council on ${e.when || "Friday, 27 November 2026"}, returning seven years after he resigned as the DA’s mayor in 2019.`
    })
  };
})();

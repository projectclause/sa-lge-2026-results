// SAFFA: Key South Africans abroad, laid out like the Voices on the Coalitions Tracker: a face, what they do and how many
// articles named them in the past week; pick one to see their latest coverage. People come from data/saffa-key.json and
// their articles from data/saffa-key-news.json (written hourly by tools/saffa-news.rb from Google News RSS).
(function () {
  const box = document.querySelector(".sf-key-people");
  if (!box) return;
  const grid = box.querySelector(".sf-kp-grid"), pills = box.querySelector(".sf-kp-pills");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ago = (t) => {
    const m = Math.round((Date.now() - new Date(t)) / 60000);
    if (!(m >= 0)) return "";
    if (m < 60) return m <= 1 ? "just now" : m + " min ago";
    const h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago");
    const d = Math.round(h / 24); if (d < 7) return d === 1 ? "yesterday" : d + " days ago";
    const old = Date.now() - new Date(t) > 300 * 864e5; // more than about a year back: say which year
    return new Date(t).toLocaleDateString("en-ZA", old ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
  };
  const face = (p) => p.img ? `<img src="${esc(p.img)}" alt="">` : `<i class="pl-av" aria-hidden="true">${esc(p.n.split(/\s+/).map((w) => w[0]).slice(0, 2).join(""))}</i>`;
  const CN = { us: "United States", gb: "United Kingdom", es: "Spain", ch: "Switzerland", za: "South Africa", nl: "Netherlands", de: "Germany", fr: "France", ae: "United Arab Emirates", au: "Australia", ca: "Canada" };
  const REG = ["North America", "Europe", "Australia & Oceania", "Middle East & Asia", "Africa", "South America"];
  const phone = window.matchMedia("(max-width: 720px)");

  Promise.all([fetch("data/saffa-key.json").then((r) => r.json()), fetch("data/saffa-key-news.json").then((r) => r.json()).catch(() => ({ people: {}, week: {} }))])
    .then(([P, N]) => {
      const arts = (p) => ((N.people || {})[p.id] || []).map((a) => ({ ...a, p }));
      const week = (p) => (N.week || {})[p.id] ?? arts(p).length;
      const by = Object.fromEntries(P.map((p) => [p.id, p]));
      const piece = (a, named) => `<li><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.h)}</a><span>${named ? `<b>${esc(a.p.n)}</b> · ` : ""}${esc(a.src)}${a.t ? " · " + esc(ago(a.t)) : ""}</span></li>`;
      let reg = REG[0], who = null;

      const draw = () => {
        pills.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", b.dataset.reg === reg));
        const ps = P.filter((p) => p.region === reg).sort((a, b) => week(b) - week(a));
        if (!ps.length) { grid.innerHTML = `<p class="sf-kp-empty">No one from this region yet.</p>`; return; }
        if (who && !ps.includes(by[who])) who = null;
        const feed = (who ? arts(by[who]) : ps.flatMap(arts)).sort((a, b) => (b.t || "").localeCompare(a.t || ""));
        grid.innerHTML = `<div class="pl-voices">${ps.map((p) => `<button type="button" class="pl-voice" data-k="${esc(p.id)}" aria-pressed="${who === p.id}" aria-expanded="false">${face(p)}<span><b class="pl-nm">${esc(p.n)}${p.cc ? `<img class="pl-vflag sf-kp-flag" src="assets/flags/${esc(p.cc)}.png" alt="${esc(CN[p.cc] || "")}" title="Lives in ${esc(p.lives)}">` : ""}</b><span>${esc(p.role)}</span>${p.born ? `<i class="sf-kp-born">Born in ${esc(p.born.split(";")[0].trim())}</i>` : ""}${arts(p)[0] && arts(p)[0].t ? `<i class="sf-kp-last">Latest ${esc(ago(arts(p)[0].t))}</i>` : ""}</span><em title="Articles naming ${esc(p.n)} in the past 7 days">${week(p)}</em></button>`).join("")}</div>
          <p class="sf-kp-lbl">Latest${who ? ` <span>· ${esc(by[who].n)}</span>` : ""}</p>
          ${feed.length ? `<ol class="sf-kp-list">${feed.map((a) => piece(a, !who)).join("")}</ol>` : `<p class="sf-kp-none">No news coverage found.</p>`}
          ${ps.some((p) => p.credit && p.img) ? `<p class="sf-kp-credit">Photos: ${ps.filter((p) => p.credit && p.img).map((p) => `${esc(p.n)}, ${esc(p.credit)}`).join("; ")}.</p>` : ""}`;
      };

      pills.innerHTML = REG.map((r) => `<button type="button" role="tab" data-reg="${esc(r)}" aria-selected="false">${esc(r)} <small>${P.filter((p) => p.region === r).length}</small></button>`).join("");
      pills.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; reg = b.dataset.reg; who = null; draw(); b.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); });
      grid.addEventListener("click", (e) => {
        const b = e.target.closest(".pl-voice"); if (!b) return;
        const k = b.dataset.k;
        if (phone.matches) { // phones: open this person's articles right under their card, one at a time
          const open = b.getAttribute("aria-expanded") !== "true";
          grid.querySelectorAll(".sf-kp-vlist").forEach((l) => l.remove());
          grid.querySelectorAll(".pl-voice").forEach((x) => { x.setAttribute("aria-expanded", open && x === b); x.setAttribute("aria-pressed", open && x === b); });
          if (open) b.insertAdjacentHTML("afterend", arts(by[k]).length ? `<ol class="sf-kp-list sf-kp-vlist">${arts(by[k]).map((a) => piece(a, false)).join("")}</ol>` : `<p class="sf-kp-none">No news coverage found.</p>`);
          return;
        }
        who = who === k ? null : k; draw();
      });
      draw();
    })
    .catch(() => { box.hidden = true; });
})();

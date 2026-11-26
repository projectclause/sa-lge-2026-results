// SAFFA: Key South Africans abroad. People from data/saffa-key.json, each with their latest three articles from
// data/saffa-key-news.json (written hourly by tools/saffa-news.rb from Google News RSS).
(function () {
  const grid = document.querySelector(".sf-kp-grid");
  if (!grid) return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ago = (t) => {
    const m = Math.round((Date.now() - new Date(t)) / 60000);
    if (!(m >= 0)) return "";
    if (m < 60) return m <= 1 ? "just now" : m + " min ago";
    const h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago");
    const d = Math.round(h / 24); if (d < 7) return d === 1 ? "yesterday" : d + " days ago";
    return new Date(t).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  };
  const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("");
  Promise.all([fetch("data/saffa-key.json").then((r) => r.json()), fetch("data/saffa-key-news.json").then((r) => r.json()).catch(() => ({ people: {} }))])
    .then(([P, N]) => {
      const REG = ["North America", "Europe", "Australia & Oceania", "Middle East & Asia", "Africa", "South America"];
      const pills = document.querySelector(".sf-kp-pills");
      const show = (reg) => {
        pills.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", b.dataset.reg === reg));
        let any = false;
        grid.querySelectorAll(".sf-kp").forEach((k) => { const on = k.dataset.reg === reg; k.hidden = !on; any = any || on; });
        grid.querySelector(".sf-kp-empty").hidden = any;
      };
      pills.innerHTML = REG.map((r) => `<button type="button" role="tab" data-reg="${esc(r)}" aria-selected="false">${esc(r)} <small>${P.filter((p) => p.region === r).length}</small></button>`).join("");
      pills.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; show(b.dataset.reg); b.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); });
      grid.innerHTML = `<p class="sf-kp-empty" hidden>No one from this region yet.</p>` + P.map((p) => {
        const arts = (N.people && N.people[p.id]) || [];
        const face = p.img ? `<img src="${esc(p.img)}" alt="" width="72" height="72" loading="lazy">` : `<span class="sf-kp-ini" aria-hidden="true">${esc(initials(p.n))}</span>`;
        return `<article class="sf-kp" data-reg="${esc(p.region)}">
          <header class="sf-kp-top">${face}<div><h3>${esc(p.n)}</h3><p class="sf-kp-role">${esc(p.role)}</p><p class="sf-kp-from">Born in ${esc(p.born)} · lives in ${esc(p.lives)}</p></div></header>
          <p class="sf-kp-lbl">Latest</p>
          ${arts.length ? `<ol class="sf-kp-list">${arts.map((a) => `<li><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.h)}</a><span>${esc(a.src)}${a.t ? " · " + esc(ago(a.t)) : ""}</span></li>`).join("")}</ol>` : `<p class="sf-kp-none">No recent articles.</p>`}
          ${arts.length > 1 ? `<button type="button" class="sf-kp-more" aria-expanded="false">${arts.length - 1} more ${arts.length === 2 ? "article" : "articles"}</button>` : ""}
          ${p.credit ? `<p class="sf-kp-credit">Photo: ${esc(p.credit)}</p>` : ""}
        </article>`;
      }).join("");
      show(REG[0]);
    })
    .then(() => grid.addEventListener("click", (e) => {
      const b = e.target.closest(".sf-kp-more"); if (!b) return;
      const open = b.getAttribute("aria-expanded") !== "true", n = b.closest(".sf-kp").querySelectorAll(".sf-kp-list li").length - 1;
      b.setAttribute("aria-expanded", open); b.closest(".sf-kp").classList.toggle("sf-kp-open", open);
      b.textContent = open ? "Show less" : `${n} more ${n === 1 ? "article" : "articles"}`;
    }))
    .catch(() => { grid.closest(".sf-key-people").hidden = true; });
})();

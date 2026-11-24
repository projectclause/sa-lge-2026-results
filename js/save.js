// Save a Coalitions Tracker story. First time: sign up (name, surname, email). Signed up already but no
// name on file: ask for name and surname. After that, saving is one tap. Saved stories live in this browser.
(function () {
  "use strict";
  const root = document.querySelector(".pl"); if (!root || !window.PRE) return;
  const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  const saved = () => { try { return JSON.parse(localStorage.getItem("pre-saved") || "[]"); } catch (e) { return []; } };
  const setSaved = (a) => { try { localStorage.setItem("pre-saved", JSON.stringify(a)); } catch (e) {} };
  const signedUp = () => { try { return !!(PRE.me().email || localStorage.getItem("pre-signed")); } catch (e) { return false; } };
  let D = null;
  (window.PreambleFeed ? PreambleFeed.load() : fetch("data/coalition-feed.json").then((r) => r.json())).then((d) => { D = d; paint(); }).catch(() => {});
  document.addEventListener("pl-data", (e) => { D = e.detail; paint(); }); // the tracker refreshed its data

  function toast(t) {
    const el = document.createElement("div"); el.className = "sv-toast"; el.setAttribute("role", "status"); el.textContent = t;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add("on"));
    setTimeout(() => { el.classList.remove("on"); setTimeout(() => el.remove(), 300); }, 2200);
  }

  // make sure we know who this reader is before saving
  async function identify() {
    const me = PRE.me();
    if (signedUp() && me.first && me.last) return true;
    if (signedUp()) {
      const v = await PRE.ask({ title: "Leave your name and surname", note: "So we know who saved this story. We’ll remember you next time.", button: "Save story",
        fields: [{ name: "first", label: "Name", auto: "given-name" }, { name: "last", label: "Surname", auto: "family-name" }] });
      if (!v) return false;
      PRE.remember(v);
      PRE.send({ action: "name", email: me.email || "", first: v.first, last: v.last }).catch(() => {});
      return true;
    }
    const v = await PRE.ask({ title: "Signup to Preamble", note: "Sign up to save stories. We’ll remember you next time.", button: "Sign up and save",
      fields: [{ name: "first", label: "Name", auto: "given-name" }, { name: "last", label: "Surname", auto: "family-name" }, { name: "email", label: "Email address", type: "email", auto: "email" }] });
    if (!v) return false;
    PRE.remember(v);
    try { localStorage.setItem("pre-signed", "1"); } catch (e) {}
    PRE.send({ email: v.email, first: v.first, last: v.last }).catch(() => {});
    return true;
  }

  async function toggle(id, btn) {
    const list = saved(), on = list.includes(id);
    if (on) { setSaved(list.filter((x) => x !== id)); paint(); toast("Removed from your saved stories"); return; }
    if (!(await identify())) return;
    setSaved([id].concat(list.filter((x) => x !== id))); paint();
    const me = PRE.me(); toast(me.first ? `Saved, ${me.first}` : "Saved");
  }

  // put the buttons and the saved list in whatever view the tracker is showing
  function paint() {
    if (!D) return;
    const list = saved();
    // story page
    const ev = D.events.find((e) => "#" + e.id === location.hash);
    const credit = root.querySelector(".pl-credit");
    if (ev && credit && !root.querySelector(".sv-btn")) credit.insertAdjacentHTML("afterend", `<button type="button" class="sv-btn" data-id="${ev.id}">${ICON}<span></span></button>`);
    root.querySelectorAll(".sv-btn").forEach((b) => { const on = list.includes(b.dataset.id); b.setAttribute("aria-pressed", on); b.querySelector("span").textContent = on ? "Saved" : "Save story"; b.setAttribute("aria-label", on ? "Remove from saved stories" : "Save this story"); });
    // front page: the reader's saved stories
    const lead = root.querySelector(".pl-lead"); let box = root.querySelector(".sv-list");
    if (lead && !ev) {
      const items = list.map((id) => D.events.find((e) => e.id === id)).filter(Boolean);
      if (!items.length) { if (box) box.remove(); return; }
      if (!box) { box = document.createElement("section"); box.className = "pl-sec sv-list"; lead.before(box); }
      const me = PRE.me();
      box.innerHTML = `<h3 class="pl-sh">${me.first ? `${me.first}’s saved stories` : "Your saved stories"}</h3>` +
        items.map((e) => `<a class="pl-row" href="#${e.id}"><span class="pl-rt"><b>${e.h}</b><span>${e.cat}</span></span><span class="sv-mark">${ICON}</span></a>`).join("");
    }
  }
  root.addEventListener("click", (e) => { const b = e.target.closest(".sv-btn"); if (b) toggle(b.dataset.id, b); });
  new MutationObserver(() => paint()).observe(root, { childList: true });
  addEventListener("hashchange", () => setTimeout(paint, 0));
})();

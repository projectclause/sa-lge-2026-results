// "Signup to Preamble": after a minute on the site, ask once for an email and send it to the
// Preamble sign-ups Google Sheet (through the Apps Script web app in google-apps-script/signup.gs).
(function () {
  "use strict";
  // Paste the Apps Script web app URL here after deploying google-apps-script/signup.gs
  const SIGNUP_URL = "https://script.google.com/macros/s/AKfycbzQ1dVbTh65mMQ2DRUu7SCzUDcplcfyr4Rtw2YiNQwe08SOoE40s4IckZPNNHradaZ7ig/exec";
  const DELAY = 60 * 1000;
  // what we remember about the reader in this browser: { email, first, last }
  const me = () => { try { return JSON.parse(localStorage.getItem("pre-me") || "{}"); } catch (e) { return {}; } };
  const remember = (o) => { try { localStorage.setItem("pre-me", JSON.stringify(Object.assign(me(), o))); } catch (e) {} };
  const send = (fields) => SIGNUP_URL
    ? fetch(SIGNUP_URL, { method: "POST", mode: "no-cors", body: new URLSearchParams(Object.assign({ page: location.pathname, device: matchMedia("(max-width: 720px)").matches ? "phone" : "desktop" }, fields)) })
    : Promise.reject(new Error("off"));
  // under the submit button of any form that asks for an email
  const PRIVACY = `<p class="su-priv">We’ll only use your email for Preamble updates. <a href="privacy.html">Privacy &amp; cookies</a></p>`;
  // a small form prompt in the same style as the sign-up box; resolves with the values, or null if closed
  function ask({ title, note, fields, button }) {
    return new Promise((resolve) => {
      const last = document.activeElement, wrap = document.createElement("div");
      wrap.className = "su";
      wrap.innerHTML = `<div class="su-back"></div>
        <form class="su-box" role="dialog" aria-modal="true" aria-labelledby="su-h" novalidate>
          <button type="button" class="su-x" aria-label="Close">×</button>
          <p class="su-brand">PREAMBLE</p><h2 id="su-h">${title}</h2>${note ? `<p class="su-note">${note}</p>` : ""}
          ${fields.map((f) => `<label class="su-lab" for="su-${f.name}">${f.label}</label><input class="su-in" id="su-${f.name}" name="${f.name}" type="${f.type || "text"}" autocomplete="${f.auto || "off"}" required>`).join("")}
          <button type="submit" class="su-go su-go-w">${button}</button>
          ${fields.some((f) => f.type === "email") ? PRIVACY : ""}
          <p class="su-msg" aria-live="polite"></p></form>`;
      document.body.appendChild(wrap);
      const form = wrap.querySelector("form"), msg = wrap.querySelector(".su-msg");
      requestAnimationFrame(() => { wrap.classList.add("on"); form.querySelector(".su-in").focus(); });
      const done = (v) => { wrap.classList.remove("on"); setTimeout(() => wrap.remove(), 250); document.removeEventListener("keydown", key); if (last && last.focus) last.focus(); resolve(v); };
      const key = (e) => { if (e.key === "Escape") done(null); };
      document.addEventListener("keydown", key);
      wrap.querySelector(".su-x").onclick = () => done(null);
      wrap.querySelector(".su-back").onclick = () => done(null);
      form.onsubmit = (e) => {
        e.preventDefault();
        const v = {}; let bad = "";
        fields.forEach((f) => { v[f.name] = form[f.name].value.trim(); if (!bad && (!v[f.name] || (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v[f.name])))) bad = f.type === "email" ? "Please enter a valid email address." : "Please fill in your " + f.label.toLowerCase() + "."; });
        if (bad) { msg.textContent = bad; msg.className = "su-msg su-err"; return; }
        done(v);
      };
    });
  }
  window.PRE = { me, remember, send, ask };
  const store = (k, v) => { try { v === undefined ? null : localStorage.setItem(k, v); return localStorage.getItem(k); } catch (e) { return null; } };
  const sess = (k, v) => { try { if (v !== undefined) sessionStorage.setItem(k, v); return sessionStorage.getItem(k); } catch (e) { return null; } };
  // signed up: never ask again; closed: ask again after a week
  if (store("pre-signed") || Date.now() - Number(store("pre-signup-later") || 0) < 7 * 864e5) return;
  // the minute counts across pages in the same visit
  let start = Number(sess("pre-start")) || Date.now(); sess("pre-start", String(start));
  const wait = Math.max(0, DELAY - (Date.now() - start));

  function open() {
    if (document.querySelector(".su")) return;
    const last = document.activeElement;
    const wrap = document.createElement("div");
    wrap.className = "su";
    wrap.innerHTML = `
      <div class="su-back"></div>
      <form class="su-box" role="dialog" aria-modal="true" aria-labelledby="su-h" novalidate>
        <button type="button" class="su-x" aria-label="Close">×</button>
        <p class="su-brand">PREAMBLE</p>
        <h2 id="su-h">Signup to Preamble</h2>
        <label class="su-lab" for="su-email">Email address</label>
        <div class="su-row">
          <input id="su-email" type="email" name="email" autocomplete="email" inputmode="email" required placeholder="you@example.com">
          <button type="submit" class="su-go">Sign up</button>
        </div>
        <input type="text" name="website" class="su-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        ${PRIVACY}
        <p class="su-msg" aria-live="polite"></p>
      </form>`;
    document.body.appendChild(wrap);
    const form = wrap.querySelector("form"), input = wrap.querySelector("#su-email"), msg = wrap.querySelector(".su-msg");
    requestAnimationFrame(() => { wrap.classList.add("on"); input.focus(); });
    const close = (later) => {
      if (later) store("pre-signup-later", String(Date.now()));
      wrap.classList.remove("on"); setTimeout(() => wrap.remove(), 250);
      document.removeEventListener("keydown", onKey);
      if (last && last.focus) last.focus();
    };
    const onKey = (e) => { if (e.key === "Escape") close(true); };
    document.addEventListener("keydown", onKey);
    wrap.querySelector(".su-x").onclick = () => close(true);
    wrap.querySelector(".su-back").onclick = () => close(true);
    form.onsubmit = async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.textContent = "Please enter a valid email address."; msg.className = "su-msg su-err"; input.focus(); return; }
      if (!SIGNUP_URL) { msg.textContent = "Sign-ups aren’t switched on yet. Please try again soon."; msg.className = "su-msg su-err"; return; }
      const btn = form.querySelector(".su-go"); btn.disabled = true; btn.textContent = "Signing up…";
      try {
        const body = new URLSearchParams({ email, website: form.website.value, page: location.pathname, device: matchMedia("(max-width: 720px)").matches ? "phone" : "desktop" });
        await fetch(SIGNUP_URL, { method: "POST", mode: "no-cors", body });
        store("pre-signed", "1"); remember({ email });
        form.querySelector(".su-row").remove(); form.querySelector(".su-lab").remove();
        msg.textContent = "Thanks, you’re signed up."; msg.className = "su-msg su-ok";
        setTimeout(() => close(false), 2200);
      } catch (err) {
        btn.disabled = false; btn.textContent = "Sign up";
        msg.textContent = "Something went wrong. Please try again."; msg.className = "su-msg su-err";
      }
    };
  }
  setTimeout(open, wait);
})();

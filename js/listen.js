// Listen bar under each Coalitions Tracker story's summary line: "▶ Listen · 1:45 min" on the left, share and save on
// the right. The audio is the story's headline, standfirst and "In brief", read aloud:
//   - an MP3 made by tools/listen.rb (Microsoft Azure voice Ryan, listed in data/listen.json) when there is one;
//   - otherwise the reader's own device reads it aloud (the browser's speech engine, a British English voice when the
//     device has one, to match Ryan), so every story can be heard even before its MP3 exists.
// The bookmark is js/save.js's Save button (class sv-btn); this file only places it in the bar.
(function () {
  "use strict";
  const SITE = "https://preamble.co.za/";
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z" fill="currentColor"/></svg>';
  const SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 11v8.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l6.5 6.2L14 17.4v-3.6c-5 0-8.2 1.4-10.5 5 .6-5.6 3.6-9.6 10.5-10.4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  let MAN = null; // data/listen.json
  let cur = null; // { id, kind: "mp3" | "tts", audio, playing, t, dur }

  const fmt = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const rootOf = (bar) => bar.dataset.root || "";
  const storyUrl = (id) => `${SITE}coalitions/${id}.html`;

  // what is read: the headline, the standfirst and the "In brief" points of the story on screen
  function textOf(bar) {
    if (bar.dataset.text) return bar.dataset.text; // a bar outside a story page (the tracker's lead story) carries its text
    const art = bar.closest("article") || document;
    const q = (s) => { const el = art.querySelector(s); return el ? el.textContent.trim() : ""; };
    const brief = [...art.querySelectorAll(".pl-brief li")].map((li) => li.textContent.trim()).filter(Boolean).map((b) => (/[.!?…’'"]$/.test(b) ? b : b + "."));
    return [q(".pl-evh"), q(".pl-evdek"), brief.length ? "In brief. " + brief.join(" ") : ""].filter(Boolean).join(" \n");
  }
  const estimate = (txt) => txt.split(/\s+/).length / 2.55; // about 153 words a minute

  function toast(t) {
    const el = document.createElement("div"); el.className = "sv-toast"; el.setAttribute("role", "status"); el.textContent = t;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add("on"));
    setTimeout(() => { el.classList.remove("on"); setTimeout(() => el.remove(), 300); }, 2200);
  }
  async function copy(url) {
    try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch (e) { prompt("Copy this link", url); }
  }

  function paint(bar) {
    const id = bar.dataset.id, mine = cur && cur.id === id;
    const btn = bar.querySelector(".ls-play"), lab = bar.querySelector(".ls-t");
    if (!btn) return;
    const playing = mine && cur.playing;
    btn.innerHTML = playing ? PAUSE : PLAY;
    btn.setAttribute("aria-label", playing ? "Pause" : "Listen to this story");
    const m = MAN && MAN.stories && MAN.stories[id];
    const dur = mine && cur.dur ? cur.dur : m && m.sec ? m.sec : estimate(textOf(bar));
    lab.textContent = mine && (cur.playing || cur.t > 0) && cur.kind === "mp3" ? `${fmt(cur.t)} / ${fmt(dur)}` : mine && cur.playing ? "Listening…" : `Listen · ${fmt(dur)} min`;
  }
  const paintAll = () => document.querySelectorAll(".ls-bar").forEach(paint);

  function stop() {
    if (!cur) return;
    if (cur.kind === "mp3") cur.audio.pause(); else speechSynthesis.cancel();
    cur.playing = false;
  }

  function play(bar) {
    const id = bar.dataset.id;
    if (cur && cur.id === id) {
      if (cur.playing) { if (cur.kind === "mp3") cur.audio.pause(); else speechSynthesis.pause(); cur.playing = false; }
      else if (cur.kind === "mp3") { cur.audio.play(); cur.playing = true; }
      else if (speechSynthesis.paused) { speechSynthesis.resume(); cur.playing = true; }
      else return start(bar);
      return paintAll();
    }
    stop(); start(bar);
  }

  function start(bar) {
    const id = bar.dataset.id, m = MAN && MAN.stories && MAN.stories[id];
    if (m && m.file) {
      const audio = new Audio(rootOf(bar) + m.file);
      cur = { id, kind: "mp3", audio, playing: true, t: 0, dur: m.sec || 0 };
      audio.addEventListener("timeupdate", () => { if (cur && cur.audio === audio) { cur.t = audio.currentTime; if (audio.duration) cur.dur = audio.duration; paintAll(); } });
      audio.addEventListener("ended", () => { if (cur && cur.audio === audio) { cur.playing = false; cur.t = 0; paintAll(); } });
      audio.play().catch(() => { cur.playing = false; paintAll(); });
      return paintAll();
    }
    if (!("speechSynthesis" in window)) { toast("Listening isn’t available in this browser"); return; }
    const u = new SpeechSynthesisUtterance(textOf(bar));
    const vs = speechSynthesis.getVoices();
    // the site's voice is Ryan (British English, male): on the reader's device, prefer a British male voice, then any British one
    const gb = vs.filter((x) => /en[-_]GB/i.test(x.lang));
    const v = gb.find((x) => /daniel|arthur|ryan|oliver|george|thomas|male/i.test(x.name)) || gb[0] || vs.find((x) => /^en/i.test(x.lang));
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-GB";
    u.rate = 1;
    u.onend = u.onerror = () => { if (cur && cur.u === u) { cur.playing = false; paintAll(); } };
    cur = { id, kind: "tts", u, playing: true, t: 0, dur: 0 };
    speechSynthesis.cancel(); speechSynthesis.speak(u);
    paintAll();
  }

  // fill an empty bar; keep a Save button that the page already put in it
  function build(bar) {
    if (bar.dataset.ready) return;
    bar.dataset.ready = "1";
    const save = bar.querySelector(".sv-btn");
    bar.innerHTML = `<button type="button" class="ls-play">${PLAY}</button><span class="ls-t"></span>
      <span class="ls-r"><button type="button" class="ls-share">${SHARE}<span>Share story</span></button><button type="button" class="ls-ic ls-copy" aria-label="Copy link" title="Copy link">${ARROW}</button></span>`;
    if (save) bar.querySelector(".ls-r").appendChild(save);
    paint(bar);
  }
  const scan = () => document.querySelectorAll(".ls-bar").forEach(build);

  document.addEventListener("click", (e) => {
    const bar = e.target.closest(".ls-bar"); if (!bar) return;
    const id = bar.dataset.id, h = bar.classList.contains("ls-lead") ? { textContent: (bar.dataset.text || "").split(" \n")[0] } : (bar.closest("article") || document).querySelector(".pl-evh");
    if (e.target.closest(".ls-play")) play(bar);
    else if (e.target.closest(".ls-copy")) {
      const btn = e.target.closest(".ls-copy");
      copy(storyUrl(id)).then(() => { // a tick for a moment, so a tap clearly did something
        btn.classList.add("ls-done"); btn.innerHTML = TICK; btn.blur();
        setTimeout(() => { btn.classList.remove("ls-done"); btn.innerHTML = ARROW; }, 1600);
      });
    }
    else if (e.target.closest(".ls-share")) {
      if (navigator.share) navigator.share({ title: h ? h.textContent.trim() : "Coalitions Tracker", url: storyUrl(id) }).catch(() => {});
      else copy(storyUrl(id));
    }
  });

  const first = document.querySelector(".ls-bar");
  fetch((first ? rootOf(first) : "") + "data/listen.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    .then((m) => { MAN = m; paintAll(); });
  if ("speechSynthesis" in window) speechSynthesis.addEventListener && speechSynthesis.addEventListener("voiceschanged", () => {});
  // the tracker redraws its views (story pages open by hash, and refresh while open): pick up new bars as they appear
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  addEventListener("hashchange", () => { if (cur && !document.querySelector(`.ls-bar[data-id="${cur.id}"]`)) { stop(); cur = null; } });
  scan();
})();

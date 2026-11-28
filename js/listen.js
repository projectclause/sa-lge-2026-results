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
  const SM_ICONS = {"wa":"<path d=\"M12 4a8 8 0 0 0-6.9 12l-1.1 4 4.1-1.1A8 8 0 1 0 12 4z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linejoin=\"round\"/><path d=\"M9.3 8.6c.2-.4.5-.4.8-.4h.5c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .4-.1.6l-.5.6c.6 1.1 1.4 1.9 2.5 2.5l.6-.5c.2-.2.4-.2.6-.1l1.5.7c.3.1.4.3.4.5v.5c0 .3-.1.6-.4.8-.5.4-1.2.5-1.8.3-2.4-.7-4.3-2.6-5-5-.2-.6-.1-1.3.3-1.8z\" fill=\"currentColor\"/>","link":"<path d=\"M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\"/>","mail":"<rect x=\"4\" y=\"6\" width=\"16\" height=\"12\" rx=\"1.5\" fill=\"currentColor\"/><path d=\"M4.5 7l7.5 6 7.5-6\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.6\"/>","fb":"<path d=\"M13.2 20v-7h2.4l.4-2.8h-2.8V8.4c0-.8.3-1.4 1.4-1.4H16V4.6a19 19 0 0 0-2.1-.1c-2.1 0-3.5 1.3-3.5 3.6v2.1H8v2.8h2.4v7z\" fill=\"currentColor\"/>","bsky":"<path d=\"M7.2 5.6c2 1.5 4.1 4.5 4.8 6.1.7-1.6 2.8-4.6 4.8-6.1 1.5-1.1 3.8-1.9 3.8.7 0 .5-.3 4.4-.5 5-.6 2.2-2.9 2.8-4.9 2.4 3.5.6 4.4 2.6 2.5 4.6-3.7 3.8-5.3-1-5.7-2.2 0-.2-.1-.4-.1-.3 0-.1-.1.1-.1.3-.4 1.2-2 6-5.7 2.2-1.9-2-1-4 2.5-4.6-2 .3-4.3-.2-4.9-2.4-.2-.6-.5-4.5-.5-5 0-2.6 2.3-1.8 3.8-.7z\" fill=\"currentColor\"/>","x":"<path d=\"M5 5l14 14M19 5L5 19\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\"/>","li":"<rect x=\"5\" y=\"9.5\" width=\"3\" height=\"9\" fill=\"currentColor\"/><circle cx=\"6.5\" cy=\"6.4\" r=\"1.7\" fill=\"currentColor\"/><path d=\"M10.5 9.5h2.8v1.3c.5-.9 1.6-1.6 3-1.6 2.4 0 3.2 1.5 3.2 3.9v5.4h-3v-4.8c0-1.1-.2-2-1.4-2s-1.6.9-1.6 2v4.8h-3z\" fill=\"currentColor\"/>","th":"<path d=\"M15.6 11.4c-.1-2.1-1.4-3.3-3.4-3.3-1.3 0-2.4.6-3 1.6l1.3.9c.4-.7 1-1 1.7-1 1 0 1.6.6 1.7 1.6-.6-.1-1.3-.2-2-.1-2 .1-3.3 1.3-3.2 2.9.1 1.6 1.5 2.6 3.2 2.5 2.4-.1 3.3-2 3.4-3.8.7.4 1.2 1 1.4 1.8.4 1.4-.2 3-1.5 4.1-2.4 2-6.9 1.6-8.3-1.5-1.1-2.3-1-6 .1-8.2 1.3-2.7 4.8-3.6 7.5-2.6 1.6.6 2.7 1.8 3.2 3.4l1.6-.4c-.6-2.1-2.1-3.7-4.2-4.5-3.5-1.3-7.8 0-9.5 3.4C4.7 10.9 4.7 15.3 6 18c1.8 3.9 7.4 4.6 10.5 2 1.8-1.5 2.6-3.7 2-5.8-.4-1.4-1.4-2.4-2.9-2.8zm-3.8 3.9c-.9 0-1.6-.4-1.6-1.1 0-.7.8-1.3 1.8-1.3.6 0 1.2 0 1.8.2-.1 1.4-.9 2.2-2 2.2z\" fill=\"currentColor\"/>","rd":"<circle cx=\"12\" cy=\"13\" r=\"6.5\" fill=\"currentColor\"/><circle cx=\"17.5\" cy=\"6\" r=\"1.5\" fill=\"currentColor\"/><path d=\"M12 6.5l1-3.2 4 1\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\"/><circle cx=\"9.6\" cy=\"12.5\" r=\"1.1\" fill=\"#fff\"/><circle cx=\"14.4\" cy=\"12.5\" r=\"1.1\" fill=\"#fff\"/><path d=\"M9.6 15.3c1.4 1 3.4 1 4.8 0\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>"};  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l6.5 6.2L14 17.4v-3.6c-5 0-8.2 1.4-10.5 5 .6-5.6 3.6-9.6 10.5-10.4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
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
      <span class="ls-r"><button type="button" class="ls-share">${SHARE}<span>Share story</span></button><button type="button" class="ls-ic ls-copy" aria-label="Share options" title="Share options" aria-haspopup="true" aria-expanded="false">${ARROW}</button><div class="sm-menu ls-menu" role="menu" hidden></div></span>`;
    if (save) bar.querySelector(".ls-r").appendChild(save);
    paint(bar);
  }
  const scan = () => document.querySelectorAll(".ls-bar").forEach(build);

  // the arrow opens the same "Share options" menu as the page's Share button, for this story's own link
  const SM_OPTS = [["whatsapp", "WhatsApp", "wa"], ["copy", "Copy link", "link"], ["email", "Email", "mail"], ["facebook", "Facebook", "fb"],
    ["bluesky", "Bluesky", "bsky"], ["x", "X", "x"], ["linkedin", "LinkedIn", "li"], ["threads", "Threads", "th"], ["reddit", "Reddit", "rd"]];
  function openMenu(menu, id, title) {
    const url = storyUrl(id), u = encodeURIComponent(url), t = encodeURIComponent(title), both = encodeURIComponent(title + " " + url);
    const href = { whatsapp: `https://wa.me/?text=${both}`, email: `mailto:?subject=${t}&body=${encodeURIComponent(title + "\n" + url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`, bluesky: `https://bsky.app/intent/compose?text=${both}`,
      x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`, linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      threads: `https://www.threads.net/intent/post?text=${both}`, reddit: `https://www.reddit.com/submit?url=${u}&title=${t}` };
    menu.innerHTML = `<p class="sm-h">Share options</p><p class="sm-note" hidden></p>` + SM_OPTS.map(([k, l, ic]) =>
      `<a class="sm-item" data-k="${k}" href="${href[k] || "#"}"${href[k] && k !== "email" ? ' target="_blank" rel="noopener"' : ""}><span class="sm-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${SM_ICONS[ic]}</svg></span>${l}</a>`).join("");
    menu.hidden = false;
  }
  function closeMenus() {
    document.querySelectorAll(".ls-menu").forEach((m) => { m.hidden = true; });
    document.querySelectorAll(".ls-copy[aria-expanded='true']").forEach((b) => b.setAttribute("aria-expanded", "false"));
  }
  document.addEventListener("click", (e) => { if (!e.target.closest(".ls-menu") && !e.target.closest(".ls-copy")) closeMenus(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenus(); });

  document.addEventListener("click", (e) => {
    const bar = e.target.closest(".ls-bar"); if (!bar) return;
    const id = bar.dataset.id, h = bar.classList.contains("ls-lead") ? { textContent: (bar.dataset.text || "").split(" \n")[0] } : (bar.closest("article") || document).querySelector(".pl-evh");
    if (e.target.closest(".ls-play")) play(bar);
    else if (e.target.closest(".ls-menu")) {
      const a = e.target.closest(".sm-item"); if (!a || a.dataset.k !== "copy") return; // the other options are plain links
      e.preventDefault();
      const note = bar.querySelector(".ls-menu .sm-note");
      navigator.clipboard.writeText(storyUrl(id)).then(() => { note.textContent = "Link copied."; note.hidden = false; })
        .catch(() => { note.textContent = storyUrl(id); note.hidden = false; });
    }
    else if (e.target.closest(".ls-copy")) {
      const btn = e.target.closest(".ls-copy"), menu = bar.querySelector(".ls-menu"), was = !menu.hidden;
      closeMenus();
      if (!was) { openMenu(menu, id, h ? h.textContent.trim() : "Coalitions Tracker"); btn.setAttribute("aria-expanded", "true"); }
      btn.blur();
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

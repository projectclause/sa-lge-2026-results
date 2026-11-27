// Share cards, drawn to match the South Africa Elections App Design social cards (1080×1920):
//  • "race" card: national / provincial / metro vote share (like the SA National Race Card)
//  • "council" card: one council's ward winners and seats (like the City of Johannesburg results card)
(function () {
  "use strict";
  const W = 1080, H = 1920, PX = 72;
  const INK = "#141821", INK2 = "#5a6272", INK3 = "#7a8291", NAVY = "#051C2C", BLUE = "#1d3f73", BG = "#f7f7f5", RULE = "#dfe2e8";
  const SANS = '"Libre Franklin", system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
  const HEAD = '"Cooper Hewitt", ' + SANS;

  let fontsReady = null;
  function fonts() {
    if (fontsReady) return fontsReady;
    const ff = typeof FontFace !== "undefined" ? new FontFace("Cooper Hewitt", "url(assets/fonts/CooperHewitt-Semibold.woff2)", { weight: "600" }) : null;
    fontsReady = Promise.all([
      ff ? ff.load().then((f) => document.fonts.add(f)).catch(() => {}) : null,
      document.fonts ? document.fonts.load(`700 20px "Libre Franklin"`) : null,
      document.fonts ? document.fonts.load(`500 20px "Libre Franklin"`) : null,
      document.fonts ? document.fonts.ready : null
    ]);
    return fontsReady;
  }
  const loadImg = (src) => new Promise((res) => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  const font = (ctx, w, s, f = SANS) => { ctx.font = `${w} ${s}px ${f}`; };
  function spaced(ctx, text, x, y, ls) { // letter-spaced caps, like the design's kickers
    let cx = x; for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + ls; } return cx - x;
  }
  function fit(ctx, text, w, size, min, maxW, f = SANS) { let s = size; do { font(ctx, w, s, f); if (ctx.measureText(text).width <= maxW) break; s -= 1; } while (s > min); return s; }
  function wrap(ctx, text, maxW) {
    const out = []; String(text).split("\n").forEach((para) => {
      let line = ""; para.split(" ").forEach((w) => { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
      if (line) out.push(line);
    });
    return out;
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function contain(ctx, img, x, y, w, h) { const s = Math.min(w / img.width, h / img.height); ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s); }
  function cover(ctx, img, x, y, w, h, posY = 0.15) { const s = Math.max(w / img.width, h / img.height), iw = img.width * s, ih = img.height * s; ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) * posY, iw, ih); }
  function badge(ctx, text, color, x, y, size) { ctx.fillStyle = color || "#8a8a8a"; ctx.fillRect(x, y, size, size); ctx.fillStyle = "#fff"; fit(ctx, text, 700, Math.round(size * 0.34), 9, size - 8); ctx.textAlign = "center"; ctx.fillText(text, x + size / 2, y + size / 2 + size * 0.12); ctx.textAlign = "left"; }
  function sectionHead(ctx, left, right, y) {
    ctx.fillStyle = INK3; font(ctx, 700, 18); spaced(ctx, left.toUpperCase(), PX, y, 2.2);
    if (right) { font(ctx, 400, 21); ctx.textAlign = "right"; ctx.fillText(right, W - PX, y); ctx.textAlign = "left"; }
    ctx.fillStyle = RULE; ctx.fillRect(PX, y + 18, W - PX * 2, 2);
  }
  function drawMap(ctx, map, x, y, w, h) {
    if (!map || h <= 0) return;
    const s = Math.min(w / map.w, h / map.h), ox = x + (w - map.w * s) / 2, oy = y + (h - map.h * s) / 2;
    ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s); ctx.translate(-map.x0, -map.y0);
    ctx.lineJoin = "round"; ctx.lineWidth = Math.max(0.12, 0.8 / s); ctx.strokeStyle = "#ffffff";
    map.paths.forEach((p) => { const path = new Path2D(p.d); ctx.fillStyle = p.fill; ctx.fill(path); ctx.stroke(path); });
    ctx.restore();
  }
  // bottom band on every downloaded image: the PREAMBLE name and where to find more data
  const FOOT = 140;
  function brand(ctx) {
    ctx.fillStyle = NAVY; ctx.fillRect(0, H - FOOT, W, FOOT);
    ctx.fillStyle = "#fff"; font(ctx, 700, 46); ctx.fillText("PREAMBLE", PX, H - FOOT + 62);
    ctx.fillStyle = "rgba(255,255,255,.85)"; font(ctx, 400, 25); ctx.fillText("For more information on South African data visit preamble.co.za", PX, H - FOOT + 104);
  }
  function wordmark(ctx, x, y, size) { ctx.fillStyle = INK3; font(ctx, 400, size); ctx.textAlign = "right"; ctx.fillText("PREAMBLE", x, y); ctx.textAlign = "left"; }

  // ---------- race card ----------
  async function race(d) {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const ctx = c.getContext("2d");
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    const imgs = await Promise.all(d.cands.slice(0, 5).flatMap((k) => [loadImg(k.photo), loadImg(k.logo)]));
    let y = 44 + 29;
    ctx.fillStyle = INK2; font(ctx, 500, 29); ctx.fillText(d.dateLine, PX, y);
    y += 36; ctx.fillStyle = BLUE; font(ctx, 700, 17);
    const kw = spaced(ctx, "LOCAL ELECTIONS · 4 NOVEMBER 2026", PX, y, 1.4);
    ctx.fillStyle = INK2; spaced(ctx, d.region.toUpperCase(), PX + kw + 14, y, 1.4);
    // headline (Cooper Hewitt, up to three lines)
    y += 30; let hs = 46; font(ctx, 600, hs, HEAD); ctx.fillStyle = INK;
    let lines = wrap(ctx, d.headline, W - PX * 2);
    while (lines.length > 3 && hs > 34) { hs -= 2; font(ctx, 600, hs, HEAD); lines = wrap(ctx, d.headline, W - PX * 2); }
    lines.forEach((l) => { y += hs * 1.12; ctx.fillText(l, PX, y); });
    y += 40; ctx.fillStyle = INK2; font(ctx, 400, 27); ctx.fillText(d.sub, PX, y);
    // five candidate / party columns
    y += 30; const colW = (W - PX * 2 - 20 * 4) / 5;
    const nameSize = Math.min(...d.cands.slice(0, 5).map((k) => fit(ctx, k.name, 500, 28, 14, colW)));
    d.cands.slice(0, 5).forEach((k, i) => {
      const x = PX + i * (colW + 20), ph = imgs[i * 2], lg = imgs[i * 2 + 1], r = 66;
      ctx.save(); ctx.beginPath(); ctx.arc(x + r, y + r, r, 0, Math.PI * 2); ctx.closePath(); ctx.fillStyle = ph ? "#ebebe8" : "#ffffff"; ctx.fill(); ctx.clip();
      if (ph) cover(ctx, ph, x, y, r * 2, r * 2); else if (lg) contain(ctx, lg, x + 24, y + 24, r * 2 - 48, r * 2 - 48); else badge(ctx, k.badge || "", k.color, x + 30, y + 30, r * 2 - 60);
      ctx.restore();
      if (!ph) { ctx.strokeStyle = "#e3e6eb"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + r, y + r, r - 1, 0, Math.PI * 2); ctx.stroke(); }
      let yy = y + 132 + 14;
      if (ph && lg) contain(ctx, lg, x, yy, 56, 30);
      yy += 34;
      ctx.fillStyle = INK; font(ctx, 500, nameSize); ctx.fillText(k.name, x, yy + 24); yy += 24;
      if (k.votes) { ctx.fillStyle = INK2; fit(ctx, k.votes, 500, 24, 14, colW); ctx.fillText(k.votes, x, yy + 32); ctx.fillStyle = INK3; font(ctx, 500, 18); ctx.fillText("votes", x, yy + 54); }
      ctx.fillStyle = INK; fit(ctx, k.pct, 700, 44, 24, colW); ctx.fillText(k.pct, x, yy + 104);
    });
    y += 132 + 14 + 34 + 24 + 104 + 18;
    // share bar with the 50% line
    ctx.fillStyle = INK2; font(ctx, 400, 28); ctx.textAlign = "center"; ctx.fillText(d.shareLabel, W / 2, y + 28); ctx.textAlign = "left";
    y += 46; const bw = W - PX * 2;
    ctx.save(); roundRect(ctx, PX, y, bw, 72, 4); ctx.clip(); ctx.fillStyle = "#eef0f3"; ctx.fillRect(PX, y, bw, 72);
    let bx = PX; d.segs.forEach((s) => { const w = bw * s.pct / 100; ctx.fillStyle = s.color; ctx.fillRect(bx, y, w + 0.5, 72); bx += w; }); ctx.restore();
    ctx.fillStyle = INK; ctx.fillRect(PX + bw / 2 - 2, y - 6, 4, 84);
    // legend
    y += 72 + 14; font(ctx, 500, 27); let lx = PX, ly = y + 28;
    d.segs.forEach((s) => { const t = `${s.label} ${s.pct.toFixed(1)}%`, w = 25 + ctx.measureText(t).width; if (lx + w > W - PX) { lx = PX; ly += 42; }
      ctx.fillStyle = s.color; roundRect(ctx, lx, ly - 18, 16, 16, 3); ctx.fill(); ctx.fillStyle = INK; ctx.fillText(t, lx + 25, ly); lx += w + 22; });
    y = ly + 18;
    // counted
    if (d.prog) {
      y += 20; ctx.fillStyle = INK; font(ctx, 700, 29); ctx.fillText(d.prog.big, PX, y + 26); ctx.fillStyle = INK3; font(ctx, 400, 24); ctx.fillText(d.prog.small, PX, y + 58);
      const px = PX + 330, pw = 280; ctx.fillStyle = "#fff"; ctx.fillRect(px, y + 6, pw, 22); ctx.strokeStyle = "#8a93a3"; ctx.lineWidth = 1.5; ctx.strokeRect(px, y + 6, pw, 22);
      ctx.fillStyle = "rgba(5,28,44,.55)"; for (let gx = px + 4; gx < px + pw * d.prog.w - 2; gx += 7) for (let gy = y + 10; gy < y + 27; gy += 7) { ctx.beginPath(); ctx.arc(gx, gy, 1.6, 0, Math.PI * 2); ctx.fill(); }
      font(ctx, 700, 16); const tw = ctx.measureText(d.prog.pct).width; ctx.fillStyle = "#fff"; ctx.fillRect(px + 12, y + 8, tw + 8, 18); ctx.fillStyle = NAVY; ctx.fillText(d.prog.pct, px + 16, y + 23);
      ctx.fillStyle = INK3; font(ctx, 400, 21); ctx.fillText(d.prog.note, px, y + 56);
      y += 72;
    }
    // ward map
    y += 34; ctx.fillStyle = BLUE; font(ctx, 700, 20); spaced(ctx, d.mapLabel, PX, y, 1.6);
    ctx.fillStyle = INK3; font(ctx, 400, 20); ctx.textAlign = "right"; ctx.fillText(d.mapNote, W - PX, y); ctx.textAlign = "left";
    const mapTop = y + 16, mapBottom = H - 64 - FOOT - 96;
    drawMap(ctx, d.map, PX, mapTop, W - PX * 2, mapBottom - mapTop);
    // footer
    ctx.fillStyle = INK2; font(ctx, 700, 21); const src = wrap(ctx, d.source, 620);
    src.forEach((l, i) => ctx.fillText(l, PX, H - 64 - FOOT - 30 * (src.length - 1 - i)));
    brand(ctx);
    return c;
  }

  // ---------- council card ----------
  async function council(d) {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = NAVY; ctx.fillRect(0, 0, W, 14);
    const logos = await Promise.all(d.parties.slice(0, 8).map((p) => loadImg(p.logo)));
    ctx.fillStyle = BLUE; font(ctx, 700, 16); spaced(ctx, "LOCAL ELECTIONS · 4 NOVEMBER 2026", PX, 60, 1.6);
    ctx.fillStyle = INK; fit(ctx, d.title, 700, 34, 20, 580); ctx.fillText(d.title, PX, 100);
    wordmark(ctx, W - PX, 80, 44);
    // ward winners
    sectionHead(ctx, "Ward winners", d.wardsNote, 170);
    const mapTop = 205, mapH = d.map ? 620 : 0;
    drawMap(ctx, d.map, PX, mapTop, W - PX * 2, mapH);
    // council seats
    let y = mapTop + (d.map ? mapH + 50 : 20);
    sectionHead(ctx, `Council · ${d.total} seats`, `${d.need} needed for a majority`, y);
    const R = 440, cx = W / 2, cy = y + 60 + R;
    const { pts, dot } = window.HEMI(d.total);
    let i = 0;
    d.parties.concat(d.rest ? [d.rest] : []).forEach((p) => { for (let q = 0; q < p.seats && i < pts.length; q++, i++) { const pt = pts[i]; ctx.beginPath(); ctx.arc(cx + pt.x * R, cy - pt.y * R, dot * R, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); } });
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]); ctx.beginPath(); ctx.moveTo(cx, cy - R - 18); ctx.lineTo(cx, cy - R * 0.5 + 4); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = "center"; ctx.fillStyle = INK; font(ctx, 700, 88); ctx.fillText(String(d.total), cx, cy - 36); ctx.fillStyle = INK2; font(ctx, 400, 26); ctx.fillText("council seats", cx, cy); ctx.textAlign = "left";
    // party tiles: the largest eight
    y = cy + 56; const tw = (W - PX * 2) / 4;
    d.parties.slice(0, 8).forEach((p, k) => {
      const x = PX + (k % 4) * tw, ty = y + Math.floor(k / 4) * 92;
      ctx.fillStyle = "#fff"; roundRect(ctx, x, ty, 64, 64, 10); ctx.fill(); ctx.strokeStyle = "#e3e6eb"; ctx.lineWidth = 2; ctx.stroke();
      if (logos[k]) contain(ctx, logos[k], x + 8, ty + 8, 48, 48); else badge(ctx, p.badge || "", p.color, x + 10, ty + 10, 44);
      ctx.fillStyle = INK; fit(ctx, p.name, 700, 27, 13, tw - 90); ctx.fillText(p.name, x + 78, ty + 28);
      ctx.fillStyle = INK3; font(ctx, 500, 22); ctx.fillText(`${p.seats} seat${p.seats === 1 ? "" : "s"}`, x + 78, ty + 58);
    });
    ctx.fillStyle = INK3; font(ctx, 400, 22);
    let fy = H - 64 - FOOT - 31 * (d.foot.length - 1);
    d.foot.forEach((t) => wrap(ctx, t, W - PX * 2).forEach((l) => { ctx.fillText(l, PX, fy); fy += 31; }));
    brand(ctx);
    return c;
  }

  // ---------- mayors card: one city's mayor after 2026 and every mayor before ----------
  async function mayors(d) {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = NAVY; ctx.fillRect(0, 0, W, 14);
    const [nowImg, ...faces] = await Promise.all([loadImg(d.now && d.now.img)].concat(d.list.map((r) => loadImg(r.img))));
    const circle = (img, x, y, r, name, color) => {
      ctx.save(); ctx.beginPath(); ctx.arc(x + r, y + r, r, 0, Math.PI * 2); ctx.closePath(); ctx.fillStyle = img ? "#ebebe8" : (color || "#8a8a8a"); ctx.fill(); ctx.clip();
      if (img) { ctx.filter = "grayscale(1)"; cover(ctx, img, x, y, r * 2, r * 2, 0.1); ctx.filter = "none"; }
      else { ctx.fillStyle = "#fff"; font(ctx, 700, Math.round(r * 0.7)); ctx.textAlign = "center"; ctx.fillText(String(name).split(" ").map((w) => w[0]).slice(0, 2).join(""), x + r, y + r + r * 0.25); ctx.textAlign = "left"; }
      ctx.restore();
    };
    ctx.fillStyle = BLUE; font(ctx, 700, 16); spaced(ctx, "LOCAL ELECTIONS · 4 NOVEMBER 2026", PX, 60, 1.6);
    ctx.fillStyle = INK; fit(ctx, d.title, 600, 50, 28, 640, HEAD); ctx.fillText(d.title, PX, 116);
    wordmark(ctx, W - PX, 80, 44);
    ctx.fillStyle = INK2; font(ctx, 400, 25); ctx.fillText(d.sub, PX, 156);
    // who leads the city after the 2026 election
    let y = 200;
    ctx.fillStyle = "#f4f5f7"; roundRect(ctx, PX, y, W - PX * 2, 250, 10); ctx.fill();
    const n = d.now;
    if (n.n) circle(nowImg, PX + 30, y + 35, 90, n.n, n.color);
    const tx = PX + (n.n ? 240 : 34), tw = W - PX - 30 - tx;
    ctx.fillStyle = INK3; font(ctx, 700, 18); spaced(ctx, n.label.toUpperCase(), tx, y + 58, 1.8);
    if (n.n) {
      ctx.fillStyle = INK; fit(ctx, n.n, 600, 52, 30, tw, HEAD); ctx.fillText(n.n, tx, y + 118);
      ctx.fillStyle = n.color; ctx.fillRect(tx, y + 141, 20, 20);
      ctx.fillStyle = INK; font(ctx, 600, 26); ctx.fillText(n.party, tx + 30, y + 160);
    }
    ctx.fillStyle = INK2; font(ctx, 400, 22);
    wrap(ctx, n.how || "", tw).slice(0, n.n ? 2 : 5).forEach((l, i) => ctx.fillText(l, tx, y + (n.n ? 198 : 104) + i * 29));
    // every mayor, newest first
    y += 250 + 62;
    sectionHead(ctx, `Mayors since ${d.since}`, `${d.list.length} mayors`, y);
    const top = y + 36, bottom = H - FOOT - 28, rowH = Math.min(104, (bottom - top) / d.list.length), r = Math.min(40, rowH / 2 - 7);
    const nameSize = Math.min(31, Math.round(rowH * 0.34)), subSize = Math.min(23, Math.round(rowH * 0.25));
    d.list.forEach((m, i) => {
      const ry = top + i * rowH, mid = ry + rowH / 2;
      if (m.cur) { ctx.fillStyle = "#f4f5f7"; ctx.fillRect(PX - 16, ry + 2, W - PX * 2 + 32, rowH - 4); }
      ctx.fillStyle = INK3; font(ctx, 500, subSize); ctx.fillText(String(m.num).padStart(2, "0"), PX, mid + subSize * 0.35);
      circle(faces[i], PX + 58, mid - r, r, m.n, m.color);
      const nx = PX + 58 + r * 2 + 24;
      ctx.fillStyle = INK; font(ctx, 700, nameSize); ctx.fillText(m.n, nx, mid - 4);
      ctx.fillStyle = m.color; ctx.fillRect(nx, mid + 9, subSize * 0.7, subSize * 0.7);
      ctx.fillStyle = INK2; font(ctx, 400, subSize); ctx.fillText(`${m.party} · ${m.y}`, nx + subSize * 0.7 + 10, mid + 8 + subSize * 0.72);
      if (m.tag) { font(ctx, 700, Math.max(14, subSize - 5)); const t = m.tag.toUpperCase(), w = ctx.measureText(t).width + 20, h = subSize + 8; ctx.fillStyle = INK; ctx.fillRect(W - PX - w, mid - h / 2, w, h); ctx.fillStyle = "#fff"; ctx.fillText(t, W - PX - w + 10, mid + (subSize - 5) * 0.36); }
      if (i < d.list.length - 1) { ctx.fillStyle = RULE; ctx.fillRect(PX, ry + rowH - 1, W - PX * 2, 1); }
    });
    brand(ctx);
    return c;
  }

  async function render(d) { await fonts(); return d.type === "mayors" ? mayors(d) : d.type === "council" ? council(d) : race(d); }

  async function share(d, btn) {
    btn && btn.classList.add("busy");
    try {
      const canvas = await render(d);
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      const file = new File([blob], (d.file || "results") + ".png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia("(pointer: coarse)").matches) {
        try { await navigator.share({ files: [file], title: d.title || d.region }); return; } catch (e) { if (e && e.name === "AbortError") return; }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } finally { btn && btn.classList.remove("busy"); }
  }

  window.ShareCard = { render, share, preview };

  // ---------- share icon on each card: tap it to see the image first, then share, save or copy the link ----------
  const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 11v8.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // which cards get an icon, and which image each one makes
  const SPOTS = [[".rs-nat", "race"], [".my-city", "card"]];
  function addIcons() {
    SPOTS.forEach(([sel, key]) => document.querySelectorAll(sel).forEach((el) => {
      if (el.querySelector(":scope > .share-btn") || !el.firstElementChild || el.querySelector(":scope > .dm-loading")) return;
      el.classList.add("has-share");
      el.insertAdjacentHTML("afterbegin", `<button type="button" class="share-btn" data-share="${key}" aria-label="Share this card as an image" title="Share">${ICON}</button>`);
    }));
  }
  // cards redraw themselves (a new city, a new council), so put the icon back each time
  if (typeof MutationObserver !== "undefined") {
    let t = 0; new MutationObserver(() => { clearTimeout(t); t = setTimeout(addIcons, 60); }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addIcons); else addIcons();

  let box = null, cur = null, back = null;
  function modal() {
    if (box) return box;
    box = document.createElement("div"); box.className = "shp"; box.hidden = true;
    box.innerHTML = `<div class="shp-box" role="dialog" aria-modal="true" aria-labelledby="shp-h">
      <div class="shp-top"><p id="shp-h" class="shp-h">Share this card</p><button type="button" class="shp-x" aria-label="Close">×</button></div>
      <div class="shp-img"><p class="shp-wait">Making the image…</p></div>
      <div class="shp-acts">
        <button type="button" class="shp-b shp-main" data-a="share" hidden>${ICON}Share</button>
        <button type="button" class="shp-b" data-a="save"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>Save image</button>
        <button type="button" class="shp-b" data-a="copy"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>Copy link</button>
      </div>
      <p class="shp-note" role="status"></p></div>`;
    document.body.appendChild(box);
    const note = box.querySelector(".shp-note"), say = (t) => { note.textContent = t; };
    box.addEventListener("click", async (e) => {
      if (e.target === box || e.target.closest(".shp-x")) return close();
      const b = e.target.closest(".shp-b"); if (!b) return;
      const a = b.dataset.a;
      if (a === "copy") { const url = location.href.split("?")[0]; try { await navigator.clipboard.writeText(url); say("Link copied."); } catch (err) { say(url); } return; }
      if (!cur) { say("The image is still being made…"); return; }
      if (a === "save") { const dl = document.createElement("a"); dl.href = cur.url; dl.download = cur.file.name; document.body.appendChild(dl); dl.click(); dl.remove(); say("Image saved."); return; }
      if (a === "share") {
        navigator.share({ files: [cur.file], title: cur.title }).then(() => close()).catch((err) => { if (!err || err.name !== "AbortError") say("Could not open the share sheet. Use Save image instead."); });
      }
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !box.hidden) close(); });
    return box;
  }
  function close() {
    if (!box || box.hidden) return;
    box.hidden = true; document.documentElement.classList.remove("shp-on");
    if (cur) { const u = cur.url; setTimeout(() => URL.revokeObjectURL(u), 4000); } cur = null;
    if (back) back.focus();
  }
  async function preview(d, btn) {
    const m = modal(); back = btn || null; cur = null;
    const img = m.querySelector(".shp-img"), sh = m.querySelector('[data-a="share"]');
    img.innerHTML = '<p class="shp-wait">Making the image…</p>'; m.querySelector(".shp-note").textContent = ""; sh.hidden = true;
    m.hidden = false; document.documentElement.classList.add("shp-on"); m.querySelector(".shp-x").focus();
    try {
      const canvas = await render(d);
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      if (m.hidden) return;
      const file = new File([blob], (d.file || "preamble") + ".png", { type: "image/png" });
      cur = { file, url: URL.createObjectURL(blob), title: d.title || d.region || "Preamble" };
      img.innerHTML = `<img src="${cur.url}" alt="Image of this card to share">`;
      // the image is ready before the Share tap, so phones allow the share sheet to open
      sh.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
    } catch (e) { img.innerHTML = '<p class="shp-wait">Could not make the image. Please try again.</p>'; }
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".share-btn"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const S = window.SHARE || {}, get = S[b.dataset.share] || (b.dataset.share === "race" && S.panel);
    if (get) { const d = get(); if (d) preview(d, b); }
  });
})();

// ---------- share menu ----------
(function () {
  "use strict";
  const btn = document.querySelector(".sm-btn"), menu = document.querySelector(".sm-menu");
  if (!btn || !menu) return;
  const I = {
    link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    mail: '<rect x="4" y="6" width="16" height="12" rx="1.5" fill="currentColor"/><path d="M4.5 7l7.5 6 7.5-6" fill="none" stroke="#fff" stroke-width="1.6"/>',
    fb: '<path d="M13.2 20v-7h2.4l.4-2.8h-2.8V8.4c0-.8.3-1.4 1.4-1.4H16V4.6a19 19 0 0 0-2.1-.1c-2.1 0-3.5 1.3-3.5 3.6v2.1H8v2.8h2.4v7z" fill="currentColor"/>',
    wa: '<path d="M12 4a8 8 0 0 0-6.9 12l-1.1 4 4.1-1.1A8 8 0 1 0 12 4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.3 8.6c.2-.4.5-.4.8-.4h.5c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .4-.1.6l-.5.6c.6 1.1 1.4 1.9 2.5 2.5l.6-.5c.2-.2.4-.2.6-.1l1.5.7c.3.1.4.3.4.5v.5c0 .3-.1.6-.4.8-.5.4-1.2.5-1.8.3-2.4-.7-4.3-2.6-5-5-.2-.6-.1-1.3.3-1.8z" fill="currentColor"/>',
    story: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3.2 2.4"/><path d="M12 8.5v7M8.5 12h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    ig: '<rect x="4.5" y="4.5" width="15" height="15" rx="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16.6" cy="7.4" r="1.1" fill="currentColor"/>',
    igs: '<circle cx="12" cy="12" r="8.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 2"/><rect x="8" y="8" width="8" height="8" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="1.9" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    bsky: '<path d="M7.2 5.6c2 1.5 4.1 4.5 4.8 6.1.7-1.6 2.8-4.6 4.8-6.1 1.5-1.1 3.8-1.9 3.8.7 0 .5-.3 4.4-.5 5-.6 2.2-2.9 2.8-4.9 2.4 3.5.6 4.4 2.6 2.5 4.6-3.7 3.8-5.3-1-5.7-2.2 0-.2-.1-.4-.1-.3 0-.1-.1.1-.1.3-.4 1.2-2 6-5.7 2.2-1.9-2-1-4 2.5-4.6-2 .3-4.3-.2-4.9-2.4-.2-.6-.5-4.5-.5-5 0-2.6 2.3-1.8 3.8-.7z" fill="currentColor"/>',
    x: '<path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    li: '<rect x="5" y="9.5" width="3" height="9" fill="currentColor"/><circle cx="6.5" cy="6.4" r="1.7" fill="currentColor"/><path d="M10.5 9.5h2.8v1.3c.5-.9 1.6-1.6 3-1.6 2.4 0 3.2 1.5 3.2 3.9v5.4h-3v-4.8c0-1.1-.2-2-1.4-2s-1.6.9-1.6 2v4.8h-3z" fill="currentColor"/>',
    th: '<path d="M15.6 11.4c-.1-2.1-1.4-3.3-3.4-3.3-1.3 0-2.4.6-3 1.6l1.3.9c.4-.7 1-1 1.7-1 1 0 1.6.6 1.7 1.6-.6-.1-1.3-.2-2-.1-2 .1-3.3 1.3-3.2 2.9.1 1.6 1.5 2.6 3.2 2.5 2.4-.1 3.3-2 3.4-3.8.7.4 1.2 1 1.4 1.8.4 1.4-.2 3-1.5 4.1-2.4 2-6.9 1.6-8.3-1.5-1.1-2.3-1-6 .1-8.2 1.3-2.7 4.8-3.6 7.5-2.6 1.6.6 2.7 1.8 3.2 3.4l1.6-.4c-.6-2.1-2.1-3.7-4.2-4.5-3.5-1.3-7.8 0-9.5 3.4C4.7 10.9 4.7 15.3 6 18c1.8 3.9 7.4 4.6 10.5 2 1.8-1.5 2.6-3.7 2-5.8-.4-1.4-1.4-2.4-2.9-2.8zm-3.8 3.9c-.9 0-1.6-.4-1.6-1.1 0-.7.8-1.3 1.8-1.3.6 0 1.2 0 1.8.2-.1 1.4-.9 2.2-2 2.2z" fill="currentColor"/>',
    rd: '<circle cx="12" cy="13" r="6.5" fill="currentColor"/><circle cx="17.5" cy="6" r="1.5" fill="currentColor"/><path d="M12 6.5l1-3.2 4 1" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="9.6" cy="12.5" r="1.1" fill="#fff"/><circle cx="14.4" cy="12.5" r="1.1" fill="#fff"/><path d="M9.6 15.3c1.4 1 3.4 1 4.8 0" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>',
    dl: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'
  };
const OPTS = [
  ["image", "Download image", "dl", true],
  ["whatsapp", "WhatsApp", "wa"], ["wastory", "WhatsApp Status", "story", true],
  ["instagram", "Instagram", "ig", true], ["igstory", "Instagram Story", "igs", true],
  ["copy", "Copy link", "link"], ["email", "Email", "mail"], ["facebook", "Facebook", "fb"],
  ["bluesky", "Bluesky", "bsky"], ["x", "X", "x"], ["linkedin", "LinkedIn", "li"], ["threads", "Threads", "th"], ["reddit", "Reddit", "rd"]
];
  const noImage = btn.closest(".sm").hasAttribute("data-noimage"); // e.g. Coalitions: links only, nothing to download
  menu.innerHTML = `<p class="sm-h">Share options</p><p class="sm-note" hidden></p>` + OPTS.filter((o) => !(noImage && o[3])).map(([k, l, ic, img]) =>
    `<a class="sm-item" data-k="${k}" href="#" target="_blank" rel="noopener"${img ? ' data-img="1"' : ""}><span class="sm-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${I[ic]}</svg></span>${l}</a>`).join("");
  const note = menu.querySelector(".sm-note");
  const say = (t) => { note.textContent = t; note.hidden = !t; };

  function context() {
    const area = (document.querySelector("#rs-nat-h b") || {}).textContent;
    const where = area && area !== "National results" ? area : ((document.querySelector(".rf-h b") || {}).textContent || "South Africa");
    // the home page shares its plain address; Mayors and Coalitions share the city or story that is open
    const url = document.querySelector(".rs-grid") ? location.href.split("#")[0] : location.href;
    // the title shown when the site is shared; the same wording is in each page's og:title
    const text = "PREAMBLE | South Africa's Global and Local Data";
    return { url, text };
  }
  function hrefs() {
    const { url, text } = context(), u = encodeURIComponent(url), t = encodeURIComponent(text);
    return {
      email: `mailto:?subject=${t}&body=${encodeURIComponent(text + "\n" + url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      bluesky: `https://bsky.app/intent/compose?text=${encodeURIComponent(text + " " + url)}`,
      x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      threads: `https://www.threads.net/intent/post?text=${encodeURIComponent(text + " " + url)}`,
      reddit: `https://www.reddit.com/submit?url=${u}&title=${t}`
    };
  }
  function open() {
    const h = hrefs();
    menu.querySelectorAll(".sm-item").forEach((a) => { a.href = h[a.dataset.k] || "#"; if (!h[a.dataset.k]) a.removeAttribute("target"); });
    const mail = menu.querySelector('[data-k="email"]'); if (mail) mail.removeAttribute("target"); // a mail link should not leave an empty tab behind
    say(""); menu.hidden = false; btn.setAttribute("aria-expanded", "true");
    prepare();
  }
  // The share image is drawn as soon as the menu opens. Phones only allow the share sheet to open directly
  // from a tap, so the image has to be ready before the tap: drawing it after the tap made the phone refuse
  // the share sheet, and the image was downloaded instead.
  let card = null, cardP = Promise.resolve(null);
  function prepare() {
    const S = window.SHARE || {};
    const data = S.card ? S.card() : S.council ? S.council() : S.race ? S.race() : null;
    card = null;
    cardP = !data ? Promise.resolve(null) : window.ShareCard.render(data)
      .then((canvas) => new Promise((r) => canvas.toBlob(r, "image/png")))
      .then((blob) => (card = { blob, file: new File([blob], (data.file || "results") + ".png", { type: "image/png" }) }))
      .catch(() => null);
    return cardP;
  }
  function save(c) {
    const dl = document.createElement("a"); dl.href = URL.createObjectURL(c.blob); dl.download = c.file.name;
    document.body.appendChild(dl); dl.click(); dl.remove(); setTimeout(() => URL.revokeObjectURL(dl.href), 4000);
  }
  function close() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
  btn.addEventListener("click", (e) => { e.stopPropagation(); menu.hidden ? open() : close(); });
  document.addEventListener("click", (e) => { if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  menu.addEventListener("click", async (e) => {
    const a = e.target.closest(".sm-item"); if (!a) return;
    const k = a.dataset.k;
    if (k === "copy") {
      e.preventDefault();
      const { url } = context();
      try { await navigator.clipboard.writeText(url); say("Link copied."); } catch (err) { say(url); }
      return;
    }
    if (!a.dataset.img) return; // link options open the app's own share page
    e.preventDefault();
    const label = a.textContent.trim();
    if (k === "image") { // plain download
      say("Making the image…");
      const c = card || await cardP;
      if (!c) { say("Could not make the image. Please try again."); return; }
      save(c); say("Image saved.");
      return;
    }
    // WhatsApp Status, Instagram and Instagram Story: hand the image to the phone's share sheet
    const pick = { wastory: "WhatsApp, then My status", instagram: "Instagram, then Feed", igstory: "Instagram, then Story" }[k];
    if (!card) { // still being drawn: no waiting inside the tap, or the phone blocks the share sheet
      say("Getting the image ready…");
      cardP.then((c) => say(c ? `Image ready. Tap ${label} again.` : "Could not make the image. Please try again."));
      return;
    }
    const c = card;
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [c.file] })) {
      say(`In the share sheet, choose ${pick}.`);
      navigator.share({ files: [c.file] }).then(() => { say(""); close(); }).catch((err) => {
        if (err && err.name === "AbortError") say("");
        else if (err && err.name === "NotAllowedError") say(`Tap ${label} again.`);
        else { save(c); say(`Image saved. Open ${pick.split(",")[0]} on your phone and add it from your photos.`); }
      });
      return;
    }
    // computers (and browsers with no share sheet): these apps only post from the phone
    save(c);
    say(`Image saved. ${label} can only be posted from the phone app: open preamble.co.za on your phone and tap Share, or send this image to your phone.`);
  });
})();

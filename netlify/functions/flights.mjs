// Live aircraft over South Africa for the SAFFA Flights tab, served at /api/flights.
// Positions come from adsb.lol (open ADS-B data from volunteer receivers, ODbL). adsb.lol does not allow browser
// requests from other sites and limits each caller to about 500 requests a day, so this function fetches three
// circles of airspace (around Johannesburg, Cape Town and Durban) and Netlify's CDN keeps one shared copy for a few
// minutes: at most a few hundred upstream requests a day however many people are looking.
const POINTS = [[-26.14, 28.25, 250], [-33.97, 18.6, 250], [-29.61, 31.12, 250]]; // lat, lon, radius in nautical miles
const FRESH = 300; // seconds the CDN serves the same copy

export default async () => {
  const seen = new Map();
  const results = await Promise.allSettled(POINTS.map(([la, lo, r]) =>
    fetch(`https://api.adsb.lol/v2/point/${la}/${lo}/${r}`, { headers: { "User-Agent": "preamble.co.za SAFFA flights" }, signal: AbortSignal.timeout(8000) })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("adsb.lol " + res.status))))));
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const a of r.value.ac || []) {
      if (a.lat == null || a.lon == null || seen.has(a.hex)) continue;
      seen.set(a.hex, {
        c: (a.flight || "").trim(), t: a.t || "", r: a.r || "",
        ll: [Math.round(a.lon * 1000) / 1000, Math.round(a.lat * 1000) / 1000],
        alt: a.alt_baro === "ground" ? 0 : a.alt_baro ?? null, trk: a.track ?? a.true_heading ?? null, gs: a.gs ?? null
      });
    }
  }
  const ok = results.some((r) => r.status === "fulfilled");
  return new Response(JSON.stringify({ at: new Date().toISOString(), ok, ac: [...seen.values()] }), {
    status: ok ? 200 : 502,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      // one shared copy at Netlify's edge for FRESH seconds, then served stale while it refreshes in the background
      "Netlify-CDN-Cache-Control": ok ? `public, durable, s-maxage=${FRESH}, stale-while-revalidate=120` : "no-store"
    }
  });
};

export const config = { path: "/api/flights" };

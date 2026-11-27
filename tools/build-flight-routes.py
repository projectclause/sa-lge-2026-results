# Builds data/flight-routes.json: every scheduled callsign that flies into or out of a South African airport
# (ICAO codes starting FA), with the airports and airlines it needs. The SAFFA Flights tab matches live aircraft
# against it, so it can tell a flight to or from South Africa from one just passing over.
#
# Source: Virtual Radar Server standing data, CC0 (https://github.com/vradarserver/standing-data).
# Usage: git clone --depth 1 https://github.com/vradarserver/standing-data.git /tmp/vrs
#        python3 tools/build-flight-routes.py /tmp/vrs
import csv, glob, json, os, sys

src = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rows(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        yield from csv.DictReader(f)


routes, used = {}, set()
for path in glob.glob(os.path.join(src, "routes/schema-01/*/*.csv")):
    for r in rows(path):
        codes = (r.get("AirportCodes") or "").split("-")
        if len(codes) < 2 or not any(c.startswith("FA") for c in codes):
            continue
        routes[r["Callsign"]] = "-".join(codes)
        used.update(codes)

airports = {}
for path in glob.glob(os.path.join(src, "airports/schema-01/*/*.csv")):
    for r in rows(path):
        if r["ICAO"] in used and r["Latitude"]:
            airports[r["ICAO"]] = [r["Name"], r["Location"], r["IATA"], r["CountryISO2"],
                                   round(float(r["Latitude"]), 3), round(float(r["Longitude"]), 3)]

need = {c[:3] for c in routes}
airlines = {r["ICAO"]: r["Name"] for r in rows(os.path.join(src, "airlines/schema-01/airlines.csv")) if r["ICAO"] in need}

# drop routes whose airports we cannot place on the globe
routes = {k: v for k, v in sorted(routes.items()) if all(c in airports for c in v.split("-"))}
out = {"note": "Built by tools/build-flight-routes.py from Virtual Radar Server standing data (CC0). Routes that touch a South African airport.",
       "airports": dict(sorted(airports.items())), "airlines": dict(sorted(airlines.items())), "routes": routes}
with open(os.path.join(root, "data/flight-routes.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
print(len(routes), "routes,", len(airports), "airports,", len(airlines), "airlines")

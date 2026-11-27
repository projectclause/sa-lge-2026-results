# Flights snapshot for the SAFFA Flights tab: aircraft in the air over South Africa, written each hour to
# data/flights-live.json by the hourly GitHub Action.
#
# Positions come from adsb.lol (open ADS-B data from volunteer receivers, ODbL), in three 250-nautical-mile circles
# around Johannesburg, Cape Town and Durban. The site is static (GitHub Pages) and adsb.lol does not allow browser
# requests from other sites, so the page reads this snapshot rather than asking adsb.lol itself. The page matches
# each callsign against data/flight-routes.json to keep only flights into, out of or within South Africa.
#
# If every request fails, the previous snapshot is left as it is.
require "json"
require "net/http"
require "time"

ROOT = File.expand_path("..", __dir__)
OUT = File.join(ROOT, "data/flights-live.json")
POINTS = [[-26.14, 28.25], [-33.97, 18.6], [-29.61, 31.12]].freeze

seen = {}
ok = false
POINTS.each_with_index do |(lat, lon), i|
  sleep 2 if i.positive? # stay well inside adsb.lol's rate limit
  uri = URI("https://api.adsb.lol/v2/point/#{lat}/#{lon}/250")
  begin
    get = lambda do
      Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 10, read_timeout: 20) do |h|
        h.get(uri.request_uri, "User-Agent" => "preamble.co.za SAFFA flights", "Accept" => "application/json")
      end
    end
    res = get.call
    if res.code == "429" # rate-limited: wait and try once more
      sleep 8
      res = get.call
    end
    unless res.is_a?(Net::HTTPSuccess)
      puts "Flights: adsb.lol #{res.code} for #{lat},#{lon}"
      next
    end
    ok = true
    (JSON.parse(res.body)["ac"] || []).each do |a|
      next if a["lat"].nil? || a["lon"].nil? || seen.key?(a["hex"])
      alt = a["alt_baro"] == "ground" ? 0 : a["alt_baro"]
      seen[a["hex"]] = { "c" => a["flight"].to_s.strip, "t" => a["t"].to_s, "r" => a["r"].to_s,
                         "ll" => [a["lon"].round(3), a["lat"].round(3)], "alt" => alt,
                         "trk" => a["track"] || a["true_heading"], "gs" => a["gs"] }
    end
  rescue StandardError => e
    puts "Flights: #{e.class} for #{lat},#{lon}: #{e.message}"
  end
end

unless ok
  puts "Flights: no data this hour; keeping the last snapshot"
  exit 0
end

File.write(OUT, JSON.generate({ "at" => Time.now.utc.iso8601, "ok" => true, "ac" => seen.values }) + "\n")
puts "Flights: #{seen.size} aircraft written"

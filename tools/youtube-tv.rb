# YouTube TV: hourly view counts for the voices with their own YouTube channel (Coalitions Tracker > Voices > YouTube TV).
# For each channel in data/coalition-feed.json (youtube_tv.channels) it reads YouTube's public channel feed, adds up the
# views of the videos posted in the past 7 days, ranks the channels by that total and writes data/youtube-tv.json, which
# the page uses in place of the hand-written ranking. The feed lists a channel's latest 15 videos, so a channel that posts
# more than 15 a week shows at least that many views. If a feed can't be read, that channel keeps its last figure.
require "json"
require "net/http"
require "time"

ROOT = File.expand_path("..", __dir__)
CFG = JSON.parse(File.read(File.join(ROOT, "data/coalition-feed.json")))["youtube_tv"] || {}
OUT = File.join(ROOT, "data/youtube-tv.json")
old = (JSON.parse(File.read(OUT)) rescue {})
NOW = Time.now.utc

def get(url)
  uri = URI(url)
  px = (ENV["https_proxy"] || ENV["HTTPS_PROXY"]).to_s.empty? ? nil : URI(ENV["https_proxy"] || ENV["HTTPS_PROXY"])
  http = px ? Net::HTTP.new(uri.host, uri.port, px.host, px.port, px.user, px.password) : Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true; http.open_timeout = 15; http.read_timeout = 25
  2.times do |n|
    res = http.start { |h| h.get(uri.request_uri, "User-Agent" => "Mozilla/5.0 (compatible; preamble-tracker/1.0)") }
    return res.body.force_encoding("UTF-8") if res.is_a?(Net::HTTPSuccess)
    warn "  #{res.code} for #{url}"
    sleep 2 * (n + 1)
  rescue StandardError => e
    warn "  #{e.class} for #{url}"
    sleep 2 * (n + 1)
  end
  nil
end

def short(n) = n >= 1_000_000 ? format("%.2fM", n / 1e6).sub(/\.?0+M\z/, "M") : n >= 1000 ? "#{(n / 1000.0).round}K" : n.to_s

raw = {}
(CFG["channels"] || {}).each do |k, id|
  xml = get("https://www.youtube.com/feeds/videos.xml?channel_id=#{id}")
  if xml.nil? || !xml.include?("<entry>")
    raw[k] = old.dig("raw", k) if old.dig("raw", k) # keep the last good figure
    next
  end
  week = xml.scan(%r{<entry>(.*?)</entry>}m).sum do |(e)|
    t = (Time.parse(e[%r{<published>(.*?)</published>}, 1]) rescue nil)
    t && NOW - t <= 7 * 86_400 ? e[/views="(\d+)"/, 1].to_i : 0
  end
  raw[k] = week
  warn "#{k}: #{week} views this week"
  sleep 0.3
end
abort "youtube-tv: no channel could be read; leaving #{OUT} as it is" if raw.empty?

order = raw.keys.sort_by { |k| -raw[k] }
sast = NOW.getlocal("+02:00")
out = { "updated" => sast.strftime("%F"), "checked" => sast.iso8601, "order" => order,
        "views7" => order.to_h { |k| [k, short(raw[k])] }, "raw" => raw }
# only write when the figures move, so an unchanged hour makes no commit
File.write(OUT, JSON.pretty_generate(out) + "\n") unless old["raw"] == out["raw"] && old["order"] == out["order"]

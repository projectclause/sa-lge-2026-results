# SAFFA Key South Africans: the latest three news articles about each person in data/saffa-key.json,
# from Google News RSS, written to data/saffa-key-news.json. Runs hourly with the Coalitions Tracker update.
require "json"
require "net/http"
require "cgi"
require "time"

ROOT = File.expand_path("..", __dir__)
PEOPLE = JSON.parse(File.read(File.join(ROOT, "data/saffa-key.json")))
OUT = File.join(ROOT, "data/saffa-key-news.json")
old = (JSON.parse(File.read(OUT)) rescue { "people" => {} })

def get(url)
  3.times do |n|
    uri = URI(url)
    px = (ENV["https_proxy"] || ENV["HTTPS_PROXY"]).to_s.empty? ? nil : URI(ENV["https_proxy"] || ENV["HTTPS_PROXY"])
    http = px ? Net::HTTP.new(uri.host, uri.port, px.host, px.port, px.user, px.password) : Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 15
    http.read_timeout = 20
    res = http.start { |h| h.get(uri.request_uri, "User-Agent" => "Mozilla/5.0 (compatible; preamble-saffa/1.0)") }
    return res.body.force_encoding("UTF-8") if res.is_a?(Net::HTTPSuccess)
    warn "  #{res.code} for #{uri.host}"
  rescue StandardError => e
    warn "  #{e.class} for #{url}"
    sleep(2 * (n + 1))
  end
  nil
end

def tag(b, n)
  v = b[%r{<#{n}(?:\s[^>]*)?>(.*?)</#{n}>}m, 1].to_s.strip.sub(/\A<!\[CDATA\[(.*)\]\]>\z/m, '\1')
  CGI.unescapeHTML(v).strip
end

# reference pages, old clips and listings that Google News files as news
JUNK = /net worth|MRC Video|wikipedia|\A(19|20)\d\d |tickets|events to look forward|horoscope|quiz/i

out = { "updated" => Time.now.getlocal("+02:00").iso8601, "people" => {} }
PEOPLE.each do |p|
  url = "https://news.google.com/rss/search?q=#{CGI.escape("#{p["q"]} when:7d")}&hl=en-ZA&gl=ZA&ceid=ZA:en"
  xml = get(url)
  items = (xml || "").scan(%r{<item>(.*?)</item>}m).map do |(b)|
    src = tag(b, "source")
    t = (Time.parse(tag(b, "pubDate")) rescue nil)
    { "h" => tag(b, "title").sub(/\s+-\s+#{Regexp.escape(src)}\z/, ""), "url" => tag(b, "link"), "src" => src,
      "t" => t&.getlocal("+02:00")&.iso8601 }
  end.select { |x| x["t"] && !x["h"].empty? && !x["url"].empty? && !(JUNK =~ "#{x["h"]} | #{x["src"]}") }
  # newest first, one per outlet, three in all; only headlines that name the person (passing mentions only if there are none)
  seen = {}
  last = p["n"].split.last.downcase
  named = items.select { |x| x["h"].downcase.include?(last) }
  top = (named.empty? ? items : named).sort_by { |x| x["t"] }.reverse
             .select { |x| seen[x["src"]] ? false : (seen[x["src"]] = true) }.first(3)
  top = old.dig("people", p["id"]) || [] if top.empty? # keep the last good list if the feed fails
  out["people"][p["id"]] = top
  warn "#{p["n"]}: #{top.size} articles"
  sleep 0.5
end
same = old["people"] == out["people"]
File.write(OUT, JSON.pretty_generate(same ? old : out) + "\n")

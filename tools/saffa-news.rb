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
JUNK = /net worth|MRC Video|mp3|download|lyrics|wikipedia|\A(19|20)\d\d |tickets|events to look forward|horoscope|quiz/i

out = { "updated" => Time.now.getlocal("+02:00").iso8601, "people" => {}, "week" => {} }
def articles(q, days)
  xml = get("https://news.google.com/rss/search?q=#{CGI.escape("#{q} when:#{days}d")}&hl=en-ZA&gl=ZA&ceid=ZA:en")
  (xml || "").scan(%r{<item>(.*?)</item>}m).map do |(b)|
    src = tag(b, "source")
    t = (Time.parse(tag(b, "pubDate")) rescue nil)
    { "h" => tag(b, "title").sub(/\s+-\s+#{Regexp.escape(src)}\z/, ""), "url" => tag(b, "link"), "src" => src,
      "t" => t&.getlocal("+02:00")&.iso8601 }
  end.select { |x| x["t"] && !x["h"].empty? && !x["url"].empty? && !(JUNK =~ "#{x["h"]} | #{x["src"]}") }
end

# newest first, one per outlet, three in all
def pick(list)
  seen = {}
  list.sort_by { |x| x["t"] }.reverse.select { |x| seen[x["src"]] ? false : (seen[x["src"]] = true) }.first(3)
end

PEOPLE.each do |p|
  last = p["n"].split.last.downcase
  named = ->(xs) { xs.select { |x| x["h"].downcase.include?(last) } } # only headlines that name the person
  since = (Time.now - 7 * 86_400).getlocal("+02:00").iso8601
  week = named.(articles(p["q"], 7)).select { |x| x["t"] >= since } # Google’s when:7d lets older pieces through
  top = pick(week)
  top = pick(week + named.(articles(p["q"], 30))) if top.size < 3 # a quiet week: fill from the past month
  top = pick(top + named.(articles(p["q"], 365))) if top.size < 3 # a quiet month: fill from the past year
  if top.empty? # keep the last good list if the feed fails
    top = old.dig("people", p["id"]) || []
    out["week"][p["id"]] = old.dig("week", p["id"]) || 0
  else # how many articles named them in the past 7 days (Google News returns up to 100)
    out["week"][p["id"]] = week.map { |x| x["h"].downcase }.uniq.size
  end
  out["people"][p["id"]] = top
  warn "#{p["n"]}: #{top.size} articles, #{out["week"][p["id"]]} this week"
  sleep 0.5
end
same = old["people"] == out["people"] && old["week"] == out["week"]
File.write(OUT, JSON.pretty_generate(same ? old : out) + "\n")

# Right of reply on the Coalitions Tracker: for each key player, finds their most recent published response
# (a denial, rejection or reply) in a trusted outlet's headline, and writes data/coalition-replies.json. The page
# shows it on the player's card, quoted word for word and credited, like the Madlanga tracker's response lines.
# Same guardrails as tools/madlanga-update.rb: trusted outlets only; opinion, rumour, questions and headlines that
# state guilt are held back; the headline must name the person and use a response word.
require "json"
require "net/http"
require "time"
require "cgi"

ROOT = File.expand_path("..", __dir__)
FEED = JSON.parse(File.read(File.join(ROOT, "data/coalition-feed.json")))
OUT = File.join(ROOT, "data/coalition-replies.json")
old = (JSON.parse(File.read(OUT)) rescue {})
NOW = Time.now.utc

TRUSTED = ["News24", "Daily Maverick", "IOL", "EWN", "SABC News", "eNCA", "TimesLIVE", "Mail & Guardian", "Sowetan",
           "The Citizen", "Business Day", "Sunday Times", "The National", "Sunday World", "The Witness", "Cape Times",
           "Cape Argus", "The Star", "Daily Dispatch", "City Press", "Reuters", "Bloomberg", "BusinessTech", "Jacaranda FM",
           "Newzroom Afrika", "702", "Pretoria News"].freeze
ALIAS = { /sabc/i => "SABC News", /^thenational|the national/i => "The National", /sunday world/i => "Sunday World",
          /mail ?& ?guardian/i => "Mail & Guardian", /^the witness/i => "The Witness", /thestar|^the star/i => "The Star",
          /^ewn|eyewitness/i => "EWN", /timeslive/i => "TimesLIVE", /^iol$|dailynews|themercury|the mercury/i => "IOL",
          /citizen/i => "The Citizen", /news24/i => "News24", /pretoria news/i => "Pretoria News" }.freeze
def outlet(src)
  s = src.to_s.strip
  return s if TRUSTED.include?(s)
  ALIAS.each { |re, n| return n if s =~ re }
  nil
end

def get(url)
  uri = URI(url)
  px = (ENV["https_proxy"] || ENV["HTTPS_PROXY"]).to_s.empty? ? nil : URI(ENV["https_proxy"] || ENV["HTTPS_PROXY"])
  http = px ? Net::HTTP.new(uri.host, uri.port, px.host, px.port, px.user, px.password) : Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true; http.open_timeout = 15; http.read_timeout = 25
  res = http.start { |h| h.get(uri.request_uri, "User-Agent" => "Mozilla/5.0 (compatible; preamble-tracker/1.0)") }
  res.is_a?(Net::HTTPSuccess) ? res.body.force_encoding("UTF-8") : nil
rescue StandardError => e
  warn "  #{e.class} for #{url}"
  nil
end

RESP = /\b(denies|denied|rejects|rejected|disputes|hits back|fires back|responds to|dismisses (?:claims|allegations|reports))\b/i
OPINION = /\A\s*(opinion|analysis|editorial|comment|column|op-ed|letter|explainer|cartoon)\b|\b(opinion|analysis|editorial)\s*[|:]|moegoe/i
RUMOUR = /\b(sources? (?:say|said|claim)|insiders?|rumou?rs?|reportedly|speculat\w*)\b/i
GUILT = /\b(liars?|corrupt|criminals?|murderers?|killers?|crooks?|thie(?:f|ves)|guilty)\b/i
QUALIFIED = /\b(alleged(?:ly)?|accused|claims?|allegations?|denies|denied|says|said)\b/i
SEX = /\b(rape[ds]?|sexual|molest\w*)\b/i
CHILD = /\b(child(?:ren)?|minors?|\d{1,2}-year-old)\b/i
def blocked?(h)
  h.include?("?") || h =~ OPINION || h =~ RUMOUR || h =~ SEX || h =~ CHILD || (h =~ GUILT && h !~ QUALIFIED)
end

out = {}
players = (FEED["journalists"] || {}).select { |_, p| p["group"] == "player" }
players.each do |k, p|
  name = p["n"].to_s
  surname = name.split(/\s+/).last.to_s
  next if surname.length < 4
  xml = get("https://news.google.com/rss/search?q=#{CGI.escape("\"#{name}\" (denies OR rejects OR \"hits back\" OR disputes OR responds) when:14d")}&hl=en-ZA&gl=ZA&ceid=ZA:en")
  best = nil
  (xml || "").scan(%r{<item>(.*?)</item>}m).each do |(it)|
    t = CGI.unescapeHTML(it[%r{<title>(.*?)</title>}m, 1].to_s)
    src = CGI.unescapeHTML(it[%r{<source[^>]*>(.*?)</source>}m, 1].to_s)
    src = t[/ - ([^-]+)\z/, 1].to_s.strip if src.empty?
    h = t.sub(/ - [^-]+\z/, "").strip
    o = outlet(src) or next
    # the person must be the one responding: their name comes just before the response word (e.g. "Mashaba denies…")
    subj = /\b#{Regexp.escape(surname)}(?:’s|'s)?\s+(?:[^\s,]+\s+){0,2}?#{RESP.source}/i
    pos = h.split(/\s+/).index { |w| w =~ /\A#{Regexp.escape(surname)}/ }
    next unless h =~ subj && pos && pos <= 3 && !blocked?(h)
    d = (Time.parse(it[%r{<pubDate>(.*?)</pubDate>}m, 1]).utc rescue nil) or next
    best = { "src" => o, "h" => h, "url" => it[%r{<link>(.*?)</link>}m, 1].to_s.strip, "d" => d.iso8601 } if !best || d.iso8601 > best["d"]
  end
  prev = old[k]
  best ||= prev if prev && Time.parse(prev["d"]) > NOW - 30 * 86_400
  out[k] = best if best
  sleep 0.5
end
File.write(OUT, JSON.pretty_generate(out) + "\n")
puts "Coalition replies: #{out.size} of #{players.size} key players have a recent published response"
out.each { |k, r| puts "  #{k}: #{r['src']}: #{r['h']}" }

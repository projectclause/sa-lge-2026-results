# Mayor watch: checks the news each hour for Herman Mashaba being elected Mayor of Johannesburg.
# When at least two different outlets report in their headline that he has been elected (not that he is "set to",
# "tipped", "poised" or "expected" to be), it writes data/mayors-elected.json with the date and the reports. The home
# page headline ("Mashaba Makes History"), the ticker card, the Mayors page and search then switch by themselves.
# Once set, it is never unset by this script; a person can edit the file by hand if a report turns out to be wrong.
require "json"
require "net/http"
require "time"
require "cgi"

ROOT = File.expand_path("..", __dir__)
OUT = File.join(ROOT, "data/mayors-elected.json")
data = JSON.parse(File.read(OUT)) rescue { "JHB" => { "elected" => false } }
exit 0 if data.dig("JHB", "elected")

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

YES = /\bMashaba\b.{0,60}\b(elected|sworn in|voted in|inaugurated|wins|clinches|secures|returns as|back as|officially|is (?:the )?new|named)\b.{0,40}\bmayor\b|\bmayor\b.{0,20}\bMashaba\b.{0,30}\b(elected|sworn in|voted in|inaugurated)\b|\bnew (?:Joburg|Johannesburg) mayor\b.{0,30}\bMashaba\b|\belects\b.{0,30}\bMashaba\b.{0,30}\bmayor\b/i
NOT = /\b(set to|to elect|to vote|vote for|poised|tipped|expected|could|may|might|bid|will|to be|likely|ahead of|race|eyes|path|hopes?|wants?|plans?|vows?|if|before|nears?|close in|fails?|blocked|delay|postpone|uncertain|threat|risk)\b|\?/i

found = {}
["Mashaba elected mayor", "Mashaba Johannesburg mayor", "Joburg new mayor Mashaba"].each do |q|
  xml = get("https://news.google.com/rss/search?q=#{CGI.escape(q + ' when:2d')}&hl=en-ZA&gl=ZA&ceid=ZA:en") or next
  xml.scan(%r{<item>(.*?)</item>}m).each do |(it)|
    t = CGI.unescapeHTML(it[%r{<title>(.*?)</title>}m, 1].to_s)
    src = t[/ - ([^-]+)\z/, 1].to_s.strip
    head = t.sub(/ - [^-]+\z/, "")
    next unless head =~ YES && head !~ NOT
    pub = (Time.parse(it[%r{<pubDate>(.*?)</pubDate>}m, 1]) rescue nil)
    found[src.downcase] ||= { "src" => src, "h" => head, "d" => pub&.utc&.iso8601, "url" => it[%r{<link>(.*?)</link>}m, 1].to_s }
  end
end

puts "Mayor watch: #{found.size} outlet(s) report Mashaba elected"
found.each_value { |f| puts "  #{f['src']}: #{f['h']}" }
exit 0 if found.size < 2

first = found.values.map { |f| f["d"] }.compact.min || Time.now.utc.iso8601
day = Time.parse(first).getlocal("+02:00")
data["JHB"] = { "elected" => true, "n" => "Herman Mashaba", "p" => "ASA", "date" => day.strftime("%Y-%m-%d"),
                "when" => day.strftime("%A, %-d %B %Y"), "reports" => found.values.first(5) }
File.write(OUT, JSON.pretty_generate(data) + "\n")
puts "Mayor watch: marked Mashaba elected (#{data['JHB']['when']})"

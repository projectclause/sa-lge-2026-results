# encoding: utf-8
# Hourly updater for the Coalitions Tracker. Run by .github/workflows/auto-update.yml every hour; you can also run it
# yourself from the site folder:   ruby tools/auto-update.rb            (add --dry-run to see what it would add, writing nothing)
#
# What it does
#   1. Looks for new coalition coverage published in the last few days:
#        - Google News (South Africa) for every voice and key player on the tracker, and for the searches in
#          data/auto-sources.json ("queries");
#        - the YouTube channel of every voice who posts their own videos (found from their videos already on the
#          tracker, or listed in data/auto-sources.json "youtube").
#   2. Skips anything already on the tracker, anything it has looked at before, and anything not about the coalitions.
#   3. Sorts what is left:
#        - a piece by one of the tracker's voices, or one where a key player is the person speaking, becomes a new piece
#          for that person (so their count and their "latest piece" update);
#        - every report is put into the story it belongs to, or, when several outlets cover something no story covers
#          yet, into a new story with a short summary.
#      With ANTHROPIC_API_KEY set, Claude does the sorting and writes the summaries. Without it, simple rules do:
#      fewer pieces are attributed, and new stories get a plain list of headlines instead of a written summary.
#   4. Writes everything to data/coalition-auto.json. It never edits data/coalition-feed.json, so the editor's hand
#      edits and this job can never collide. The site joins the two files when it loads (js/feed.js, tools/feed.rb).
#
# To keep a piece or story for good, copy it into data/coalition-feed.json: once its link is in the feed, the hourly
# copy is dropped. To change a story the job wrote, add a story with the same id to the feed; the editor's version wins.
#
# Testing without the internet: AUTO_FIXTURES=<folder> reads feeds from files in that folder instead
# (gnews-<search words>.xml, yt-<channel id>.xml, ytpage-<person key>.xml).
Encoding.default_external = Encoding::UTF_8
Encoding.default_internal = Encoding::UTF_8
require "json"
require "net/http"
require "uri"
require "time"
require "digest"
require "cgi"
require "set"
require_relative "feed"

ROOT = File.expand_path("..", __dir__)
FEED_PATH = File.join(ROOT, "data/coalition-feed.json")
AUTO_PATH = File.join(ROOT, "data/coalition-auto.json")
SRC_PATH = File.join(ROOT, "data/auto-sources.json")
FIXTURES = ENV["AUTO_FIXTURES"]
DRY = ARGV.include?("--dry-run")
NOW = Time.now.getlocal("+02:00") # South African time
TODAY = NOW.strftime("%F")
ELECTION = "2026-11-04"
MAX_AGE = 3        # days: only pieces published this recently are considered
MAX_NEW = 40       # most pieces or reports added in one run
MODEL = ENV["AUTO_MODEL"] || "claude-opus-5-5"

def log(s) = $stderr.puts(s)
def key(h) = h.to_s.downcase.gsub(/[^a-z0-9]+/, " ").strip
def slug(s) = s.to_s.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/\A-|-\z/, "")[0, 60]
def jread(p, default) = File.exist?(p) ? JSON.parse(File.read(p)) : default
def norm_src(s) = s.to_s.downcase.sub(/\A(the|www\.)\s*/, "").gsub(/[^a-z0-9]/, "")

feed = jread(FEED_PATH, nil) or abort "data/coalition-feed.json is missing"
J = feed["journalists"]
auto = jread(AUTO_PATH, {})
%w[items events seen].each { |k| auto[k] ||= [] }
%w[attach coverage channels].each { |k| auto[k] ||= {} }
before = JSON.generate(auto)
src_cfg = jread(SRC_PATH, {})

# ---------- 1. tidy: drop what the editor has since added by hand ----------
hand_urls = feed["items"].map { |i| i["url"] }.to_set
feed["events"].each { |e| (e["coverage"] || []).each { |c| hand_urls << c["url"] } }
hand_events = feed["events"].map { |e| e["id"] }.to_set
gone = auto["items"].select { |i| hand_urls.include?(i["url"]) || !J[i["j"]] }.map { |i| i["id"] }.to_set
auto["items"].reject! { |i| gone.include?(i["id"]) }
auto["attach"].each_value { |l| l.reject! { |id| gone.include?(id) } }
auto["coverage"].each_value { |l| l.reject! { |c| hand_urls.include?(c["url"]) } }
auto["events"].reject! { |e| hand_events.include?(e["id"]) }
auto["events"].each { |e| e["items"].reject! { |id| gone.include?(id) }; e["coverage"].reject! { |c| hand_urls.include?(c["url"]) } }
auto["attach"].reject! { |eid, l| l.empty? || !hand_events.include?(eid) }
auto["coverage"].reject! { |eid, l| l.empty? || !hand_events.include?(eid) }

# everything already on the tracker, by link and by outlet + headline (Google News links differ from the outlet's own)
known = hand_urls.dup
known_h = Set.new
add_known = ->(x) { known << x["url"]; known_h << "#{norm_src(x["src"])}|#{key(x["h"])}" }
feed["items"].each(&add_known)
feed["events"].each { |e| (e["coverage"] || []).each(&add_known) }
auto["items"].each(&add_known)
auto["coverage"].each_value { |l| l.each(&add_known) }
auto["events"].each { |e| e["coverage"].each(&add_known) }
seen = auto["seen"].to_set

# ---------- 2. fetch ----------
def http_get(url, fixture = nil, tries = 3)
  if FIXTURES
    f = File.join(FIXTURES, (fixture || slug(url.sub(%r{\Ahttps?://}, ""))) + ".xml")
    return File.exist?(f) ? File.read(f) : nil
  end
  uri = URI(url)
  tries.times do |n|
    begin
      res = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 10, read_timeout: 20) do |h|
        h.get(uri.request_uri, "User-Agent" => "Mozilla/5.0 (compatible; PreambleTracker/1.0; +https://preamble.co.za)", "Accept-Language" => "en-ZA,en")
      end
      return res.body.force_encoding("UTF-8") if res.is_a?(Net::HTTPSuccess)
      if res.is_a?(Net::HTTPRedirection) && res["location"] then uri = URI.join(url, res["location"]); next end
      log "  #{res.code} from #{uri.host}"
      return nil if res.code.to_i == 404
    rescue StandardError => e
      log "  #{e.class} for #{uri.host}"
    end
    sleep(2 * (n + 1)) unless FIXTURES
  end
  nil
end

def tag(b, n)
  v = b[%r{<#{n}(?:\s[^>]*)?>(.*?)</#{n}>}m, 1].to_s.strip
  v = v.sub(/\A<!\[CDATA\[(.*)\]\]>\z/m, '\1')
  CGI.unescapeHTML(v).strip
end
def text(html) = CGI.unescapeHTML(html.to_s.gsub(/<[^>]+>/, " ")).gsub(/\s+/, " ").strip
def sast_day(t) = (Time.parse(t).getlocal("+02:00").strftime("%F") rescue nil)

def gnews(q)
  url = "https://news.google.com/rss/search?q=#{CGI.escape("#{q} when:#{MAX_AGE}d")}&hl=en-ZA&gl=ZA&ceid=ZA:en"
  xml = http_get(url, "gnews-#{slug(q)}") or return []
  xml.scan(%r{<item>(.*?)</item>}m).map do |(b)|
    src = tag(b, "source")
    h = tag(b, "title").sub(/\s+-\s+#{Regexp.escape(src)}\z/, "")
    { "h" => h, "url" => tag(b, "link"), "d" => sast_day(tag(b, "pubDate")), "src" => src, "desc" => text(tag(b, "description"))[0, 400] }
  end
end

def youtube(channel)
  xml = http_get("https://www.youtube.com/feeds/videos.xml?channel_id=#{channel}", "yt-#{channel}") or return []
  xml.scan(%r{<entry>(.*?)</entry>}m).map do |(b)|
    id = tag(b, "yt:videoId")
    { "h" => tag(b, "title"), "url" => "https://www.youtube.com/watch?v=#{id}", "d" => sast_day(tag(b, "published")), "src" => "YouTube",
      "desc" => tag(b, "media:description")[0, 400], "kind" => "Video" }
  end
end

# the voices' own YouTube channels: from config, or found once from one of their videos already on the tracker
(src_cfg["youtube"] || {}).each { |k, ch| auto["channels"][k] = { "id" => ch, "checked" => TODAY } }
feed["items"].select { |i| i["src"] == "YouTube" && J[i["j"]]&.dig("group") == "voice" }.group_by { |i| i["j"] }.each do |k, its|
  c = auto["channels"][k]
  next if c && (c["id"] || c["checked"].to_s > (NOW - 7 * 86_400).strftime("%F")) # no channel found: try again weekly
  page = http_get(its.max_by { |i| i["d"] }["url"], "ytpage-#{k}")
  id = page && (page[/"externalChannelId":"(UC[\w-]{22})"/, 1] || page[/itemprop="channelId" content="(UC[\w-]{22})"/, 1] || page[/"channelId":"(UC[\w-]{22})"/, 1])
  auto["channels"][k] = { "id" => id, "checked" => TODAY }
  log "YouTube channel for #{J[k]["n"]}: #{id || "not found"}"
end

COALITION = /coalition|mayor|speaker|council|govern|sitting|metro|hung|\bGNU\b|unity government|\bdeal\b|talks|negotiat|caucus|councillor|municipal|partners/i
POLITICS = /\bANC\b|\bDA\b|Democratic Alliance|ActionSA|\bEFF\b|\bMK\b|\bMKP\b|uMkhonto|\bIFP\b|Patriotic Alliance|FF ?Plus|Freedom Front|Zille|Mashaba|Ramaphosa|Malema|Johannesburg|Joburg|Tshwane|Ekurhuleni|eThekwini|Durban|Nelson Mandela Bay|Gqeberha|Buffalo City|Mangaung|Cape Town|metro/i
oldest = (NOW - MAX_AGE * 86_400).strftime("%F")
cands = {}
take = lambda do |x, via|
  next if x["url"].to_s.empty? || x["h"].to_s.empty? || x["d"].nil? || x["d"] < oldest || x["d"] < ELECTION || x["d"] > TODAY
  hk = "#{norm_src(x["src"])}|#{key(x["h"])}"
  next if known.include?(x["url"]) || known_h.include?(hk)
  sig = Digest::SHA1.hexdigest(hk)[0, 12]
  next if seen.include?(sig)
  c = (cands[hk] ||= x.merge("sig" => sig, "via" => []))
  c["via"] |= [via]
end

people = J.select { |_, p| %w[voice player].include?(p["group"]) }
log "Searching Google News for #{people.size} people and #{(src_cfg["queries"] || []).size} topics…"
people.each do |k, p|
  gnews(%("#{p["n"]}" (coalition OR mayor OR council OR metro))).each { |x| take.(x, k) }
  sleep 0.4 unless FIXTURES
end
(src_cfg["queries"] || []).each { |q| gnews(q).each { |x| take.(x, nil) }; sleep 0.4 unless FIXTURES }
auto["channels"].each { |k, c| c["id"] && youtube(c["id"]).each { |x| take.(x, "yt:#{k}") } }

# Google News searches already require coalition words in the article, so their results need only name a party, leader
# or metro; videos from the voices' own channels must also be about the coalitions
relevant = cands.values.select { |x| s = "#{x["h"]} #{x["desc"]}"; s =~ POLITICS && (s =~ COALITION || x["via"].any? { |v| !v.to_s.start_with?("yt:") }) }
relevant.select! { |x| x["src"] != "YouTube" || x["via"].any? { |v| v.to_s.start_with?("yt:") } } # stray YouTube results: only the voices' own channels
relevant = relevant.sort_by { |x| [x["d"], x["h"]] }.reverse.first(MAX_NEW * 2)
log "#{cands.size} new results, #{relevant.size} about the coalitions"

# ---------- 3. sort into people and stories ----------
outlet_of = ->(p) { p["role"].to_s.split(", ").last || p["o"] }
surname = ->(p) { p["n"].split(/\s+/).last.to_s.gsub(/[^\p{L}-]/, "") }
all_events = feed["events"] + auto["events"]
ev_by_id = all_events.to_h { |e| [e["id"], e] }
BY = feed["items"].to_h { |i| [i["id"], i] }.merge(auto["items"].to_h { |i| [i["id"], i] })
ev_updated = ->(e) { ((e["items"] || []).map { |id| BY[id]&.dig("d") }.compact + (e["coverage"] || []).map { |c| c["d"] }).max.to_s }

def rules_person(x, people, outlet_of, surname)
  yt = x["via"].find { |v| v.to_s.start_with?("yt:") }
  return [yt.sub("yt:", ""), "Video"] if yt
  x["via"].compact.each do |k|
    p = people[k] or next
    if p["group"] == "player"
      return [k, "Reported"] if surname.(p).size > 2 && x["h"].include?(surname.(p))
    elsif norm_src(x["src"]) == norm_src(outlet_of.(p)) || norm_src(x["src"]) == norm_src(p["o"])
      return [k, x["src"] =~ /702|CapeTalk|Kaya|Jacaranda|radio/i ? "Interview" : "Article"]
    end
  end
  nil
end

# without Claude: a report joins the story holding the most similar piece or report already on the tracker (headline
# words, weighted by how rare they are). Checked against the editor's own pieces, it picks the right story about 70% of
# the time when it picks one, and leaves the rest out.
STOPW = %w[south africa african party coalition coalitions talks with from about that this what will says said after over their
           have been into they more than when which would could should there where while just also only very much some other
           most such them then were your against amid ahead first last next government local elections election].to_set
toks = ->(s) { s.to_s.downcase.gsub(/[’']s\b/, "").scan(/[a-z][a-z-]{2,}/).reject { |w| STOPW.include?(w) }.to_set }
docs = all_events.flat_map do |e|
  (e["items"] || []).map { |id| (i = BY[id]) && [e["id"], toks.("#{i["h"]} #{i["s"]}")] }.compact +
    (e["coverage"] || []).map { |c| [e["id"], toks.(c["h"])] }
end
df = Hash.new(0); docs.each { |_, t| t.each { |w| df[w] += 1 } }
idf = ->(w) { Math.log((docs.size + 1.0) / (df[w] + 1)) }
weight = ->(t) { t.sum { |w| idf.(w) } }
rules_event = lambda do |x|
  q = toks.(x["h"]); qw = weight.(q)
  best = docs.map { |eid, t| i = q & t; [eid, i.empty? ? 0 : weight.(i) / Math.sqrt(qw * weight.(t) + 1e-9)] }.max_by { |_, v| v }
  best && best[1] >= 0.3 ? best[0] : nil
end

decisions = {} # sig -> { j, kind, event, place, s }
new_stories = {}
api_ok = false
if ENV["ANTHROPIC_API_KEY"].to_s.strip != "" && relevant.any?
  begin
    require "anthropic"
    recent_events = all_events.sort_by { |e| ev_updated.(e) }.reverse.first(25)
    ctx = {
      "stories" => recent_events.map { |e| { "id" => e["id"], "cat" => e["cat"], "place" => e["place"], "h" => e["h"], "dek" => e["dek"], "updated" => ev_updated.(e),
                                            "written_by" => e["auto"] ? "hourly job (you may rewrite it)" : "editor (do not rewrite)", "brief" => e["auto"] ? e["brief"] : nil }.compact },
      "people" => people.map { |k, p| { "key" => k, "name" => p["n"], "role" => p["role"], "type" => p["group"] == "player" ? "key player (politician)" : "voice (journalist or commentator)", "outlet" => outlet_of.(p) } },
      "new_results" => relevant.each_with_index.map { |x, n| { "n" => n, "date" => x["d"], "outlet" => x["src"], "headline" => x["h"], "text" => x["desc"], "found_by_searching_for" => x["via"].compact.map { |v| v.to_s.start_with?("yt:") ? "own YouTube channel of #{v[3..]}" : v } } }
    }
    schema = {
      type: "object", additionalProperties: false, required: %w[pieces stories],
      properties: {
        pieces: { type: "array", items: { type: "object", additionalProperties: false, required: %w[n keep j kind story place s],
          properties: { n: { type: "integer" }, keep: { type: "boolean" }, j: { type: "string" }, kind: { type: "string", enum: %w[Article Column Analysis Interview Video Podcast Post Statement Reported Report Show] },
                        story: { type: "string" }, place: { type: "string" }, s: { type: "string" } } } },
        stories: { type: "array", items: { type: "object", additionalProperties: false, required: %w[id cat place h dek brief],
          properties: { id: { type: "string" }, cat: { type: "string" }, place: { type: "string" }, h: { type: "string" }, dek: { type: "string" }, brief: { type: "array", items: { type: "string" } } } } }
      }
    }
    system = <<~SYS
      You sort news for Preamble's Coalitions Tracker, which follows the coalition talks after South Africa's 4 November 2026 local government elections.
      You get the tracker's current stories, the people it follows, and new search results. For every result return one entry in "pieces":
      - keep: true only if it is about the post-election coalition talks, council sittings, or who governs a municipality. Drop opinion pieces about unrelated topics, sport, crime and duplicates of each other (keep the first).
      - j: the key of a person from "people" only if the piece is BY that voice (their column, show, video or report), or a key player is the main person speaking in it (interview, statement, speech). A piece that only mentions someone gets "". Never guess.
      - story: the id of the existing story it belongs to; or the id of a new story you add to "stories"; or "" if it fits none and is not worth a story of its own.
      - place: where it happens, in the tracker's style (e.g. "Johannesburg", "Tshwane", "Gauteng metros", "eThekwini", "National").
      - s: one plain sentence saying what the piece reports or argues, using only the headline and text given. No opinions of your own.
      Make a new story only when at least two results from different outlets cover something no existing story covers. Give it a short lowercase id with hyphens, a cat (short section label like the existing ones), a place, a headline (h) in sentence case, a two-sentence dek, and 2 to 5 brief bullet points, all stated only from the results given. You may also return an updated version of a story marked as written by the hourly job (same id) when new results change it. Never return stories written by the editor.
      Write in plain British/South African English, like the existing stories. Be factual and neutral: attribute claims ("ActionSA says…").
    SYS
    client = Anthropic::Client.new(max_retries: 3, timeout: 300)
    msg = client.beta.messages.create(
      model: MODEL.to_sym, max_tokens: 16_000,
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default", # if this model declines, the API retries on a suitable one
      output_config: { effort: :medium, format_: { type: :json_schema, schema: schema } },
      system_: system,
      messages: [{ role: "user", content: JSON.generate(ctx) }]
    )
    raise "Claude declined (#{msg.stop_reason})" if msg.stop_reason.to_s == "refusal"
    raise "answer cut off" if msg.stop_reason.to_s == "max_tokens"
    out = JSON.parse(msg.content.select { |b| b.type.to_s == "text" }.map(&:text).join)
    out["stories"].each do |s|
      next if hand_events.include?(s["id"]) || s["h"].to_s.empty?
      new_stories[slug(s["id"])] = s.merge("id" => slug(s["id"]))
    end
    out["pieces"].each do |pc|
      x = relevant[pc["n"]] or next
      decisions[x["sig"]] = pc["keep"] ? { "j" => (J[pc["j"]] ? pc["j"] : nil), "kind" => pc["kind"], "event" => pc["story"].to_s, "place" => pc["place"], "s" => pc["s"] } : :drop
    end
    api_ok = true
    log "Claude sorted #{decisions.size} results (#{msg.usage.input_tokens} tokens in, #{msg.usage.output_tokens} out)"
  rescue LoadError
    log "The anthropic gem is not installed (gem install anthropic); using the simple rules"
  rescue StandardError => e
    log "Claude could not sort this hour's results (#{e.class}: #{e.message[0, 200]}); using the simple rules"
  end
end

unless api_ok
  places = (JSON.parse(File.read(File.join(ROOT, "data/municipalities.geojson")))["features"].map { |f| f["properties"]["name"] } rescue []) +
           %w[Johannesburg Tshwane Ekurhuleni eThekwini Durban Mangaung Nelson\ Mandela\ Bay Buffalo\ City Cape\ Town]
  places = places.compact.uniq.select { |n| n.size > 3 }.sort_by { |n| -n.size }
  loose = Hash.new { |h, k| h[k] = [] }
  relevant.each do |x|
    j, kind = rules_person(x, people, outlet_of, surname)
    ev = rules_event.(x)
    place = places.find { |n| x["h"].include?(n) } || (ev && ev_by_id[ev]["place"]) || "National"
    s = x["desc"].to_s.sub(/\A#{Regexp.escape(x["h"])}\s*/, "").sub(/\s*#{Regexp.escape(x["src"])}\z/, "").strip
    s = s.split(/(?<=[.!?])\s/).first.to_s[0, 240]
    s = "#{kind == "Video" ? "Video" : "Reported"} by #{x["src"]}." if s.size < 25
    decisions[x["sig"]] = { "j" => j, "kind" => kind || "Report", "event" => ev.to_s, "place" => place, "s" => s }
    loose[place] << x if ev.nil? && place != "National"
  end
  # several outlets on one place no story covers yet: a new story, a plain list of what each reported
  loose.each do |place, xs|
    next if xs.map { |x| x["src"] }.uniq.size < 2 || xs.size < 3
    id = "auto-#{slug(place)}"
    xs = xs.sort_by { |x| x["d"] }.reverse
    ex = ev_by_id[id]
    new_stories[id] = { "id" => id, "cat" => place, "place" => place, "h" => (ex && ex["h"]) || (xs.first["h"].include?(place) ? xs.first["h"] : "#{place}: #{xs.first["h"]}"),
                        "dek" => "#{xs.map { |x| x["src"] }.uniq.size} outlets are reporting on the coalition talks in #{place}. Preamble’s editors have not yet summarised this story; the latest reports are listed below.",
                        "brief" => xs.first(5).map { |x| "#{x["src"]}: #{x["h"]}" } }
    xs.each { |x| decisions[x["sig"]]["event"] = id }
  end
end

# ---------- 4. write ----------
added = { items: 0, reports: 0, stories: [] }
new_stories.each do |id, s|
  e = auto["events"].find { |x| x["id"] == id }
  fields = s.slice("cat", "place", "h", "dek", "brief").merge("auto" => true)
  if e then e.merge!(fields)
  else auto["events"] << fields.merge("id" => id, "items" => [], "coverage" => [], "sec" => [], "voices" => {}, "first" => TODAY); added[:stories] << id
  end
end
auto_ev = auto["events"].to_h { |e| [e["id"], e] }
relevant.each do |x|
  dec = decisions[x["sig"]]
  seen << x["sig"]
  next if dec.nil? || dec == :drop
  break if added[:items] + added[:reports] >= MAX_NEW
  ev = dec["event"].to_s
  ev = "" unless hand_events.include?(ev) || auto_ev[ev]
  if dec["j"]
    it = { "id" => "a-#{x["sig"][0, 10]}", "j" => dec["j"], "d" => x["d"], "kind" => dec["kind"], "place" => dec["place"], "h" => x["h"],
           "s" => dec["s"], "src" => x["src"], "url" => x["url"], "auto" => true }
    auto["items"] << it; added[:items] += 1
    if auto_ev[ev] then auto_ev[ev]["items"] << it["id"]
    elsif ev != "" then (auto["attach"][ev] ||= []) << it["id"]
    end
  elsif ev != ""
    c = { "src" => x["src"], "h" => x["h"], "d" => x["d"], "url" => x["url"] }
    auto_ev[ev] ? auto_ev[ev]["coverage"] << c : (auto["coverage"][ev] ||= []) << c
    added[:reports] += 1
  end
end
auto["events"].reject! { |e| e["items"].empty? && e["coverage"].empty? }
auto["seen"] = seen.to_a.last(5000)

if added[:items] + added[:reports] > 0 || added[:stories].any?
  auto["edition"] = { "date" => TODAY, "time" => NOW.strftime("%H:%M") }
end
auto["note"] = "Written every hour by tools/auto-update.rb. Do not edit by hand: copy what you want to keep into coalition-feed.json instead."
auto = auto.slice("note", "edition", "items", "attach", "coverage", "events", "channels", "seen").compact

log "Added #{added[:items]} pieces by voices and key players, #{added[:reports]} reports, #{added[:stories].size} new stories#{added[:stories].any? ? " (#{added[:stories].join(", ")})" : ""}#{api_ok ? " [sorted by Claude]" : " [simple rules]"}"
if JSON.generate(auto) == before
  log "Nothing changed."
elsif DRY
  log "Dry run: data/coalition-auto.json not written."
else
  File.write(AUTO_PATH, JSON.pretty_generate(auto) + "\n")
  log "Wrote data/coalition-auto.json"
end

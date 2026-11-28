# Madlanga Commission tracker: hourly update, with no human approval step. It stays safe by only ever
# RELAYING what trusted newsrooms have already published, word for word and credited, never writing its
# own claims about anyone. Writes data/madlanga-auto.json (what the page shows) and data/madlanga-log.json
# (why each line was allowed in).
#
# Guardrails:
#  1. Quote, never paraphrase: every line is an outlet's own headline in quotation marks, credited and linked.
#  2. Trusted outlets only: established newsrooms (see TRUSTED). Everything else is ignored.
#  3. Hold back risky headlines: children or sexual offences; rumour ("sources say"); questions; opinion
#     and analysis pieces; words that state guilt (liar, corrupt, killer...) unless qualified ("alleged") or
#     tied to a court finding; anything naming a protected witness (protect_names in data/madlanga.json).
#  3b. Victims: headlines naming a murder victim (the "victims" list in data/madlanga.json, or a name right after
#     "murder of", "killing of", "death of", or "sent to … before her/his murder") are held back, out of respect for families.
#  4. People heard in private get no automatic lines at all, only the fixed wording on their card.
#  5. No new people: only those already listed in data/madlanga.json get cards.
#  6. Charges, dismissals, withdrawals and disciplinary steps appear only once two different trusted
#     outlets report them; a witness's status moves to "Testified" only once two outlets report it.
#  7. Responses: where a named person's denial or response is published, it is shown on their card.
#  8. Kill switch: auto.enabled false in data/madlanga.json pauses everything automatic. Any URL or headline
#     fragment in "remove" is taken down on the next run, including from stored history.
#  9. Corrections: lines are rebuilt each run from the current feeds, so a changed headline updates.
# 11. The archive is the authority: our page never contradicts madlangacommission.co.za/witnesses. Each run reads
#     that page and, for every witness on it, shows the archive's spelling of the name, its role description and a
#     status that agrees with its status line; "what has happened since" events its status line contradicts are dropped.
# 10. Cross-check (tools/madlanga-check.rb): every run compares our hearing day, witness names and statuses, evidence
#     leaders and timeline with Madlanga Files and the Madlanga Commission Archive, and writes each disagreement to
#     data/madlanga-checks.json. A day number that does not fit their record is hidden; everything else is only flagged.
require "json"
require "net/http"
require "time"
require "cgi"
require_relative "madlanga-check"

ROOT = File.expand_path("..", __dir__)
CFG = JSON.parse(File.read(File.join(ROOT, "data/madlanga.json")))
OUT = File.join(ROOT, "data/madlanga-auto.json")
LOG = File.join(ROOT, "data/madlanga-log.json")
NOW = Time.now.utc
old = (JSON.parse(File.read(OUT)) rescue {})
log = (JSON.parse(File.read(LOG)) rescue [])

unless CFG.dig("auto", "enabled")
  File.write(OUT, JSON.pretty_generate({ "updated" => NOW.iso8601, "paused" => true }) + "\n")
  puts "Madlanga: automatic updates paused (auto.enabled is false)"
  exit 0
end

TRUSTED = {
  "News24" => "news24", "Daily Maverick" => "dailymaverick", "IOL" => "iol", "EWN" => "ewn",
  "SABC News" => "sabcnews", "eNCA" => "enca", "TimesLIVE" => "timeslive", "Mail & Guardian" => "mailguardian",
  "Sowetan" => "sowetan", "The Citizen" => "citizen", "Business Day" => "businessday", "Sunday Times" => "sundaytimes",
  "The National" => "thenational", "Sunday World" => "sundayworld", "The Witness" => "witness", "Cape Times" => "capetimes",
  "Cape Argus" => nil, "The Star" => nil, "Daily Dispatch" => "dailydispatch", "City Press" => nil, "Reuters" => "reuters",
  "Bloomberg" => "bloomberg", "BusinessTech" => "businesstech", "Jacaranda FM" => "jacarandafm",
  "Newzroom Afrika" => "newzroomafrika", "702" => "702", "SAnews" => nil
}.freeze
ALIAS = { /sabc/i => "SABC News", /^thenational|the national/i => "The National", /sunday world/i => "Sunday World",
          /mail ?& ?guardian/i => "Mail & Guardian", /^the witness/i => "The Witness", /thestar|^the star/i => "The Star",
          /south african government news/i => "SAnews", /^ewn|eyewitness/i => "EWN", /timeslive/i => "TimesLIVE",
          /^iol$|dailynews|themercury|the mercury/i => "IOL", /citizen/i => "The Citizen", /news24/i => "News24" }.freeze

def outlet(src)
  s = src.to_s.strip
  return s if TRUSTED.key?(s)
  ALIAS.each { |re, name| return name if s =~ re }
  nil
end

def get(url)
  uri = URI(url)
  px = (ENV["https_proxy"] || ENV["HTTPS_PROXY"]).to_s.empty? ? nil : URI(ENV["https_proxy"] || ENV["HTTPS_PROXY"])
  http = px ? Net::HTTP.new(uri.host, uri.port, px.host, px.port, px.user, px.password) : Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true; http.open_timeout = 15; http.read_timeout = 25
  2.times do |n|
    res = http.start { |h| h.get(uri.request_uri, "User-Agent" => "Mozilla/5.0 (compatible; preamble-tracker/1.0)") }
    return res.body.force_encoding("UTF-8") if res.is_a?(Net::HTTPSuccess)
    sleep 2 * (n + 1)
  rescue StandardError => e
    warn "  #{e.class} for #{url}"
    sleep 2 * (n + 1)
  end
  nil
end

def news(q)
  xml = get("https://news.google.com/rss/search?q=#{CGI.escape(q)}&hl=en-ZA&gl=ZA&ceid=ZA:en") or return []
  xml.scan(%r{<item>(.*?)</item>}m).map do |(it)|
    t = CGI.unescapeHTML(it[%r{<title>(.*?)</title>}m, 1].to_s)
    src = CGI.unescapeHTML(it[%r{<source[^>]*>(.*?)</source>}m, 1].to_s)
    src = t[/ - ([^-]+)\z/, 1].to_s.strip if src.empty?
    h = t.sub(/ - [^-]+\z/, "").strip
    d = (Time.parse(it[%r{<pubDate>(.*?)</pubDate>}m, 1]).utc rescue nil)
    { "h" => h, "src" => src, "url" => it[%r{<link>(.*?)</link>}m, 1].to_s.strip, "d" => d&.iso8601 }
  end
end

# ---- guardrail 3: hold back risky headlines ----
SEX = /\b(rape[ds]?|sexual|sex offen\w*|molest\w*|indecent)\b/i
CHILD = /\b(child(?:ren)?|minors?|teen(?:ager)?s?|schoolgirls?|schoolboys?|bab(?:y|ies)|toddlers?|\d{1,2}-year-old)\b/i
RUMOUR = /\b(sources? (?:say|said|claim)|insiders?|rumou?rs?|reportedly|speculat\w*)\b/i
OPINION = /\A\s*(opinion|analysis|editorial|comment|column|op-ed|letter|explainer|cartoon)\b|\b(opinion|analysis|editorial)\s*[|:]|moegoe/i
GUILT = /\b(liars?|lied|corrupt|criminals?|murderers?|killers?|crooks?|thie(?:f|ves)|guilty|mafia|gangsters?|hitm[ae]n|hit squads?)\b/i
QUALIFIED = /\b(alleged(?:ly)?|accused|claims?|claimed|allegations?|denies|denied|accus\w+|testif\w+|tells?|told|says|said)\b/i
COURT = /\b(convicted|found guilty|sentenced|court (?:finds|found|rules|ruled))\b/i
PROTECT = (CFG["protect_names"] || []).reject(&:empty?)
VICTIMS = (CFG["victims"] || []).reject(&:empty?)
NAMED_VICTIM = /\b(?:murder|killing|death|assassination|shooting) of (?:[A-Z][a-z]+ ){1,2}[A-Z][a-z]+|\b(?:sent|messages) to [A-Z][a-z]+ [A-Z][a-z]+ before (?:her|his) (?:murder|death|killing)|\b[A-Z][a-z]+ [A-Z][a-z]+(?:’s|'s)? (?:murder|killing|killers?)\b/
REMOVE = (CFG["remove"] || []).reject(&:empty?)

def blocked(h)
  return "sexual offences" if h =~ SEX
  return "children" if h =~ CHILD
  return "rumour" if h =~ RUMOUR
  return "question" if h.include?("?")
  return "opinion or analysis" if h =~ OPINION
  return "states guilt" if h =~ GUILT && h !~ QUALIFIED && h !~ COURT
  return "names a victim" if VICTIMS.any? { |n| h.downcase.include?(n.downcase) } || h =~ NAMED_VICTIM
  return "protected witness" if PROTECT.any? { |n| h.downcase.include?(n.downcase) }
  return "removed" if REMOVE.any? { |r| h.include?(r) }
  nil
end

# ---- gather this run's coverage ----
items = {}
held = []
["Madlanga commission", "Madlanga inquiry", "Madlanga commission testimony", "Madlanga commission witness", "Madlanga commission hears"].each do |q|
  news("#{q} when:7d").each do |it|
    next unless it["h"] =~ /madlanga|commission|inquiry|witness|testif/i
    name = outlet(it["src"])
    next unless name
    next if REMOVE.any? { |r| it["url"].include?(r) }
    why = blocked(it["h"])
    if why
      held << it.merge("why" => why)
      next
    end
    key = it["h"].downcase.gsub(/[^a-z0-9]+/, " ").strip
    items[key] ||= it.merge("src" => name, "logo" => TRUSTED[name])
  end
  sleep 1
end
items = items.values.select { |i| i["d"] }.sort_by { |i| i["d"] }.reverse
puts "Madlanga: #{items.size} trusted headlines kept, #{held.size} held back"

def mentions?(person, h)
  return false if (person["not"] || []).any? { |n| h.include?(n) }
  (person["match"] || []).any? { |m| h =~ /\b#{Regexp.escape(m)}\b/i }
end

people = CFG["people"]
ago = ->(days) { NOW - days * 86_400 }
recent = items.select { |i| Time.parse(i["d"]) > ago.(2) }

# today's reports: the last two days
reports = recent.first(20)

# today bar: hearing day number and the live stream link
day = recent.map { |i| i["h"][/\bDay (\d{2,3})\b/, 1]&.to_i }.compact.max
live = recent.find { |i| i["h"] =~ /\A(LIVE|LIVESTREAM|WATCH LIVE|LIVE BLOG)\b/i && Time.parse(i["d"]) > NOW - 12 * 3600 }
bare = ->(h) { h.sub(/\A(?:LIVE|LIVESTREAM|WATCH LIVE|WATCH|RECORDED|LIVE BLOG)\s*[|:]\s*/i, "").strip }
stand = recent.select { |i| Time.parse(i["d"]) > NOW - 20 * 3600 }
              .find { |i| bare.(i["h"]) =~ /takes? the stand|testifies|continues (?:her |his )?testimony|back on the (?:witness )?stand|returns to (?:the )?witness stand/i }
stand = stand && stand.merge("h" => bare.(stand["h"]))

# per person: quoted lines (kept 30 days, so evidence builds up day by day), and their latest response
RESP = /\b(denies|denied|rejects|rejected|disputes|hits back|fires back|dismisses (?:claims|allegations))\b/i
TESTIFY = /\b(testif(?:y|ies|ied|ying)|takes? the stand|on the stand|witness stand|tells? (?:the )?Madlanga|told (?:the )?Madlanga|cross-examin\w*)\b/i
prev = old["people"] || {}
out_people = {}
people.each do |p|
  next if p["g"] != "witness"
  next if p["private"] # guardrail 4
  mine = items.select { |i| mentions?(p, i["h"]) }
  kept = (prev.dig(p["k"], "lines") || []).reject { |l| REMOVE.any? { |r| l["url"].include?(r) || l["h"].include?(r) } || blocked(l["h"]) }
  lines = (mine + kept).uniq { |l| l["url"] }.select { |l| Time.parse(l["d"]) > ago.(30) }.sort_by { |l| l["d"] }.reverse.first(12)
  resp = mine.select { |i| i["h"] =~ RESP }.max_by { |i| i["d"] } || prev.dig(p["k"], "resp")
  resp = nil if resp && (resp["h"] !~ RESP || blocked(resp["h"]) || REMOVE.any? { |r| resp["url"].include?(r) } || Time.parse(resp["d"]) < ago.(60))
  st = nil
  if %w[c s w n].include?(p["st"]) # guardrail 6: status moves to Testified only with two outlets
    outs = mine.select { |i| i["h"] =~ TESTIFY }.map { |i| i["src"] }.uniq
    st = "t" if outs.size >= 2
  end
  next if lines.empty? && !resp && !st
  e = { "lines" => lines.map { |l| l.slice("src", "logo", "h", "url", "d") } }
  e["resp"] = resp.slice("src", "logo", "h", "url", "d") if resp
  e["st"] = st if st
  out_people[p["k"]] = e
end

# what has happened since: two-outlet rule
EVENTS = [
  ["withdrawn", /\bcharges?\b.*\b(withdrawn|dropped)\b|\bwithdraws? (?:the )?charges\b/i],
  ["charged", /\b(charged|arrested|perjury charges?|faces? (?:criminal )?charges|appears? in court)\b/i],
  ["dismissed", /\b(dismissed|fired|axed|sacked|boots)\b/i],
  ["disciplinary", /\b(disciplinary hearing|suspended|suspension)\b/i]
].freeze
since = {}
items.select { |i| Time.parse(i["d"]) > ago.(14) }.each do |i|
  ev = EVENTS.find { |_, re| i["h"] =~ re }&.first
  next unless ev
  next if ev == "dismissed" && i["h"] =~ /\b(bid|application|appeal|case|claims?|request|challenge)\b/i
  p = people.find { |x| x["g"] == "witness" && !x["protected"] && mentions?(x, i["h"]) }
  next unless p
  k = "#{p['k']}|#{ev}"
  (since[k] ||= []) << i
end
prev_since = (old["since"] || []).reject { |s| REMOVE.any? { |r| s["url"].include?(r) } }
new_since = since.map do |k, list|
  outs = list.map { |i| i["src"] }.uniq
  next if outs.size < 2
  first = list.min_by { |i| i["d"] }
  { "k" => k.split("|")[0], "tag" => k.split("|")[1], "src" => first["src"], "logo" => first["logo"], "h" => first["h"],
    "url" => first["url"], "d" => first["d"], "outlets" => outs }
end.compact
since_all = (new_since + prev_since).uniq { |s| "#{s['k']}|#{s['tag']}" }.select { |s| Time.parse(s["d"]) > ago.(120) }.sort_by { |s| s["d"] }.reverse

# voices: articles in the last 7 days and the newest piece
voices = {}
(CFG["voices"] || []).each do |v|
  next if v["late"]
  wk = news("\"#{v['n']}\" Madlanga when:7d")
  last = wk.map { |i| i["d"] }.compact.max
  last ||= news("\"#{v['n']}\" Madlanga when:1y").map { |i| i["d"] }.compact.max
  # the newest articles naming them, for the list that opens under their card. Every guardrail applies except the
  # opinion and question checks: this section is analysis and opinion by design.
  arts = wk.select { |i| i["url"] && i["h"] && i["d"] }.reject { |i| (w = blocked(i["h"])) && !["opinion or analysis", "question"].include?(w) }
           .sort_by { |i| i["d"] }.reverse.uniq { |i| i["h"] }.first(6).map { |i| i.slice("h", "src", "url", "d") }
  voices[v["k"]] = { "n7" => wk.size, "last" => last, "items" => arts }
  sleep 0.5
end

# guardrail 10: cross-check against Madlanga Files and the Madlanga Commission Archive
CHECKS = File.join(ROOT, "data/madlanga-checks.json")
old_checks = (JSON.parse(File.read(CHECKS)) rescue {})
checks = begin
  MadlangaCheck.run(CFG, day, method(:get), NOW)
rescue StandardError => e
  warn "  cross-check failed: #{e.class}: #{e.message}"
  nil
end
if checks
  day = nil unless checks["day_ok"]
  File.write(CHECKS, JSON.pretty_generate(checks) + "\n")
  seen_issues = (old_checks["issues"] || []).map { |i| [i["area"], i["what"]] }
  new_issues = checks["issues"].reject { |i| seen_issues.include?([i["area"], i["what"]]) }
  checks["issues"].select { |i| i["level"] == "high" }.each { |i| puts "::warning title=Madlanga cross-check::#{i['what']} (ours: #{i['ours']}; theirs: #{i['theirs']})" }
  puts "Madlanga cross-check: #{checks['issues'].size} to review (#{checks['issues'].count { |i| i['level'] == 'high' }} high), #{new_issues.size} new; sources #{checks['sources'].values.join(' / ')}"
end

# guardrail 11: never contradict the archive's witness list
cards = MadlangaCheck.archive_cards(get("#{MadlangaCheck::ARCHIVE}/witnesses"))
align, align_changes = MadlangaCheck.align(CFG, cards)
if cards.empty? # archive unreachable: keep what it said last time rather than fall back
  align = (old["align"] || {}); align_changes = []
  puts "  archive unreachable: keeping its last known names and statuses"
end
align.each { |k, o| (out_people[k] ||= { "lines" => [] })["st"] = o["st"] if o["st"] }
dropped = since_all.select { |s| (a = align[s["k"]]) && MadlangaCheck.contradicts?(s["tag"], a["status_text"]) }
since_all -= dropped
puts "Madlanga: archive has #{cards.size} people; #{align.size} of ours matched, #{align_changes.size} corrections, #{dropped.size} events dropped"
align_changes.each { |c| puts "  archive: #{c}" }

data = {
  "updated" => NOW.iso8601,
  "today" => { "day" => day, "live" => live&.slice("src", "h", "url", "d"), "stand" => stand&.slice("src", "logo", "h", "url", "d") },
  "reports" => reports.map { |i| i.slice("src", "logo", "h", "url", "d") },
  "people" => out_people,
  "since" => since_all,
  "voices" => voices,
  "align" => align.transform_values { |o| o.slice("n", "role", "st", "url") }
}
File.write(OUT, JSON.pretty_generate(data) + "\n")

# guardrail log: what was added and why, and what was held back
seen = (old["reports"] || []).map { |r| r["url"] } + (old["people"] || {}).values.flat_map { |e| (e["lines"] || []).map { |l| l["url"] } }
added = reports.reject { |r| seen.include?(r["url"]) }.map { |r| { "t" => NOW.iso8601, "kind" => "report", "src" => r["src"], "h" => r["h"], "url" => r["url"], "rule" => "trusted outlet, quoted verbatim" } }
added += new_since.reject { |s| prev_since.any? { |p| p["k"] == s["k"] && p["tag"] == s["tag"] } }.map { |s| { "t" => NOW.iso8601, "kind" => "since:#{s['tag']}", "who" => s["k"], "src" => s["outlets"].join(", "), "h" => s["h"], "url" => s["url"], "rule" => "two or more trusted outlets" } }
added += new_issues.map { |i| { "t" => NOW.iso8601, "kind" => "check:#{i['level']}", "src" => i["source"], "h" => i["what"], "url" => "", "rule" => "ours: #{i['ours']} · theirs: #{i['theirs']} · #{i['action']}" } } if checks
old_align = old["align"] || {}
added += align_changes.reject { |c| old_align.any? { |k, o| c.start_with?((CFG["people"].find { |p| p["k"] == k } || {})["n"].to_s + ":") && o.values_at("n", "st").compact.any? } }.map { |c| { "t" => NOW.iso8601, "kind" => "archive", "src" => "madlangacommission.co.za", "h" => c, "url" => "#{MadlangaCheck::ARCHIVE}/witnesses", "rule" => "never contradict the archive's witness list" } }
added += dropped.map { |s| { "t" => NOW.iso8601, "kind" => "dropped:#{s['tag']}", "who" => s["k"], "src" => "madlangacommission.co.za", "h" => s["h"], "url" => s["url"], "rule" => "the archive's status line contradicts this event" } }
added += held.uniq { |h| h["url"] }.map { |h| { "t" => NOW.iso8601, "kind" => "held back", "src" => h["src"], "h" => h["h"], "url" => h["url"], "rule" => h["why"] } }
File.write(LOG, JSON.pretty_generate((added + log).first(500)) + "\n")
puts "Madlanga: #{reports.size} reports, #{out_people.size} people with lines, #{since_all.size} events, #{voices.size} voices"

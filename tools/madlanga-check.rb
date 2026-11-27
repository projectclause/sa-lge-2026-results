# Madlanga cross-check: run by madlanga-update.rb every hour. Compares what our page says with two independent
# records of the commission, and writes every disagreement to data/madlanga-checks.json for a person to look at.
#   • Madlanga Files (madlangafiles.co.za/api/timeline): every hearing day with its date, witnesses and evidence leaders
#   • The Madlanga Commission Archive (madlangacommission.co.za): its witness list and latest hearing day
# Neither is the official commission (criminaljusticecommission.org.za is), so the check never rewrites our page on its
# own say-so. The only automatic action is the safe one: if our hearing day number disagrees with them, the page stops
# showing a number until the two agree again. Everything else is flagged, not changed.
require "json"
require "time"
require "date"
require "cgi"

module MadlangaCheck
  MF = "https://www.madlangafiles.co.za/api/timeline"
  ARCHIVE = "https://madlangacommission.co.za"
  TITLES = /\A(?:(?:Justice|Adv(?:ocate)?|Dr|Prof(?:essor)?|Mr|Ms|Mrs|Lt|Lt-Gen|Lt-Col|Lieutenant|Gen(?:eral)?|Col(?:onel)?|Brig(?:adier)?|Maj(?:or)?|Chief|Supt|Superintendent|Capt(?:ain)?|Constable|Warrant|Officer|Suspended|Deputy|Commissioner|Retired|IDAC|Investigator|JMPD|SC)\.?\s+)+/i

  module_function

  def plain(s) = s.to_s.tr("‘’“”\"'", "").gsub(/[^A-Za-z\- ]+/, " ").squeeze(" ").strip
  def words(s) = plain(s).downcase.split(/[\s-]+/)

  # first names and surname for one of our people: "Itumeleng ‘Tumelo’ Nku" gives [["itumeleng", "tumelo"], "nku"]
  def parts(name)
    nick = name[/[‘'"“](.+?)[’'"”]/, 1]
    bare = plain(name.sub(/[‘'"“].+?[’'"”]/, "")).sub(TITLES, "").sub(/\s+(?:SC|\(retired\)|retired)\z/i, "")
    w = bare.downcase.split
    [(w[0...-1] + [nick&.downcase]).compact, w.last.to_s]
  end

  def same_first?(ours, theirs) = ours.any? { |a| theirs.any? { |b| a.start_with?(b) || b.start_with?(a) } }

  # the record's entries (labels or slugs) for this surname, and whether one of them shares a first name
  def find(firsts, sur, entries)
    hits = entries.select { |e| words(e).include?(sur) }
    strong = hits.select { |e| same_first?(firsts, words(e) - [sur]) }
    [hits, strong]
  end

  def weekdays_between(a, b) = ((a + 1)..b).count { |d| !d.saturday? && !d.sunday? }

  def run(cfg, day, get, now)
    issues = []
    add = ->(level, area, what, ours, theirs, source, action = "flagged for review") {
      issues << { "level" => level, "area" => area, "what" => what, "ours" => ours, "theirs" => theirs, "source" => source, "action" => action }
    }
    sources = {}
    mf = begin
      JSON.parse(get.(MF) || "")
    rescue StandardError
      nil
    end
    sources["Madlanga Files"] = mf && mf["days"].is_a?(Array) ? "ok (#{mf['days'].size} hearing days to #{mf.dig('range', 'to')})" : "unreachable"
    home = get.("#{ARCHIVE}/")
    wpage = get.("#{ARCHIVE}/witnesses")
    slugs = wpage ? wpage.scan(%r{href="/witnesses/([a-z0-9-]+)"}).flatten.uniq.reject { |s| s =~ /\Aprofile-\d/ } : []
    sources["Madlanga Commission Archive"] = slugs.any? ? "ok (#{slugs.size} people)" : "unreachable"
    arch_names = slugs.map { |s| s.tr("-", " ") }

    # ---- hearing day number ----
    day_ok = true
    if mf && mf["days"].is_a?(Array) && !mf["days"].empty? && day
      last = mf["days"].max_by { |d| d["day"].to_i }
      ld = Date.parse(last["date"]) rescue nil
      if ld
        room = weekdays_between(ld, now.to_date)
        if day < last["day"].to_i || day > last["day"].to_i + room
          day_ok = false
          add.("high", "hearing day", "Our day number does not fit their record", "Day #{day}",
               "Day #{last['day']} on #{ld.strftime('%-d %b %Y')}, so at most Day #{last['day'].to_i + room} today", "Madlanga Files",
               "day number hidden on the page until they agree")
        end
      end
    end
    if home && day && (n = home[/(\d{3})\s*<\/[^>]+>\s*(?:<[^>]+>\s*)*sitting days/, 1]&.to_i) && day < n
      add.("medium", "hearing day", "The archive counts more sitting days than our day number", "Day #{day}", "#{n} sitting days", "Madlanga Commission Archive")
    end

    # ---- witnesses: names, spelling and status ----
    mf_w = Hash.new { |h, k| h[k] = [] }
    (mf ? mf["days"] : []).each { |d| (d["witnesses"] || []).each { |w| mf_w[w["label"]] << d["day"].to_i } }
    labels = mf_w.keys
    people = cfg["people"] || []
    surnames = people.map { |p| parts(p["n"])[1] }.tally
    status = cfg["status"] || {}
    people.select { |p| p["g"] == "witness" }.each do |p|
      firsts, sur = parts(p["n"])
      st = p["st"].to_s
      if p["n"] =~ /\AWitness [A-Z]+\z/ # coded witnesses: exact label only
        days = mf_w[p["n"]]
        in_arch = slugs.include?(p["n"].downcase.tr(" ", "-"))
        if days.empty? && !in_arch && st.start_with?("t")
          add.("medium", "witness status", "#{p['n']}: neither record shows them testifying", status[st] || st, "not listed", "both")
        end
        next
      end
      hits, strong = find(firsts, sur, labels)
      ahits, astrong = find(firsts, sur, arch_names)
      unique = surnames[sur].to_i == 1
      mf_match = strong.first || (unique && hits.size == 1 ? hits.first : nil)
      ar_match = astrong.first || (unique && ahits.size == 1 ? ahits.first : nil)
      # spelling: same surname, different first name in the archive or Madlanga Files
      [[mf_match, "Madlanga Files"], [ar_match, "Madlanga Commission Archive"]].each do |m, src|
        next unless m
        theirs_first = plain(m.sub(TITLES, "")).downcase.split[0...-1].reject { |x| x.length < 2 }
        next if firsts.empty? || theirs_first.empty? || same_first?(firsts, theirs_first)
        shown = src == "Madlanga Files" ? m : m.split.map(&:capitalize).join(" ")
        add.("medium", "name", "#{p['n']}: the other record spells the name differently", p["n"], shown, src)
      end
      if firsts.empty? && (m = mf_match || ar_match)
        add.("low", "name", "#{p['n']}: we show only a surname", p["n"], mf_match || ar_match.split.map(&:capitalize).join(" "), mf_match ? "Madlanga Files" : "Madlanga Commission Archive")
      end
      days = mf_match ? mf_w[mf_match] : []
      if days.any? && %w[n c s w].include?(st)
        add.("high", "witness status", "#{p['n']}: we do not say they testified, but Madlanga Files lists them on hearing day#{days.size > 1 ? 's' : ''} #{days.uniq.first(4).join(', ')}",
             status[st] || st, "Testified (#{mf_match})", "Madlanga Files")
      elsif days.any? && st == "p"
        add.("medium", "witness status", "#{p['n']}: we say private hearing, but Madlanga Files lists public hearing day#{days.size > 1 ? 's' : ''} #{days.uniq.first(4).join(', ')}",
             status[st], "Listed on #{days.uniq.size} hearing day#{days.uniq.size > 1 ? 's' : ''}", "Madlanga Files")
      elsif days.empty? && !ar_match && st.start_with?("t")
        add.("high", "witness status", "#{p['n']}: we say they testified, but neither record lists them", status[st] || st, "not listed", "both")
      end
    end

    # ---- evidence leaders ----
    leaders = Hash.new(0)
    (mf ? mf["days"] : []).each { |d| (d["evidenceLeaders"] || []).each { |e| leaders[e["label"]] += 1 } }
    ours = people.select { |p| p["g"] == "evidence" }
    leaders.each do |label, n|
      firsts, sur = parts(label)
      o = ours.find { |p| parts(p["n"])[1] == sur }
      if !o && n >= 3
        add.("medium", "evidence leaders", "Madlanga Files lists an evidence leader we do not have", "not listed", "#{label} (#{n} days)", "Madlanga Files")
      elsif o && label =~ /\bSC\b/ && o["n"] !~ /\bSC\b/
        add.("low", "evidence leaders", "#{o['n']}: the other record gives the title SC", o["n"], label, "Madlanga Files")
      end
    end

    # ---- timeline: when public hearings began ----
    if mf && (first = mf.dig("range", "from"))
      fd = Date.parse(first) rescue nil
      row = (cfg["timeline"] || []).find { |r| r[1].to_s =~ /hearings begin/i }
      if fd && row && row[0] !~ /#{fd.strftime('%B')}.*#{fd.year}/
        add.("high", "timeline", "Our date for the start of public hearings differs", row[0], fd.strftime("%-d %B %Y"), "Madlanga Files")
      end
    end

    rank = { "high" => 0, "medium" => 1, "low" => 2 }
    issues = issues.uniq { |i| [i["area"], i["what"], i["theirs"]] }.sort_by { |i| [rank[i["level"]], i["area"]] }
    { "checked" => now.iso8601, "sources" => sources, "day_ok" => day_ok, "issues" => issues }
  end

  # ---- the archive is the authority: our page never contradicts madlangacommission.co.za/witnesses ----
  # Every card on that page: its slug, name, status line, role and "Last heard" note.
  def archive_cards(page)
    return [] unless page
    page.scan(%r{<a class="witness-card" href="/witnesses/([a-z0-9-]+)">(.*?)</a>}m).map do |slug, b|
      g = ->(cls) { CGI.unescapeHTML(b[%r{class="#{cls}"[^>]*>(.*?)</}m, 1].to_s.gsub(/<[^>]+>/, "")).strip }
      { "slug" => slug, "name" => g.("wc-name"), "status" => g.("status"), "role" => g.("wc-role"), "heard" => g.("date-pill date-pill--plain") }
    end.reject { |c| c["name"].empty? }
  end

  # the archive's status line as one of our status codes (nil when it says nothing we can map)
  def archive_status(card)
    s = card["status"].downcase
    return "tp" if s.start_with?("testified") && s =~ /in camera|in private|private session|behind closed doors/
    return "t" if s.start_with?("testified")
    return "n" if s.start_with?("named")
    return "s" if s =~ /\A(subpoenaed|under subpoena)/
    return "w" if card["heard"] =~ /not yet heard/i
    nil
  end

  # statuses that agree with the archive's even though the code differs (ours adds detail, never denies it)
  AGREES = { "t" => %w[t tp], "w" => %w[w s c] }.freeze

  def bare_name(n) = plain(n.sub(/[‘'"“].+?[’'"”]/, "")).sub(TITLES, "").sub(/\A(?:Brig|Maj-Gen|Major-Gen|Lieutenant-Gen|Lt-Gen|Adv)\.?\s+/i, "").strip

  # For each of our witnesses on the archive: the name, role and status our page must show, and what changed.
  def align(cfg, cards)
    out = {}; changes = []
    return [out, changes] if cards.empty?
    names = cards.map { |c| c["name"] }
    witnesses = (cfg["people"] || []).select { |p| p["g"] == "witness" }
    surnames = witnesses.map { |p| parts(p["n"])[1] }.tally
    witnesses.each do |p|
      card = cards.find { |c| c["slug"] == p["k"] }
      unless card
        firsts, sur = parts(p["n"])
        hits, strong = find(firsts, sur, names)
        nm = strong.first || (surnames[sur] == 1 && hits.size == 1 ? hits.first : nil)
        card = nm && cards.find { |c| c["name"] == nm }
      end
      next unless card
      o = { "src" => "madlangacommission.co.za", "url" => "#{ARCHIVE}/witnesses/#{card['slug']}", "status_text" => card["status"] }
      # name: their spelling wins; a surname-only name takes their full name
      ours_f, ours_s = parts(p["n"]); theirs = bare_name(card["name"]); th_w = theirs.downcase.split
      if !theirs.empty? && (ours_s != th_w.last || ours_f.empty? || !same_first?(ours_f, th_w[0...-1]))
        title = p["n"][/\A(?:Lt Gen|Gen|Dr|Chief Supt|Lt-Col|Brigadier|Adv|Justice)\s+/].to_s
        o["n"] = title + card["name"].sub(TITLES, "").sub(/\A(?:Brig|Maj-Gen|Major-Gen|Lieutenant-Gen|Lt-Gen|Adv|Advocate)\.?\s+/i, "").tr("'", "’").sub(/’(.+?)’/, "‘\\1’")
        changes << "#{p['n']}: name as the archive spells it, #{o['n']}"
      end
      # role: theirs
      if !card["role"].empty? && card["role"] != p["role"]
        o["role"] = card["role"]
      end
      # status: theirs, unless ours only adds detail to it
      if (st = archive_status(card)) && !(AGREES[st] || [st]).include?(p["st"].to_s)
        o["st"] = st
        changes << "#{p['n']}: status #{p['st']} to #{st} (archive: #{card['status'].empty? ? card['heard'] : card['status']})"
      elsif st
        o["st"] = p["st"]
      end
      out[p["k"]] = o
    end
    [out, changes]
  end

  # a "what has happened since" event the archive's status line contradicts
  def contradicts?(tag, status_text)
    s = status_text.to_s.downcase
    case tag
    when "charged" then s =~ /charges? (?:were |was )?withdrawn|acquitted|not charged|cleared/
    when "withdrawn" then s =~ /\bon trial\b|\bconvicted\b/
    when "dismissed" then s =~ /reinstated/
    else false
    end
  end
end

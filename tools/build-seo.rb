# encoding: utf-8
# Makes the site readable by search engines and AI crawlers that do not run JavaScript.
# Run from the site folder after every tracker update:   ruby tools/build-seo.rb
#
# It writes, from data/coalition-feed.json:
#   coalitions/<story-id>.html  one static, indexable page per story (South Africa and International)
#   coalitions.html             a plain-HTML snapshot of the front page inside <div class="pl"> (the app replaces it on load)
#   sitemap.xml                 every page with its last-updated date
#   llms.txt                    a plain-text guide to the site for AI assistants
#   structured data (JSON-LD)   in the <head> of each main page
Encoding.default_external = Encoding::UTF_8
require "json"
require "date"
require "fileutils"
require_relative "feed"

# stable sort: items with the same date keep their order, so re-running this script on unchanged data changes no file
class Array; def ssort(&k) each_with_index.sort_by { |x, i| [k.(x), i] }.map(&:first) end; end

ROOT = File.expand_path("..", __dir__)
SITE = "https://preamble.co.za"
D = Feed.load(ROOT) # data/coalition-feed.json plus the hourly additions in data/coalition-auto.json
J = D["journalists"]
BY = D["items"].to_h { |i| [i["id"], i] }
X = D["intl"] || { "stories" => [], "pieces" => [], "voices" => {} }
XP = X["pieces"].to_h { |p| [p["id"], p] }
MON = %w[January February March April May June July August September October November December]

def esc(s); s.to_s.gsub("&", "&amp;").gsub("<", "&lt;").gsub(">", "&gt;").gsub(%q("), "&quot;"); end
def day(d); y, m, dd = d.split("-").map(&:to_i); "#{dd} #{MON[m - 1]} #{y}"; end
def jsonld(h); %(<script type="application/ld+json">#{JSON.generate(h).gsub("</", "<\\/")}</script>); end
def replace_block(s, name, body)
  a, b = "<!-- #{name}:START -->", "<!-- #{name}:END -->"
  s.include?(a) ? s.sub(/#{Regexp.escape(a)}.*?#{Regexp.escape(b)}/m) { "#{a}#{body}#{b}" } : nil
end

PUBLISHER = { "@type" => "NewsMediaOrganization", "name" => "Preamble", "url" => "#{SITE}/",
              "logo" => { "@type" => "ImageObject", "url" => "#{SITE}/assets/share.png" },
              "sameAs" => ["https://www.instagram.com/preamblehqdotcom/", "https://youtube.com/preambleyt", "https://preamble.substack.com/"] }

# ---------- one story = one page ----------
sa = D["events"].map do |e|
  items = e["items"].map { |id| BY[id] }.compact.ssort { |i| i["d"] }
  dates = items.map { |i| i["d"] } + (e["coverage"] || []).map { |c| c["d"] }
  says = (e["voices"] || {}).map { |k, line| p = J[k] or next; [p, line, items.select { |i| i["j"] == k }] }.compact
  cov = (e["coverage"] || []) + items.reject { |i| i["src"] =~ /^(X|YouTube|TikTok|Instagram|LinkedIn|Facebook)/ }.map { |i| i.slice("src", "h", "d", "url") }
  cov = cov.uniq { |c| c["url"] }.ssort { |c| c["d"] }.reverse
  { id: e["id"], scope: "South Africa", cat: e["cat"], place: e["place"], h: e["h"], dek: e["dek"], brief: e["brief"] || [], sec: e["sec"] || [],
    first: dates.min, upd: dates.max, says: says.map { |p, l, its| [p["n"], p["role"] || p["o"], l, its.map { |i| [i["d"], i["h"], i["src"], i["url"]] }] },
    cov: cov.map { |c| [c["d"], c["src"], c["h"], c["url"]] }, live: "coalitions.html##{e["id"]}" }
end
intl = X["stories"].map do |t|
  ps = t["p"].map { |id| XP[id] }.compact.ssort { |p| p["d"] }.reverse
  dates = ps.map { |p| p["d"] }
  says = (t["voices"] || {}).map { |k, line| v = X["voices"][k] or next; [v["n"], v["role"], line, ps.select { |p| p["j"].include?(k) }.map { |p| [p["d"], p["h"], p["src"], p["url"]] }] }.compact
  { id: t["id"], scope: "International", cat: t["cat"], place: t["place"], h: t["h"], dek: t["dek"], brief: t["brief"] || [], sec: t["sec"] || [],
    first: dates.min, upd: dates.max, says: says, cov: ps.map { |p| [p["d"], p["src"] + (p["lang"] ? " (#{p["lang"]})" : ""), p["h"], p["url"]] }, live: "coalitions.html##{t["id"]}" }
end
STORIES = (sa + intl).ssort { |s| s[:upd].to_s }.reverse

# ---------- one person = one profile page (people/<name>.html) ----------
# People search their names; Google and AI Overviews answer from pages *about* a person. Each profile is a ProfilePage
# whose mainEntity is a Person, with a plain answer to "who is X" and "what has X said", every piece they published
# (subjectOf, with dates and links), and links to each story they appear in. People with no coalition piece and no
# quoted line are skipped, so there are no thin pages.
def slug(n); n.unicode_normalize(:nfkd).gsub(/[^\x00-\x7F]/, "").downcase.gsub(/[“”"']/, "").gsub(/[^a-z0-9]+/, "-").gsub(/^-|-$/, ""); end
PEOPLE = []
J.each do |k, p|
  its = D["items"].select { |i| i["j"] == k }.ssort { |i| i["d"] }.reverse
  lines = D["events"].map { |e| (l = (e["voices"] || {})[k]) && [e["id"], e["h"], l] }.compact
  next if its.empty? && lines.empty?
  kind = p["group"] == "player" ? "Key player" : p["pb"] ? "Public broadcaster (SABC)" : p["beat"] == "reporting" ? "Reporter" : "Analyst and commentator"
  PEOPLE << { k: k, n: p["n"], role: p["role"] || p["o"], org: p["o"], img: p["img"], kind: kind, scope: "South Africa",
              its: its.map { |i| [i["d"], i["h"], i["src"], i["url"], i["kind"], i["s"]] }, lines: lines, upd: its.first&.dig("d") || D["edition"]["date"] }
end
X["voices"].each do |k, v|
  ps = X["pieces"].select { |q| Array(q["j"]).include?(k) }.ssort { |q| q["d"] }.reverse
  lines = X["stories"].map { |t| (l = (t["voices"] || {})[k]) && [t["id"], t["h"], l] }.compact
  next if ps.empty? && lines.empty?
  PEOPLE << { k: k, n: v["n"], role: v["role"], org: v["o"] || v["role"].to_s.split(", ").last, img: v["img"], kind: "International voice", scope: "International",
              its: ps.map { |q| [q["d"], q["h"], q["src"], q["url"], q["lang"] ? "Article (#{q["lang"]})" : "Article", q["s"]] }, lines: lines, upd: ps.first&.dig("d") || D["edition"]["date"] }
end
PEOPLE.each { |q| q[:slug] = slug(q[:n]) }
PEOPLE.group_by { |q| q[:slug] }.each_value { |g| g.drop(1).each_with_index { |q, i| q[:slug] += "-#{i + 2}" } }
PROFILE = PEOPLE.to_h { |q| [[q[:scope], q[:k]], "people/#{q[:slug]}.html"] }

NAMELINK = PEOPLE.to_h { |q| [q[:n], "people/#{q[:slug]}.html"] }

head = File.read(File.join(ROOT, "coalitions.html"))
css = head[/<link rel="stylesheet" href="css\/style\.css\?v=[^"]+">/].sub('href="', 'href="../')
# the masthead is copied from coalitions.html (its nav ends with the News Tracker network icon, assets/news-tracker-icon.svg): links and images are one folder up
mast = head[/<header class="masthead">.*?<\/header>/m].gsub('href="', 'href="../').gsub('src="assets/', 'src="../assets/').sub(' aria-current="page"', ' aria-current="page"')
abort "build-seo: the masthead in coalitions.html has lost the News Tracker icon (a.tab-eye)" unless mast.include?('class="tab-eye" href="../news-tracker.html"') && mast.include?('src="../assets/news-tracker-icon.svg"')
foot = head[/<footer class="footer">.*?<\/footer>/m]

FileUtils.mkdir_p(File.join(ROOT, "coalitions"))
# the footer’s privacy link is relative: the story and profile pages sit one folder down
foot = foot.gsub('href="privacy.html"', 'href="../privacy.html"')
Dir[File.join(ROOT, "coalitions/*.html")].each { |f| File.delete(f) }
STORIES.each do |s|
  url = "#{SITE}/coalitions/#{s[:id]}.html"
  title = "#{s[:h]} | Coalitions Tracker | PREAMBLE"
  ld = { "@context" => "https://schema.org", "@type" => "NewsArticle", "headline" => s[:h][0, 110], "description" => s[:dek],
         "datePublished" => s[:first], "dateModified" => s[:upd], "url" => url, "mainEntityOfPage" => url, "inLanguage" => "en-ZA",
         "image" => ["#{SITE}/assets/share.png"], "articleSection" => "Coalitions Tracker · #{s[:scope]}",
         "author" => { "@type" => "Organization", "name" => "Preamble", "url" => "#{SITE}/" }, "publisher" => PUBLISHER,
         "about" => ["2026 South African municipal elections", "Coalition government", s[:place]].compact,
         "isBasedOn" => s[:cov].first(20).map { |c| c[3] } }
  crumbs = { "@context" => "https://schema.org", "@type" => "BreadcrumbList", "itemListElement" => [
    { "@type" => "ListItem", "position" => 1, "name" => "PREAMBLE", "item" => "#{SITE}/" },
    { "@type" => "ListItem", "position" => 2, "name" => "Coalitions Tracker", "item" => "#{SITE}/coalitions.html" },
    { "@type" => "ListItem", "position" => 3, "name" => s[:h], "item" => url }] }
  body = +""
  body << %(<p class="pl-back"><a href="../coalitions.html">← Coalitions Tracker</a> · <a href="../#{s[:live]}">Open this story in the live tracker</a></p>\n)
  body << %(<article class="pl-ev">\n<p class="pl-cat">#{esc(s[:scope])} · #{esc(s[:cat])} · #{esc(s[:place])}</p>\n<h1 class="pl-evh">#{esc(s[:h])}</h1>\n<p class="pl-dek pl-evdek">#{esc(s[:dek])}</p>\n)
  body << %(<p class="pl-credit">Preamble’s AI summary of #{s[:cov].size} reports. Updated <time datetime="#{s[:upd]}">#{day(s[:upd])}</time>.</p>\n)
  body << %(<section class="pl-brief"><h2>In brief</h2><ul>#{s[:brief].map { |b| "<li>#{esc(b)}</li>" }.join}</ul></section>\n) if s[:brief].any?
  s[:sec].each { |t, p| body << %(<section class="pl-body"><h2>#{esc(t)}</h2><p>#{esc(p)}</p></section>\n) }
  if s[:says].any?
    body << %(<section class="pl-sec pl-says"><h2 class="pl-sh">What they are saying</h2>\n)
    s[:says].each do |n, role, line, its|
      body << %(<div class="pl-voicecard"><p><b>#{NAMELINK[n] ? %(<a href="../#{NAMELINK[n]}">#{esc(n)}</a>) : esc(n)}</b>, #{esc(role)}</p><p class="pl-vsays">#{esc(line)}</p>)
      body << %(<ul>#{its.map { |d, h, src, u| %(<li>#{day(d)} · <a href="#{esc(u)}" rel="noopener">#{esc(h)}</a> (#{esc(src)})</li>) }.join}</ul>) if its.any?
      body << "</div>\n"
    end
    body << "</section>\n"
  end
  body << %(<section class="pl-sec pl-cov"><h2 class="pl-sh">Coverage</h2>\n#{s[:cov].map { |d, src, h, u| %(<p class="pl-art"><span class="pl-am2"><b>#{esc(src)}</b> <time datetime="#{d}">#{day(d)}</time></span> <a class="pl-ah" href="#{esc(u)}" rel="noopener">#{esc(h)}</a></p>) }.join("\n")}\n</section>\n)
  body << %(<p class="pl-how">Preamble summarises published reporting and links to every original article. The people quoted do not write for Preamble.</p>\n</article>\n)
  html = <<~HTML
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>#{esc(title)}</title>
      <meta name="description" content="#{esc(s[:dek])}">
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
      <link rel="canonical" href="#{url}">
      <meta property="og:site_name" content="PREAMBLE">
      <meta property="og:type" content="article">
      <meta property="og:title" content="#{esc(s[:h])}">
      <meta property="og:description" content="#{esc(s[:dek])}">
      <meta property="og:url" content="#{url}">
      <meta property="og:image" content="#{SITE}/assets/share.png">
      <meta property="article:modified_time" content="#{s[:upd]}">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="#{esc(s[:h])}">
      <meta name="twitter:description" content="#{esc(s[:dek])}">
      <meta name="twitter:image" content="#{SITE}/assets/share.png">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
      #{css}
      #{jsonld(ld)}
      #{jsonld(crumbs)}
    </head>
    <body class="rs-page">
      #{mast}
      <main class="rs-wrap pl-wrap"><div class="pl">
    #{body}  </div></main>
      #{foot}
    </body>
    </html>
  HTML
  File.write(File.join(ROOT, "coalitions/#{s[:id]}.html"), html)
end

FileUtils.mkdir_p(File.join(ROOT, "people"))
Dir[File.join(ROOT, "people/*.html")].each { |f| File.delete(f) }
pmast = mast.gsub('href="../', 'href="../')
PEOPLE.each do |q|
  url = "#{SITE}/people/#{q[:slug]}.html"
  n, role = q[:n], q[:role]
  latest = q[:its].first
  who = "#{n} (#{role}) is " + (q[:kind] == "Key player" ? "one of the key players in the coalition talks after South Africa’s 4 November 2026 local government elections." : "one of the #{q[:scope] == "International" ? "international journalists and analysts" : "journalists and commentators"} Preamble’s Coalitions Tracker follows on the coalition talks after South Africa’s 4 November 2026 local government elections.")
  said = q[:lines].map { |_, h, l| "On “#{h}”: #{l}" }
  desc = "#{n} (#{role}) on South Africa’s 2026 coalition talks: #{q[:its].size} #{q[:its].size == 1 ? "piece" : "pieces"} tracked#{latest ? ", latest #{day(latest[0])}" : ""}. #{q[:lines].first ? q[:lines].first[2] : ""}".strip[0, 300]
  title = "#{n} on the 2026 coalition talks | PREAMBLE"
  person = { "@type" => "Person", "@id" => "#{url}#person", "name" => n, "jobTitle" => role.to_s.split(", ").first, "description" => who,
             "worksFor" => q[:org] ? { "@type" => "Organization", "name" => q[:org] } : nil, "image" => q[:img] ? "#{SITE}/#{q[:img]}" : nil,
             "knowsAbout" => ["2026 South African municipal elections", "Coalition government in South Africa"],
             "subjectOf" => q[:its].first(30).map { |d, h, src, u, kd| { "@type" => kd.to_s.start_with?("Video") ? "VideoObject" : "CreativeWork", "name" => h, "url" => u, "datePublished" => d, "publisher" => { "@type" => "Organization", "name" => src } }.tap { |w| w["uploadDate"] = d if w["@type"] == "VideoObject"; w["thumbnailUrl"] = "#{SITE}/assets/share.png" if w["@type"] == "VideoObject" } } }.compact
  ld = { "@context" => "https://schema.org", "@type" => "ProfilePage", "url" => url, "name" => title.sub(" | PREAMBLE", ""), "inLanguage" => "en-ZA",
         "dateModified" => q[:upd], "isPartOf" => { "@id" => "#{SITE}/#website" }, "publisher" => PUBLISHER, "mainEntity" => person,
         "about" => q[:lines].map { |id, h, _| { "@type" => "NewsArticle", "headline" => h[0, 110], "url" => "#{SITE}/coalitions/#{id}.html" } } }
  crumbs = { "@context" => "https://schema.org", "@type" => "BreadcrumbList", "itemListElement" => [
    { "@type" => "ListItem", "position" => 1, "name" => "PREAMBLE", "item" => "#{SITE}/" },
    { "@type" => "ListItem", "position" => 2, "name" => "Coalitions Tracker", "item" => "#{SITE}/coalitions.html" },
    { "@type" => "ListItem", "position" => 3, "name" => "People", "item" => "#{SITE}/people/" },
    { "@type" => "ListItem", "position" => 4, "name" => n, "item" => url }] }
  body = +""
  body << %(<p class="pl-back"><a href="../coalitions.html">← Coalitions Tracker</a> · <a href="./">Everyone we follow</a></p>\n<article class="pl-ev pl-prof">\n)
  body << %(<p class="pl-cat">#{esc(q[:scope])} · #{esc(q[:kind])}</p>\n<div class="pl-profh">#{q[:img] ? %(<img src="../#{esc(q[:img])}" alt="#{esc(n)}" width="96" height="96">) : ""}<div><h1 class="pl-evh">#{esc(n)}</h1><p class="pl-dek pl-evdek">#{esc(role)}</p></div></div>\n)
  body << %(<p class="pl-credit">Updated <time datetime="#{q[:upd]}">#{day(q[:upd])}</time> · #{q[:its].size} coalition #{q[:its].size == 1 ? "piece" : "pieces"} tracked</p>\n)
  body << %(<section class="pl-body"><h2>Who is #{esc(n)}?</h2><p>#{esc(who)}</p></section>\n)
  if said.any?
    body << %(<section class="pl-body"><h2>What has #{esc(n)} said about the coalition talks?</h2><ul>#{q[:lines].map { |id, h, l| %(<li>#{esc(l)} <span class="pl-as">Story: <a href="../coalitions/#{esc(id)}.html">#{esc(h)}</a></span></li>) }.join}</ul></section>\n)
  end
  if latest
    body << %(<section class="pl-body"><h2>What is #{esc(n)}’s latest on the coalitions?</h2><p>On #{day(latest[0])}, #{esc(latest[2])}: <a href="#{esc(latest[3])}" rel="noopener">#{esc(latest[1])}</a>.#{latest[5] ? " #{esc(latest[5])}" : ""}</p></section>\n)
    body << %(<section class="pl-sec pl-cov"><h2 class="pl-sh">Every piece we track, newest first</h2>\n#{q[:its].map { |d, h, src, u, kd, s| %(<p class="pl-art"><span class="pl-am2"><b>#{esc(src)}</b> · #{esc(kd)} <time datetime="#{d}">#{day(d)}</time></span> <a class="pl-ah" href="#{esc(u)}" rel="noopener">#{esc(h)}</a>#{s ? %(<span class="pl-as">#{esc(s)}</span>) : ""}</p>) }.join("\n")}\n</section>\n)
  end
  body << %(<p class="pl-how">Preamble summarises published reporting and links to every original. #{esc(n)} does not write for Preamble, and this page is not endorsed by them.</p>\n</article>\n)
  html = <<~HTML
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>#{esc(title)}</title>
      <meta name="description" content="#{esc(desc)}">
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
      <link rel="canonical" href="#{url}">
      <meta property="og:site_name" content="PREAMBLE">
      <meta property="og:type" content="profile">
      <meta property="og:title" content="#{esc(title.sub(" | PREAMBLE", ""))}">
      <meta property="og:description" content="#{esc(desc)}">
      <meta property="og:url" content="#{url}">
      <meta property="og:image" content="#{q[:img] ? "#{SITE}/#{q[:img]}" : "#{SITE}/assets/share.png"}">
      <meta name="twitter:card" content="summary">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
      #{css}
      #{jsonld(ld)}
      #{jsonld(crumbs)}
    </head>
    <body class="rs-page">
      #{pmast}
      <main class="rs-wrap pl-wrap"><div class="pl">
    #{body}  </div></main>
      #{foot}
    </body>
    </html>
  HTML
  File.write(File.join(ROOT, "people/#{q[:slug]}.html"), html)
end
# people/index.html: everyone we follow, grouped
groups = PEOPLE.group_by { |q| q[:kind] }
order = ["Key player", "Analyst and commentator", "Reporter", "Public broadcaster (SABC)", "International voice"]
plist = { "@context" => "https://schema.org", "@type" => "CollectionPage", "name" => "People in South Africa’s 2026 coalition talks", "url" => "#{SITE}/people/", "inLanguage" => "en-ZA", "publisher" => PUBLISHER,
          "mainEntity" => { "@type" => "ItemList", "itemListElement" => PEOPLE.each_with_index.map { |q, i| { "@type" => "ListItem", "position" => i + 1, "url" => "#{SITE}/people/#{q[:slug]}.html", "name" => q[:n] } } } }
pbody = +%(<p class="pl-back"><a href="../coalitions.html">← Coalitions Tracker</a></p>\n<article class="pl-ev"><h1 class="pl-evh">People in South Africa’s 2026 coalition talks</h1><p class="pl-dek pl-evdek">The key players negotiating the deals, and the journalists and commentators covering them, with everything they have said and published.</p>\n)
order.each { |g| next unless groups[g]; pbody << %(<section class="pl-sec"><h2 class="pl-sh">#{esc(g)}s</h2><ul class="pl-plist">#{groups[g].ssort { |q| q[:n] }.map { |q| %(<li><a href="#{q[:slug]}.html"><b>#{esc(q[:n])}</b></a> · #{esc(q[:role])}</li>) }.join}</ul></section>\n) }
pbody << "</article>\n"
File.write(File.join(ROOT, "people/index.html"), <<~HTML)
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>People in South Africa’s 2026 coalition talks | PREAMBLE</title>
    <meta name="description" content="Profiles of the key players negotiating South Africa’s 2026 coalition deals and the journalists and commentators covering them, with what each has said and published.">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
    <link rel="canonical" href="#{SITE}/people/">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
    #{css}
    #{jsonld(plist)}
  </head>
  <body class="rs-page">
    #{pmast}
    <main class="rs-wrap pl-wrap"><div class="pl">
  #{pbody}  </div></main>
    #{foot}
  </body>
  </html>
HTML

# ---------- coalitions.html: plain-HTML snapshot the app replaces on load ----------
ed = D["edition"]
snap = +"\n"
snap << %(<header class="pl-ed"><p class="pl-kick">Coalitions Tracker · Preamble</p><h1 class="pl-date">Who will run South Africa’s metros? Coalition talks after the 2026 local elections</h1><p class="pl-asof">Updated #{day(ed["date"])}, #{esc(ed["time"])}</p></header>\n)
snap << %(<section class="pl-sec"><h2 class="pl-sh">Stories</h2>\n)
STORIES.each { |s| snap << %(<p class="pl-row"><span class="pl-rt"><a href="coalitions/#{s[:id]}.html"><b>#{esc(s[:h])}</b></a><span>#{esc(s[:scope])} · #{esc(s[:cat])} · #{day(s[:upd])}</span><span>#{esc(s[:dek])}</span></span></p>\n) }
snap << "</section>\n"
voices = J.values.select { |p| p["group"] == "voice" }.ssort { |p| -(p["score"] || 0) }
players = J.values.select { |p| p["group"] == "player" }
snap << %(<section class="pl-sec"><h2 class="pl-sh">Voices</h2><p><a href="people/">Profiles of everyone we follow</a>. #{voices.map { |p| "#{NAMELINK[p["n"]] ? %(<a href="#{NAMELINK[p["n"]]}">#{esc(p["n"])}</a>) : esc(p["n"])} (#{esc(p["role"] || p["o"])})" }.join("; ")}.</p></section>\n)
snap << %(<section class="pl-sec"><h2 class="pl-sh">Key players</h2><p>#{players.map { |p| "#{NAMELINK[p["n"]] ? %(<a href="#{NAMELINK[p["n"]]}">#{esc(p["n"])}</a>) : esc(p["n"])} (#{esc(p["role"] || p["o"])})" }.join("; ")}.</p></section>\n)
if X["voices"].any?
  snap << %(<section class="pl-sec"><h2 class="pl-sh">International voices</h2><p>#{X["voices"].values.map { |v| "#{esc(v["n"])} (#{esc(v["role"])})" }.join("; ")}.</p></section>\n)
end
cpath = File.join(ROOT, "coalitions.html"); c = File.read(cpath)
c = replace_block(c, "PRERENDER", snap) || c.sub('<div class="pl" aria-live="polite"><p class="dm-loading">Loading…</p></div>') { %(<div class="pl" aria-live="polite"><!-- PRERENDER:START -->#{snap}<!-- PRERENDER:END --></div>) }
coll = { "@context" => "https://schema.org", "@type" => "CollectionPage", "name" => "Coalitions Tracker", "url" => "#{SITE}/coalitions.html",
         "description" => "Coverage of the coalition talks after South Africa’s 4 November 2026 local government elections, grouped into stories with summaries and links to every original report.",
         "dateModified" => ed["date"], "inLanguage" => "en-ZA", "publisher" => PUBLISHER,
         "mainEntity" => { "@type" => "ItemList", "itemListElement" => STORIES.each_with_index.map { |s, i| { "@type" => "ListItem", "position" => i + 1, "url" => "#{SITE}/coalitions/#{s[:id]}.html", "name" => s[:h] } } } }
c = replace_block(c, "JSONLD", jsonld(coll)) || c.sub("</head>") { "  <!-- JSONLD:START -->#{jsonld(coll)}<!-- JSONLD:END -->\n</head>" }
File.write(cpath, c)

# ---------- structured data on the other main pages ----------
site_ld = { "@context" => "https://schema.org", "@graph" => [
  { "@type" => "WebSite", "@id" => "#{SITE}/#website", "name" => "PREAMBLE", "url" => "#{SITE}/", "inLanguage" => "en-ZA", "publisher" => { "@id" => "#{SITE}/#org" } },
  PUBLISHER.merge("@id" => "#{SITE}/#org") ] }
pages = {
  "index.html" => { "@type" => "WebPage", "name" => "South Africa 2026 local election results", "description" => "Live results of South Africa’s 4 November 2026 local government elections: the national vote, a ward map and who won each metro." },
  "mayors.html" => { "@type" => "WebPage", "name" => "Mayors of South Africa’s metros after the 2026 elections", "description" => "Who leads each of South Africa’s eight metros after the 2026 local elections, and who is tipped where talks continue." },
  "map.html" => { "@type" => "WebPage", "name" => "2026 local elections ward map", "description" => "Results for every one of South Africa’s wards in the 2026 local government elections, searchable by address." } }
pages.each do |f, pg|
  path = File.join(ROOT, f); s = File.read(path)
  ld = site_ld.merge("@graph" => site_ld["@graph"] + [pg.merge("url" => "#{SITE}/#{f == "index.html" ? "" : f}", "isPartOf" => { "@id" => "#{SITE}/#website" }, "dateModified" => ed["date"])])
  s = replace_block(s, "JSONLD", jsonld(ld)) || s.sub("</head>") { "  <!-- JSONLD:START -->#{jsonld(ld)}<!-- JSONLD:END -->\n</head>" }
  File.write(path, s)
end

# ---------- sitemap.xml ----------
today = ed["date"]
urls = [["#{SITE}/", today, "hourly", "1.0"], ["#{SITE}/coalitions.html", today, "hourly", "0.9"], ["#{SITE}/mayors.html", today, "daily", "0.8"], ["#{SITE}/map.html", today, "weekly", "0.7"]]
urls += STORIES.map { |s| ["#{SITE}/coalitions/#{s[:id]}.html", s[:upd], "daily", "0.7"] }
urls << ["#{SITE}/people/", today, "daily", "0.7"]
urls += PEOPLE.map { |q| ["#{SITE}/people/#{q[:slug]}.html", q[:upd], "daily", "0.6"] }
urls << ["#{SITE}/news-tracker.html", today, "hourly", "0.7"]
urls << ["#{SITE}/privacy.html", "2026-11-25", "yearly", "0.3"]
File.write(File.join(ROOT, "sitemap.xml"), %(<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n#{urls.map { |u, d, f, p| "  <url><loc>#{u}</loc><lastmod>#{d}</lastmod><changefreq>#{f}</changefreq><priority>#{p}</priority></url>" }.join("\n")}\n</urlset>\n))

# ---------- llms.txt ----------
llms = +"# PREAMBLE\n\n> South Africa’s global and local data. Live results of the 4 November 2026 local government elections, a ward-by-ward map, the mayors of the eight metros, and a Coalitions Tracker that groups reporting on the coalition talks into stories with summaries and links to every original article. Updated #{day(ed["date"])}, #{ed["time"]} SAST.\n\n"
llms << "Data: Independent Electoral Commission (IEC). Summaries are written by Preamble with AI from published reporting; the journalists and politicians quoted do not write for Preamble.\n\n"
llms << "## Main pages\n\n- [2026 election results](#{SITE}/): national vote, ward map and who won each metro\n- [Coalitions Tracker](#{SITE}/coalitions.html): every story on the coalition talks, in South Africa and abroad\n- [Mayors](#{SITE}/mayors.html): who leads each metro, and who is tipped where talks continue\n- [Ward map](#{SITE}/map.html): results for every ward, searchable by address\n- [News Tracker (beta)](#{SITE}/news-tracker.html): an animated map of how the coalition stories spread across outlets and voices, day by day\n\n"
llms << "## Coalition stories (newest first)\n\n"
STORIES.each { |s| llms << "- [#{s[:h]}](#{SITE}/coalitions/#{s[:id]}.html) (#{s[:scope]}, updated #{day(s[:upd])}): #{s[:dek]}\n" }
llms << "\n## People (profiles: who they are, what they said, every piece tracked)\n\n"
PEOPLE.ssort { |q| [q[:scope], q[:kind] == "Key player" ? 0 : 1, q[:n]] }.each { |q| llms << "- [#{q[:n]}](#{SITE}/people/#{q[:slug]}.html): #{q[:role]}; #{q[:kind].downcase}, #{q[:its].size} coalition #{q[:its].size == 1 ? "piece" : "pieces"}\n" }
llms << "\n## Optional\n\n- [Tracker data (JSON)](#{SITE}/data/coalition-feed.json)\n- [Sitemap](#{SITE}/sitemap.xml)\n"
File.write(File.join(ROOT, "llms.txt"), llms)

puts "Built #{STORIES.size} story pages, #{PEOPLE.size} profiles, sitemap (#{urls.size} URLs), llms.txt and structured data."

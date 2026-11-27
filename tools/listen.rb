# Audio for the Listen bar on Coalitions Tracker stories (js/listen.js): each story's headline, standfirst and
# "In brief", read by a South African English voice from ElevenLabs, saved as audio/<story-id>.mp3 and listed in
# data/listen.json. Runs in the hourly GitHub Action after tools/build-seo.rb, reading the static story pages.
#
# Needs the ELEVENLABS_API_KEY secret (GitHub > Settings > Secrets and variables > Actions). Without it this does
# nothing, and the site falls back to the reader's own device reading the story aloud.
#
# Keeping the ElevenLabs bill in check (the key's plan has a monthly character allowance):
#   - a story is only read again when its text changed, and not more than once every REDO_HOURS hours;
#   - at most RUN_CHARS characters per hourly run and MONTH_CHARS per calendar month (Johannesburg time).
# Set LISTEN_MONTH_CHARS / LISTEN_RUN_CHARS / LISTEN_REDO_HOURS / LISTEN_VOICE in the workflow to change them.
require "json"
require "net/http"
require "digest"
require "cgi"
require "time"

ROOT = File.expand_path("..", __dir__)
MAN_PATH = File.join(ROOT, "data/listen.json")
KEY = ENV["ELEVENLABS_API_KEY"].to_s
VOICE = ENV["LISTEN_VOICE"].to_s.empty? ? "wldVCiOxtkWPlsr2mHyo" : ENV["LISTEN_VOICE"] # "Peter", South African English, ElevenLabs voice library
MODEL = "eleven_multilingual_v2"
MONTH_CHARS = (ENV["LISTEN_MONTH_CHARS"] || 40_000).to_i
RUN_CHARS = (ENV["LISTEN_RUN_CHARS"] || 8_000).to_i
REDO_HOURS = (ENV["LISTEN_REDO_HOURS"] || 12).to_i
KBPS = 64 # mp3_44100_64

if KEY.empty?
  puts "Listen: no ELEVENLABS_API_KEY secret; skipping (the site reads stories aloud on the reader's device instead)"
  exit 0
end

man = File.exist?(MAN_PATH) ? JSON.parse(File.read(MAN_PATH)) : {}
man["stories"] ||= {}
month = Time.now.getlocal("+02:00").strftime("%Y-%m")
if man["month"] != month then man["month"] = month; man["used"] = 0 end
man["voice"] = VOICE

text_of = lambda do |html|
  strip = ->(s) { CGI.unescapeHTML(s.to_s.gsub(/<[^>]+>/, "")).gsub(/\s+/, " ").strip }
  h = strip.(html[/<h1 class="pl-evh">(.*?)<\/h1>/m, 1])
  dek = strip.(html[/<p class="pl-dek pl-evdek">(.*?)<\/p>/m, 1])
  brief = (html[/<section class="pl-brief">(.*?)<\/section>/m, 1] || "").scan(/<li>(.*?)<\/li>/m).map { |m| strip.(m[0]) }
  brief = brief.reject(&:empty?).map { |b| b =~ /[.!?…’'"]\z/ ? b : "#{b}." } # a pause between points
  return nil if h.empty?
  [h.end_with?(".") ? h : "#{h}.", dek, brief.any? ? "In brief. #{brief.join(" ")}" : nil].compact.reject(&:empty?).join("\n\n")
end

pages = Dir[File.join(ROOT, "coalitions/*.html")].to_h { |f| [File.basename(f, ".html"), File.read(f, encoding: "UTF-8")] }
# stories that are gone: drop their audio
(man["stories"].keys - pages.keys).each do |id|
  File.delete(File.join(ROOT, "audio/#{id}.mp3")) if File.exist?(File.join(ROOT, "audio/#{id}.mp3"))
  man["stories"].delete(id)
end

now = Time.now.utc
todo = pages.filter_map do |id, html|
  t = text_of.(html) or next
  hash = Digest::SHA1.hexdigest("#{VOICE}|#{t}")[0, 12]
  old = man["stories"][id]
  next if old && old["hash"] == hash
  next if old && old["at"] && (now - Time.parse(old["at"])) < REDO_HOURS * 3600 # changed, but read recently: wait
  [id, t, hash, old ? 1 : 0]
end
todo.sort_by! { |x| [x[3], x[1].size] } # new stories first, then the shortest

spent = 0
Dir.mkdir(File.join(ROOT, "audio")) unless Dir.exist?(File.join(ROOT, "audio"))
todo.each do |id, t, hash, _|
  if spent + t.size > RUN_CHARS || man["used"].to_i + t.size > MONTH_CHARS
    puts "Listen: character budget reached (this run #{spent}, this month #{man["used"]}); the rest wait"
    break
  end
  uri = URI("https://api.elevenlabs.io/v1/text-to-speech/#{VOICE}?output_format=mp3_44100_#{KBPS}")
  req = Net::HTTP::Post.new(uri, "xi-api-key" => KEY, "Content-Type" => "application/json", "Accept" => "audio/mpeg")
  req.body = JSON.generate({ text: t, model_id: MODEL, language_code: "en",
                             voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true } })
  begin
    res = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 15, read_timeout: 120) { |h| h.request(req) }
  rescue StandardError => e
    puts "Listen: #{id}: #{e.class}: #{e.message}"; next
  end
  unless res.is_a?(Net::HTTPSuccess) && res.body.to_s.bytesize > 1000
    puts "Listen: #{id}: ElevenLabs #{res.code} #{res.body.to_s[0, 200]}"
    break if %w[401 402 403 429].include?(res.code) # bad key, out of credits or rate-limited: stop for this hour
    next
  end
  File.binwrite(File.join(ROOT, "audio/#{id}.mp3"), res.body)
  sec = (res.body.bytesize * 8.0 / (KBPS * 1000)).round
  man["stories"][id] = { "file" => "audio/#{id}.mp3", "sec" => sec, "hash" => hash, "chars" => t.size, "at" => now.iso8601 }
  spent += t.size
  man["used"] = man["used"].to_i + t.size
  puts "Listen: #{id} (#{t.size} characters, #{sec}s)"
end

man["stories"] = man["stories"].sort.to_h
File.write(MAN_PATH, JSON.pretty_generate(man) + "\n")
puts "Listen: #{spent} characters this run, #{man["used"]} this month"

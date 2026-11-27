# Audio for the Listen bar on Coalitions Tracker stories (js/listen.js): each story's headline, standfirst and
# "In brief", read by a South African English voice, saved as audio/<story-id>.mp3 and listed in data/listen.json.
# Runs in the hourly GitHub Action after tools/build-seo.rb, reading the static story pages.
#
# Voice service (GitHub > Settings > Secrets and variables > Actions), first one set wins:
#   1. Microsoft Azure Speech: AZURE_SPEECH_KEY and AZURE_SPEECH_REGION (e.g. southafricanorth). Voice en-ZA-LeahNeural
#      (South African English, female); set LISTEN_VOICE to en-ZA-LukeNeural for the male voice. The free F0 tier
#      allows 500,000 characters a month.
#   2. ElevenLabs: ELEVENLABS_API_KEY. Voice "Peter" (South African English, from the ElevenLabs voice library).
# With neither, this does nothing and the site falls back to the reader's own device reading the story aloud.
#
# Keeping within the allowance:
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
AZ_KEY = ENV["AZURE_SPEECH_KEY"].to_s.strip
AZ_REGION = ENV["AZURE_SPEECH_REGION"].to_s.strip.downcase.delete(" ")
EL_KEY = ENV["ELEVENLABS_API_KEY"].to_s.strip
PROVIDER = !AZ_KEY.empty? && !AZ_REGION.empty? ? "azure" : !EL_KEY.empty? ? "elevenlabs" : nil
VOICE = if !ENV["LISTEN_VOICE"].to_s.empty? then ENV["LISTEN_VOICE"]
        elsif PROVIDER == "azure" then "en-ZA-LeahNeural"
        else "wldVCiOxtkWPlsr2mHyo" # "Peter", ElevenLabs
        end
MONTH_CHARS = (ENV["LISTEN_MONTH_CHARS"] || (PROVIDER == "azure" ? 400_000 : 40_000)).to_i
RUN_CHARS = (ENV["LISTEN_RUN_CHARS"] || (PROVIDER == "azure" ? 60_000 : 8_000)).to_i
REDO_HOURS = (ENV["LISTEN_REDO_HOURS"] || (PROVIDER == "azure" ? 2 : 12)).to_i
KBPS = PROVIDER == "azure" ? 48 : 64 # the MP3 bit rate asked for, so the length can be worked out from the file size

unless PROVIDER
  puts "Listen: no AZURE_SPEECH_KEY + AZURE_SPEECH_REGION or ELEVENLABS_API_KEY secret; skipping (the site reads stories aloud on the reader's device instead)"
  exit 0
end
puts "Listen: using #{PROVIDER}, voice #{VOICE}"

# one story's text to MP3 bytes, or [nil, http code, message]
def speak(text)
  if PROVIDER == "azure"
    uri = URI("https://#{AZ_REGION}.tts.speech.microsoft.com/cognitiveservices/v1")
    req = Net::HTTP::Post.new(uri, "Ocp-Apim-Subscription-Key" => AZ_KEY, "Content-Type" => "application/ssml+xml",
                                   "X-Microsoft-OutputFormat" => "audio-24khz-48kbitrate-mono-mp3", "User-Agent" => "preamble-listen")
    paras = text.split(/\n\n+/).map { |p| CGI.escapeHTML(p) }.join('<break time="600ms"/>')
    req.body = %(<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-ZA"><voice name="#{VOICE}"><prosody rate="-4%">#{paras}</prosody></voice></speak>)
  else
    uri = URI("https://api.elevenlabs.io/v1/text-to-speech/#{VOICE}?output_format=mp3_44100_64")
    req = Net::HTTP::Post.new(uri, "xi-api-key" => EL_KEY, "Content-Type" => "application/json", "Accept" => "audio/mpeg")
    req.body = JSON.generate({ text: text, model_id: "eleven_multilingual_v2", language_code: "en",
                               voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true } })
  end
  res = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 15, read_timeout: 120) { |h| h.request(req) }
  return [res.body, res.code, nil] if res.is_a?(Net::HTTPSuccess) && res.body.to_s.bytesize > 1000
  [nil, res.code, res.body.to_s[0, 200]]
rescue StandardError => e
  [nil, "error", "#{e.class}: #{e.message}"]
end

man = File.exist?(MAN_PATH) ? JSON.parse(File.read(MAN_PATH)) : {}
man["stories"] ||= {}
month = Time.now.getlocal("+02:00").strftime("%Y-%m")
if man["month"] != month then man["month"] = month; man["used"] = 0 end
man["provider"] = PROVIDER
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
  hash = Digest::SHA1.hexdigest("#{PROVIDER}|#{VOICE}|#{t}")[0, 12]
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
  body, code, msg = speak(t)
  unless body
    puts "Listen: #{id}: #{PROVIDER} #{code} #{msg}"
    break if %w[401 402 403 429].include?(code) # bad key, out of allowance or rate-limited: stop for this hour
    next
  end
  File.binwrite(File.join(ROOT, "audio/#{id}.mp3"), body)
  sec = (body.bytesize * 8.0 / (KBPS * 1000)).round
  man["stories"][id] = { "file" => "audio/#{id}.mp3", "sec" => sec, "hash" => hash, "chars" => t.size, "at" => now.iso8601 }
  spent += t.size
  man["used"] = man["used"].to_i + t.size
  puts "Listen: #{id} (#{t.size} characters, #{sec}s)"
end

man["stories"] = man["stories"].sort.to_h
File.write(MAN_PATH, JSON.pretty_generate(man) + "\n")
puts "Listen: #{spent} characters this run, #{man["used"]} this month"

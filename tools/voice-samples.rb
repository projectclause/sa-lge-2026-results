# Voice samples for choosing the Listen bar voice: the same short news paragraph read by several Microsoft Azure
# neural voices, saved as audio/samples/<voice>.mp3 and listed in data/voice-samples.json. voices.html (unlisted)
# plays them. Run by hand: GitHub > Actions > "Listen voice samples" > Run workflow. Needs AZURE_SPEECH_KEY and
# AZURE_SPEECH_REGION, like tools/listen.rb.
require "json"
require "net/http"
require "cgi"
require "time"

ROOT = File.expand_path("..", __dir__)
KEY = ENV["AZURE_SPEECH_KEY"].to_s.strip
REGION = ENV["AZURE_SPEECH_REGION"].to_s.strip.downcase.delete(" ")
abort "voice-samples: AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are needed" if KEY.empty? || REGION.empty?

VOICES = [
  ["en-ZA-LeahNeural", "Leah", "South African English, female"],
  ["en-ZA-LukeNeural", "Luke", "South African English, male"],
  ["en-GB-SoniaNeural", "Sonia", "British English, female"],
  ["en-GB-RyanNeural", "Ryan", "British English, male"],
  ["en-US-AvaMultilingualNeural", "Ava", "American English, female, very natural"],
  ["en-US-AndrewMultilingualNeural", "Andrew", "American English, male, very natural"],
  ["en-US-EmmaMultilingualNeural", "Emma", "American English, female, warm"],
  ["en-US-BrianMultilingualNeural", "Brian", "American English, male, relaxed"],
  ["en-AU-NatashaNeural", "Natasha", "Australian English, female"],
  ["en-IE-EmilyNeural", "Emily", "Irish English, female"],
  ["en-KE-AsiliaNeural", "Asilia", "Kenyan English, female"],
  ["en-NG-AbeoNeural", "Abeo", "Nigerian English, male"]
].freeze

TEXT = "Herman Mashaba was re-elected Mayor of Johannesburg on Friday, seven years after he resigned. " \
       "In Tshwane, ActionSA’s Nasiphi Moya returns as mayor, and in eThekwini the MK Party’s Mxolisi Phakathi " \
       "was elected with the ANC’s support. In brief: the ANC no longer runs any of South Africa’s eight metros."

out = []
Dir.mkdir(File.join(ROOT, "audio")) unless Dir.exist?(File.join(ROOT, "audio"))
Dir.mkdir(File.join(ROOT, "audio/samples")) unless Dir.exist?(File.join(ROOT, "audio/samples"))
VOICES.each do |id, name, desc|
  lang = id[0, 5]
  uri = URI("https://#{REGION}.tts.speech.microsoft.com/cognitiveservices/v1")
  req = Net::HTTP::Post.new(uri, "Ocp-Apim-Subscription-Key" => KEY, "Content-Type" => "application/ssml+xml",
                                 "X-Microsoft-OutputFormat" => "audio-24khz-48kbitrate-mono-mp3", "User-Agent" => "preamble-listen")
  req.body = %(<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="#{lang}"><voice name="#{id}">#{CGI.escapeHTML(TEXT)}</voice></speak>)
  begin
    res = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 15, read_timeout: 60) { |h| h.request(req) }
  rescue StandardError => e
    puts "#{id}: #{e.class}: #{e.message}"; next
  end
  unless res.is_a?(Net::HTTPSuccess) && res.body.to_s.bytesize > 1000
    puts "#{id}: #{res.code} #{res.body.to_s[0, 150]}"; next
  end
  File.binwrite(File.join(ROOT, "audio/samples/#{id}.mp3"), res.body)
  out << { "id" => id, "name" => name, "desc" => desc, "file" => "audio/samples/#{id}.mp3" }
  puts "#{id}: ok"
end
File.write(File.join(ROOT, "data/voice-samples.json"), JSON.pretty_generate({ "text" => TEXT, "at" => Time.now.utc.iso8601, "voices" => out }) + "\n")
puts "#{out.size} of #{VOICES.size} voices recorded"

# Tells Bing, Yandex, Seznam, Naver and other IndexNow search engines that pages changed,
# so they recrawl straight away (Bing's index also feeds ChatGPT search and Copilot).
# Run after a push has gone live:   ruby tools/indexnow.rb            (every URL in sitemap.xml)
#                                   ruby tools/indexnow.rb URL URL…   (just these)
require "net/http"; require "json"; require "uri"
ROOT = File.expand_path("..", __dir__)
key = Dir[File.join(ROOT, "*.txt")].map { |f| File.basename(f, ".txt") }.find { |n| n =~ /\A[0-9a-f]{32}\z/ } or abort "no IndexNow key file"
urls = ARGV.any? ? ARGV : File.read(File.join(ROOT, "sitemap.xml")).scan(%r{<loc>([^<]+)</loc>}).flatten
body = { host: "preamble.co.za", key: key, keyLocation: "https://preamble.co.za/#{key}.txt", urlList: urls }
uri = URI("https://api.indexnow.org/indexnow")
res = Net::HTTP.post(uri, JSON.generate(body), "Content-Type" => "application/json; charset=utf-8")
puts "IndexNow: #{res.code} #{res.message} (#{urls.size} URLs)"

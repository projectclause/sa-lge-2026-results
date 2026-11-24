# encoding: utf-8
# The Coalitions Tracker reads two files:
#   data/coalition-feed.json   written by hand (the editor's stories, people and pieces); the hourly job never touches it
#   data/coalition-auto.json   written every hour by tools/auto-update.rb (new pieces, new coverage, new stories)
# Feed.load joins them the same way js/feed.js does in the browser, so the static pages and the live page agree.
# Anything the editor has already added by hand wins: a piece or report whose link is already in the feed is skipped,
# and an hourly story whose id the editor reuses is replaced by the editor's version.
require "json"
require "set"

module Feed
  module_function

  def load(root)
    d = JSON.parse(File.read(File.join(root, "data/coalition-feed.json"), encoding: "UTF-8"))
    path = File.join(root, "data/coalition-auto.json")
    a = File.exist?(path) ? (JSON.parse(File.read(path, encoding: "UTF-8")) rescue nil) : nil
    merge(d, a)
  end

  def merge(d, a)
    return d unless a.is_a?(Hash)
    urls = Set.new
    alias_of = {} # hourly item id -> the id the editor used for the same link
    id_of_url = {}
    d["items"].each { |i| urls << i["url"]; id_of_url[i["url"]] = i["id"] }
    d["events"].each { |e| (e["coverage"] || []).each { |c| urls << c["url"] } }
    ids = d["items"].map { |i| i["id"] }.to_set
    (a["items"] || []).each do |i|
      if id_of_url[i["url"]] then alias_of[i["id"]] = id_of_url[i["url"]]; next end
      next if ids.include?(i["id"]) || !d["journalists"][i["j"]]
      d["items"] << i; ids << i["id"]; urls << i["url"]
    end
    real = ->(id) { alias_of[id] || id }
    evs = d["events"].to_h { |e| [e["id"], e] }
    (a["attach"] || {}).each do |eid, list|
      e = evs[eid] or next
      list.map(&real).each { |id| e["items"] << id if ids.include?(id) && !e["items"].include?(id) }
    end
    (a["coverage"] || {}).each do |eid, list|
      e = evs[eid] or next
      e["coverage"] ||= []
      list.each { |c| next if urls.include?(c["url"]); e["coverage"] << c; urls << c["url"] }
    end
    (a["events"] || []).each do |e|
      next if evs[e["id"]]
      e = e.merge("items" => (e["items"] || []).map(&real).select { |id| ids.include?(id) }.uniq,
                  "coverage" => (e["coverage"] || []).reject { |c| urls.include?(c["url"]) })
      e["coverage"].each { |c| urls << c["url"] }
      next if e["items"].empty? && e["coverage"].empty?
      %w[brief sec].each { |k| e[k] ||= [] }
      e["voices"] ||= {}
      d["events"] << e; evs[e["id"]] = e
    end
    ae = a["edition"]
    if ae && ae["date"] && "#{ae["date"]} #{ae["time"]}" > "#{d["edition"]["date"]} #{d["edition"]["time"]}"
      d["edition"] = ae
    end
    d
  end
end

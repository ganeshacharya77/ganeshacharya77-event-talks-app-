import os
import re
import time
import urllib.request
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
FALLBACK_FEED_URL = "https://cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache_data = {
    "timestamp": 0,
    "payload": None
}
CACHE_TTL_SECONDS = 900  # 15 minutes cache


def fetch_and_parse_feed(force_refresh=False):
    now = time.time()
    if not force_refresh and cache_data["payload"] and (now - cache_data["timestamp"] < CACHE_TTL_SECONDS):
        return cache_data["payload"], True

    xml_content = None
    last_error = None

    for url in [FEED_URL, FALLBACK_FEED_URL]:
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) BigQueryReleaseNotesFetcher/1.0"}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                xml_content = response.read()
                break
        except Exception as e:
            last_error = str(e)
            continue

    if not xml_content:
        # If fetch fails, return cached payload if available, else raise exception
        if cache_data["payload"]:
            return cache_data["payload"], True
        raise RuntimeError(f"Unable to fetch feed from sources. Last error: {last_error}")

    feed = feedparser.parse(xml_content)
    parsed_entries = []

    global_item_counter = 0

    for entry in feed.entries:
        date_str = entry.get("title", "Unknown Date")
        pub_iso = entry.get("updated", entry.get("published", ""))
        link = entry.get("link", "https://cloud.google.com/bigquery/docs/release-notes")
        summary_html = entry.get("summary", entry.get("description", ""))

        soup = BeautifulSoup(summary_html, "html.parser")

        # Parse sub-items inside each release entry
        items = []
        current_type = "General"
        current_content_nodes = []

        def flush_item(type_name, nodes):
            nonlocal global_item_counter
            if not nodes:
                return
            
            # Combine nodes text and html
            node_html = "".join([str(n) for n in nodes])
            text_soup = BeautifulSoup(node_html, "html.parser")
            text_content = text_soup.get_text(separator=" ", strip=True)

            if not text_content:
                return

            # Extract any anchor links
            links = []
            for a in text_soup.find_all("a", href=True):
                links.append({
                    "text": a.get_text(strip=True),
                    "href": a["href"]
                })

            global_item_counter += 1
            items.append({
                "item_id": f"note-{global_item_counter}",
                "type": type_name,
                "text": text_content,
                "html": node_html,
                "links": links
            })

        for elem in soup.children:
            if elem.name in ["h2", "h3", "h4"]:
                flush_item(current_type, current_content_nodes)
                current_type = elem.get_text(strip=True)
                current_content_nodes = []
            elif elem.name is not None:
                current_content_nodes.append(elem)

        flush_item(current_type, current_content_nodes)

        # Fallback if no sub-items parsed
        if not items and summary_html.strip():
            global_item_counter += 1
            items.append({
                "item_id": f"note-{global_item_counter}",
                "type": "General",
                "text": soup.get_text(separator=" ", strip=True),
                "html": summary_html,
                "links": []
            })

        parsed_entries.append({
            "entry_id": entry.get("id", link),
            "date": date_str,
            "pub_iso": pub_iso,
            "link": link,
            "items": items
        })

    payload = {
        "fetched_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "feed_title": feed.feed.get("title", "BigQuery Release Notes"),
        "total_entries": len(parsed_entries),
        "entries": parsed_entries
    }

    cache_data["timestamp"] = now
    cache_data["payload"] = payload
    return payload, False


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/release-notes", methods=["GET"])
def get_release_notes():
    force = request.args.get("force", "false").lower() == "true"
    try:
        data, is_cached = fetch_and_parse_feed(force_refresh=force)
        return jsonify({
            "success": True,
            "cached": is_cached,
            "data": data
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/format-tweet", methods=["POST"])
def format_tweet():
    payload = request.json or {}
    text = payload.get("text", "")
    date = payload.get("date", "")
    note_type = payload.get("type", "Update")
    link = payload.get("link", "https://cloud.google.com/bigquery/docs/release-notes")
    style = payload.get("style", "standard")  # standard, headline, breakdown, tldr

    clean_text = re.sub(r"\s+", " ", text).strip()
    
    if style == "headline":
        tweet = f"🚀 BigQuery {note_type} ({date}):\n\n\"{clean_text}\"\n\n🔗 Details: {link}\n\n#BigQuery #GoogleCloud #DataEngineering"
    elif style == "breakdown":
        tweet = f"📊 Google BigQuery Release Update | {date}\n\nType: [{note_type}]\nSummary: {clean_text}\n\nRead more ➡️ {link}\n\n#BigQuery #GCP #SQL"
    elif style == "tldr":
        tweet = f"💡 TL;DR BigQuery Update ({date}):\n{clean_text}\n\n🔗 {link}\n#BigQuery #GoogleCloud"
    else:
        tweet = f"✨ New BigQuery {note_type} ({date})\n\n{clean_text}\n\n🔗 {link}\n\n#BigQuery #GoogleCloud"

    return jsonify({
        "success": True,
        "tweet": tweet,
        "length": len(tweet)
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    print(f"🚀 Starting BigQuery Release Notes Web App on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)

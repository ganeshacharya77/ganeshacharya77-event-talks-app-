# BigQuery Pulse ⚡ — Release Notes Tracker & Tweet Studio

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

A modern, full-stack web application designed to track Google Cloud **BigQuery Release Notes** in real time, automatically classify updates, and effortlessly format and tweet announcements to your tech community.

![App Demo Banner](https://img.shields.io/badge/BigQuery-Pulse_v1.0-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)

---

## ✨ Features

- 🔄 **Live RSS Feed Tracker & Caching**: Ingests updates directly from the official Google Cloud BigQuery RSS feed with an in-memory cache (15-minute TTL) and force-refresh capabilities.
- 🏷️ **Sub-Item Classification Engine**: Intelligently parses HTML header blocks to break down multi-topic releases into distinct categorized items (`Feature`, `Announcement`, `Issue / Deprecation`).
- ⚡ **AJAX Refresh & SVG Spinner**: Fetches feed updates live without requiring a full browser page refresh.
- 🔍 **Real-Time Search & Filtering**: Instant search across titles, descriptions, and SQL syntax with `Cmd+K` keyboard shortcut support.
- 🐦 **Interactive Tweet Studio Modal**:
  - Native HTML5 `<dialog>` overlay with backdrop blur.
  - 4 Preset Tweet Formatting Styles: *Standard*, *Headline 🚀*, *Breakdown 📊*, *TL;DR 💡*.
  - Real-time **280-character Twitter length indicator** with dynamic warning bars.
  - Single-click hashtag toggles (`#BigQuery`, `#GoogleCloud`, `#DataEngineering`, `#SQL`, `#GCP`).
  - 1-Click **Post on X / Twitter** (via Twitter Intent API) and clipboard copy fallback.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.9+, Flask, `feedparser`, `requests`, `BeautifulSoup4`
- **Frontend**: Vanilla HTML5, CSS3 (Custom Glassmorphism Design System, CSS Grid & Variables), JavaScript (ES6+ Native Modules)
- **Overlay UI**: Native HTML5 `<dialog>` API & backdrop filter
- **Data Source**: Official Google Cloud BigQuery RSS Feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`)

---

## 🚀 Quick Start & Installation

### Prerequisites
- Python 3.9 or higher
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/ganeshacharya77/ganeshacharya77-event-talks-app-.git
cd ganeshacharya77-event-talks-app-
```

### 2. Run with the Automatic Script
```bash
./start.sh
```

### Or Manual Setup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run application
python3 app.py
```

### 3. Open in Browser
Visit **`http://127.0.0.1:5050`** in your browser.

---

## 📡 API Endpoints

### `GET /api/release-notes`
Fetches the parsed list of release notes.

- **Query Parameters**:
  - `force` *(optional, boolean)*: Set to `true` to bypass server cache.
- **Sample Response**:
```json
{
  "success": true,
  "cached": false,
  "data": {
    "fetched_at": "2026-07-22 22:00:00 UTC",
    "total_entries": 30,
    "entries": [
      {
        "date": "July 20, 2026",
        "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#July_20_2026",
        "items": [
          {
            "item_id": "note-1",
            "type": "Feature",
            "text": "Lakehouse for Apache Iceberg now supports integration with SAP Business Data Cloud...",
            "html": "<p>...</p>"
          }
        ]
      }
    ]
  }
}
```

### `POST /api/format-tweet`
Generates a pre-formatted tweet string for a specific release note.

- **Request Body**:
```json
{
  "text": "Lakehouse for Apache Iceberg supports integration...",
  "date": "July 20, 2026",
  "type": "Feature",
  "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#July_20_2026",
  "style": "headline"
}
```

---

## 📁 Directory Structure

```text
bq-releases-notes/
├── app.py                  # Flask backend server & RSS parser engine
├── requirements.txt        # Python package dependencies
├── start.sh                # Executable runner script
├── ARCHITECTURE.md         # Full technical architecture documentation
├── README.md               # Project README overview
├── static/
│   ├── css/
│   │   └── style.css       # Design system, glassmorphism & responsive styles
│   └── js/
│       └── app.js          # Client state manager, AJAX refresh & Tweet Studio
└── templates/
    └── index.html          # Main HTML5 application interface
```

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

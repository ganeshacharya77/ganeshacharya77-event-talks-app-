# 🚀 Implementation Plan: Utility Features & Light/Dark Theme Switch

This document outlines the design and implementation plan for adding three requested features to **BigQuery Pulse**:

---

## 📋 Features Overview

| Feature | Location | Description |
| :--- | :--- | :--- |
| 1. **Copy to Clipboard Button** | On every Release Note Card | A button to copy the full release note text and direct URL formatted cleanly to the clipboard, with animated toast confirmation. |
| 2. **Export to CSV Button** | Header / Controls Bar | Downloads all currently loaded & filtered release notes into a structured `.csv` file (`bigquery_release_notes.csv`). |
| 3. **Dark / Light Theme Toggle** | App Header (Top Right) | A theme toggle switch that dynamically swaps CSS `:root` variables between Dark (`slate-900`) and Light (`slate-50`) modes with `localStorage` persistence. |

---

## 🛠️ Step-by-Step Implementation Steps

### 1. Light/Dark Theme Switch (`style.css` & `app.js` & `index.html`)
- **CSS (`static/css/style.css`)**:
  - Define `[data-theme="light"]` attribute overrides on `:root`:
    ```css
    [data-theme="light"] {
        --bg-main: #f8fafc;
        --bg-card: #ffffff;
        --bg-card-hover: #f1f5f9;
        --bg-card-secondary: #f8fafc;
        --border-color: #e2e8f0;
        --border-highlight: #3b82f6;
        --text-primary: #0f172a;
        --text-secondary: #475569;
        --text-muted: #64748b;
    }
    ```
- **HTML (`templates/index.html`)**:
  - Add a styled toggle switch in `.header-actions`.
- **JS (`static/js/app.js`)**:
  - Add `toggleTheme()` and `initTheme()` functions that check `localStorage.getItem('theme')` and set `document.documentElement.setAttribute('data-theme', theme)`.

### 2. Export to CSV Feature (`app.js` & `index.html`)
- **HTML (`templates/index.html`)**:
  - Add an **"Export CSV"** button alongside the search & filter bar.
- **JS (`static/js/app.js`)**:
  - Implement `exportToCSV()` function:
    1. Extracts `state.filteredItems` (or `state.flattenedItems`).
    2. Formats rows into RFC 4180 CSV compliance (escaping double quotes `"`, commas `,`, and newlines `\n`).
    3. Triggers browser download via a temporary Blob URL (`bigquery_release_notes_YYYY-MM-DD.csv`).
    4. Displays toast: `"Exported X updates to CSV!"`.

### 3. Copy to Clipboard Action (`app.js` & `index.html`)
- **HTML/JS Card Renderer**:
  - Ensure every card renders a **"Copy Content"** button alongside "Tweet Update".
  - Bind `copyUpdateText(itemId)` with fallback handling for clipboard API and immediate UI visual feedback.

---

## 🔍 Verification & Testing Strategy
1. **Theme Switch**: Click theme toggle to verify all text, background colors, card borders, badges, and modals dynamically adapt between Dark & Light themes cleanly. Check page reload persistence.
2. **CSV Export**: Click "Export CSV" with and without search filters applied. Inspect generated CSV file format in Excel / Numbers / text editor.
3. **Copy to Clipboard**: Click "Copy Content" on multiple cards, verify clipboard content and toast alert feedback.

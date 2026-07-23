# 🚀 Implementation Plan: Search Keyword Highlighting

This document details the plan to implement real-time **Search Keyword Highlighting** across BigQuery release note cards.

---

## 🎯 Feature Objectives

- **Visual Clarity**: When a user types a search query in the search bar (e.g. `"Iceberg"`, `"AI"`, `"SQL"`, `"governance"`), matching text within release note cards will automatically be highlighted using styled `<mark class="search-highlight">` tags.
- **HTML Safety**: Ensure keyword replacement only highlights visible text content and does NOT break HTML tag attributes (such as `<a href="...">` or `<span class="...">`).
- **Instant Cleanup**: When the search query is cleared, cards revert instantly to standard clean rendering.

---

## 🛠️ Step-by-Step Implementation Steps

### 1. CSS Styling (`static/css/style.css`)
Add visual styling for `<mark class="search-highlight">` in both Dark and Light themes:

```css
/* Search Keyword Highlighting */
mark.search-highlight {
    background: rgba(245, 158, 11, 0.3);
    color: #fef3c7;
    border-bottom: 2px solid var(--accent-amber);
    border-radius: 3px;
    padding: 0 3px;
    font-weight: 600;
}

[data-theme="light"] mark.search-highlight {
    background: rgba(245, 158, 11, 0.25);
    color: #92400e;
    border-bottom: 2px solid #d97706;
}
```

### 2. Highlight Helper (`static/js/app.js`)
Implement `highlightMatches(htmlContent, query)`:
- Escape regex special characters in `query`.
- Split HTML text vs HTML tags (or parse via DOM parser) to apply replacement safely.

### 3. Update Renderer (`renderFeed` in `static/js/app.js`)
- Pass `item.html` through `highlightMatches(item.html, state.searchQuery)` when rendering `.item-body`.

---

## 🔍 Verification & Testing Strategy
1. **Search Test**: Type common keywords (`"Iceberg"`, `"Preview"`, `"SAP"`, `"tag"`) and confirm matching occurrences light up in amber.
2. **HTML Attribute Integrity Test**: Search for words that appear in HTML tags (e.g. `"href"`, `"http"`, `"class"`, `"docs"`) and verify that link URLs and tag structures do not break or render raw markup.
3. **Clear Search Test**: Click the `✕` clear button or erase input to verify all highlights disappear cleanly.

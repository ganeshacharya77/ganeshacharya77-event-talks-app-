/* ==========================================================================
   BigQuery Pulse - Interactive Frontend Logic
   ========================================================================== */

let state = {
    entries: [],
    flattenedItems: [],
    filteredItems: [],
    activeFilter: 'ALL',
    searchQuery: '',
    currentSelectedItem: null,
    currentPresetStyle: 'standard',
    isFetching: false,
    theme: 'dark'
};

// Initialize App on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initKeyboardShortcuts();
    refreshNotes(false);
});

/* ==========================================================================
   Theme Switcher (Dark / Light Mode)
   ========================================================================== */

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

function toggleTheme() {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`);
}

function setTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    const moonIcon = document.getElementById('themeMoonIcon');
    const sunIcon = document.getElementById('themeSunIcon');
    const label = document.getElementById('themeToggleLabel');

    if (theme === 'light') {
        moonIcon.classList.add('hidden');
        sunIcon.classList.remove('hidden');
        label.textContent = 'Dark Mode';
    } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
        label.textContent = 'Light Mode';
    }
}

/* ==========================================================================
   Fetch Release Notes & Data Operations
   ========================================================================== */

async function refreshNotes(force = false) {
    if (state.isFetching) return;
    
    state.isFetching = true;
    const refreshBtn = document.getElementById('refreshBtn');
    const spinner = document.getElementById('spinnerIcon');
    const btnLabel = document.getElementById('refreshBtnLabel');
    const feedContent = document.getElementById('feedContent');

    refreshBtn.disabled = true;
    spinner.classList.add('spinning');
    btnLabel.textContent = 'Fetching...';

    try {
        const response = await fetch(`/api/release-notes?force=${force}`);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch release notes');
        }

        const data = result.data;
        state.entries = data.entries || [];
        
        // Flatten items for easy searching and filtering while keeping entry metadata
        state.flattenedItems = [];
        state.entries.forEach(entry => {
            (entry.items || []).forEach(item => {
                state.flattenedItems.push({
                    ...item,
                    date: entry.date,
                    pub_iso: entry.pub_iso,
                    link: entry.link,
                    entry_id: entry.entry_id
                });
            });
        });

        // Update Header & Stats Meta
        updateStats(data);
        
        // Apply filters & render
        applyFilters();

        if (force) {
            showToast('Feed refreshed with latest BigQuery updates!');
        }

    } catch (error) {
        console.error('Error fetching release notes:', error);
        feedContent.innerHTML = `
            <div class="empty-state">
                <h3 style="color: var(--accent-red); margin-bottom: 0.5rem;">Failed to load release notes</h3>
                <p>${error.message || 'Please check your internet connection and try again.'}</p>
                <button class="btn btn-primary" style="margin-top: 1rem;" onclick="refreshNotes(true)">Retry Fetch</button>
            </div>
        `;
        showToast('Error loading feed: ' + error.message);
    } finally {
        state.isFetching = false;
        refreshBtn.disabled = false;
        spinner.classList.remove('spinning');
        btnLabel.textContent = 'Refresh Feed';
    }
}

// Update Top Dashboard Statistics
function updateStats(data) {
    document.getElementById('statTotalEntries').textContent = data.total_entries || 0;
    document.getElementById('statTotalItems').textContent = state.flattenedItems.length;
    
    if (state.entries.length > 0) {
        document.getElementById('statLatestDate').textContent = state.entries[0].date;
    }
    
    document.getElementById('lastFetchedTime').textContent = `Last refreshed: ${data.fetched_at || 'Just now'}`;
}

// Handle Category Filter Tabs
function setFilter(filterType) {
    state.activeFilter = filterType;
    
    // Update Tab UI States
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('data-type') === filterType) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    applyFilters();
}

// Handle Real-Time Search Input
function handleSearch() {
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    state.searchQuery = input.value.trim().toLowerCase();
    
    if (state.searchQuery.length > 0) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }

    applyFilters();
}

function clearSearch() {
    const input = document.getElementById('searchInput');
    input.value = '';
    state.searchQuery = '';
    document.getElementById('clearSearchBtn').classList.add('hidden');
    applyFilters();
}

// Filter and Group Items
function applyFilters() {
    const query = state.searchQuery;
    const filter = state.activeFilter;

    state.filteredItems = state.flattenedItems.filter(item => {
        // Filter by Category Tag
        let matchesCategory = true;
        if (filter === 'Feature') {
            matchesCategory = item.type.toLowerCase().includes('feature');
        } else if (filter === 'Announcement') {
            matchesCategory = item.type.toLowerCase().includes('announcement');
        } else if (filter === 'Issue') {
            matchesCategory = item.type.toLowerCase().includes('issue') || 
                              item.type.toLowerCase().includes('deprecated') || 
                              item.type.toLowerCase().includes('change') || 
                              item.type.toLowerCase().includes('fix');
        }

        // Filter by Search Query
        let matchesSearch = true;
        if (query) {
            const textMatch = item.text.toLowerCase().includes(query);
            const dateMatch = item.date.toLowerCase().includes(query);
            const typeMatch = item.type.toLowerCase().includes(query);
            matchesSearch = textMatch || dateMatch || typeMatch;
        }

        return matchesCategory && matchesSearch;
    });

    renderFeed();
}

// Highlight Search Keywords Safely in HTML
function highlightMatches(htmlContent, query) {
    if (!query || !query.trim()) return htmlContent;

    const safeQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeQuery})`, 'gi');

    // Split HTML by tags to safely modify text nodes only without touching tag attributes
    const parts = htmlContent.split(/(<[^>]+>)/g);
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] && !parts[i].startsWith('<')) {
            parts[i] = parts[i].replace(regex, '<mark class="search-highlight">$1</mark>');
        }
    }
    return parts.join('');
}

// Render Timeline Feed Cards
function renderFeed() {
    const feedContent = document.getElementById('feedContent');
    const resultsCount = document.getElementById('resultsCount');

    resultsCount.textContent = `Showing ${state.filteredItems.length} update${state.filteredItems.length === 1 ? '' : 's'}`;

    if (state.filteredItems.length === 0) {
        feedContent.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <h3 style="margin-top: 1rem; color: var(--text-primary);">No updates found</h3>
                <p>Try adjusting your search query or switching filter tabs.</p>
                <button class="btn btn-secondary" style="margin-top: 1rem;" onclick="clearSearch(); setFilter('ALL');">Reset Filters</button>
            </div>
        `;
        return;
    }

    // Group filtered items by date
    const groupedByDate = {};
    state.filteredItems.forEach(item => {
        if (!groupedByDate[item.date]) {
            groupedByDate[item.date] = [];
        }
        groupedByDate[item.date].push(item);
    });

    let html = '';

    Object.keys(groupedByDate).forEach(dateStr => {
        const itemsForDate = groupedByDate[dateStr];

        html += `
            <section class="date-group">
                <div class="date-header">
                    <h2 class="date-title">${escapeHtml(dateStr)}</h2>
                    <div class="date-line"></div>
                </div>
                <div class="date-items" style="display: flex; flex-direction: column; gap: 1rem;">
        `;

        itemsForDate.forEach(item => {
            const badgeClass = getBadgeClass(item.type);
            const highlightedHtml = highlightMatches(item.html, state.searchQuery);

            html += `
                <article class="item-card" id="${item.item_id}">
                    <div class="item-card-header">
                        <span class="badge ${badgeClass}">${escapeHtml(item.type)}</span>
                        <a href="${item.link}" target="_blank" rel="noopener" class="date-tag" style="font-size: 0.8rem; text-decoration: none;">
                            Direct Link ↗
                        </a>
                    </div>
                    
                    <div class="item-body">
                        ${highlightedHtml}
                    </div>

                    <div class="item-actions">
                        <button class="action-btn tweet-btn" onclick="openTweetStudio('${item.item_id}')">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            Tweet Update
                        </button>
                        <button class="action-btn" onclick="copyUpdateText('${item.item_id}')" title="Copy update text to clipboard">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Copy Content
                        </button>
                    </div>
                </article>
            `;
        });

        html += `
                </div>
            </section>
        `;
    });

    feedContent.innerHTML = html;
}

// Get Badge CSS Class from Item Type
function getBadgeClass(typeStr) {
    const lower = (typeStr || '').toLowerCase();
    if (lower.includes('feature')) return 'badge-feature';
    if (lower.includes('announcement')) return 'badge-announcement';
    if (lower.includes('issue') || lower.includes('deprecated') || lower.includes('fix')) return 'badge-issue';
    return 'badge-general';
}

/* ==========================================================================
   Export to CSV Feature
   ========================================================================== */

function exportToCSV() {
    if (!state.filteredItems || state.filteredItems.length === 0) {
        showToast('No release notes available to export.');
        return;
    }

    const headers = ['Date', 'Category', 'Summary Text', 'Direct Link', 'ISO Timestamp'];
    const rows = [headers];

    state.filteredItems.forEach(item => {
        const cleanText = (item.text || '').replace(/"/g, '""');
        const cleanDate = (item.date || '').replace(/"/g, '""');
        const cleanType = (item.type || '').replace(/"/g, '""');
        const cleanLink = (item.link || '').replace(/"/g, '""');
        const cleanIso = (item.pub_iso || '').replace(/"/g, '""');

        rows.push([
            `"${cleanDate}"`,
            `"${cleanType}"`,
            `"${cleanText}"`,
            `"${cleanLink}"`,
            `"${cleanIso}"`
        ]);
    });

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const dateSlug = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bigquery_release_notes_${dateSlug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${state.filteredItems.length} update(s) to CSV!`);
}

/* ==========================================================================
   Tweet Studio Modal Controls
   ========================================================================== */

function openTweetStudio(itemId) {
    const item = state.flattenedItems.find(i => i.item_id === itemId);
    if (!item) return;

    state.currentSelectedItem = item;
    state.currentPresetStyle = 'standard';

    // Populate Modal Metadata
    document.getElementById('tweetItemDate').textContent = item.date;
    const typeBadge = document.getElementById('tweetItemType');
    typeBadge.textContent = item.type;
    typeBadge.className = `badge ${getBadgeClass(item.type)}`;
    document.getElementById('tweetItemSnippet').textContent = item.text;

    // Reset preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.preset-btn:first-child').classList.add('active');

    // Generate Initial Tweet Draft
    generateTweetDraft();

    // Show Native Modal Dialog
    const modal = document.getElementById('tweetDialog');
    if (typeof modal.showModal === 'function') {
        modal.showModal();
    } else {
        modal.classList.remove('hidden');
    }
}

function closeTweetStudio() {
    const modal = document.getElementById('tweetDialog');
    if (typeof modal.close === 'function') {
        modal.close();
    } else {
        modal.classList.add('hidden');
    }
}

async function applyTweetPreset(styleName) {
    state.currentPresetStyle = styleName;
    
    // Update Preset Buttons UI
    document.querySelectorAll('.preset-btn').forEach(btn => {
        if (btn.textContent.toLowerCase().includes(styleName)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    await generateTweetDraft();
}

async function generateTweetDraft() {
    if (!state.currentSelectedItem) return;

    const item = state.currentSelectedItem;

    try {
        const response = await fetch('/api/format-tweet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: item.text,
                date: item.date,
                type: item.type,
                link: item.link,
                style: state.currentPresetStyle
            })
        });

        const result = await response.json();
        if (result.success) {
            document.getElementById('tweetTextarea').value = result.tweet;
            updateCharCount();
        }
    } catch (err) {
        console.error('Error generating tweet draft:', err);
        const fallbackTweet = `✨ BigQuery ${item.type} (${item.date})\n\n${item.text}\n\n🔗 ${item.link}\n\n#BigQuery #GoogleCloud`;
        document.getElementById('tweetTextarea').value = fallbackTweet;
        updateCharCount();
    }
}

function toggleHashtag(tagStr) {
    const textarea = document.getElementById('tweetTextarea');
    let currentVal = textarea.value;

    if (currentVal.includes(tagStr)) {
        textarea.value = currentVal.replace(tagStr, '').replace(/\s+/g, ' ').trim();
    } else {
        textarea.value = (currentVal + ' ' + tagStr).trim();
    }

    updateCharCount();
}

function updateCharCount() {
    const textarea = document.getElementById('tweetTextarea');
    const label = document.getElementById('charCountLabel');
    const progressBar = document.getElementById('charProgressBar');

    const len = textarea.value.length;
    label.textContent = `${len} / 280 characters`;

    const percentage = Math.min((len / 280) * 100, 100);
    progressBar.style.width = `${percentage}%`;

    progressBar.className = 'char-progress-fill';
    if (len > 280) {
        progressBar.classList.add('exceeded');
        label.style.color = 'var(--accent-red)';
    } else if (len > 250) {
        progressBar.classList.add('warning');
        label.style.color = 'var(--accent-amber)';
    } else {
        label.style.color = 'var(--text-muted)';
    }
}

function launchTwitterIntent() {
    const text = document.getElementById('tweetTextarea').value;
    if (!text.trim()) {
        showToast('Tweet content cannot be empty.');
        return;
    }

    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
}

function copyTweetText() {
    const text = document.getElementById('tweetTextarea').value;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Tweet text copied to clipboard!');
    }).catch(err => {
        showToast('Failed to copy: ' + err);
    });
}

function copyUpdateText(itemId) {
    const item = state.flattenedItems.find(i => i.item_id === itemId);
    if (!item) return;

    const copyPayload = `BigQuery Release Note (${item.date} - ${item.type}):\n${item.text}\nDirect Link: ${item.link}`;
    navigator.clipboard.writeText(copyPayload).then(() => {
        showToast('Content copied to clipboard!');
    }).catch(err => {
        showToast('Failed to copy text.');
    });
}

/* ==========================================================================
   Utilities & Keyboard Shortcuts
   ========================================================================== */

function showToast(message) {
    const toast = document.getElementById('toastNotification');
    const msgSpan = document.getElementById('toastMessage');
    
    msgSpan.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3200);
}

function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }
        if (e.key === 'Escape') {
            closeTweetStudio();
        }
    });
}

let bookmarks = [];
let query = "";

const listEl = document.getElementById("bookmarks-list");
const searchInput = document.getElementById("search-input");
const searchWrap = document.getElementById("search-wrap");
const countBadge = document.getElementById("count-badge");
const footerEl = document.getElementById("footer");
const footerCount = document.getElementById("footer-count");
const clearBtn = document.getElementById("clear-all-btn");
const toastEl = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");

function loadBookmarks() {
  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.local.get(["markletBookmarks"], (result) => {
      bookmarks = result.markletBookmarks || [];
      render();
    });
  } else {
    bookmarks = [];
    render();
  }
}

function saveBookmarks(newList) {
  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.local.set({ markletBookmarks: newList });
  }
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function highlight(text, q) {
  if (!q.trim()) return escHtml(text);
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escHtml(text).replace(
    new RegExp(`(${escaped})`, "gi"),
    '<mark class="highlight">$1</mark>'
  );
}

function escHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function render() {
  const q = query.toLowerCase().trim();
  const filtered = q
    ? bookmarks.filter(
      (b) =>
        b.text.toLowerCase().includes(q) ||
        (b.title && b.title.toLowerCase().includes(q))
    )
    : bookmarks;

  const total = bookmarks.length;
  countBadge.textContent = `${total} saved`;
  footerCount.textContent = total;

  const hasAny = total > 0;
  searchWrap.style.display = hasAny ? "" : "none";
  footerEl.classList.toggle("hidden", !hasAny);

  listEl.innerHTML = "";

  if (!hasAny) {
    listEl.appendChild(buildEmptyState());
    return;
  }

  if (filtered.length === 0) {
    listEl.appendChild(buildNoResults());
    return;
  }

  filtered.forEach((bm, i) => {
    listEl.appendChild(buildCard(bm, q, i));
  });
}


function buildCard(bm, q, i) {
  const card = document.createElement("div");
  card.className = "bookmark-card";
  card.style.animationDelay = `${i * 0.04}s`;
  card.setAttribute("data-id", bm.id);
  card.setAttribute("title", "Click to jump to this bookmark");

  const faviconSrc = bm.favicon || `https://www.google.com/s2/favicons?sz=32&domain=${new URL(bm.url).hostname}`;

  card.innerHTML = `
    <div class="card-top">
      <div class="site-info">
        <img class="favicon" src="${faviconSrc}" alt="" loading="lazy" onerror="this.style.display='none'" />
        <span class="site-name">${escHtml(bm.title || new URL(bm.url).hostname)}</span>
      </div>
      <div class="card-actions">
        <button class="action-btn copy-btn" title="Copy text" data-id="${bm.id}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
        <button class="action-btn delete delete-btn" title="Delete bookmark" data-id="${bm.id}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="snippet">${highlight(bm.text, q)}</div>
    <div class="card-footer">
      <div class="timestamp">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        ${timeAgo(bm.savedAt)}
      </div>
      <button class="jump-btn" data-id="${bm.id}" data-url="${escHtml(bm.url)}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        Jump back
      </button>
    </div>
  `;

  card.addEventListener("click", (e) => {
    if (e.target.closest(".action-btn")) return;
    jumpTo(bm);
  });

  card.querySelector(".jump-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    jumpTo(bm);
  });

  card.querySelector(".copy-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(bm.text).then(() => showToast("✓ Copied to clipboard"));
  });

  card.querySelector(".delete-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    deleteBookmark(bm.id, card);
  });

  return card;
}


function buildEmptyState() {
  const el = document.createElement("div");
  el.className = "empty-state";
  el.innerHTML = `
    <div class="empty-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    </div>
    <div class="empty-title">No bookmarks yet</div>
    <div class="empty-desc">Select any text on a webpage and save it to jump back anytime.</div>
    <div class="empty-hint">
      <ol>
        <li><kbd>Select text</kbd></li>
        <li>Right-click the selected text</li>
        <li>Click on <strong>Save with Marklet</strong></li>
      </ol>  
    </div>
  `;
  return el;
}

function buildNoResults() {
  const el = document.createElement("div");
  el.className = "no-results";
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M8 11h6"/>
    </svg>
    <p>No bookmarks match "<strong>${escHtml(query)}</strong>"</p>
  `;
  return el;
}


function jumpTo(bm) {
  if (typeof chrome !== "undefined" && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.url.startsWith(bm.url.split("#")[0])) {
        chrome.tabs.sendMessage(tab.id, { action: "jumpToBookmark", text: bm.text });
        showToast("↗ Jumped to bookmark");

      } else {
        chrome.tabs.update(tab.id, { url: bm.url }, () => {
          chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === tab.id && info.status === "complete") {
              chrome.tabs.onUpdated.removeListener(listener);

              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content.js"]
              }, () => {
                chrome.tabs.sendMessage(tabId, { action: "jumpToBookmark", text: bm.text });
              });
            }
          });
        });
        showToast("↗ Opening page…");
      }
    });
  } else {
    showToast("↗ Would jump to: " + (bm.title || bm.url));
  }
}

function deleteBookmark(id, cardEl) {
  cardEl.style.transition = "opacity 0.2s, transform 0.2s";
  cardEl.style.opacity = "0";
  cardEl.style.transform = "translateX(12px)";
  setTimeout(() => {
    bookmarks = bookmarks.filter((b) => b.id !== id);
    saveBookmarks(bookmarks);
    render();
  }, 200);
  showToast("Bookmark removed");
}

clearBtn.addEventListener("click", () => {
  if (bookmarks.length === 0) return;
  listEl.style.transition = "opacity 0.2s";
  listEl.style.opacity = "0";
  setTimeout(() => {
    bookmarks = [];
    saveBookmarks(bookmarks);
    listEl.style.opacity = "";
    render();
  }, 200);
  showToast("All bookmarks cleared");
});


searchInput.addEventListener("input", () => {
  query = searchInput.value;
  render();
});

let toastTimer = null;
function showToast(msg) {
  toastMsg.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

loadBookmarks();

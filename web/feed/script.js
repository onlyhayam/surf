/* script.js — viewer page logic */

const PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

const FETCH_TIMEOUT_MS = 9000;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min auto-refresh window
const CACHE_PREFIX = "rss_cache::";

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

/* ---------------- cache helpers ---------------- */

function readCache(url) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + url);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(url, items) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + url,
      JSON.stringify({ items, fetchedAt: Date.now() }),
    );
  } catch {
    /* storage full or blocked — ignore, just won't cache */
  }
}

function isStale(cacheEntry) {
  return !cacheEntry || Date.now() - cacheEntry.fetchedAt > CACHE_TTL_MS;
}

/* ---------------- fetch + parse ---------------- */

async function fetchFeedXML(url) {
  let lastErr;
  for (const buildProxyUrl of PROXIES) {
    try {
      const res = await withTimeout(
        fetch(buildProxyUrl(url)),
        FETCH_TIMEOUT_MS,
      );
      if (!res.ok) throw new Error("bad status " + res.status);
      const text = await res.text();
      if (!text || text.trim().length < 20) throw new Error("empty body");
      return text;
    } catch (err) {
      lastErr = err;
      continue;
    }
  }
  throw lastErr || new Error("all proxies failed");
}

function firstImageFromHTML(html) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function textOf(el) {
  return el ? el.textContent.trim() : "";
}

function parseFeed(xmlText, sourceName) {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("parse error");

  const items = [];
  const isAtom = doc.querySelector("feed") !== null;

  if (isAtom) {
    doc.querySelectorAll("entry").forEach((entry) => {
      const linkEl =
        entry.querySelector("link[rel='alternate']") ||
        entry.querySelector("link");
      const link = linkEl ? linkEl.getAttribute("href") : "#";
      const summary =
        textOf(entry.querySelector("summary")) ||
        textOf(entry.querySelector("content"));
      const mediaThumb = entry.querySelector("media\\:thumbnail, thumbnail");
      let image = mediaThumb ? mediaThumb.getAttribute("url") : null;
      if (!image)
        image = firstImageFromHTML(textOf(entry.querySelector("content")));
      items.push({
        title: textOf(entry.querySelector("title")) || "(untitled)",
        link,
        date:
          textOf(entry.querySelector("updated")) ||
          textOf(entry.querySelector("published")),
        description: summary.replace(/<[^>]+>/g, " ").trim(),
        image,
        source: sourceName,
      });
    });
  } else {
    doc.querySelectorAll("item").forEach((item) => {
      const enclosure =
        item.querySelector("enclosure[type^='image']") ||
        item.querySelector("enclosure");
      const mediaContent = item.querySelector("media\\:content, content");
      const mediaThumb = item.querySelector("media\\:thumbnail, thumbnail");
      let image = null;
      if (
        enclosure &&
        enclosure.getAttribute("type") &&
        enclosure.getAttribute("type").startsWith("image")
      ) {
        image = enclosure.getAttribute("url");
      } else if (mediaThumb) {
        image = mediaThumb.getAttribute("url");
      } else if (
        mediaContent &&
        (mediaContent.getAttribute("medium") === "image" ||
          (mediaContent.getAttribute("type") || "").startsWith("image"))
      ) {
        image = mediaContent.getAttribute("url");
      }
      const rawDesc =
        textOf(item.querySelector("description")) ||
        textOf(item.getElementsByTagName("content:encoded")[0]);
      if (!image) image = firstImageFromHTML(rawDesc);
      items.push({
        title: textOf(item.querySelector("title")) || "(untitled)",
        link: textOf(item.querySelector("link")) || "#",
        date:
          textOf(item.querySelector("pubDate")) ||
          textOf(item.querySelector("date")),
        description: rawDesc.replace(/<[^>]+>/g, " ").trim(),
        image,
        source: sourceName,
      });
    });
  }
  return items;
}

/* ---------------- render helpers ---------------- */

function formatDate(d) {
  if (!d) return "";
  const parsed = new Date(d);
  if (isNaN(parsed)) return d;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function escapeHTML(str) {
  return (str || "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

function renderCard(item) {
  const imgHTML = item.image
    ? `<img class="card-img" src="${escapeHTML(item.image)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;card-img placeholder&quot;>📰</div>'">`
    : `<div class="card-img placeholder">📰</div>`;
  return `
    <div class="card">
      ${imgHTML}
      <div class="card-body">
        <div class="card-source">${escapeHTML(item.source)}</div>
        <h3 class="card-title"><a href="${escapeHTML(item.link)}" target="_blank" rel="noopener">${escapeHTML(item.title)}</a></h3>
        <p class="card-desc">${escapeHTML(item.description)}</p>
        <div class="card-date">${formatDate(item.date)}</div>
      </div>
    </div>`;
}

function renderSkeletonCard() {
  return `
    <div class="skeleton">
      <div class="sk-img"></div>
      <div class="sk-body">
        <div class="sk-line short"></div>
        <div class="sk-line"></div>
        <div class="sk-line"></div>
        <div class="sk-line short"></div>
      </div>
    </div>`;
}

/* ---------------- round-robin interleave ----------------
   Takes items already grouped by source, each bucket sorted
   newest-first, and weaves them source-by-source so no two
   consecutive cards share a provider. */
function interleaveBySource(itemsBySourceMap) {
  const buckets = Object.values(itemsBySourceMap).filter((b) => b.length > 0);
  const result = [];
  let i = 0;
  while (buckets.some((b) => i < b.length)) {
    for (const bucket of buckets) {
      if (i < bucket.length) result.push(bucket[i]);
    }
    i++;
  }
  return result;
}

/* ---------------- state ----------------
   itemsBySource: { feedUrl: { name, category, url, items: [...] } } */
let itemsBySource = {};
let pendingSources = new Set(); // feed urls still loading (no cache + no fetch yet)
let activeTab = "All";

function renderTabs(categories) {
  const tabs = document.getElementById("tabs");
  const names = ["All", ...categories];
  tabs.innerHTML = names
    .map(
      (name) =>
        `<button class="tab ${name === activeTab ? "active" : ""}" data-cat="${escapeHTML(name)}">${escapeHTML(name)}</button>`,
    )
    .join("");
  tabs.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.cat;
      renderTabs(categories);
      renderContent();
    });
  });
}

function renderContent() {
  const content = document.getElementById("content");

  const relevant = Object.values(itemsBySource).filter(
    (s) => activeTab === "All" || s.category === activeTab,
  );

  const bySourceName = {};
  relevant.forEach((s) => {
    bySourceName[s.name] = [...s.items].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );
  });

  const interleaved = interleaveBySource(bySourceName);

  const pendingCount = relevant.filter(
    (s) => s.items.length === 0 && pendingSources.has(s.url),
  ).length;

  if (interleaved.length === 0 && pendingCount === 0) {
    content.innerHTML = `<div class="empty-state">No items yet. Try “Manage feeds” to add a category or feed.</div>`;
    return;
  }

  const skeletons = Array.from(
    { length: Math.min(pendingCount * 2, 6) },
    renderSkeletonCard,
  ).join("");
  content.innerHTML = `<div class="feed-grid">${interleaved.map(renderCard).join("")}${skeletons}</div>`;
}

/* ---------------- load orchestration ---------------- */

async function loadOneFeed(feed, category) {
  const cached = readCache(feed.url);

  // always register a placeholder first so skeleton accounting has
  // something to count, even before cache/network resolves
  if (!itemsBySource[feed.url]) {
    itemsBySource[feed.url] = {
      name: feed.name,
      category,
      url: feed.url,
      items: [],
    };
  }

  if (cached && cached.items) {
    itemsBySource[feed.url].items = cached.items;
  } else {
    pendingSources.add(feed.url);
  }
  renderContent();

  if (!isStale(cached)) return; // fresh enough, skip network

  try {
    const xml = await fetchFeedXML(feed.url);
    const items = parseFeed(xml, feed.name);
    writeCache(feed.url, items);
    itemsBySource[feed.url] = {
      name: feed.name,
      category,
      url: feed.url,
      items,
    };
  } catch (err) {
    console.warn(`Feed failed: ${feed.name} (${feed.url})`, err.message);
    if (!itemsBySource[feed.url]) {
      itemsBySource[feed.url] = {
        name: feed.name,
        category,
        url: feed.url,
        items: [],
      };
    }
  } finally {
    pendingSources.delete(feed.url);
    renderContent();
  }
}

async function loadAllFeeds({ forceFresh = false } = {}) {
  const config = getFeedConfig();
  const categories = Object.keys(config);

  if (categories.length === 0) {
    document.getElementById("content").innerHTML =
      `<div class="empty-state">No feeds configured. Head to “Manage feeds” to add one.</div>`;
    return;
  }

  if (forceFresh) {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  }

  itemsBySource = {};
  pendingSources = new Set();
  renderTabs(categories);

  const allFeeds = [];
  categories.forEach((cat) =>
    config[cat].forEach((feed) => allFeeds.push({ feed, cat })),
  );

  // pre-register every feed as a pending placeholder up front, so tabs
  // show the right skeleton count even for feeds still queued behind
  // the first batch
  allFeeds.forEach(({ feed, cat }) => {
    itemsBySource[feed.url] = {
      name: feed.name,
      category: cat,
      url: feed.url,
      items: [],
    };
    pendingSources.add(feed.url);
  });
  renderContent();

  // first few feeds load/settle first, rest follow — keeps initial paint fast
  const FIRST_BATCH = 3;
  const firstBatch = allFeeds.slice(0, FIRST_BATCH);
  const rest = allFeeds.slice(FIRST_BATCH);

  await Promise.allSettled(
    firstBatch.map(({ feed, cat }) => loadOneFeed(feed, cat)),
  );
  await Promise.allSettled(rest.map(({ feed, cat }) => loadOneFeed(feed, cat)));
}

/* ---------------- refresh button + auto-refresh timer ---------------- */

function wireRefreshButton() {
  const btn = document.getElementById("refreshBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    btn.classList.add("spinning");
    btn.disabled = true;
    await loadAllFeeds({ forceFresh: true });
    btn.classList.remove("spinning");
    btn.disabled = false;
  });
}

wireRefreshButton();
loadAllFeeds();

// auto-refresh stale feeds in the background every CACHE_TTL_MS
setInterval(() => loadAllFeeds(), CACHE_TTL_MS);

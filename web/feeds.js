/* feeds.js — single source of truth for categories + feed URLs.
   To add a whole new preset category, just add a key below. */

const PRESET_FEEDS = {
  Technology: [
    {
      name: "Ars Technica",
      url: "https://feeds.arstechnica.com/arstechnica/index",
    },
    { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
    { name: "Hacker News", url: "https://news.ycombinator.com/rss" },
    { name: "Wired", url: "https://www.wired.com/feed/rss" },
  ],
  Other: [
    { name: "NPR", url: "https://feeds.npr.org/1001/rss.xml" },
    {
      name: "Reuters World",
      url: "https://www.reutersagency.com/feed/?best-topics=world&post_type=best",
    },
  ],
};

const LS_KEYS = {
  custom: "rss_customFeeds", // { category: [{name,url}] }
  deletedFeeds: "rss_deletedFeeds", // ["category::url", ...]  (hidden preset feeds)
  deletedCats: "rss_deletedCats", // ["category", ...]        (hidden preset categories)
};

function _read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function _write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* Returns the merged, live view: { category: [{name,url,preset}] } */
function getFeedConfig() {
  const custom = _read(LS_KEYS.custom, {});
  const deletedFeeds = _read(LS_KEYS.deletedFeeds, []);
  const deletedCats = _read(LS_KEYS.deletedCats, []);
  const merged = {};

  Object.keys(PRESET_FEEDS).forEach((cat) => {
    if (deletedCats.includes(cat)) return;
    const feeds = PRESET_FEEDS[cat]
      .filter((f) => !deletedFeeds.includes(cat + "::" + f.url))
      .map((f) => ({ ...f, preset: true }));
    merged[cat] = feeds;
  });

  Object.keys(custom).forEach((cat) => {
    if (!merged[cat]) merged[cat] = [];
    merged[cat] = merged[cat].concat(
      custom[cat].map((f) => ({ ...f, preset: false })),
    );
  });

  return merged;
}

function getCategoryNames() {
  return Object.keys(getFeedConfig());
}

function addCategory(name) {
  name = name.trim();
  if (!name) return;
  const custom = _read(LS_KEYS.custom, {});
  if (!custom[name]) custom[name] = [];
  _write(LS_KEYS.custom, custom);
  // un-delete if it was a removed preset category with the same name
  const deletedCats = _read(LS_KEYS.deletedCats, []).filter((c) => c !== name);
  _write(LS_KEYS.deletedCats, deletedCats);
}

function deleteCategory(name) {
  if (PRESET_FEEDS[name]) {
    const deletedCats = _read(LS_KEYS.deletedCats, []);
    if (!deletedCats.includes(name)) deletedCats.push(name);
    _write(LS_KEYS.deletedCats, deletedCats);
  }
  const custom = _read(LS_KEYS.custom, {});
  delete custom[name];
  _write(LS_KEYS.custom, custom);
}

function addFeed(category, name, url) {
  category = category.trim();
  name = name.trim();
  url = url.trim();
  if (!category || !name || !url) return;
  const custom = _read(LS_KEYS.custom, {});
  if (!custom[category]) custom[category] = [];
  custom[category].push({ name, url });
  _write(LS_KEYS.custom, custom);
  // un-delete category if needed
  const deletedCats = _read(LS_KEYS.deletedCats, []).filter(
    (c) => c !== category,
  );
  _write(LS_KEYS.deletedCats, deletedCats);
}

function deleteFeed(category, url, isPreset) {
  if (isPreset) {
    const deletedFeeds = _read(LS_KEYS.deletedFeeds, []);
    const key = category + "::" + url;
    if (!deletedFeeds.includes(key)) deletedFeeds.push(key);
    _write(LS_KEYS.deletedFeeds, deletedFeeds);
  } else {
    const custom = _read(LS_KEYS.custom, {});
    if (custom[category]) {
      custom[category] = custom[category].filter((f) => f.url !== url);
      _write(LS_KEYS.custom, custom);
    }
  }
}

function resetAll() {
  localStorage.removeItem(LS_KEYS.custom);
  localStorage.removeItem(LS_KEYS.deletedFeeds);
  localStorage.removeItem(LS_KEYS.deletedCats);
}

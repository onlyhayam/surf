/* feeds.js — single source of truth for categories + feed URLs.
   To add a whole new preset category, just add a key below. */

const PRESET_FEEDS = {
  Technology: [
    {
      name: "Ars Technica",
      url: "https://feeds.arstechnica.com/arstechnica/index",
    },
    { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
    { name: "Wired", url: "https://www.wired.com/feed/rss" },
    { name: "Anthropic", url: "https://www.anthropic.com/news/rss.xml" },
    { name: "BAIR Blog", url: "https://bair.berkeley.edu/blog/feed.xml" },

    {
      name: "Machine Learning Mastery",
      url: "https://machinelearningmastery.com/feed/",
    },
    { name: "Dark Reading", url: "https://www.darkreading.com/rss.xml" },
  ],

  Cybersecurity: [
    { name: "Dark Reading", url: "https://www.darkreading.com/rss.xml" },
  ],

  AI: [
    { name: "Anthropic", url: "https://www.anthropic.com/news/rss.xml" },
    { name: "BAIR Blog", url: "https://bair.berkeley.edu/blog/feed.xml" },

    {
      name: "Machine Learning Mastery",
      url: "https://machinelearningmastery.com/feed/",
    },
  ],
  Finance: [
    // Global finance & markets
    {
      name: "Reuters Markets",
      url: "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
    },
    {
      name: "Bloomberg Markets",
      url: "https://feeds.bloomberg.com/markets/news.rss",
    },

    { name: "Morningstar", url: "https://www.morningstar.com/rss/news.xml" },

    // CFO / Executive finance
    { name: "CFO Dive", url: "https://www.cfodive.com/feeds/news/" },
    { name: "CFO.com", url: "https://www.cfo.com/feed/" },
    { name: "Treasury & Risk", url: "https://www.treasuryandrisk.com/feed/" },
    {
      name: "Harvard Business Review Finance",
      url: "https://hbr.org/topic/finance/rss",
    },

    // Accounting & ACCA-level
    {
      name: "IFRS Foundation",
      url: "https://www.ifrs.org/news-and-events/updates/rss/",
    },
    {
      name: "Journal of Accountancy",
      url: "https://www.journalofaccountancy.com/rss/all-content.html",
    },
    { name: "Accounting Today", url: "https://www.accountingtoday.com/feed" },
    { name: "AICPA News", url: "https://www.aicpa-cima.com/news/rss" },

    // Corporate finance & valuation
    {
      name: "Corporate Finance Institute",
      url: "https://corporatefinanceinstitute.com/resources/feed/",
    },
    {
      name: "Mergers & Inquisitions",
      url: "https://mergersandinquisitions.com/feed/",
    },

    // Economics & macro
    { name: "IMF Blog", url: "https://www.imf.org/en/Blogs/rss" },
    { name: "World Bank Blogs", url: "https://blogs.worldbank.org/feed" },

    // Personal finance
    {
      name: "Mr. Money Mustache",
      url: "https://www.mrmoneymustache.com/feed/",
    },
    {
      name: "Money Saving Expert",
      url: "https://www.moneysavingexpert.com/feed/",
    },
  ],

  Literature: [
    {
      name: "The Paris Review (Blog)",
      url: "https://www.theparisreview.org/blog/feed/",
    },
  ],

  Cooking: [
    { name: "Serious Eats", url: "https://www.seriouseats.com/rss" },
    { name: "Food52", url: "https://food52.com/blog/feed" },
    { name: "Smitten Kitchen", url: "https://smittenkitchen.com/feed/" },
    { name: "Simply Recipes", url: "https://www.simplyrecipes.com/feed" },
    {
      name: "King Arthur Baking",
      url: "https://www.kingarthurbaking.com/blog/feed",
    },
    { name: "The Kitchn", url: "https://www.thekitchn.com/rss" },
  ],

  General: [
    {
      name: "Reuters World",
      url: "https://www.reutersagency.com/feed/?best-topics=world&post_type=best",
    },
    {
      name: "Reuters Business",
      url: "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
    },
    {
      name: "Associated Press",
      url: "https://feeds.apnews.com/rss/apf-topnews",
    },
    { name: "BBC World", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml" },
    {
      name: "The Economist",
      url: "https://www.economist.com/the-world-this-week/rss.xml",
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

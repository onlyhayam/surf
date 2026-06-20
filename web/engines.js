/**
 * engines.js
 * ----------------------------------------------------------------------
 * Single source of truth for every search engine the UI knows about.
 *
 * To add a new engine, just push a new object into ENGINES below.
 * Nothing else in the codebase needs to change — the dropdown menu,
 * the "Search with ..." button list, and the routing logic are all
 * generated dynamically from this array.
 *
 * Fields:
 *   id     - unique, lowercase, no spaces (used internally & for storage)
 *   name   - display name shown in the UI
 *   url    - query URL. "%s" is replaced with the encoded search term
 *   icon   - any short string/emoji shown next to the name (optional)
 * ----------------------------------------------------------------------
 */

const ENGINES = [
  {
    id: "duckduckgo",
    name: "DuckDuckGo",
    url: "https://duckduckgo.com/?q=%s",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=duck.com"
  },
  {
    id: "startpage",
    name: "Startpage",
    url: "https://www.startpage.com/sp/search?query=%s",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=startpage.com"
  },
  {
    id: "google",
    name: "Google",
    url: "https://www.google.com/search?q=%s",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=google.com"  },
  {
    id: "bing",
    name: "Bing",
    url: "https://www.bing.com/search?q=%s",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=bing.com"
  },
  {
    id: "brave",
    name: "Brave Search",
    url: "https://search.brave.com/search?q=%s",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=brave.com"
  },
  {
    id: "ecosia",
    name: "Ecosia",
    url: "https://www.ecosia.org/search?q=%s",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=ecosia.org"
  },
  {
    id: "qwant",
    name: "Qwant",
    url: "https://www.qwant.com/?q=%s",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=qwant.com"
  }
];

const DEFAULT_ENGINE_ID = "duckduckgo";
const STORAGE_KEY = "preferred_search_engine";

/**
 * Builds a final, ready-to-open search URL for a given engine id + query.
 */
function buildSearchUrl(engineId, query) {
  const engine = ENGINES.find((e) => e.id === engineId) || ENGINES[0];
  return engine.url.replace("%s", encodeURIComponent(query));
}

/**
 * Returns the engine object for a given id, falling back to the default.
 */
function getEngine(engineId) {
  return ENGINES.find((e) => e.id === engineId) || ENGINES.find((e) => e.id === DEFAULT_ENGINE_ID);
}
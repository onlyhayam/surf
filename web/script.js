/**
 * script.js
 * ----------------------------------------------------------------------
 * Wires up the UI to the ENGINES config (engines.js). Nothing in here
 * is hardcoded to a specific engine — everything is generated from the
 * ENGINES array, so adding/removing engines only requires editing
 * engines.js.
 * ----------------------------------------------------------------------
 */

(function () {
  "use strict";

  // ---- Element references ----
  const menuToggle = document.getElementById("menuToggle");
  const sideMenu = document.getElementById("sideMenu");
  const sideMenuOverlay = document.getElementById("sideMenuOverlay");

  const defaultEngineBtn = document.getElementById("defaultEngineBtn");
  const defaultEngineLabel = document.getElementById("defaultEngineLabel");
  const defaultEngineMenu = document.getElementById("defaultEngineMenu");

  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");

  const engineListSection = document.querySelector(".engine-list");

  // ---- State ----
  let currentEngineId = localStorage.getItem(STORAGE_KEY) || DEFAULT_ENGINE_ID;

  /**
   * Renders an engine's `icon` field as either:
   *  - an <img> if the value looks like a URL (http/https or starts with "/")
   *  - plain text/emoji otherwise
   * Returns a DOM node ready to insert (never null).
   */
  function renderIcon(engine) {
    if (!engine.icon) return document.createTextNode("");

    const looksLikeUrl =
      /^(https?:)?\/\//.test(engine.icon) || engine.icon.startsWith("/");

    if (looksLikeUrl) {
      const img = document.createElement("img");
      img.src = engine.icon;
      img.alt = `${engine.name} icon`;
      img.className = "engine-icon";
      return img;
    }

    return document.createTextNode(engine.icon + " ");
  }

  // ----------------------------------------------------------------------
  // Rendering
  // ----------------------------------------------------------------------

  function renderDefaultEngineLabel() {
    const engine = getEngine(currentEngineId);
    defaultEngineLabel.textContent = engine.name;
  }

  function renderDefaultEngineMenu() {
    defaultEngineMenu.innerHTML = "";
    ENGINES.forEach((engine) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.dataset.engineId = engine.id;
      li.appendChild(renderIcon(engine));
      li.appendChild(document.createTextNode(engine.name));
      if (engine.id === currentEngineId) {
        li.classList.add("is-active");
        li.setAttribute("aria-selected", "true");
      }
      li.addEventListener("click", () => selectDefaultEngine(engine.id));
      defaultEngineMenu.appendChild(li);
    });
  }

  function renderEngineQuickList() {
    engineListSection.innerHTML = "";
    ENGINES.forEach((engine) => {
      engineListSection.appendChild(createEngineQuickItem(engine));
    });
  }

  /**
   * Builds one "Search with X" control. It starts as a plain button;
   * clicking it morphs the button into a text input (scoped to that
   * engine only). Pressing Enter searches with this engine. Clicking
   * away or pressing Escape collapses it back into a button.
   */
  function createEngineQuickItem(engine) {
    const wrapper = document.createElement("div");
    wrapper.className = "engine-item";
    wrapper.dataset.engineId = engine.id;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "engine-list__btn";
    btn.textContent = "";
    btn.appendChild(renderIcon(engine));
    btn.appendChild(document.createTextNode(`Search with ${engine.name}`));

    const form = document.createElement("form");
    form.className = "engine-item__form";
    form.hidden = true;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "engine-item__input";
    input.placeholder = `Search with ${engine.name}…`;
    input.setAttribute("aria-label", `Search with ${engine.name}`);

    form.appendChild(input);
    wrapper.appendChild(btn);
    wrapper.appendChild(form);

    function expand() {
      btn.hidden = true;
      form.hidden = false;
      input.value = "";
      input.focus();
    }

    function collapse() {
      form.hidden = true;
      btn.hidden = false;
    }

    btn.addEventListener("click", expand);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = input.value.trim();
      if (!query) return;
      window.open(buildSearchUrl(engine.id, query), "_blank", "noopener");
      collapse();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") collapse();
    });

    input.addEventListener("blur", () => {
      // Small delay so a click on the same form's submit isn't lost.
      setTimeout(() => {
        if (!form.contains(document.activeElement)) collapse();
      }, 100);
    });

    return wrapper;
  }

  // ----------------------------------------------------------------------
  // Behaviour
  // ----------------------------------------------------------------------

  function selectDefaultEngine(engineId) {
    currentEngineId = engineId;
    localStorage.setItem(STORAGE_KEY, engineId);
    renderDefaultEngineLabel();
    renderDefaultEngineMenu();
    closeDropdown();
    searchInput.focus();
  }

  function toggleDropdown() {
    const isHidden = defaultEngineMenu.hasAttribute("hidden");
    if (isHidden) {
      defaultEngineMenu.removeAttribute("hidden");
      defaultEngineBtn.setAttribute("aria-expanded", "true");
    } else {
      closeDropdown();
    }
  }

  function closeDropdown() {
    defaultEngineMenu.setAttribute("hidden", "");
    defaultEngineBtn.setAttribute("aria-expanded", "false");
  }

  function toggleSideMenu() {
    const isOpen = sideMenu.classList.contains("is-open");
    if (isOpen) {
      closeSideMenu();
    } else {
      openSideMenu();
    }
  }

  function openSideMenu() {
    sideMenu.classList.add("is-open");
    sideMenuOverlay.classList.add("is-open");
    menuToggle.setAttribute("aria-expanded", "true");
  }

  function closeSideMenu() {
    sideMenu.classList.remove("is-open");
    sideMenuOverlay.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  }

  /**
   * Opens the given engine's results for the current input value in a
   * new tab. Falls back silently (no-op) if the query is empty.
   */
  function runSearch(engineId) {
    const query = searchInput.value.trim();
    if (!query) {
      searchInput.focus();
      return;
    }
    const url = buildSearchUrl(engineId, query);
    window.open(url, "_blank", "noopener");
  }

  // ----------------------------------------------------------------------
  // Event wiring
  // ----------------------------------------------------------------------

  menuToggle.addEventListener("click", toggleSideMenu);
  sideMenuOverlay.addEventListener("click", closeSideMenu);

  defaultEngineBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  // Close dropdown when clicking outside of it.
  document.addEventListener("click", (e) => {
    if (
      !defaultEngineBtn.contains(e.target) &&
      !defaultEngineMenu.contains(e.target)
    ) {
      closeDropdown();
    }
  });

  // Enter key / submit button -> search with the currently selected default engine.
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    runSearch(currentEngineId);
  });

  // ----------------------------------------------------------------------
  // Init
  // ----------------------------------------------------------------------

  renderDefaultEngineLabel();
  renderDefaultEngineMenu();
  renderEngineQuickList();
})();

//
/* script.js — viewer page logic */

const PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

const FETCH_TIMEOUT_MS = 9000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

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

let allItemsByCategory = {};
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
  let items;
  if (activeTab === "All") {
    items = Object.values(allItemsByCategory).flat();
  } else {
    items = allItemsByCategory[activeTab] || [];
  }
  if (items.length === 0) {
    content.innerHTML = `<div class="empty-state">No items yet. Try “Manage feeds” to add a category or feed.</div>`;
    return;
  }
  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  content.innerHTML = `<div class="feed-grid">${items.map(renderCard).join("")}</div>`;
}

async function loadAllFeeds() {
  const config = getFeedConfig();
  const categories = Object.keys(config);

  if (categories.length === 0) {
    document.getElementById("content").innerHTML =
      `<div class="empty-state">No feeds configured. Head to “Manage feeds” to add one.</div>`;
    return;
  }

  renderTabs(categories);
  allItemsByCategory = {};
  categories.forEach((c) => (allItemsByCategory[c] = []));
  renderContent();

  const tasks = [];
  categories.forEach((cat) => {
    config[cat].forEach((feed) => {
      tasks.push(
        fetchFeedXML(feed.url)
          .then((xml) => {
            allItemsByCategory[cat].push(...parseFeed(xml, feed.name));
            renderContent();
          })
          .catch((err) =>
            console.warn(
              `Feed failed: ${feed.name} (${feed.url})`,
              err.message,
            ),
          ),
      );
    });
  });

  await Promise.allSettled(tasks);
  renderContent();
}

loadAllFeeds();

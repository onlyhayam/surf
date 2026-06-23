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

// iframe

/* control.js — manage categories & feeds */

function escapeHTML(str) {
  return (str || "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove("show"), 1800);
}

function populateCategorySelect() {
  const select = document.getElementById("feedCategorySelect");
  const categories = getCategoryNames();
  select.innerHTML =
    categories
      .map((c) => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`)
      .join("") + `<option value="__new__">+ New category…</option>`;
}

function renderCategories() {
  const config = getFeedConfig();
  const list = document.getElementById("categoriesList");
  const categories = Object.keys(config);

  if (categories.length === 0) {
    list.innerHTML = `<div class="panel"><div class="empty-state">No categories yet. Add one above.</div></div>`;
    return;
  }

  list.innerHTML = categories
    .map((cat) => {
      const feeds = config[cat];
      const rows = feeds.length
        ? feeds
            .map(
              (f) => `
        <div class="feed-row">
          <div class="feed-info">
            <div class="feed-name">${escapeHTML(f.name)} ${f.preset ? '<span class="badge">preset</span>' : ""}</div>
            <div class="feed-url">${escapeHTML(f.url)}</div>
          </div>
          <button class="btn-danger" data-action="delete-feed" data-cat="${escapeHTML(cat)}" data-url="${escapeHTML(f.url)}" data-preset="${f.preset}">Delete</button>
        </div>`,
            )
            .join("")
        : `<div class="empty-state" style="padding:16px 0;">No feeds in this category.</div>`;

      return `
      <div class="panel">
        <div class="category-header">
          <h3>${escapeHTML(cat)} <span class="count">(${feeds.length})</span></h3>
          <button class="btn-danger" data-action="delete-category" data-cat="${escapeHTML(cat)}">Delete category</button>
        </div>
        ${rows}
      </div>`;
    })
    .join("");

  list.querySelectorAll("[data-action='delete-feed']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { cat, url, preset } = btn.dataset;
      deleteFeed(cat, url, preset === "true");
      showToast(`Removed feed from ${cat}`);
      refreshAll();
    });
  });

  list.querySelectorAll("[data-action='delete-category']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat;
      if (!confirm(`Delete category "${cat}" and all its feeds?`)) return;
      deleteCategory(cat);
      showToast(`Deleted category ${cat}`);
      refreshAll();
    });
  });
}

function refreshAll() {
  populateCategorySelect();
  renderCategories();
}

document.getElementById("addCategoryBtn").addEventListener("click", () => {
  const input = document.getElementById("newCategoryName");
  const name = input.value.trim();
  if (!name) return showToast("Enter a category name");
  addCategory(name);
  input.value = "";
  showToast(`Added category ${name}`);
  refreshAll();
});

document
  .getElementById("feedCategorySelect")
  .addEventListener("change", (e) => {
    if (e.target.value === "__new__") {
      const name = prompt("New category name:");
      if (name && name.trim()) {
        addCategory(name.trim());
        refreshAll();
        document.getElementById("feedCategorySelect").value = name.trim();
      } else {
        e.target.value = getCategoryNames()[0] || "";
      }
    }
  });

document.getElementById("addFeedBtn").addEventListener("click", () => {
  const category = document.getElementById("feedCategorySelect").value;
  const name = document.getElementById("newFeedName").value.trim();
  const url = document.getElementById("newFeedUrl").value.trim();

  if (!category || category === "__new__") return showToast("Pick a category");
  if (!name) return showToast("Enter a feed name");
  if (!url || !/^https?:\/\//i.test(url))
    return showToast("Enter a valid feed URL");

  addFeed(category, name, url);
  document.getElementById("newFeedName").value = "";
  document.getElementById("newFeedUrl").value = "";
  showToast(`Added "${name}" to ${category}`);
  refreshAll();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (
    !confirm(
      "This clears all custom feeds/categories and restores preset defaults. Continue?",
    )
  )
    return;
  resetAll();
  showToast("Restored defaults");
  refreshAll();
});

refreshAll();

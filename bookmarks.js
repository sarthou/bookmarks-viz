let allFolders = [];
let bookmarkTags = {}; // { bookmarkId: ["tag1","tag2"] }
let currentPage = 0;
const foldersPerPage = 3;
let pinnedFolders = new Set();

function togglePin(folderId, pinElement) {
  if (pinnedFolders.has(folderId)) {
    pinnedFolders.delete(folderId);
  } else {
    pinnedFolders.add(folderId);
  }

  // Save updated list
  browser.storage.local.set({ pinnedFolders: Array.from(pinnedFolders) });

  // Re-render pages so pinned folders move to top
  renderAllPages();
}

/* --- Helpers --- */
function createBookmarkItem(b) {
  const li = document.createElement("li");

  const favicon = document.createElement("img");
  favicon.className = "favicon";
  try {
    favicon.src = "https://www.google.com/s2/favicons?sz=32&domain_url=" + new URL(b.url).hostname;
  } catch {
    favicon.src = "";
  }
  li.appendChild(favicon);

  const a = document.createElement("a");
  a.href = b.url;
  a.textContent = b.title || b.url;
  a.target = "_blank";
  li.appendChild(a);

  return li;
}

function getTotalPages(folders = allFolders) {
  return Math.max(1, Math.ceil(folders.length / foldersPerPage));
}

function pageWidthPx() {
  const el = document.querySelector(".folders-container");
  return el ? el.clientWidth : 0;
}

function updateArrows(folders = allFolders) {
  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");
  const total = getTotalPages(folders);

  prevBtn.disabled = currentPage <= 0;
  nextBtn.disabled = currentPage >= total - 1;
}

function updatePageTransform(folders = allFolders) {
  const wrapper = document.getElementById("folders");
  const w = pageWidthPx();
  wrapper.style.transform = `translateX(-${currentPage * w}px)`;
  updateArrows(folders);
}

/* Render all pages for the given folder set */
function renderAllPages(folders = allFolders) {
  const sortedFolders = folders.slice().sort((a, b) => {
    const aPinned = pinnedFolders.has(a.id);
    const bPinned = pinnedFolders.has(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return a.title.localeCompare(b.title);
  });


  const wrapper = document.getElementById("folders");
  wrapper.innerHTML = "";

  for (let i = 0; i < sortedFolders.length; i += foldersPerPage) {
    const page = document.createElement("div");
    page.className = "folders-page";

    sortedFolders.slice(i, i + foldersPerPage).forEach(folder => {
      const box = document.createElement("div");
      box.className = "folder-box";
      box.dataset.folderId = folder.id; // required for pin tracking


      const titleContainer = document.createElement("div");
      titleContainer.className = "folder-title-container";

      // --- PIN ---
      const pin = document.createElement("span");
      pin.className = "folder-pin";
      pin.innerHTML = pinnedFolders.has(folder.id) 
        ? `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
            <path d="M12 2L15 8H21L16.5 12L18 18L12 14L6 18L7.5 12L3 8H9L12 2Z" />
          </svg>` // filled
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L15 8H21L16.5 12L18 18L12 14L6 18L7.5 12L3 8H9L12 2Z" />
          </svg>`; // outline

      pin.addEventListener("click", e => {
        e.stopPropagation(); // prevent focusing folder
        togglePin(folder.id, pin);
      });

      // --- TITLE ---
      const title = document.createElement("h3");
      title.textContent = folder.title || "Untitled Folder";

      titleContainer.appendChild(pin);
      titleContainer.appendChild(title);
      box.appendChild(titleContainer);

      // --- BOOKMARK LIST ---
      const list = document.createElement("ul");
      (folder.children || []).forEach(b => {
        if (b.url) list.appendChild(createBookmarkItem(b));
      });
      box.appendChild(list);

      page.appendChild(box);
    });

    wrapper.appendChild(page);
  }

  currentPage = 0;
  // Ensure first paint is aligned before any transition
  wrapper.style.transform = "translateX(0)";
  updateArrows(sortedFolders);
}

/* --- Events --- */
document.getElementById("prev").addEventListener("click", () => {
  if (currentPage > 0) {
    currentPage--;
    updatePageTransform();
  }
});

document.getElementById("next").addEventListener("click", () => {
  const total = getTotalPages();
  if (currentPage < total - 1) {
    currentPage++;
    updatePageTransform();
  }
});

/* Search (by title for now) */
document.getElementById("search").addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) {
    renderAllPages();
    updatePageTransform();
    return;
  }

  const filtered = [];

  allFolders.forEach(folder => {
    const folderTitleMatch = (folder.title || "").toLowerCase().includes(q);

    let matches = [];
    if (folder.children) {
      matches = folder.children.filter(b => {
        if (!b.url) return false;
        const titleMatch = (b.title || "").toLowerCase().includes(q) ||
                           (b.url || "").toLowerCase().includes(q);
        const tagMatch = (bookmarkTags[b.id] || []).some(tag =>
          tag.includes(q)
        );
        return titleMatch || tagMatch;
      });
    }

    if (folderTitleMatch && folder.children) {
      // Folder matches → keep everything
      filtered.push({ title: folder.title, children: folder.children });
    } else if (matches.length) {
      // Some children match → keep only them
      filtered.push({ title: folder.title, children: matches });
    }
  });

  renderAllPages(filtered);
  updatePageTransform(filtered);
});

/* Load bookmarks from both root sections and collect loose bookmarks */
function loadBookmarks() {
  browser.bookmarks.getTree().then(tree => {
    const rootChildren = (tree[0] && tree[0].children) || [];
    const loose = [];
    allFolders = [];

    rootChildren.forEach(root => {
      (root.children || []).forEach(child => {
        if (child.children) {
          allFolders.push(child);
        } else if (child.url) {
          loose.push(child);
        }
      });
    });

    if (loose.length) {
      allFolders.unshift({ title: "Loose Bookmarks", children: loose });
    }

    renderAllPages();
    // After initial render, ensure transform uses the measured width
    updatePageTransform();
  });
}

function loadTags() {
  browser.bookmarks.getTree().then(tree => {
    const rootChildren = tree[0].children || [];
    const tagsRoot = rootChildren.find(child => child.title === "Tags");

    bookmarkTags = {};

    if (tagsRoot && tagsRoot.children) {
      tagsRoot.children.forEach(tagFolder => {
        const tagName = tagFolder.title;
        (tagFolder.children || []).forEach(b => {
          if (!bookmarkTags[b.id]) bookmarkTags[b.id] = [];
          bookmarkTags[b.id].push(tagName.toLowerCase());
        });
      });
    }
  });
}

/* In case the popup frame changes size (rare), keep transform correct */
window.addEventListener("resize", () => updatePageTransform());

/* --- Apply user options --- */
function applyOptions() {
  browser.storage.local.get(["background", "theme"]).then(res => {
    if (res.background) {
      document.body.style.backgroundImage = `url("${res.background}")`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
    }
    if (res.theme === "light") {
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }
  });

  browser.storage.local.get("pinnedFolders").then(res => {
  pinnedFolders = new Set(res.pinnedFolders || []);
});
}

applyOptions();

/* Init */
loadBookmarks();
loadTags();


function focusSearchWhenReady(input) {
  function tryFocus() {
    if (document.hasFocus() && input.offsetParent !== null) {
      // Popup is active and input is visible
      input.focus();
    } else {
      // Try again on the next frame
      requestAnimationFrame(tryFocus);
    }
  }
  tryFocus();
}

window.addEventListener("load", () => {
  browser.storage.local.get("startupFocus").then(res => {
    const mode = res.startupFocus || "search"; // default
    if (mode === "search") {
      const searchInput = document.getElementById("search");
      focusSearchWhenReady(searchInput);
    } else {
      // Navigation mode
      if (document.activeElement) {
        setTimeout(() => document.activeElement.blur(), 500);
      }
    }
  });
});

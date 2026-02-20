/* --- Globals --- */
let allFolders = [];
let bookmarkTags = {};
let currentPage = 0;
const foldersPerPage = 3;
let pinnedFolders = new Set();
let expandedFolders = new Set();
let lastFocusedId = null; // Track the ID to restore focus

/* --- Logic Helpers --- */
function togglePin(folderId) {
  lastFocusedId = folderId; // Keep focus on the pinned item
  if (pinnedFolders.has(folderId)) pinnedFolders.delete(folderId);
  else pinnedFolders.add(folderId);
  browser.storage.local.set({ pinnedFolders: Array.from(pinnedFolders) });
  refreshCurrentView();
}

function createPinElement(isPinned) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M12 2L15 8H21L16.5 12L18 18L12 14L6 18L7.5 12L3 8H9L12 2Z");
  if (isPinned) {
    svg.setAttribute("fill", "currentColor");
    path.setAttribute("stroke", "currentColor");
  } else {
    svg.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
  }
  svg.appendChild(path);
  return svg;
}

function createFolderIcon(isOpen) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", isOpen ? "currentColor" : "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", isOpen
    ? "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"
    : "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z");
  svg.appendChild(path);
  return svg;
}

/* --- Tree Construction --- */
function buildTreeList(items, container, isSearchMode = false) {
  const ul = document.createElement("ul");
  ul.className = "folder-list";

  items.forEach(item => {
    const li = document.createElement("li");
    if (item.url) {
      const row = document.createElement("div");
      row.className = "item-row";
      const img = document.createElement("img");
      img.className = "favicon";
      try { img.src = "https://www.google.com/s2/favicons?sz=32&domain_url=" + new URL(item.url).hostname; } catch { img.src = ""; }
      const a = document.createElement("a");
      a.href = item.url;
      a.textContent = item.title || item.url;
      a.target = "_blank";
      row.append(img, a);
      li.appendChild(row);
    } else if (item.children) {
      const isExpanded = isSearchMode || expandedFolders.has(item.id);
      const header = document.createElement("a");
      header.className = "sub-folder-header";
      header.href = "#";
      header.dataset.isFolder = "true";
      header.dataset.folderId = item.id; // Identifier for focus restoration

      const icon = createFolderIcon(isExpanded);
      const title = document.createElement("span");
      title.className = "sub-folder-title";
      title.textContent = item.title || "Untitled Folder";

      header.append(icon, title);
      li.appendChild(header);

      header.addEventListener("click", (e) => {
        e.preventDefault();
        lastFocusedId = item.id; // Store ID before re-rendering
        if (expandedFolders.has(item.id)) expandedFolders.delete(item.id);
        else expandedFolders.add(item.id);
        refreshCurrentView();
      });

      if (isExpanded) {
        const nest = document.createElement("div");
        nest.className = "sub-list-nest";
        buildTreeList(item.children, nest, isSearchMode);
        li.appendChild(nest);
      }
    }
    ul.appendChild(li);
  });
  container.appendChild(ul);
}

/* --- Render Engine --- */
function renderAllPages(folders = allFolders, isSearchMode = false) {
  const sorted = folders.slice().sort((a, b) => {
    const aP = pinnedFolders.has(a.id), bP = pinnedFolders.has(b.id);
    if (aP && !bP) return -1; if (!aP && bP) return 1;
    return (a.title || "").localeCompare(b.title || "");
  });

  const wrapper = document.getElementById("folders");
  wrapper.innerHTML = "";

  for (let i = 0; i < sorted.length; i += foldersPerPage) {
    const page = document.createElement("div");
    page.className = "folders-page";
    sorted.slice(i, i + foldersPerPage).forEach(folder => {
      const box = document.createElement("div");
      box.className = "folder-box";
      const titleRow = document.createElement("div");
      titleRow.className = "folder-title-container";
      const pin = document.createElement("span");
      pin.className = "folder-pin";
      pin.appendChild(createPinElement(pinnedFolders.has(folder.id)));
      pin.onclick = () => togglePin(folder.id);
      const h3 = document.createElement("h3");
      h3.textContent = folder.title;
      titleRow.append(pin, h3);
      box.appendChild(titleRow);
      buildTreeList(folder.children || [], box, isSearchMode);
      page.appendChild(box);
    });
    wrapper.appendChild(page);
  }

  updatePageTransform(sorted);

  // Focus Restoration Logic
  if (lastFocusedId) {
    const toFocus = wrapper.querySelector(`[data-folder-id="${lastFocusedId}"]`);
    if (toFocus) toFocus.focus();
    lastFocusedId = null; // Clear it for next time
  }
}

function performSearch(q) {
  if (!q) {
    renderAllPages(allFolders, false);
    return;
  }
  const filterRec = (items) => {
    return items.reduce((acc, item) => {
      const match = (item.title || "").toLowerCase().includes(q) || (item.url || "").toLowerCase().includes(q) || (bookmarkTags[item.id] || []).some(t => t.includes(q));
      if (item.children) {
        const children = filterRec(item.children);
        if (match || children.length > 0) acc.push({ ...item, children: match ? item.children : children });
      } else if (match) acc.push(item);
      return acc;
    }, []);
  };
  const filtered = allFolders.map(f => {
    const m = (f.title || "").toLowerCase().includes(q);
    const res = filterRec(f.children || []);
    return (m || res.length > 0) ? { ...f, children: m ? f.children : res } : null;
  }).filter(Boolean);
  renderAllPages(filtered, true);
}

function refreshCurrentView() {
  performSearch(document.getElementById("search").value.trim().toLowerCase());
}

function updatePageTransform(folders = allFolders) {
  const wrapper = document.getElementById("folders"), container = document.querySelector(".folders-container");
  const w = container ? container.clientWidth : 0;
  wrapper.style.transform = `translateX(-${currentPage * w}px)`;
  const total = Math.max(1, Math.ceil(folders.length / foldersPerPage));
  document.getElementById("prev").disabled = currentPage <= 0;
  document.getElementById("next").disabled = currentPage >= total - 1;
}

/* --- Init --- */
async function init() {
  const res = await browser.storage.local.get(null);
  if (res.background) document.body.style.backgroundImage = `url("${res.background}")`;
  if (res.theme === "light") document.body.classList.add("light-theme");
  pinnedFolders = new Set(res.pinnedFolders || []);

  const tree = await browser.bookmarks.getTree();
  const root = tree[0].children || [];
  root.forEach(r => (r.children || []).forEach(c => {
    if (c.title === "Tags") {
      c.children?.forEach(tagF => tagF.children?.forEach(b => {
        if (!bookmarkTags[b.id]) bookmarkTags[b.id] = [];
        bookmarkTags[b.id].push(tagF.title.toLowerCase());
      }));
    } else if (c.children) allFolders.push(c);
  }));

  renderAllPages();
  const searchInput = document.getElementById("search");
  searchInput.addEventListener("input", e => performSearch(e.target.value.trim().toLowerCase()));
  if (res.startupFocus !== "none") {
    const f = () => { if (document.hasFocus() && searchInput.offsetParent) searchInput.focus(); else requestAnimationFrame(f); };
    f();
  }
}
document.getElementById("prev").onclick = () => { if (currentPage > 0) { currentPage--; updatePageTransform(); } };
document.getElementById("next").onclick = () => { if (currentPage < Math.ceil(allFolders.length / 3) - 1) { currentPage++; updatePageTransform(); } };
window.onresize = () => updatePageTransform();
document.addEventListener("DOMContentLoaded", init);
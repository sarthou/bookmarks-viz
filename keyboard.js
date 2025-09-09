/* --- Keyboard navigation --- */

function focusSearch() {
  document.getElementById("search").focus();
}

function clearSearchAndReset() {
  const searchInput = document.getElementById("search");
  searchInput.value = "";
  renderAllPages();
  updatePageTransform();
}

function openFirstResult() {
  const firstLink = document.querySelector(".folder-box a");
  if (firstLink) {
    browser.tabs.create({ url: firstLink.href });
  }
}

// returns the DOM element of the currently visible page (folders-page)
function getVisiblePageElement() {
  const pages = Array.from(document.querySelectorAll(".folders-page"));
  if (!pages.length) return null;

  // prefer the page index if the global variable exists
  if (typeof currentPage !== "undefined" && pages[currentPage]) {
    return pages[currentPage];
  }

  // fallback: find the page that overlaps the slider container most
  const container = document.querySelector(".folders-container");
  if (container) {
    const crect = container.getBoundingClientRect();
    let best = null;
    let bestOverlap = 0;

    for (const p of pages) {
      const r = p.getBoundingClientRect();
      // compute horizontal overlap with container
      const overlap = Math.max(0, Math.min(r.right, crect.right) - Math.max(r.left, crect.left));
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = p;
      }
    }
    if (best) return best;
  }

  // last resort
  return pages[0];
}

// focus the first visible bookmark inside the visible page
function focusFirstBookmark() {
  const page = getVisiblePageElement();
  if (!page) return;

  // find the first anchor inside that visible page
  const firstLink = page.querySelector(".folder-box a");
  if (firstLink) firstLink.focus();
}


function focusNextBookmark(current, direction) {
  const currentPage = current.closest(".folders-page");
  const links = Array.from(currentPage.querySelectorAll(".folder-box a"));
  const index = links.indexOf(current);
  if (index === -1) return;

  const next = links[index + direction];
  if (next) {
    next.focus();
  } else if (direction < 0) {
    // at top and pressed up → cancel focus
    current.blur();
  }
}

function focusNextBox(current, direction) {
  const pages = Array.from(document.querySelectorAll(".folders-page"));
  if (!pages.length) return;

  // Determine which page we’re on
  const currentPageEl = current.closest(".folders-page");
  const pageIndex = pages.indexOf(currentPageEl);
  if (pageIndex === -1) return;

  const boxes = Array.from(currentPageEl.querySelectorAll(".folder-box"));
  const currentBox = current.closest(".folder-box");
  const boxIndex = boxes.indexOf(currentBox);

  if (boxIndex === -1) return;

  const targetBox = boxes[boxIndex + direction];
  if (targetBox) {
    // Move focus within the same page
    const link = targetBox.querySelector("a");
    if (link) link.focus();
  } else {
    // We’re at the edge → move to prev/next page
    const newPageIndex = pageIndex + direction;
    if (newPageIndex >= 0 && newPageIndex < pages.length) {
      if (direction < 0) {
        document.getElementById("prev").click();
      } else {
        document.getElementById("next").click();
      }

      // Focus edge box of the new page after transition
      setTimeout(() => {
        const newPage = pages[newPageIndex];
        const newBoxes = Array.from(newPage.querySelectorAll(".folder-box"));
        const edgeBox = direction < 0 ? newBoxes[newBoxes.length - 1] : newBoxes[0];
        if (edgeBox) {
          const link = edgeBox.querySelector("a");
          if (link) link.focus();
        }
      }, 300);
    }
  }
}


document.addEventListener("keydown", e => {
  const searchInput = document.getElementById("search");
  const active = document.activeElement;

  // --- Case 1: Search bar active ---
  if (active === searchInput) {
    switch (e.key) {
      case "Escape":
        clearSearchAndReset();
        e.stopImmediatePropagation();
        e.preventDefault();   
        break;
      case "Enter":
        e.preventDefault();              // stop default <a> activation
        e.stopImmediatePropagation();    // extra safety
        openFirstResult();
        window.close(); // close popup
        break;
      case "ArrowDown":
        focusFirstBookmark();
        break;
    }
  }
  // --- Case 2: A bookmark is active ---
  else if (active && active.tagName === "A") {
    switch (e.key) {
      case "Enter":
        browser.tabs.create({ url: active.href });
        e.preventDefault();              // stop default <a> activation
        e.stopImmediatePropagation();    // extra safety
        window.close(); // close popup
        break;
      case "ArrowDown":
        e.preventDefault();
        focusNextBookmark(active, +1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusNextBookmark(active, -1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusNextBox(active, -1);
        break;
      case "ArrowRight":
        e.preventDefault();
        focusNextBox(active, +1);
        break;
      case "Escape":
        active.blur();
        e.stopImmediatePropagation();
        e.preventDefault();
        break;
    }
  }
  else {
    // --- Case 3: Nothing focused (Navigation mode) ---
    switch (e.key) {
        case "ArrowLeft":
        document.getElementById("prev").click();
        break;
        case "ArrowRight":
        document.getElementById("next").click();
        break;
        case "ArrowUp":
        focusSearch();
        break;
        case "ArrowDown":
        focusFirstBookmark();
        break;
        case "Escape":
        window.close(); // close popup
        break;
    }
  }
});

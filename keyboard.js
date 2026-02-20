/* --- Keyboard navigation --- */

function focusSearch() { document.getElementById("search").focus(); }

function clearSearchAndReset() {
  const searchInput = document.getElementById("search");
  searchInput.value = "";
  performSearch("");
}

function openFirstResult() {
  const firstLink = document.querySelector(".folder-box a");
  if (firstLink) {
    if (firstLink.dataset.isFolder === "true") firstLink.click();
    else { browser.tabs.create({ url: firstLink.href }); window.close(); }
  }
}

function focusFirstBookmark() {
  const pages = Array.from(document.querySelectorAll(".folders-page"));
  const firstLink = pages[currentPage]?.querySelector("a");
  if (firstLink) firstLink.focus();
}

function focusNextBookmark(current, direction) {
  const page = current.closest(".folders-page");
  const links = Array.from(page.querySelectorAll("a"));
  const index = links.indexOf(current);
  if (index !== -1 && links[index + direction]) links[index + direction].focus();
  else if (index !== -1 && direction < 0) current.blur();
}

function focusNextBox(current, direction) {
  const pages = Array.from(document.querySelectorAll(".folders-page"));
  const pageIndex = pages.indexOf(current.closest(".folders-page"));
  const boxes = Array.from(pages[pageIndex].querySelectorAll(".folder-box"));
  const boxIndex = boxes.indexOf(current.closest(".folder-box"));

  if (boxes[boxIndex + direction]) {
    const link = boxes[boxIndex + direction].querySelector("a");
    if (link) link.focus();
  } else {
    const newIdx = pageIndex + direction;
    if (newIdx >= 0 && newIdx < pages.length) {
      if (direction < 0) document.getElementById("prev").click();
      else document.getElementById("next").click();
      setTimeout(() => {
        const targetPage = Array.from(document.querySelectorAll(".folders-page"))[newIdx];
        const targetBox = direction < 0 ? targetPage.querySelector(".folder-box:last-child") : targetPage.querySelector(".folder-box:first-child");
        targetBox?.querySelector("a")?.focus();
      }, 300);
    }
  }
}

document.addEventListener("keydown", e => {
  const searchInput = document.getElementById("search");
  const active = document.activeElement;

  if (active === searchInput) {
    if (e.key === "Escape") clearSearchAndReset();
    else if (e.key === "Enter") openFirstResult();
    else if (e.key === "ArrowDown") { e.preventDefault(); focusFirstBookmark(); }
  } else if (active && active.tagName === "A") {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        if (active.dataset.isFolder === "true") {
          active.click(); // Expand/Collapse folder
        } else {
          browser.tabs.create({ url: active.href });
          window.close();
        }
        break;
      case "ArrowDown": e.preventDefault(); focusNextBookmark(active, 1); break;
      case "ArrowUp": e.preventDefault(); focusNextBookmark(active, -1); break;
      case "ArrowLeft": e.preventDefault(); focusNextBox(active, -1); break;
      case "ArrowRight": e.preventDefault(); focusNextBox(active, 1); break;
      case "Escape": active.blur(); break;
    }
  } else {
    if (e.key === "ArrowLeft") document.getElementById("prev").click();
    else if (e.key === "ArrowRight") document.getElementById("next").click();
    else if (e.key === "ArrowUp") focusSearch();
    else if (e.key === "ArrowDown") focusFirstBookmark();
    else if (e.key === "Escape") window.close();
  }
});
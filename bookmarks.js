let currentIndex = 0;
const foldersPerPage = 3;
let allFolders = [];

function renderFolders() {
  const container = document.getElementById("folders");
  container.innerHTML = "";

  const visible = allFolders.slice(currentIndex, currentIndex + foldersPerPage);
  visible.forEach(folder => {
    const box = document.createElement("div");
    box.className = "folder-box";

    const title = document.createElement("h3");
    title.textContent = folder.title || "Untitled Folder";
    box.appendChild(title);

    const list = document.createElement("ul");
    folder.children.forEach(b => {
    if (b.url) {
      list.appendChild(createBookmarkItem(b));
    }
    });
    box.appendChild(list);

    container.appendChild(box);
  });
}

function loadBookmarks() {
  browser.bookmarks.getTree().then(tree => {
    const rootChildren = tree[0].children;

    allFolders = [];
    const looseBookmarks = [];

    rootChildren.forEach(root => {
      if (root.children) {
        root.children.forEach(child => {
          if (child.children) {
            // It's a folder → keep it
            allFolders.push(child);
          } else if (child.url) {
            // It's a bookmark → keep it for a special box
            looseBookmarks.push(child);
          }
        });
      }
    });

    // If there are direct bookmarks, group them in a synthetic folder
    if (looseBookmarks.length > 0) {
      allFolders.unshift({
        title: "Loose Bookmarks",
        children: looseBookmarks
      });
    }

    renderFolders();
  });
}

function createBookmarkItem(b) {
  const li = document.createElement("li");

  // favicon
  const favicon = document.createElement("img");
  favicon.className = "favicon";
  try {
    favicon.src = "https://www.google.com/s2/favicons?domain=" + new URL(b.url).hostname;
  } catch (e) {
    favicon.src = ""; // fallback if URL parsing fails
  }
  li.appendChild(favicon);

  // link text
  const a = document.createElement("a");
  a.href = b.url;
  a.textContent = b.title || b.url;
  a.target = "_blank";
  li.appendChild(a);

  return li;
}


document.getElementById("prev").addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex -= foldersPerPage;
    renderFolders();
  }
});

document.getElementById("next").addEventListener("click", () => {
  if (currentIndex + foldersPerPage < allFolders.length) {
    currentIndex += foldersPerPage;
    renderFolders();
  }
});

document.getElementById("search").addEventListener("input", e => {
  const query = e.target.value.toLowerCase();
  if (!query) {
    renderFolders();
    return;
  }
  const results = [];
  allFolders.forEach(folder => {
    const matches = folder.children.filter(b => {
      return (b.title && b.title.toLowerCase().includes(query));
      // TODO: add tags support here later
    });
    if (matches.length > 0) {
      results.push({ title: folder.title, children: matches });
    }
  });
  const container = document.getElementById("folders");
  container.innerHTML = "";
  results.forEach(folder => {
    const box = document.createElement("div");
    box.className = "folder-box";

    const title = document.createElement("h3");
    title.textContent = folder.title;
    box.appendChild(title);

    const list = document.createElement("ul");
    folder.children.forEach(b => {
      if (b.url) {
        list.appendChild(createBookmarkItem(b));
      }
    });

    box.appendChild(list);
    container.appendChild(box);
  });
});

loadBookmarks();

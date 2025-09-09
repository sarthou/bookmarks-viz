function saveOptions() {
  const bg = document.getElementById("bg").value;
  const theme = document.getElementById("themeToggle").checked ? "dark" : "light"; // checked = dark
  const startupFocus = document.getElementById("focusSearchToggle").checked ? "search" : "navigation";

  browser.storage.local.set({ background: bg, theme, startupFocus }).then(() => {
    alert("Options saved!");
  });
}

function loadOptions() {
  browser.storage.local.get(["background", "theme", "startupFocus"]).then(res => {
    if (res.background) document.getElementById("bg").value = res.background;

    const themeToggle = document.getElementById("themeToggle");
    themeToggle.checked = (res.theme || "light") === "dark";  // checked = dark

    const toggle = document.getElementById("focusSearchToggle");
    toggle.checked = (res.startupFocus || "search") === "search";

    // update label
    const themeLabel = document.getElementById("themeLabel");
    themeLabel.textContent = themeToggle.checked ? "Dark Mode" : "Light Mode";
  });
}

// Event listeners
document.getElementById("save").addEventListener("click", saveOptions);
document.addEventListener("DOMContentLoaded", loadOptions);

// Theme toggle change listener
const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.getElementById("themeLabel");

themeToggle.addEventListener("change", () => {
  const theme = themeToggle.checked ? "dark" : "light";
  themeLabel.textContent = themeToggle.checked ? "Dark Mode" : "Light Mode";
  browser.storage.local.set({ theme });
});

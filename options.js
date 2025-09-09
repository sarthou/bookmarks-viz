function saveOptions() {
  const bg = document.getElementById("bg").value;
  const theme = document.getElementById("theme").value;

  browser.storage.local.set({ background: bg, theme }).then(() => {
    alert("Options saved!");
  });
}

function loadOptions() {
  browser.storage.local.get(["background", "theme"]).then(res => {
    if (res.background) document.getElementById("bg").value = res.background;
    if (res.theme) document.getElementById("theme").value = res.theme;
  });
}

document.getElementById("save").addEventListener("click", saveOptions);
document.addEventListener("DOMContentLoaded", loadOptions);

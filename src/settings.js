document.getElementById('chrome-version').value = `v${window.versions.chrome()}`;


document.getElementById("save").addEventListener("click", function () {
    let screenConfig = {
        url: document.getElementById('url').value,
        fullscreen: document.getElementById('fullscreen').checked,
    }
    window.webdisplay.saveSettings(screenConfig);
});

// Load initial settings
window.webdisplay.getSettings().then(function (settings) {
    console.log("getSettings", settings);
    document.getElementById('url').value = settings.url;
    document.getElementById('fullscreen').checked = settings.fullscreen;
});
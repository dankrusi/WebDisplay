document.getElementById('chromeVersion').value = `v${window.versions.chrome()}`;

function saveSettings() {
    let screenConfig = {
        url: document.getElementById('url').value,
        fullscreen: document.getElementById('fullscreen').checked,
    }
    window.webdisplay.saveSettings(screenConfig);
}

document.getElementById("save").addEventListener("click", function () {
    saveSettings();
});
document.getElementById("saveRestart").addEventListener("click", function () {
    saveSettings();
    window.webdisplay.createSplashWindow();
});
document.getElementById("saveLaunch").addEventListener("click", function () {
    saveSettings();
    window.webdisplay.createKioskWindow();
});

// Load initial settings
window.webdisplay.getSettings().then(function (settings) {
    console.log("getSettings", settings);
    document.getElementById('displayId').value = settings.displayId;
    document.getElementById('url').value = settings.url;
    document.getElementById('fullscreen').checked = settings.fullscreen;
});
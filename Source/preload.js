const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
    // we can also expose variables, not just functions
});



contextBridge.exposeInMainWorld('webdisplay', {
    saveSettings: (settings) => {
        console.log("bridge: saveSettings", settings);
        ipcRenderer.send('saveSettings', settings);
    },
    getSettings: async () => {
        console.log("bridge: getSettings called");
        return await ipcRenderer.invoke('getSettings');
    },
    createSplashWindow: async () => {
        return await ipcRenderer.invoke('createSplashWindow');
    },
    createKioskWindow: async () => {
        return await ipcRenderer.invoke('createKioskWindow');
    },
    createSettingsWindow: async () => {
        return await ipcRenderer.invoke('createSettingsWindow');
    },
    onSplashTimeout: async () => {
        return await ipcRenderer.invoke('onSplashTimeout');
    },
});
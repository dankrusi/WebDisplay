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
        ipcRenderer.send('apiSaveSettings', settings);
    },
    getSettings: async () => {
        console.log("bridge: getSettings called");
        return await ipcRenderer.invoke('apiGetSettings');
    },
});
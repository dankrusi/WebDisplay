const { powerSaveBlocker, app, BrowserWindow, screen, ipcMain, globalShortcut } = require('electron');

// https://www.electronforge.io/config/makers/squirrel.windows
// run this as early in the main process as possible
if (require('electron-squirrel-startup')) app.quit();

const commandLineArgs = require('command-line-args');
const settings = require('electron-settings');


let splashWindow;
let settingsWindow;
let kioskWindow;

console.log("cmd argv", process.argv);

const optionDefinitions = [
    { name: 'verbose', alias: 'v', type: Boolean },
    { name: 'url', alias: 'u', type: String },
    { name: 'settings', type: Boolean },
    { name: 'fullscreen', alias: 'f', type: Boolean },
    { name: 'width', alias: 'w', type: Number },
    { name: 'height', alias: 'h', type: Number },
    { name: 'timeout', alias: 't', type: Number },
    { name: 'screen', alias: 's', type: Number },
]
const options = commandLineArgs(optionDefinitions);
console.log("cmd options", options);

function getCurrentDisplay() {
    // Get the current display based on the mouse pointer
    const primaryDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    console.log("primaryDisplay", primaryDisplay);
    return primaryDisplay; //TODO
}

function saveScreenConfig(config) {
    config.displayId = getCurrentDisplay().id; // Add display ID to the settings
    settings.setSync('screen-' + getCurrentDisplay().id, config);


}

function getScreenConfig() {
    // Get settings for screen
    let screenConfig = settings.getSync('screen-' + getCurrentDisplay().id);
    return screenConfig;
}

function closeAllWindows() {

    if (splashWindow) splashWindow.close();
    if (settingsWindow) settingsWindow.close();
    if (kioskWindow) kioskWindow.close();

    splashWindow = null;
    settingsWindow = null;
    kioskWindow = null;
}


function createSplashWindow() {

    closeAllWindows();

    splashWindow = new BrowserWindow({
        width: 400,
        height: 200,
        webPreferences: {
            preload: __dirname + '/preload.js'
        },
        alwaysOnTop: true,
        frame: false
    });

    splashWindow.loadFile('./src/splash.html');

}


function onSplashTimeout() {


    let screenConfig = getScreenConfig();
    if (screenConfig == null || screenConfig.url == null || screenConfig.url == "" || options.settings == true) {
        createSettingsWindow();
    } else {
        createKioskWindow();
    }
}


const createKioskWindow = () => {

    closeAllWindows();

    const preventDisplaySleepId = powerSaveBlocker.start('prevent-display-sleep');
    const preventAppSuspension = powerSaveBlocker.start('prevent-app-suspension');

    // Get the current display based on the mouse pointer
    const primaryDisplay = getCurrentDisplay();


    // Get settings for screen
    let screenConfig = getScreenConfig();
    if (screenConfig == null || screenConfig.url == null || screenConfig.url == "" || options.settings == true) {
        //TODO: should not happen
        console.warn("⚠️ Screen configuration is missing or settings mode is active. Skipping kiosk window creation.");
    } else {
        console.log("options: ", options);
        console.log("screen has config: ", screenConfig);
        let isFullscreen = options.fullscreen || screenConfig.fullscreen || false; // Use command line or saved config
        kioskWindow = new BrowserWindow({
            width: options.width || 800,
            height: options.height || 600,
            fullscreen: isFullscreen, //options.fullscreen, // Enable fullscreen mode,
            x: primaryDisplay.bounds.x, // Position on the current monitor
            y: primaryDisplay.bounds.y, // Position on the current monitor
            alwaysOnTop: true,  // Keep on top
            kiosk: isFullscreen,        // Kiosk mode to disable standard system UI
            show: false, // Delay showing the window for smoother experience
            webPreferences: {
                preload: __dirname + '/preload.js', // Add the preload script here
                contextIsolation: true, // Isolate the context for better security
                enableRemoteModule: false, // 
            },
        });

        // Disable visual zoom (pinch) entirely
        kioskWindow.webContents.setVisualZoomLevelLimits(1, 1);

        // Optionally regain focus to prevent user from clicking outside
        kioskWindow.on('blur', () => {
            kioskWindow.focus();
        });

        // Open the DevTools.
        //kioskWindow.webContents.openDevTools();

        // Optional: wait until ready before showing
        kioskWindow.once('ready-to-show', () => {
            kioskWindow.show();
        });

        // Optional: Add error handler for loading failures
        kioskWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            console.error("❌ Failed to load URL:", errorDescription);
            // kioskWindow.loadFile('offline.html'); // Optionally show a fallback
        });

        // Add a listener for the Escape key
        kioskWindow.webContents.on('before-input-event', (event, input) => {
            console.log('before-input-event', event, input);
            if (input.key === 'Escape') {
                kioskWindow.close(); // Close the window on Escape key
            }
        });

        // maybe at this check to whait till online
        //setTimeout(async () => {
        //    const online = await isOnline();
        //    if (online) {
        //        kioskWindow.loadURL(getConfiguredStartupURL());
        //    } else {
        //        console.warn("🌐 No network – retrying in 5 seconds...");
        //        setTimeout(() => kioskWindow.loadURL(getConfiguredStartupURL()), 5000);
        //    }
        //}, 3000);


        // Load the configured URL
        const urlToLoad = options.url || screenConfig.url;
        console.log("🌐 Loading URL:", urlToLoad);
        setTimeout(() => {
            kioskWindow.loadURL(urlToLoad);
        }, 1000); // delay helps avoid blank screen on boot


        // 🔍 Detect blank screen after a few seconds
        let detectBlankPageTimer = setInterval(() => {
            if (kioskWindow && !kioskWindow.isDestroyed()) {
                kioskWindow.webContents.executeJavaScript('document.body.innerText')
                    .then((content) => {
                        if (!content || content.trim() === '') {
                            console.warn("⚠️ Blank content detected – reloading...");
                            kioskWindow.loadURL(urlToLoad);
                            if (detectBlankPageTimer != null) clearInterval(detectBlankPageTimer);
                        } else {
                            console.log("✅ Window content loaded successfully.");
                        }
                    })
                    .catch(err => {
                        console.error("❌ Error checking window content:", err);
                    });
            }
        }, 10000); // check 10 seconds after launch

    }

    


    // Hide the cursor after 3 seconds of inactivity
    /*
    let inactivityTimeout;

    const hideCursor = () => {
        console.log("hideCursor");
        kioskWindow.webContents.send('hide-cursor');
        kioskWindow.webContents.executeJavaScript(`
            document.body.style.backgroundColor = "lightblue";
            document.body.style.cursor = 'none';
        `);
    };

    const resetInactivityTimer = () => {
        console.log("resetInactivityTimer");
        clearTimeout(inactivityTimeout);
        kioskWindow.webContents.send('show-cursor');
        inactivityTimeout = setTimeout(hideCursor, 3000);
        kioskWindow.webContents.executeJavaScript(`
            document.body.style.cursor = 'default'; // Show the cursor
        `);
    };

    // Events: see https://www.electronjs.org/docs/latest/api/web-contents
    kioskWindow.webContents.on('before-input-event', () => {
        resetInactivityTimer();
    });*/



    // Execute JavaScript in the renderer process
    //kioskWindow.webContents.executeJavaScript(`
    //    console.log('Hello from Main Process!');
    //    document.body.style.backgroundColor = "lightblue";
    //`);
};


const createSettingsWindow = () => {

    closeAllWindows();

    // Show settings
    settingsWindow = new BrowserWindow({
        //width: options.width,
        //height: options.height,
        //fullscreen: options.fullscreen, // Enable fullscreen mode,
        //x: primaryDisplay.bounds.x, // Position on the current monitor
       // y: primaryDisplay.bounds.y, // Position on the current monitor
        webPreferences: {
            preload: __dirname + '/preload.js', // Add the preload script here
            contextIsolation: true, // Isolate the context for better security
            enableRemoteModule: false, // 
        },
    });
    settingsWindow.loadFile('./src/settings.html');
    


};

// disables 2-finger swipe back/forward
app.commandLine.appendSwitch('disable-features', 'OverscrollHistoryNavigation'); 

app.whenReady().then(() => {


    // Bridge
    ipcMain.on('saveSettings', (_event, value) => {
        console.log("api call saveSettings", value);
        saveScreenConfig(value);
    });
    ipcMain.handle('getSettings', async (event) => {
        console.log("Main process: getSettings called");
        return getScreenConfig();
    });
    ipcMain.handle('createSettingsWindow', async (event) => {
        createSettingsWindow();
    });
    ipcMain.handle('createKioskWindow', async (event) => {
        createKioskWindow();
    });
    ipcMain.handle('createSplashWindow', async (event) => {
        createSplashWindow();
    });
    ipcMain.handle('onSplashTimeout', async (event) => {
        onSplashTimeout();
    });

    
    createSplashWindow();


    
});

app.on('activate', () => {
    //if (BrowserWindow.getAllWindows().length === 0) createWindow();
})

app.on('window-all-closed', () => {
    //if (process.platform !== 'darwin') app.quit()
    app.quit();
});



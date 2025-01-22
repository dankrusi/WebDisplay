const { app, BrowserWindow, screen, ipcMain, globalShortcut } = require('electron');

// https://www.electronforge.io/config/makers/squirrel.windows
// run this as early in the main process as possible
if (require('electron-squirrel-startup')) app.quit();

const commandLineArgs = require('command-line-args');
const settings = require('electron-settings');

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
console.log("cmd options",options);

let mainWindow;
const createWindow = (showSettings) => {

    // Get the current display based on the mouse pointer
    const primaryDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    console.log("primaryDisplay", primaryDisplay);


    // Get settings for screen
    let screenConfig = settings.getSync('screen-' + primaryDisplay.id);
    if (screenConfig == null || screenConfig.url == null || screenConfig.url == "" || options.settings == true || showSettings) {
        // Show settings
        mainWindow = new BrowserWindow({
            //width: options.width,
            //height: options.height,
            //fullscreen: options.fullscreen, // Enable fullscreen mode,
            x: primaryDisplay.bounds.x, // Position on the current monitor
            y: primaryDisplay.bounds.y, // Position on the current monitor
            webPreferences: {
                preload: __dirname + '/preload.js', // Add the preload script here
                contextIsolation: true, // Isolate the context for better security
                enableRemoteModule: false, // 
            },
        });
        mainWindow.loadFile('settings.html');
    } else {
        console.log("screen has config: ",screenConfig);
        mainWindow = new BrowserWindow({
            width: options.width,
            height: options.height,
            fullscreen: options.fullscreen || screenConfig.fullscreen, //options.fullscreen, // Enable fullscreen mode,
            x: primaryDisplay.bounds.x, // Position on the current monitor
            y: primaryDisplay.bounds.y, // Position on the current monitor
            webPreferences: {
                preload: __dirname + '/preload.js', // Add the preload script here
                contextIsolation: true, // Isolate the context for better security
                enableRemoteModule: false, // 
            },
        });
        mainWindow.loadURL(options.url || screenConfig.url);
    }

    // Open the DevTools.
    //mainWindow.webContents.openDevTools();
    

    // Add a listener for the Escape key
    mainWindow.webContents.on('before-input-event', (event, input) => {
        console.log('before-input-event',event,input);
        if (input.key === 'Escape') {
            mainWindow.close(); // Close the window on Escape key
        }
    });

    // Bridge
    ipcMain.on('apiSaveSettings', (_event, value) => {
        console.log("api call saveSettings", value);
        settings.setSync('screen-' + primaryDisplay.id, value);
    });
    ipcMain.handle('apiGetSettings', async (event) => {
        console.log("Main process: getSettings called");
        return screenConfig;
    });


    // Hide the cursor after 3 seconds of inactivity
    /*
    let inactivityTimeout;

    const hideCursor = () => {
        console.log("hideCursor");
        mainWindow.webContents.send('hide-cursor');
        mainWindow.webContents.executeJavaScript(`
            document.body.style.backgroundColor = "lightblue";
            document.body.style.cursor = 'none';
        `);
    };

    const resetInactivityTimer = () => {
        console.log("resetInactivityTimer");
        clearTimeout(inactivityTimeout);
        mainWindow.webContents.send('show-cursor');
        inactivityTimeout = setTimeout(hideCursor, 3000);
        mainWindow.webContents.executeJavaScript(`
            document.body.style.cursor = 'default'; // Show the cursor
        `);
    };

    // Events: see https://www.electronjs.org/docs/latest/api/web-contents
    mainWindow.webContents.on('before-input-event', () => {
        resetInactivityTimer();
    });*/

    

    // Execute JavaScript in the renderer process
    //mainWindow.webContents.executeJavaScript(`
    //    console.log('Hello from Main Process!');
    //    document.body.style.backgroundColor = "lightblue";
    //`);
};

app.whenReady().then(() => {

    // Register Shift key shortcut
    let shiftPressed = false;
    globalShortcut.register('CommandOrControl+Shift+S', () => {
        shiftPressed = true;
    });

    setTimeout(() => {
        createWindow(shiftPressed);
    }, 400);


    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow(false);
    })
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
});



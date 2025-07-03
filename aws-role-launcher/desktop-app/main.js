const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 400,
        height: 500,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        resizable: false,
        icon: path.join(__dirname, 'assets/icon.png'), // Add an icon if you have one
        title: 'AWS Role Launcher'
    });

    mainWindow.loadFile('index.html');
    
    // Hide menu bar
    mainWindow.setMenuBarVisibility(false);
    
    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Handle role switching
ipcMain.handle('switch-role', async (event, accountId, roleName, displayName) => {
    const url = `https://signin.aws.amazon.com/switchrole?account=${accountId}&roleName=${roleName}&displayName=${encodeURIComponent(displayName)}`;
    await shell.openExternal(url);
    return true;
});

// Handle direct console access
ipcMain.handle('open-console', async (event) => {
    await shell.openExternal('https://console.aws.amazon.com/');
    return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
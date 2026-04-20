const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { createTrayIconBuffer } = require('./iconGenerator');

let mainWindow = null;
let tray = null;

function loadEnv() {
  const envPath = path.join(__dirname, '../../.env');
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 580,
    frame: false,
    backgroundColor: '#313338',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximize-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximize-change', false);
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });
}

function createTray() {
  const iconBuffer = createTrayIconBuffer();
  const icon = nativeImage.createFromBuffer(iconBuffer);

  tray = new Tray(icon);
  tray.setToolTip('Discord');

  const menu = Menu.buildFromTemplate([
    {
      label: 'Ouvrir Discord',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        mainWindow = null;
        app.exit(0);
      },
    },
  ]);

  tray.setContextMenu(menu);

  tray.on('click', () => {
    if (!mainWindow) return;
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

function buildContextMenu(context) {
  const menus = {
    server: [
      { label: 'Marquer comme lu', click: () => {} },
      { type: 'separator' },
      { label: 'Inviter des personnes', click: () => {} },
      { label: 'Paramètres du serveur', click: () => {} },
      { type: 'separator' },
      { label: 'Quitter le serveur', click: () => {}, role: undefined },
    ],
    channel: [
      { label: 'Marquer comme lu', click: () => {} },
      { label: 'Copier le lien du salon', click: () => {} },
      { type: 'separator' },
      { label: 'Épingler des messages', click: () => {} },
      { label: 'Modifier le salon', click: () => {} },
    ],
    dm: [
      { label: 'Marquer comme lu', click: () => {} },
      { type: 'separator' },
      { label: 'Fermer les messages privés', click: () => {} },
    ],
    user: [
      { label: 'Copier l\'identifiant', click: () => {} },
      { type: 'separator' },
      { label: 'Paramètres utilisateur', click: () => {} },
    ],
  };

  const template = menus[context.type] || menus.channel;
  return Menu.buildFromTemplate(template);
}

// IPC — contrôles fenêtre
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow?.hide());

// IPC — menu contextuel
ipcMain.on('show-context-menu', (event, context) => {
  const menu = buildContextMenu(context);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
});

// IPC — config utilisateur
ipcMain.handle('get-user-config', () => ({
  username: env.DISCORD_USERNAME || 'Utilisateur',
}));

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('activate', () => {
  if (!mainWindow) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

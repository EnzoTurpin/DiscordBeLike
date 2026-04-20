const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  showContextMenu: (context) => ipcRenderer.send('show-context-menu', context),
  onMaximizeChange: (callback) => {
    ipcRenderer.on('window-maximize-change', (_event, isMaximized) => callback(isMaximized));
  },
  onDeleteServer: (callback) => {
    ipcRenderer.on('delete-server', (_event, id) => callback(id));
  },
  getUserConfig: () => ipcRenderer.invoke('get-user-config'),
});

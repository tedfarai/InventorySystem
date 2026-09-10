/**
 * ===============================================================================
 * PARAMOUNT PROCUREMENT SYSTEM — ELECTRON PRELOAD BRIDGE (preload.cjs)
 * Architecture: Context Isolation Bridge with Zero Node Internals Exposed to DOM
 * ===============================================================================
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, typed window.electronAPI object to the renderer window
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // Window Controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // App & Environment Info
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  openFolder: (folderPath) => ipcRenderer.invoke('app:openFolder', folderPath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('app:showItemInFolder', filePath),

  // File System & Native Dialogs
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),

  // Desktop Notifications
  notify: (title, body) => ipcRenderer.invoke('notify:show', { title, body }),

  // Generic IPC Bridge for SQL/Procurement Actions
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  on: (channel, callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
});

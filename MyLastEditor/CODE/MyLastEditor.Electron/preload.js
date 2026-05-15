const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作API
  saveFile: (content, filePath) => ipcRenderer.invoke('save-file', { content, filePath }),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  
  // 最近文件API
  getRecentFiles: () => ipcRenderer.invoke('get-recent-files'),
  clearRecentFiles: () => ipcRenderer.invoke('clear-recent-files'),
  
  // 事件监听
  onFileNew: (callback) => ipcRenderer.on('file-new', callback),
  onFileSave: (callback) => ipcRenderer.on('file-save', callback),
  onFileSaveAs: (callback) => ipcRenderer.on('file-save-as', callback),
  onFileOpened: (callback) => ipcRenderer.on('file-opened', callback),
  onEditorZoomIn: (callback) => ipcRenderer.on('editor-zoom-in', callback),
  onEditorZoomOut: (callback) => ipcRenderer.on('editor-zoom-out', callback),
  onEditorResetZoom: (callback) => ipcRenderer.on('editor-reset-zoom', callback),
  
  // 移除事件监听
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// 暴露Node.js模块（仅限安全模块）
contextBridge.exposeInMainWorld('nodeModules', {
  path: {
    basename: (path) => require('path').basename(path),
    dirname: (path) => require('path').dirname(path),
    extname: (path) => require('path').extname(path),
    join: (...paths) => require('path').join(...paths)
  }
});
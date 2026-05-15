const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// 初始化配置存储
const store = new Store();

let mainWindow = null;
let isDev = process.argv.includes('--dev');

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false,
    backgroundColor: '#1e1e1e'
  });

  // 加载应用界面
  const startUrl = isDev 
    ? 'http://localhost:3000'  // 开发模式连接到Web开发服务器
    : `file://${path.join(__dirname, '..', 'MyLastEditor.WebUI', 'index.html')}`;  // 生产模式加载本地文件

  mainWindow.loadURL(startUrl);

  // 窗口准备就绪后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 开发模式下打开开发者工具
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 创建应用菜单
  createApplicationMenu();
}

// 创建应用菜单
function createApplicationMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建文件',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('file-new');
          }
        },
        {
          label: '打开文件',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            openFile();
          }
        },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('file-save');
          }
        },
        {
          label: '另存为',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('file-save-as');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        {
          label: '撤销',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: '重做',
          accelerator: 'CmdOrCtrl+Y',
          role: 'redo'
        },
        { type: 'separator' },
        {
          label: '剪切',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: '复制',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: '粘贴',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: '全选',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectAll'
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        {
          label: '重新加载',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: '切换开发者工具',
          accelerator: isDev ? 'CmdOrCtrl+Shift+I' : 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        {
          label: '放大',
          accelerator: 'CmdOrCtrl+=',
          click: () => {
            mainWindow.webContents.send('editor-zoom-in');
          }
        },
        {
          label: '缩小',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow.webContents.send('editor-zoom-out');
          }
        },
        {
          label: '重置缩放',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.send('editor-reset-zoom');
          }
        }
      ]
    },
    {
      label: '帮助',
      role: 'help',
      submenu: [
        {
          label: '关于 MyLastEditor',
          click: () => {
            showAboutDialog();
          }
        },
        {
          label: '查看文档',
          click: () => {
            shell.openExternal('https://github.com/yourusername/mylasteditor');
          }
        },
        {
          label: '报告问题',
          click: () => {
            shell.openExternal('https://github.com/yourusername/mylasteditor/issues');
          }
        }
      ]
    }
  ];

  // 在macOS上添加额外的菜单项
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 打开文件对话框
async function openFile() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '文本文件', extensions: ['txt', 'md', 'js', 'ts', 'html', 'css', 'json', 'xml', 'py', 'java', 'cpp', 'cs'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      mainWindow.webContents.send('file-opened', {
        path: filePath,
        content: content,
        name: path.basename(filePath)
      });
      
      // 保存最近打开的文件
      const recentFiles = store.get('recentFiles', []);
      recentFiles.unshift({
        path: filePath,
        name: path.basename(filePath),
        timestamp: Date.now()
      });
      
      // 只保留最近10个文件
      store.set('recentFiles', recentFiles.slice(0, 10));
    } catch (error) {
      dialog.showErrorBox('打开文件失败', `无法读取文件: ${error.message}`);
    }
  }
}

// 显示关于对话框
function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: '关于 MyLastEditor',
    message: 'MyLastEditor',
    detail: `版本: 1.0.0\n基于 Electron ${process.versions.electron}\nNode.js ${process.versions.node}\nChromium ${process.versions.chrome}\n\n一个现代化的跨平台文本编辑器`,
    buttons: ['确定']
  });
}

// 注册IPC事件处理
function setupIpcHandlers() {
  // 保存文件请求
  ipcMain.handle('save-file', async (event, { content, filePath }) => {
    try {
      if (!filePath) {
        const result = await dialog.showSaveDialog(mainWindow, {
          filters: [
            { name: '文本文件', extensions: ['txt'] },
            { name: '所有文件', extensions: ['*'] }
          ]
        });
        
        if (result.canceled) {
          return { success: false, message: '用户取消保存' };
        }
        
        filePath = result.filePath;
      }
      
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true, path: filePath };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  // 获取文件内容
  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  // 获取最近打开的文件
  ipcMain.handle('get-recent-files', () => {
    return store.get('recentFiles', []);
  });

  // 清除最近打开的文件
  ipcMain.handle('clear-recent-files', () => {
    store.set('recentFiles', []);
    return { success: true };
  });
}

// Electron应用准备就绪
app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 处理应用退出前的清理工作
app.on('before-quit', () => {
  // 保存窗口状态
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    store.set('windowBounds', bounds);
  }
});
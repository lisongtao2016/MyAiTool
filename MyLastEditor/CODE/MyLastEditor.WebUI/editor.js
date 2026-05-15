// MyLastEditor - 编辑器主逻辑
class MyLastEditor {
    constructor() {
        this.currentFile = null;
        this.isModified = false;
        this.zoomLevel = 100;
        this.tabs = new Map();
        this.activeTabId = 'untitled';
        this.editorContent = '';
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadRecentFiles();
        this.setupKeyboardShortcuts();
        this.updateStatusBar();
    }

    bindEvents() {
        // 工具栏按钮事件
        document.getElementById('btn-new').addEventListener('click', () => this.newFile());
        document.getElementById('btn-open').addEventListener('click', () => this.openFile());
        document.getElementById('btn-save').addEventListener('click', () => this.saveFile());
        document.getElementById('btn-save-as').addEventListener('click', () => this.saveFileAs());
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.redo());
        document.getElementById('btn-cut').addEventListener('click', () => this.cut());
        document.getElementById('btn-copy').addEventListener('click', () => this.copy());
        document.getElementById('btn-paste').addEventListener('click', () => this.paste());
        document.getElementById('btn-zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('btn-zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('btn-zoom-reset').addEventListener('click', () => this.zoomReset());
        document.getElementById('btn-theme').addEventListener('click', () => this.toggleTheme());
        document.getElementById('btn-settings').addEventListener('click', () => this.showSettings());
        document.getElementById('btn-refresh-files').addEventListener('click', () => this.refreshFileTree());

        // 快速操作按钮
        document.getElementById('btn-quick-new').addEventListener('click', () => this.newFile());
        document.getElementById('btn-quick-open').addEventListener('click', () => this.openFile());
        document.getElementById('btn-quick-open-folder').addEventListener('click', () => this.openFolder());

        // 标签页事件
        document.getElementById('btn-add-tab').addEventListener('click', () => this.addTab());
        
        // 编辑器内容变化事件
        const editor = document.getElementById('simple-editor');
        editor.addEventListener('input', (e) => {
            this.editorContent = e.target.value;
            this.setModified(true);
            this.updateCursorPosition();
        });

        editor.addEventListener('keyup', () => this.updateCursorPosition());
        editor.addEventListener('click', () => this.updateCursorPosition());

        // 设置模态框事件
        document.getElementById('btn-close-settings').addEventListener('click', () => this.hideSettings());
        document.getElementById('btn-cancel-settings').addEventListener('click', () => this.hideSettings());
        document.getElementById('btn-save-settings').addEventListener('click', () => this.saveSettings());
        
        document.getElementById('font-size').addEventListener('input', (e) => {
            document.getElementById('font-size-value').textContent = `${e.target.value}px`;
        });

        // 监听Electron事件
        if (window.electronAPI) {
            this.setupElectronEvents();
        }
    }

    setupElectronEvents() {
        window.electronAPI.onFileNew(() => this.newFile());
        window.electronAPI.onFileSave(() => this.saveFile());
        window.electronAPI.onFileSaveAs(() => this.saveFileAs());
        window.electronAPI.onFileOpened((event, data) => this.loadFile(data));
        window.electronAPI.onEditorZoomIn(() => this.zoomIn());
        window.electronAPI.onEditorZoomOut(() => this.zoomOut());
        window.electronAPI.onEditorResetZoom(() => this.zoomReset());
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 检查是否按下了Ctrl或Cmd键
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 'n':
                        e.preventDefault();
                        this.newFile();
                        break;
                    case 'o':
                        e.preventDefault();
                        this.openFile();
                        break;
                    case 's':
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.saveFileAs();
                        } else {
                            this.saveFile();
                        }
                        break;
                    case 'z':
                        e.preventDefault();
                        this.undo();
                        break;
                    case 'y':
                        e.preventDefault();
                        this.redo();
                        break;
                    case 'x':
                        e.preventDefault();
                        this.cut();
                        break;
                    case 'c':
                        e.preventDefault();
                        this.copy();
                        break;
                    case 'v':
                        e.preventDefault();
                        this.paste();
                        break;
                    case '=':
                    case '+':
                        e.preventDefault();
                        this.zoomIn();
                        break;
                    case '-':
                        e.preventDefault();
                        this.zoomOut();
                        break;
                    case '0':
                        e.preventDefault();
                        this.zoomReset();
                        break;
                }
            }
        });
    }

    newFile() {
        this.currentFile = null;
        this.editorContent = '';
        this.setModified(false);
        
        const editor = document.getElementById('simple-editor');
        editor.value = '';
        
        this.updateFileInfo('未命名文件', '未保存');
        this.showEditor();
        
        // 聚焦到编辑器
        editor.focus();
    }

    async openFile() {
        if (window.electronAPI) {
            // 在Electron环境中，通过主进程打开文件对话框
            // 主进程会发送 'file-opened' 事件，由 setupElectronEvents 处理
            console.log('通过Electron打开文件对话框');
        } else {
            // 在Web环境中，使用input元素模拟文件选择
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt,.md,.js,.ts,.html,.css,.json,.xml,.py,.java,.cpp,.cs';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const content = await this.readFile(file);
                    this.loadFile({
                        path: file.name,
                        content: content,
                        name: file.name
                    });
                }
            };
            
            input.click();
        }
    }

    async openFolder() {
        alert('打开文件夹功能需要在Electron环境中使用');
    }

    loadFile(fileData) {
        this.currentFile = {
            path: fileData.path,
            name: fileData.name
        };
        
        this.editorContent = fileData.content;
        
        const editor = document.getElementById('simple-editor');
        editor.value = fileData.content;
        
        this.setModified(false);
        this.updateFileInfo(fileData.name, '已保存');
        this.showEditor();
        
        // 更新最近文件列表
        this.addToRecentFiles(fileData);
        
        // 聚焦到编辑器
        editor.focus();
        editor.setSelectionRange(0, 0);
    }

    async saveFile() {
        if (!this.currentFile) {
            this.saveFileAs();
            return;
        }

        const content = document.getElementById('simple-editor').value;
        
        if (window.electronAPI) {
            const result = await window.electronAPI.saveFile(content, this.currentFile.path);
            if (result.success) {
                this.setModified(false);
                this.updateFileInfo(this.currentFile.name, '已保存');
                this.showNotification('文件保存成功');
            } else {
                this.showError('保存失败', result.message);
            }
        } else {
            // Web环境中的保存
            this.downloadFile(content, this.currentFile.name);
            this.setModified(false);
            this.updateFileInfo(this.currentFile.name, '已保存');
        }
    }

    async saveFileAs() {
        const content = document.getElementById('simple-editor').value;
        
        if (window.electronAPI) {
            const result = await window.electronAPI.saveFile(content, null);
            if (result.success) {
                this.currentFile = {
                    path: result.path,
                    name: window.nodeModules.path.basename(result.path)
                };
                this.setModified(false);
                this.updateFileInfo(this.currentFile.name, '已保存');
                this.showNotification('文件保存成功');
            } else if (result.message !== '用户取消保存') {
                this.showError('保存失败', result.message);
            }
        } else {
            // Web环境中的另存为
            const fileName = prompt('请输入文件名:', '未命名.txt');
            if (fileName) {
                this.downloadFile(content, fileName);
                this.currentFile = {
                    path: fileName,
                    name: fileName
                };
                this.setModified(false);
                this.updateFileInfo(fileName, '已保存');
            }
        }
    }

    downloadFile(content, fileName) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    undo() {
        document.execCommand('undo');
        this.setModified(true);
    }

    redo() {
        document.execCommand('redo');
        this.setModified(true);
    }

    cut() {
        document.execCommand('cut');
        this.setModified(true);
    }

    copy() {
        document.execCommand('copy');
    }

    paste() {
        document.execCommand('paste');
        this.setModified(true);
    }

    zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel + 10, 200);
        this.updateZoom();
    }

    zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel - 10, 50);
        this.updateZoom();
    }

    zoomReset() {
        this.zoomLevel = 100;
        this.updateZoom();
    }

    updateZoom() {
        const editor = document.getElementById('simple-editor');
        editor.style.fontSize = `${14 * (this.zoomLevel / 100)}px`;
        document.getElementById('status-zoom').textContent = `${this.zoomLevel}%`;
    }

    toggleTheme() {
        const body = document.body;
        const currentTheme = body.classList.contains('light-theme') ? 'light' : 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        body.classList.remove(`${currentTheme}-theme`);
        body.classList.add(`${newTheme}-theme`);
        
        // 更新主题按钮图标
        const themeIcon = document.querySelector('#btn-theme i');
        themeIcon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        
        this.showNotification(`已切换到${newTheme === 'dark' ? '深色' : '浅色'}主题`);
    }

    showSettings() {
        document.getElementById('modal-overlay').style.display = 'flex';
    }

    hideSettings() {
        document.getElementById('modal-overlay').style.display = 'none';
    }

    saveSettings() {
        const theme = document.getElementById('theme-select').value;
        const fontSize = document.getElementById('font-size').value;
        const autoSave = document.getElementById('auto-save').checked;
        const wordWrap = document.getElementById('word-wrap').checked;
        const lineNumbers = document.getElementById('line-numbers').checked;

        // 应用设置
        const body = document.body;
        body.className = '';
        body.classList.add(`${theme}-theme`);
        
        const editor = document.getElementById('simple-editor');
        editor.style.fontSize = `${fontSize}px`;
        editor.style.whiteSpace = wordWrap ? 'pre-wrap' : 'pre';
        
        // 保存设置到localStorage
        localStorage.setItem('editorSettings', JSON.stringify({
            theme,
            fontSize,
            autoSave,
            wordWrap,
            lineNumbers
        }));

        this.hideSettings();
        this.showNotification('设置已保存');
    }

    refreshFileTree() {
        // 刷新文件树逻辑
        console.log('刷新文件树');
    }

    addTab() {
        const tabId = `tab-${Date.now()}`;
        const tabBar = document.getElementById('tab-bar');
        
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.tab = tabId;
        tab.innerHTML = `
            <span class="tab-title">新标签页</span>
            <button class="tab-close" data-tab="${tabId}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // 在添加按钮前插入新标签页
        const addButton = document.getElementById('btn-add-tab');
        tabBar.insertBefore(tab, addButton);
        
        // 激活新标签页
        this.activateTab(tabId);
        
        // 绑定关闭事件
        tab.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(tabId);
        });
        
        tab.addEventListener('click', () => this.activateTab(tabId));
    }

    activateTab(tabId) {
        // 移除所有标签页的active类
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 添加active类到当前标签页
        const activeTab = document.querySelector(`.tab[data-tab="${tabId}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        this.activeTabId = tabId;
    }

    closeTab(tabId) {
        if (this.tabs.size <= 1) {
            this.showError('无法关闭', '至少需要保留一个标签页');
            return;
        }
        
        const tab = document.querySelector(`.tab[data-tab="${tabId}"]`);
        if (tab) {
            tab.remove();
            this.tabs.delete(tabId);
            
            // 如果关闭的是当前激活的标签页，激活另一个标签页
            if (tabId === this.activeTabId) {
                const remainingTabs = Array.from(document.querySelectorAll('.tab'));
                if (remainingTabs.length > 0) {
                    const newActiveTabId = remainingTabs[0].dataset.tab;
                    this.activateTab(newActiveTabId);
                }
            }
        }
    }

    setModified(modified) {
        this.isModified = modified;
        const statusElement = document.getElementById('status-modified');
        
        if (modified) {
            statusElement.innerHTML = '<i class="fas fa-circle" style="color: #ff6b6b;"></i> 已修改';
            document.getElementById('file-status').textContent = '已修改';
        } else {
            statusElement.innerHTML = '<i class="fas fa-circle" style="color: #4caf50;"></i> 已保存';
            document.getElementById('file-status').textContent = '已保存';
        }
    }

    updateFileInfo(fileName, status) {
        document.getElementById('file-info').querySelector('.file-name').textContent = fileName;
        document.getElementById('file-status').textContent = status;
        
        // 更新当前标签页标题
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            activeTab.querySelector('.tab-title').textContent = fileName;
        }
    }

    updateCursorPosition() {
        const editor = document.getElementById('simple-editor');
        const text = editor.value;
        const cursorPos = editor.selectionStart;
        
        // 计算行号和列号
        const textBeforeCursor = text.substring(0, cursorPos);
        const lines = textBeforeCursor.split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        
        document.getElementById('status-cursor').textContent = `第${line}行, 第${column}列`;
    }

    updateStatusBar() {
        // 更新编码和换行符显示
        document.getElementById('status-encoding').textContent = 'UTF-8';
        document.getElementById('status-line-ending').textContent = 'LF';
        
        // 根据文件扩展名更新语言显示
        if (this.currentFile) {
            const ext = this.currentFile.name.split('.').pop().toLowerCase();
            const languageMap = {
                'js': 'JavaScript',
                'ts': 'TypeScript',
                'html': 'HTML',
                'css': 'CSS',
                'json': 'JSON',
                'py': 'Python',
                'java': 'Java',
                'cpp': 'C++',
                'cs': 'C#',
                'md': 'Markdown',
                'txt': '纯文本'
            };
            
            document.getElementById('status-language').textContent = languageMap[ext] || '纯文本';
        }
    }

    showEditor() {
        document.getElementById('editor-placeholder').style.display = 'none';
        document.getElementById('editor-area').style.display = 'block';
    }

    showNotification(message) {
        // 简单的通知实现
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #007acc;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showError(title, message) {
        alert(`${title}: ${message}`);
    }

    async loadRecentFiles() {
        if (window.electronAPI) {
            const recentFiles = await window.electronAPI.getRecentFiles();
            this.updateRecentFilesList(recentFiles);
        }
    }

    updateRecentFilesList(recentFiles) {
        const listElement = document.getElementById('recent-files-list');
        listElement.innerHTML = '';

        if (recentFiles.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'recent-file-empty';
            emptyItem.textContent = '暂无最近打开的文件';
            listElement.appendChild(emptyItem);
            return;
        }

        recentFiles.forEach(file => {
            const listItem = document.createElement('li');
            listItem.className = 'recent-file-item';
            listItem.innerHTML = `
                <i class="fas fa-file"></i>
                <span class="recent-file-name">${file.name}</span>
                <span class="recent-file-path">${file.path}</span>
            `;
            
            listItem.addEventListener('click', () => this.openRecentFile(file.path));
            listElement.appendChild(listItem);
        });
    }

    addToRecentFiles(fileData) {
        // 在Electron环境中，最近文件由主进程管理
        // 在Web环境中，使用localStorage
        if (!window.electronAPI) {
            let recentFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
            
            // 移除重复项
            recentFiles = recentFiles.filter(f => f.path !== fileData.path);
            
            // 添加到开头
            recentFiles.unshift({
                path: fileData.path,
                name: fileData.name,
                timestamp: Date.now()
            });
            
            // 只保留最近10个
            recentFiles = recentFiles.slice(0, 10);
            
            localStorage.setItem('recentFiles', JSON.stringify(recentFiles));
            this.updateRecentFilesList(recentFiles);
        }
    }

    async openRecentFile(filePath) {
        if (window.electronAPI) {
            const result = await window.electronAPI.readFile(filePath);
            if (result.success) {
                this.loadFile({
                    path: filePath,
                    content: result.content,
                    name: window.nodeModules.path.basename(filePath)
                });
            } else {
                this.showError('打开文件失败', result.message);
            }
        }
    }

    // 供C# WebView2调用的方法
    loadContent(content) {
        const editor = document.getElementById('simple-editor');
        editor.value = content;
        this.editorContent = content;
        this.setModified(false);
        this.showEditor();
    }

    getContent() {
        return JSON.stringify(document.getElementById('simple-editor').value);
    }

    executeCommand(command) {
        switch(command) {
            case 'newFile':
                this.newFile();
                break;
            case 'undo':
                this.undo();
                break;
            case 'redo':
                this.redo();
                break;
            case 'cut':
                this.cut();
                break;
            case 'copy':
                this.copy();
                break;
            case 'paste':
                this.paste();
                break;
            case 'zoomIn':
                this.zoomIn();
                break;
            case 'zoomOut':
                this.zoomOut();
                break;
            case 'resetZoom':
                this.zoomReset();
                break;
        }
    }
}

// 初始化编辑器
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new MyLastEditor();
    
    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .light-theme {
            background-color: #ffffff;
            color: #333333;
        }
        
        .light-theme .toolbar {
            background-color: #f3f3f3;
            border-bottom-color: #dddddd;
        }
        
        .light-theme .toolbar-btn {
            background-color: #ffffff;
            border-color: #dddddd;
            color: #333333;
        }
        
        .light-theme .simple-editor {
            background-color: #ffffff;
            border-color: #dddddd;
            color: #333333;
        }
        
        .high-contrast-theme {
            background-color: #000000;
            color: #ffffff;
        }
        
        .high-contrast-theme .toolbar-btn {
            background-color: #222222;
            border-color: #ffffff;
            color: #ffffff;
        }
    `;
    document.head.appendChild(style);
    
    // 加载保存的设置
    const savedSettings = localStorage.getItem('editorSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        document.getElementById('theme-select').value = settings.theme;
        document.getElementById('font-size').value = settings.fontSize;
        document.getElementById('font-size-value').textContent = `${settings.fontSize}px`;
        document.getElementById('auto-save').checked = settings.autoSave;
        document.getElementById('word-wrap').checked = settings.wordWrap;
        document.getElementById('line-numbers').checked = settings.lineNumbers;
        
        // 应用主题
        document.body.classList.add(`${settings.theme}-theme`);
        
        // 应用字体大小
        document.getElementById('simple-editor').style.fontSize = `${settings.fontSize}px`;
    }
});

// 文件标签管理器
var FileTabsManager = {
    // 存储打开的文件
    openFiles: [],
    currentFileId: null,
    
    // 初始化
    init: function() {
        console.log('文件标签管理器初始化');
        this.bindEvents();
    },
    
    // 绑定事件
    bindEvents: function() {
        // 标签点击事件委托
        $(document).on('click', '.file-tab', function(e) {
            if ($(e.target).hasClass('file-tab-close')) {
                return; // 关闭按钮有单独的事件处理
            }
            var fileId = $(this).data('file-id');
            FileTabsManager.switchToFile(fileId);
        });
        
        // 关闭按钮点击事件委托
        $(document).on('click', '.file-tab-close', function(e) {
            e.stopPropagation();
            var $tab = $(this).closest('.file-tab');
            var fileId = $tab.data('file-id');
            FileTabsManager.closeFile(fileId);
        });
    },
    
    // 打开或切换到文件
    openFile: function(fileData) {
        console.log('打开文件:', fileData);
        
        // 检查文件是否已经打开
        var existingFile = this.openFiles.find(function(file) {
            return file.id === fileData.id;
        });
        
        if (existingFile) {
            // 文件已打开，切换到该文件
            this.switchToFile(fileData.id);
            return;
        }
        
        // 添加到打开文件列表
        this.openFiles.push({
            id: fileData.id,
            title: fileData.title,
            content: fileData.content || '',
            language: fileData.language || 'kindeditor',
            subtitle: fileData.subtitle || '',
            author: fileData.author || '',
            hotTags: fileData.hotTags || '',
            shareTo: fileData.shareTo || '',
            isModified: false
        });
        
        // 创建标签
        this.createTab(fileData);
        
        // 切换到新文件
        this.switchToFile(fileData.id);
    },
    
    // 创建文件标签
    createTab: function(fileData) {
        var $tabsList = $('#fileTabsList');
        
        // 创建标签元素
        var $tab = $('<div class="file-tab" data-file-id="' + fileData.id + '"></div>');
        
        // 标签内容
        var tabTitle = fileData.title || '未命名';
        if (tabTitle.length > 20) {
            tabTitle = tabTitle.substring(0, 18) + '...';
        }
        
        var $content = $('<div class="file-tab-content">' + tabTitle + '</div>');
        $tab.append($content);
        
        // 关闭按钮
        var $closeBtn = $('<button type="button" class="file-tab-close" title="关闭">×</button>');
        $tab.append($closeBtn);
        
        // 添加到标签列表
        $tabsList.append($tab);
        
        // 更新标签栏滚动
        this.updateTabsScroll();
    },
    
    // 切换到指定文件
    switchToFile: function(fileId) {
        console.log('切换到文件:', fileId);
        
        // 更新当前文件ID
        this.currentFileId = fileId;
        
        // 更新标签状态
        this.updateTabsActiveState();
        
        // 加载文件内容到编辑器
        this.loadFileToEditor(fileId);
    },
    
    // 更新标签激活状态
    updateTabsActiveState: function() {
        $('.file-tab').removeClass('active');
        $('.file-tab[data-file-id="' + this.currentFileId + '"]').addClass('active');
    },
    
    // 加载文件内容到编辑器（从服务器重新获取数据）
    loadFileToEditor: function(fileId) {
        console.log('从服务器加载文件内容:', fileId);
        
        // 显示加载中
        showToast('加载内容中...', 'info');
        
        // 从服务器重新获取数据
        $.ajax({
            type: "POST",
            url: "WebServ.asmx/LoadContent",
            data: JSON.stringify({ id: fileId }),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(response) {
                var result = response.d ? JSON.parse(response.d) : response;
                if (result.success) {
                    // 更新本地文件缓存
                    var file = FileTabsManager.openFiles.find(function(f) {
                        return f.id === fileId;
                    });
                    
                    if (file) {
                        file.title = result.title || result.Title || '';
                        file.content = result.content || result.Content || '';
                        file.language = result.language || result.Language || 'kindeditor';
                        file.subtitle = result.subtitle || result.Subtitle || '';
                        file.author = result.author || result.Author || '';
                        file.hotTags = result.hotTags || result.HotTags || '';
                        file.shareTo = result.shareTo || result.ShareTo || '';
                    }
                    
                    // 更新表单字段
                    $('#contentTitle').val(result.title || result.Title || '');
                    $('#contentSubtitle').val(result.subtitle || result.Subtitle || '');
                    $('#authorLabel').text(result.author || result.Author || '当前用户');
                    $('#contentCategory').val(result.category || result.Category || '');
                    $('#contentHotTags').val(result.hotTags || result.HotTags || '');
                    $('#contentShareTo').val(result.shareTo || result.ShareTo || '');
                    
                    // 设置当前编辑ID
                    window.currentEditingId = fileId;
                    
                    // 根据文件类型设置编辑器
                    var isKindEditorContent = result.language === 'HTML' || result.language === 'kindeditor' || result.Language === 'HTML' || result.Language === 'kindeditor';
                    
                    if (isKindEditorContent) {
                        // 使用 KindEditor
                        window.currentEditorType = 'kindeditor';
                        $('#languageSelect').val('kindeditor').trigger('change');
                        
                        // 使用 iframe 架构设置内容
                        setTimeout(function() {
                            if (window.setEditorContent) {
                                window.setEditorContent(result.content || result.Content || '');
                            }
                        }, 300);
                    } else {
                        // 使用 Ace 编辑器
                        var lang = result.language || result.Language;
                        window.currentEditorType = 'code';
                        $('#languageSelect').val(lang || 'ace/mode/javascript').trigger('change');
                        
                        // 使用 iframe 架构设置内容
                        setTimeout(function() {
                            if (window.setEditorContent) {
                                window.setEditorContent(result.content || result.Content || '');
                            }
                        }, 300);
                    }
                    
                    showToast('内容加载成功', 'success');
                    console.log('从服务器加载内容成功:', fileId);
                } else {
                    showToast('加载内容失败: ' + (result.message || '未知错误'), 'error');
                    console.error('从服务器加载内容失败:', result.message);
                }
            },
            error: function(xhr, status, error) {
                showToast('加载请求失败: ' + error, 'error');
                console.error('从服务器加载请求失败:', error);
                
                // 如果服务器请求失败，尝试使用本地缓存
                FileTabsManager.loadFileFromLocalCache(fileId);
            }
        });
    },
    
    // 从本地缓存加载文件（备用方案）
    loadFileFromLocalCache: function(fileId) {
        var file = this.openFiles.find(function(f) {
            return f.id === fileId;
        });
        
        if (!file) {
            console.error('文件未找到:', fileId);
            return;
        }
        
        console.log('从本地缓存加载文件:', file);
        
        // 更新表单字段
        $('#contentTitle').val(file.title);
        $('#contentSubtitle').val(file.subtitle);
        $('#authorLabel').text(file.author || '当前用户');
        $('#contentHotTags').val(file.hotTags);
        $('#contentShareTo').val(file.shareTo);
        
        // 设置当前编辑ID
        window.currentEditingId = fileId;
        
        // 根据文件类型设置编辑器
        if (file.language === 'kindeditor' || file.language === 'HTML') {
            // 使用 KindEditor
            window.currentEditorType = 'kindeditor';
            $('#languageSelect').val('kindeditor').trigger('change');
            
            // 使用 iframe 架构设置内容
            setTimeout(function() {
                if (window.setEditorContent) {
                    window.setEditorContent(file.content || '');
                }
            }, 300);
        } else {
            // 使用 Ace 编辑器
            window.currentEditorType = 'code';
            $('#languageSelect').val(file.language).trigger('change');
            
            // 使用 iframe 架构设置内容
            setTimeout(function() {
                if (window.setEditorContent) {
                    window.setEditorContent(file.content || '');
                }
            }, 300);
        }
        
        showToast('使用本地缓存数据', 'info');
    },
    
    // 关闭文件
    closeFile: function(fileId) {
        console.log('关闭文件:', fileId);
        
        // 检查是否有未保存的修改
        var file = this.openFiles.find(function(f) {
            return f.id === fileId;
        });
        
        if (file && file.isModified) {
            if (!confirm('文件有未保存的修改，确定要关闭吗？')) {
                return;
            }
        }
        
        // 从打开文件列表中移除
        this.openFiles = this.openFiles.filter(function(f) {
            return f.id !== fileId;
        });
        
        // 移除标签
        $('.file-tab[data-file-id="' + fileId + '"]').remove();
        
        // 如果关闭的是当前文件，切换到其他文件
        if (fileId === this.currentFileId) {
            if (this.openFiles.length > 0) {
                // 切换到最后一个打开的文件
                var lastFile = this.openFiles[this.openFiles.length - 1];
                this.switchToFile(lastFile.id);
            } else {
                // 没有打开的文件，清空编辑器
                this.clearEditor();
                this.currentFileId = null;
            }
        }
        
        // 更新标签栏滚动
        this.updateTabsScroll();
    },
    
    // 清空编辑器
    clearEditor: function() {
        $('#contentTitle').val('');
        $('#contentSubtitle').val('');
        $('#authorLabel').text('当前用户');
        $('#contentCategory').val('');
        $('#contentHotTags').val('');
        $('#contentShareTo').val('');
        window.currentEditingId = null;
        
        // 清空编辑器内容（使用 iframe 架构）
        if (window.setEditorContent) {
            window.setEditorContent('');
        }
    },
    
    // 更新当前文件内容
    updateCurrentFileContent: function() {
        if (!this.currentFileId) {
            return;
        }
        
        var file = this.openFiles.find(function(f) {
            return f.id === this.currentFileId;
        }.bind(this));
        
        if (!file) {
            return;
        }
        
        // 获取编辑器内容（使用 iframe 架构）
        var content = '';
        if (window.getEditorContent) {
            content = window.getEditorContent() || '';
        }
        
        // 更新文件内容
        file.content = content;
        file.isModified = true;
        
        // 更新标签显示（添加修改标记）
        this.updateTabModifiedState(file.id);
    },
    
    // 更新标签修改状态
    updateTabModifiedState: function(fileId) {
        var $tab = $('.file-tab[data-file-id="' + fileId + '"]');
        var file = this.openFiles.find(function(f) {
            return f.id === fileId;
        });
        
        if (file && file.isModified) {
            var title = file.title || '未命名';
            if (title.length > 18) {
                title = title.substring(0, 16) + '...';
            }
            $tab.find('.file-tab-content').text(title + ' *');
        }
    },
    
    // 保存当前文件
    saveCurrentFile: function() {
        if (!this.currentFileId) {
            return;
        }
        
        var file = this.openFiles.find(function(f) {
            return f.id === this.currentFileId;
        }.bind(this));
        
        if (!file) {
            return;
        }
        
        // 调用原有的保存功能
        window.saveContent();
        
        // 清除修改标记
        file.isModified = false;
        
        // 更新标签显示
        var title = file.title || '未命名';
        if (title.length > 20) {
            title = title.substring(0, 18) + '...';
        }
        $('.file-tab[data-file-id="' + file.id + '"] .file-tab-content').text(title);
    },
    
    // 更新标签栏滚动
    updateTabsScroll: function() {
        var $container = $('.file-tabs-container');
        var $tabsList = $('#fileTabsList');
        
        // 如果标签总宽度超过容器宽度，启用水平滚动
        if ($tabsList.width() > $container.width()) {
            $container.css('overflow-x', 'auto');
        } else {
            $container.css('overflow-x', 'hidden');
        }
    },
    
    // 获取当前文件
    getCurrentFile: function() {
        return this.openFiles.find(function(f) {
            return f.id === this.currentFileId;
        }.bind(this));
    },
    
    // 检查是否有未保存的修改
    hasUnsavedChanges: function() {
        return this.openFiles.some(function(file) {
            return file.isModified;
        });
    }
};

// 初始化文件标签管理器
$(document).ready(function() {
    FileTabsManager.init();
    
    // 覆盖原有的保存功能，先保存到文件标签管理器
    var originalSaveContent = window.saveContent;
    window.saveContent = function() {
        // 更新当前文件内容
        FileTabsManager.updateCurrentFileContent();
        
        // 调用原有的保存功能
        originalSaveContent.call(this);
        
        // 保存后清除修改标记
        var currentFile = FileTabsManager.getCurrentFile();
        if (currentFile) {
            currentFile.isModified = false;
            FileTabsManager.updateTabModifiedState(currentFile.id);
        }
    };
    
    // 覆盖原有的加载功能，使用文件标签管理器
    var originalLoadContent = window.loadContent;
    window.loadContent = function(contentId) {
        // 先通过AJAX获取文件数据
        $.ajax({
            type: "POST",
            url: "WebServ.asmx/LoadContent",
            data: JSON.stringify({ id: contentId }),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(response) {
                var result = response.d ? JSON.parse(response.d) : response;
                if (result.success) {
                    // 创建文件数据对象
                    var fileData = {
                        id: contentId,
                        title: result.title,
                        content: result.content,
                        language: result.language,
                        subtitle: result.subtitle || '',
                        author: result.author || '',
                        hotTags: result.hotTags || '',
                        shareTo: result.shareTo || ''
                    };
                    
                    // 使用文件标签管理器打开文件
                    FileTabsManager.openFile(fileData);
                } else {
                    showToast('加载失败：' + result.message, 'error');
                }
            },
            error: function(xhr, status, error) {
                showToast('加载请求失败：' + error, 'error');
            }
        });
    };
    
    // 监听编辑器内容变化，标记为已修改
    $(document).on('change keyup input', '#contentTitle, #contentSubtitle, #contentAuthor, #contentHotTags, #contentShareTo', function() {
        var currentFile = FileTabsManager.getCurrentFile();
        if (currentFile) {
            currentFile.isModified = true;
            FileTabsManager.updateTabModifiedState(currentFile.id);
        }
    });
    
    // 监听编辑器内容变化
    var checkEditorChanges = function() {
        var currentFile = FileTabsManager.getCurrentFile();
        if (currentFile) {
            currentFile.isModified = true;
            FileTabsManager.updateTabModifiedState(currentFile.id);
        }
    };
    
    // Ace 编辑器内容变化
    if (window.editor) {
        window.editor.on('change', checkEditorChanges);
    }
    
    // KindEditor 内容变化
    if (window.kindEditor) {
        // KindEditor 的内容变化监听需要特殊处理
        setTimeout(function() {
            if (window.kindEditor && window.kindEditor.edit) {
                window.kindEditor.edit.doc.body.addEventListener('input', checkEditorChanges);
            }
        }, 1000);
    }
});
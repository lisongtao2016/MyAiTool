// EditorContentManager.js - 处理编辑器内容的保存和加载 (适配 iframe 架构)

// 全局变量
var currentEditingId = null; // 当前正在编辑的内容 ID，null 表示新建模式
var allContents = []; // 存储所有内容用于搜索
var currentEditorType = 'kindeditor'; // 当前编辑器类型

$(document).ready(function() {
    console.log('EditorContentManager: 初始化开始 (iframe 架构)');
    
    // 检查用户是否已登录
    checkUserLogin();
    
    // 从主页面获取当前编辑器类型
    currentEditorType = window.currentEditorType || 'kindeditor';
    console.log('EditorContentManager: 当前编辑器类型:', currentEditorType);
    
    // 监听编辑器类型切换（从 languageSelect 获取）
    $(document).on('change', '#languageSelect', function() {
        currentEditorType = $(this).val();
        console.log('EditorContentManager: 编辑器类型切换为', currentEditorType);
    });
    
    // 初始化按钮事件
    $('#btnSave').click(saveContent);
    $('#btnNew').click(newDocument);
    // 注意：btnLoadList 使用 onclick="refreshContentList()" 直接调用，不需要 jQuery 绑定
    
    // 侧边栏切换
    $('#btnToggleSidebar').click(toggleSidebar);
    
    // 分享功能已移至 share_utils.js，会自动初始化
    
    // 搜索功能 - 每次输入时都从数据库重新获取
    var searchTimeout;
    $('#searchBox').on('input', function() {
        var searchText = $(this).val().trim();
        
        // 清除之前的定时器（防抖）
        clearTimeout(searchTimeout);
        
        // 延迟 500ms 执行搜索，避免频繁请求
        searchTimeout = setTimeout(function() {
            searchContentFromServer(searchText);
        }, 500);
    });
    
    // 初始加载内容列表
    loadContentList();
    
    // 设置当前用户信息
    setupCurrentUser();
    
    console.log('EditorContentManager: 初始化完成');
});

// 侧边栏切换函数
function toggleSidebar() {
    var $sidebar = $('.sidebar');
    var $mainContent = $('.main-content');
    var $toggleIcon = $('.toggle-icon');
    
    if ($sidebar.hasClass('collapsed')) {
        // 展开
        $sidebar.removeClass('collapsed');
        $toggleIcon.text('◀');
        $mainContent.css('width', 'calc(100% - 280px)');
    } else {
        // 收缩
        $sidebar.addClass('collapsed');
        $toggleIcon.text('▶');
        $mainContent.css('width', 'calc(100% - 50px)');
    }
}

// 新建文档
function newDocument() {
    console.log('=== 新建文档 ===');
    
    // 检查是否有未保存的修改
    if (currentEditingId) {
        // 检查表单是否有内容
        var title = $('#contentTitle').val().trim();
        var content = window.getEditorContent ? window.getEditorContent() : '';
        
        if (title || content) {
            if (!confirm('当前文档有未保存的修改，确定要新建文档吗？')) {
                return;
            }
        }
    }
    
    // 清空表单
    clearForm();
    
    // 显示提示
    showToast('已创建新文档', 'success');
    
    // 聚焦到标题输入框
    $('#contentTitle').focus();
}

// 保存内容到数据库 (适配 iframe 架构)
function saveContent() {
    console.log('=== 开始保存内容 (iframe 架构) ===');
    console.log('当前编辑器类型:', currentEditorType);
    
    var title = $('#contentTitle').val().trim();
    var subtitle = $('#contentSubtitle').val().trim();
    var author = $('#authorLabel').text().trim();
    var category = $('#contentCategory').val().trim();
    var hotTags = $('#contentHotTags').val().trim();
    var shareTo = $('#contentShareTo').val().trim();
    var projectId = window.getCurrentProjectId ? window.getCurrentProjectId() : null;
    
    console.log('保存数据 - 标题:', title, '分类:', category, '保存者:', author, '项目ID:', projectId);
    
    // 检查必填字段
    if (!title) {
        showToast('标题不能为空', 'info');
        $('#contentTitle').focus();
        return;
    }
    
    // 根据编辑器类型获取内容
    var content;
    var plainText = ''; // 纯文本内容
    var language;
    
    // 使用新的 iframe 架构 API 获取内容
    content = window.getEditorContent ? window.getEditorContent() : '';
    
    console.log('获取到的编辑器内容长度:', content ? content.length : 0);
    console.log('编辑器内容预览:', content ? content.substring(0, 100) + '...' : '空');
    
    if (currentEditorType === 'kindeditor') {
        console.log('使用 KindEditor 保存模式');
        language = 'HTML'; // KindEditor 固定为 HTML
        
        // 对于 KindEditor，内容已经是 HTML
        plainText = extractPlainTextFromHTML(content);
        
        console.log('KindEditor HTML 内容长度:', content ? content.length : 0);
        console.log('KindEditor 纯文本内容:', plainText ? plainText.substring(0, 100) + '...' : '空');
        
        // 检查 KindEditor 内容是否为空
        if (!content || content.trim() === '') {
            showToast('编辑器内容为空', 'info');
            return;
        }
    } else {
        // 使用 Ace 编辑器
        language = $('#languageSelect').val();
        
        if (!content) {
            showToast('编辑器内容为空', 'info');
            return;
        }
        
        if (!language || language === 'kindeditor') {
            showToast('请选择编程语言', 'info');
            return;
        }
        
        // Ace 编辑器内容本身就是纯文本
        plainText = content;
        
        console.log('ACE 编辑器内容长度:', content ? content.length : 0);
        console.log('ACE 语言模式:', language);
    }
    
    // 显示保存中状态
    var saveButton = $('#btnSave');
    var originalText = saveButton.text();
    saveButton.text('保存中...').prop('disabled', true);
    
        // 调用 WebMethod 保存内容
    $.ajax({
        type: "POST",
        url: "WebServ.asmx/SaveContent",
        data: JSON.stringify({
            title: title,
            content: content,
            language: language,
            subtitle: subtitle,
            author: author,
            category: category,
            hotTags: hotTags,
            shareTo: shareTo,
            plainText: plainText,
            id: currentEditingId, // 传递 ID，null 表示新建，有值表示更新
            projectId: projectId  // 添加项目ID
        }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(response) {
            var result = response.d ? JSON.parse(response.d) : response;
            if (result.success) {
                if (currentEditingId) {
                    showToast('内容更新成功！', 'success');
                    console.log('内容更新成功，ID:', currentEditingId);
                } else {
                    showToast('内容保存成功！', 'success');
                    console.log('内容保存成功');
                    
                    // 如果是新建模式，保存后设置为编辑模式
                    if (result.id) {
                        currentEditingId = result.id;
                        console.log('新内容 ID:', currentEditingId);
                    }
                }
                
                // 重新加载列表，保持当前筛选状态
                var searchText = $('#searchBox').val().trim();
                if (searchText) {
                    // 如果有搜索条件，重新搜索
                    searchContentFromServer(searchText);
                } else {
                    // 没有搜索条件，加载所有内容
                    loadContentList();
                }
            } else {
                showToast('保存失败: ' + result.message, 'error');
                console.error('保存失败:', result.message);
            }
            
            // 恢复按钮状态
            saveButton.text(originalText).prop('disabled', false);
        },
        error: function(xhr, status, error) {
            showToast('保存请求失败: ' + error, 'error');
            console.error('保存请求失败:', error);
            
            // 恢复按钮状态
            saveButton.text(originalText).prop('disabled', false);
        }
    });
}

// 从 HTML 中提取纯文本
function extractPlainTextFromHTML(html) {
    if (!html) return '';
    
    try {
        // 创建临时元素
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // 获取纯文本
        var plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        // 清理多余空格和换行
        plainText = plainText.replace(/\s+/g, ' ').trim();
        
        return plainText;
    } catch (e) {
        console.warn('提取纯文本失败:', e);
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
}

// 加载内容列表
function loadContentList() {
    console.log('加载内容列表...');
    
    // 显示加载状态
    var loadButton = $('#btnLoadList');
    var originalText = loadButton.text();
    loadButton.text('加载中...').prop('disabled', true);
    
        $.ajax({
        type: "POST",
        url: "WebServ.asmx/GetAllContents",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(response) {
            console.log('服务器返回原始数据:', response);
            
            // 安全解析JSON，防止解析错误导致按钮状态无法恢复
            var result;
            try {
                result = response.d ? JSON.parse(response.d) : response;
                console.log('处理后结果:', result);
            } catch (e) {
                console.error('JSON解析错误:', e, '原始response.d:', response.d);
                showToast('数据解析失败', 'error');
                
                // 恢复按钮状态
                loadButton.text(originalText).prop('disabled', false);
                return;
            }
            
            if (result && result.success) {
                allContents = result.contents || [];
                console.log('加载到的内容数组:', allContents);
                if (allContents.length > 0) {
                    console.log('第一条内容数据:', allContents[0]);
                    console.log('第一条内容字段:', Object.keys(allContents[0]));
                }
                displayContentList(allContents);
                console.log('成功加载', allContents.length, '条内容');
            } else {
                showToast('加载列表失败: ' + (result ? result.message : '未知错误'), 'error');
                console.error('加载列表失败:', result ? result.message : '未知错误');
            }
            
            // 恢复按钮状态
            loadButton.text(originalText).prop('disabled', false);
        },
        error: function(xhr, status, error) {
            showToast('加载请求失败: ' + error, 'error');
            console.error('加载请求失败:', error);
            
            // 恢复按钮状态
            loadButton.text(originalText).prop('disabled', false);
        }
    });
}

// 从服务器搜索内容
function searchContentFromServer(searchText) {
    console.log('搜索内容:', searchText);
    
    $.ajax({
        type: "POST",
        url: "WebServ.asmx/SearchContents",
        data: JSON.stringify({ searchText: searchText }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(response) {
            var result = response.d ? JSON.parse(response.d) : response;
            if (result.success) {
                allContents = result.contents || [];
                displayContentList(allContents);
                console.log('搜索到', allContents.length, '条结果');
            } else {
                console.error('搜索失败:', result.message);
            }
        },
        error: function(xhr, status, error) {
            console.error('搜索请求失败:', error);
        }
    });
}

// 显示内容列表 (使用新的 div 布局)
function displayContentList(contents) {
    var $contentList = $('#contentList');
    $contentList.empty();
    
    if (!contents || contents.length === 0) {
        var noContentMsg = '<div class="no-content-message">📭 没有找到任何内容<br>点击"保存"按钮创建新内容</div>';
        $contentList.html(noContentMsg);
        return;
    }
    
    // 创建容器
    var $container = $('<div class="content-list-container"></div>');
    
    // 添加每个内容项
    for (var i = 0; i < contents.length; i++) {
        var content = contents[i];
        var $item = createContentListItem(content);
        $container.append($item);
    }
    
    $contentList.append($container);
    
    // 初始化jQuery UI工具提示
    initJQueryUITooltips();
}

// 创建内容列表项
function createContentListItem(content) {
    console.log('创建列表项，内容对象:', content);
    console.log('可用字段:', Object.keys(content));
    
    var $item = $('<div class="content-list-item"></div>');
    
    // 内容区域
    var $contentArea = $('<div class="content-area"></div>');
    
    // 添加工具提示类，以便jQuery UI可以识别
    $item.addClass('has-tooltip');
    
    // 使用小写字段名，因为服务器返回的是小写JSON字段
    // 注意：空字符串("")也是真值，需要特别处理
    var rawTitle = content.title || content.Title;
    var title = (rawTitle !== undefined && rawTitle !== null && rawTitle !== '') ? rawTitle : '无标题';
    
    var rawSubtitle = content.subtitle || content.Subtitle;
    var subtitle = (rawSubtitle !== undefined && rawSubtitle !== null && rawSubtitle !== '') ? rawSubtitle : null;
    
    var rawAuthor = content.author || content.Author;
    var author = (rawAuthor !== undefined && rawAuthor !== null && rawAuthor !== '') ? rawAuthor : '匿名';
    
    var rawLanguage = content.language || content.Language;
    var language = (rawLanguage !== undefined && rawLanguage !== null && rawLanguage !== '') ? rawLanguage : '未知';
    
    var rawCreatedDate = content.createdDate || content.CreatedDate || content.UpdatedDate;
    var createdDate = (rawCreatedDate !== undefined && rawCreatedDate !== null && rawCreatedDate !== '') ? rawCreatedDate : null;
    
    console.log('提取的字段 - 原始标题:', rawTitle, '标题:', title, '副标题:', subtitle, '作者:', author, '语言:', language, '日期:', createdDate);
    
    // 问题1修复：标题文字截断显示，完整内容显示在工具提示中
    var displayTitle = title;
    if (displayTitle.length > 30) {
        displayTitle = displayTitle.substring(0, 28) + '...';
    }
    
    // 只显示截断后的标题
    var titleHtml = '<div class="content-title" title="点击编辑">' + escapeHtml(displayTitle) + '</div>';
    $contentArea.html(titleHtml);
    
    // 为内容项创建工具提示数据 - 使用与CSS匹配的类名
    var tooltipContent = '<div class="tooltip-content">';
    tooltipContent += '<div class="tooltip-header">' + escapeHtml(title) + '</div>';
    tooltipContent += '<div class="tooltip-grid">';
    
    tooltipContent += '<div class="tooltip-row">';
    tooltipContent += '<div class="tooltip-label">👤 作者:</div>';
    tooltipContent += '<div class="tooltip-value">' + escapeHtml(author) + '</div>';
    tooltipContent += '</div>';
    
    tooltipContent += '<div class="tooltip-row">';
    tooltipContent += '<div class="tooltip-label">📅 日期:</div>';
    tooltipContent += '<div class="tooltip-value">' + formatDate(createdDate) + '</div>';
    tooltipContent += '</div>';
    
    tooltipContent += '<div class="tooltip-row">';
    tooltipContent += '<div class="tooltip-label">💻 语言:</div>';
    tooltipContent += '<div class="tooltip-value">' + escapeHtml(language) + '</div>';
    tooltipContent += '</div>';
    
    if (subtitle) {
        tooltipContent += '<div class="tooltip-row">';
        tooltipContent += '<div class="tooltip-label">📝 副标题:</div>';
        tooltipContent += '<div class="tooltip-value">' + escapeHtml(subtitle) + '</div>';
        tooltipContent += '</div>';
    }
    
    tooltipContent += '</div></div>';
    
    // 存储工具提示内容作为data属性
    $item.attr('data-tooltip-content', tooltipContent);
    
    // 操作区域
    var $actionArea = $('<div class="action-area"></div>');
    
    // 使用 id 字段（大小写不敏感）
    var contentId = content.id || content.Id;
    
    // 问题2修复：移除编辑图标按钮
    // 问题3修复：删除图标放到最前边
    var $deleteBtn = $('<button class="delete-icon-btn" title="删除">🗑️</button>');
    $deleteBtn.click(function(e) {
        e.stopPropagation(); // 防止触发整行点击事件
        deleteContent(contentId, title);
    });
    
    $actionArea.append($deleteBtn);
    
    // 组装 - 将操作区域放在最前边
    $item.append($actionArea).append($contentArea);
    
    // 点击整行可以编辑
    $item.click(function(e) {
        // 防止点击删除按钮时触发
        if (!$(e.target).closest('.delete-icon-btn').length) {
            editContent(contentId);
        }
    });
    
    return $item;
}

// 编辑内容
function editContent(contentId) {
    console.log('编辑内容 ID:', contentId);
    
    // 显示加载中
    showToast('加载内容中...', 'info');
    
    $.ajax({
        type: "POST",
        url: "WebServ.asmx/LoadContent",
        data: JSON.stringify({ id: contentId }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(response) {
            var result = response.d ? JSON.parse(response.d) : response;
            if (result.success) {
                // 服务器返回的是 title, subtitle, content, language, author 等字段
                // 注意：服务器返回的字段名是驼峰式，不是大写开头
                
                // 填充表单
                $('#contentTitle').val(result.title || result.Title || '');
                $('#contentSubtitle').val(result.subtitle || result.Subtitle || '');
                $('#authorLabel').text(result.author || result.Author || '当前用户');
                $('#contentCategory').val(result.category || result.Category || '');
                $('#contentHotTags').val(result.hotTags || result.HotTags || '');
                $('#contentShareTo').val(result.shareTo || result.ShareTo || '');
                
                // 设置当前编辑 ID
                currentEditingId = contentId;
                
                // 创建文件数据用于标签管理器
                var fileData = {
                    id: contentId,
                    title: result.title || result.Title || '无标题',
                    subtitle: result.subtitle || result.Subtitle || '',
                    author: result.author || result.Author || '匿名',
                    language: result.language || result.Language || '未知'
                };
                
                // 打开文件标签
                if (typeof FileTabsManager !== 'undefined') {
                    try {
                        FileTabsManager.openFile(fileData);
                        console.log('已添加到文件标签管理器:', fileData);
                    } catch (e) {
                        console.warn('添加文件标签失败:', e);
                    }
                }
                
                // 根据语言类型切换编辑器
                var isKindEditorContent = result.language === 'HTML' || result.language === 'kindeditor' || result.Language === 'HTML' || result.Language === 'kindeditor';
                
                if (isKindEditorContent) {
                    // 首先切换到 KindEditor
                    $('#languageSelect').val('kindeditor').trigger('change');
                    
                    // 等待编辑器切换完成后再设置内容
                    setTimeout(function() {
                        if (window.setEditorContent) {
                            window.setEditorContent(result.content || result.Content || '');
                        }
                    }, 300);
                } else {
                    // 切换到对应的语言模式
                    var lang = result.language || result.Language;
                    if (lang) {
                        $('#languageSelect').val(lang).trigger('change');
                        
                        // 等待编辑器切换完成后再设置内容
                        setTimeout(function() {
                            if (window.setEditorContent) {
                                window.setEditorContent(result.content || result.Content || '');
                            }
                        }, 300);
                    } else {
                        // 如果语言未指定，直接设置内容
                        if (window.setEditorContent) {
                            window.setEditorContent(result.content || result.Content || '');
                        }
                    }
                }
                
                showToast('内容加载成功', 'success');
                console.log('内容加载成功:', contentId);
                console.log('加载的内容:', result);
            } else {
                showToast('加载内容失败: ' + (result.message || '未知错误'), 'error');
                console.error('加载内容失败:', result.message);
            }
        },
        error: function(xhr, status, error) {
            showToast('加载请求失败: ' + error, 'error');
            console.error('加载请求失败:', error);
        }
    });
}

// 删除内容
function deleteContent(contentId, contentTitle) {
    if (!confirm('确定要删除 "' + (contentTitle || '该内容') + '" 吗？')) {
        return;
    }
    
    console.log('删除内容 ID:', contentId);
    
    $.ajax({
        type: "POST",
        url: "WebServ.asmx/DeleteContent",
        data: JSON.stringify({ id: contentId }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(response) {
            var result = response.d ? JSON.parse(response.d) : response;
            if (result.success) {
                showToast('内容删除成功！', 'success');
                console.log('内容删除成功:', contentId);
                
                // 如果删除的是当前正在编辑的内容，清空表单
                if (currentEditingId === contentId) {
                    clearForm();
                    currentEditingId = null;
                }
                
                // 重新加载列表
                loadContentList();
            } else {
                showToast('删除失败: ' + result.message, 'error');
                console.error('删除失败:', result.message);
            }
        },
        error: function(xhr, status, error) {
            showToast('删除请求失败: ' + error, 'error');
            console.error('删除请求失败:', error);
        }
    });
}

// 清空表单
function clearForm() {
    $('#contentTitle').val('');
    $('#contentSubtitle').val('');
    $('#authorLabel').text('当前用户');
    $('#contentCategory').val('');
    $('#contentHotTags').val('');
    $('#contentShareTo').val('');
    
    // 清空编辑器内容
    if (window.setEditorContent) {
        window.setEditorContent('');
    }
    
    currentEditingId = null;
    
    // 切换到默认编辑器 (KindEditor)
    $('#languageSelect').val('kindeditor').trigger('change');
    
    console.log('表单已清空');
}

// 辅助函数：转义 HTML
function escapeHtml(text) {
    if (text === undefined || text === null || text === '') return '';
    // 创建映射表 - 正确的 HTML 实体
    var escapeMap = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, function(match) { 
        return escapeMap[match] || match; 
    });
}

// 辅助函数：格式化日期
function formatDate(dateString) {
    if (!dateString) return '未知';
    
    try {
        var date = new Date(dateString);
        if (isNaN(date.getTime())) return '无效日期';
        
        var now = new Date();
        var diffMs = now - date;
        var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            // 今天
            return '今天 ' + date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
        } else if (diffDays === 1) {
            return '昨天';
        } else if (diffDays < 7) {
            return diffDays + '天前';
        } else {
            return date.getFullYear() + '-' + 
                   (date.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                   date.getDate().toString().padStart(2, '0');
        }
    } catch (e) {
        console.warn('日期格式化失败:', e);
        return dateString;
    }
}

// 初始化jQuery UI工具提示
function initJQueryUITooltips() {
    // 安全地移除现有的工具提示（防止重复绑定）
    $('.has-tooltip').each(function() {
        var $element = $(this);
        // 检查是否已经初始化了tooltip
        if ($element.data('ui-tooltip')) {
            $element.tooltip('destroy');
        }
    });
    
    // 初始化新的工具提示
    $('.has-tooltip').tooltip({
        content: function() {
            // 从data属性获取工具提示内容
            var tooltipContent = $(this).attr('data-tooltip-content');
            return tooltipContent || '无详细信息';
        },
        position: {
            my: 'left+30 center',
            at: 'right center',
            collision: 'flipfit'
        },
        show: { effect: 'fadeIn', duration: 200 },
        hide: { effect: 'fadeOut', duration: 200 },
        tooltipClass: 'content-tooltip',
        track: true,
        open: function(event, ui) {
            // 确保工具提示显示在最上层
            $(ui.tooltip).css('z-index', '10000');
        }
    });
    
    console.log('jQuery UI工具提示初始化完成');
}

// Toast 通知组件 - 自动消失的提示框
function showToast(message, type) {
    // 移除旧的 toast（如果有）
    $('.toast-notification').remove();
    
    // 创建 toast 元素
    var bgColor = type === 'error' ? '#ff6b6b' : (type === 'success' ? '#4ecdc4' : '#ff9a9e');
    var icon = type === 'error' ? '❌' : (type === 'success' ? '✅' : 'ℹ️');
    
    var $toast = $('<div class="toast-notification">' + icon + ' ' + message + '</div>');
    $toast.css({
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: bgColor,
        color: '#fff',
        padding: '15px 25px',
        borderRadius: '10px',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
        zIndex: '9999',
        fontFamily: '"Comic Sans MS", "YouYuan", serif',
        fontSize: '14px',
        fontWeight: 'bold',
        animation: 'toastSlideIn 0.3s ease',
        cursor: 'pointer'
    });
    
    $('body').append($toast);
    
    // 3 秒后自动消失
    setTimeout(function() {
        $toast.css('animation', 'toastFadeOut 0.3s ease');
        setTimeout(function() {
            $toast.remove();
        }, 300);
    }, 3000);
    
    // 点击立即消失
    $toast.on('click', function() {
        $(this).remove();
    });
    
    // 添加 CSS 动画
    if (!$('#toast-animations').length) {
        var toastAnimations = `
            <style id="toast-animations">
                @keyframes toastSlideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes toastFadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            </style>
        `;
        $('head').append(toastAnimations);
    }
}

// 检查用户登录状态
function checkUserLogin() {
    var userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
        // 用户未登录，跳转到登录页面
        showToast('请先登录', 'info');
        setTimeout(function() {
            window.location.href = 'login.html';
        }, 1500);
        return false;
    }
    
    return true;
}

// 设置当前用户信息
function setupCurrentUser() {
    var userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
        try {
            var user = JSON.parse(userInfo);
            
            // 在页面显示用户信息
            var $userInfo = $('<div class="user-info" style="position: absolute; top: 10px; right: 10px; display: flex; align-items: center; gap: 8px;"></div>');
            var $userName = $('<span style="font-size: 12px; color: #495057;">👤 ' + escapeHtml(user.displayName || user.username) + '</span>');
            var $logoutBtn = $('<button style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 3px; padding: 4px 8px; font-size: 12px; cursor: pointer;">退出</button>');
            
            $logoutBtn.click(function() {
                localStorage.removeItem('userInfo');
                showToast('已退出登录', 'success');
                setTimeout(function() {
                    window.location.href = 'login.html';
                }, 1000);
            });
            
            $userInfo.append($userName).append($logoutBtn);
            $('body').append($userInfo);
            
            // 设置默认作者为当前用户
            var currentAuthor = $('#authorLabel').text();
            if ((!currentAuthor || currentAuthor === '当前用户') && user.displayName) {
                $('#authorLabel').text(user.displayName);
            }
            
            console.log('当前用户:', user);
        } catch (e) {
            console.warn('解析用户信息失败:', e);
        }
    }
}

// 获取当前用户信息
function getCurrentUser() {
    var userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
        try {
            return JSON.parse(userInfo);
        } catch (e) {
            console.warn('解析用户信息失败:', e);
        }
    }
}

// 暴露全局函数，供 WebForm1.aspx 调用
window.loadContentList = loadContentList;
window.refreshContentList = loadContentList; // 别名
window.displayContentList = displayContentList;

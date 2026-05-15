// 全局编辑器变量（在 document.ready 之前定义）
window.currentEditorType = 'kindeditor'; // 当前编辑器类型
window.editorContent = ''; // 当前编辑器内容缓存
window.kindEditorIframeReady = false; // KindEditor iframe 就绪状态
window.aceEditorIframeReady = false; // ACE iframe 就绪状态
window.languageModes = []; // 语言模式列表

$(document).ready(function () {
    // 移除旧的编辑器初始化代码
    
    // 获取语言模式列表
    var modelist = ace.require("ace/ext/modelist");
    var modes = modelist.modes;

    // 按显示名称排序语言模式
    modes.sort(function (a, b) {
        return a.caption.localeCompare(b.caption);
    });
    
    // 保存语言模式列表
    window.languageModes = modes;

    // 创建自定义下拉框
    var $languageSelect = $("#languageSelect");
    
    // 清空并填充 select 元素
    $languageSelect.empty();
    
    // 先添加 KindEditor 选项
    $languageSelect.append($('<option value="kindeditor">📝 KindEditor 富文本</option>'));
    
    // 添加分隔线
    $languageSelect.append($('<option value="" disabled>──────────────</option>'));
    
    // 填充语言数据
    for (var i = 0; i < modes.length; i++) {
        var mode = modes[i];
        $languageSelect.append($('<option></option>')
            .val(mode.mode)
            .text(mode.caption));
    }
    
    console.log('语言选择器初始化完成，共有', modes.length + 1, '个选项（包括 KindEditor）');
    
    // 默认设置为 KindEditor（在绑定事件之前设置）
    $languageSelect.val('kindeditor');
    window.currentEditorType = 'kindeditor';
    console.log('默认设置为：KindEditor 富文本');
    
    // 绑定 change 事件（在设置默认值之后）
    $languageSelect.on('change', function() {
        console.log('Language select change triggered', this.value);
        
        var selectedMode = this.value;
        
        // 如果选择的是 KindEditor
        if (selectedMode === 'kindeditor') {
            console.log('切换到 KindEditor');
            window.currentEditorType = 'kindeditor';
            
            // 切换 iframe 显示
            switchToKindEditor();
            
            // 同步内容到 KindEditor
            syncContentToKindEditor();
        } else {
            // 切换到 Ace 编辑器
            console.log('切换到 Ace 编辑器，模式:', selectedMode);
            window.currentEditorType = 'code';
            
            // 切换 iframe 显示
            switchToAceEditor();
            
            // 设置 ACE 编辑器语言模式
            setAceLanguageMode(selectedMode);
            
            // 同步内容到 ACE 编辑器
            syncContentToAceEditor();
        }
    });

    // 监听 iframe 消息
    setupMessageHandlers();
    
    // 添加 Ctrl+S 快捷键保存功能
    document.addEventListener('keydown', function(e) {
        // Ctrl+S 或 Cmd+S (Mac)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            console.log('Ctrl+S 被按下，触发保存');
            $('#btnSave').click();
        }
    });
    
    // 初始化编辑器内容
    initializeEditorContent();
    
    // 初始化文件标签管理器
    if (typeof FileTabsManager !== 'undefined') {
        FileTabsManager.init();
        console.log('文件标签管理器初始化完成');
    } else {
        console.warn('文件标签管理器未加载');
    }
});

// 设置消息处理器
function setupMessageHandlers() {
    window.addEventListener('message', function(event) {
        var data = event.data;
        
        if (!data || !data.type) return;
        
        console.log('主页面收到消息:', data.type, '来源:', data.source);
        
        switch (data.type) {
            case 'iframe_loaded':
                if (data.source === 'kindeditor_iframe') {
                    console.log('KindEditor iframe 加载完成');
                } else if (data.source === 'ace_editor_iframe') {
                    console.log('ACE iframe 加载完成');
                }
                break;
                
            case 'kindeditor_ready':
                console.log('KindEditor iframe 已就绪');
                window.kindEditorIframeReady = true;
                break;
                
            case 'ace_editor_ready':
                console.log('ACE iframe 已就绪');
                window.aceEditorIframeReady = true;
                break;
                
            case 'kindeditor_content_changed':
                console.log('KindEditor 内容变化');
                window.editorContent = data.content;
                break;
                
            case 'ace_content_changed':
                console.log('ACE 内容变化');
                window.editorContent = data.content;
                break;
                
            case 'kindeditor_content_response':
                console.log('收到 KindEditor 内容响应');
                window.editorContent = data.content;
                break;
                
            case 'ace_content_response':
                console.log('收到 ACE 内容响应');
                window.editorContent = data.content;
                break;
        }
    });
}

// 切换到 KindEditor
function switchToKindEditor() {
    var $aceIframe = $('#aceEditorIframe');
    var $kindIframe = $('#kindEditorIframe');
    
    $aceIframe.hide();
    $kindIframe.show();
    
    // 通知 ACE iframe 隐藏编辑器
    if ($aceIframe[0] && $aceIframe[0].contentWindow) {
        try {
            $aceIframe[0].contentWindow.postMessage({
                type: 'hide_editor'
            }, '*');
        } catch (e) {
            console.warn('通知 ACE iframe 隐藏失败:', e);
        }
    }
    
    // 通知 KindEditor iframe 显示编辑器
    if ($kindIframe[0] && $kindIframe[0].contentWindow) {
        try {
            $kindIframe[0].contentWindow.postMessage({
                type: 'show_editor'
            }, '*');
        } catch (e) {
            console.warn('通知 KindEditor iframe 显示失败:', e);
        }
    }
    
    console.log('已切换到 KindEditor');
}

// 切换到 ACE 编辑器
function switchToAceEditor() {
    var $aceIframe = $('#aceEditorIframe');
    var $kindIframe = $('#kindEditorIframe');
    
    $kindIframe.hide();
    $aceIframe.show();
    
    // 通知 KindEditor iframe 隐藏编辑器
    if ($kindIframe[0] && $kindIframe[0].contentWindow) {
        try {
            $kindIframe[0].contentWindow.postMessage({
                type: 'hide_editor'
            }, '*');
        } catch (e) {
            console.warn('通知 KindEditor iframe 隐藏失败:', e);
        }
    }
    
    // 通知 ACE iframe 显示编辑器
    if ($aceIframe[0] && $aceIframe[0].contentWindow) {
        try {
            $aceIframe[0].contentWindow.postMessage({
                type: 'show_editor'
            }, '*');
        } catch (e) {
            console.warn('通知 ACE iframe 显示失败:', e);
        }
    }
    
    console.log('已切换到 ACE 编辑器');
}

// 设置 ACE 编辑器语言模式
function setAceLanguageMode(mode) {
    var $aceIframe = $('#aceEditorIframe');
    
    if ($aceIframe[0] && $aceIframe[0].contentWindow) {
        try {
            $aceIframe[0].contentWindow.postMessage({
                type: 'set_language_mode',
                mode: mode
            }, '*');
            console.log('已设置 ACE 语言模式:', mode);
        } catch (e) {
            console.warn('设置 ACE 语言模式失败:', e);
        }
    }
}

// 同步内容到 KindEditor
function syncContentToKindEditor() {
    var $aceIframe = $('#aceEditorIframe');
    var $kindIframe = $('#kindEditorIframe');
    
    // 先从 ACE 获取当前内容
    if ($aceIframe[0] && $aceIframe[0].contentWindow) {
        try {
            $aceIframe[0].contentWindow.postMessage({
                type: 'get_content'
            }, '*');
            
            // 监听内容响应
            setTimeout(function() {
                if ($kindIframe[0] && $kindIframe[0].contentWindow) {
                    try {
                        $kindIframe[0].contentWindow.postMessage({
                            type: 'sync_to_kindeditor',
                            content: window.editorContent
                        }, '*');
                        console.log('已同步内容到 KindEditor');
                    } catch (e) {
                        console.warn('同步内容到 KindEditor 失败:', e);
                    }
                }
            }, 100);
        } catch (e) {
            console.warn('从 ACE 获取内容失败:', e);
        }
    }
}

// 同步内容到 ACE 编辑器
function syncContentToAceEditor() {
    var $aceIframe = $('#aceEditorIframe');
    var $kindIframe = $('#kindEditorIframe');
    
    // 先从 KindEditor 获取当前内容
    if ($kindIframe[0] && $kindIframe[0].contentWindow) {
        try {
            $kindIframe[0].contentWindow.postMessage({
                type: 'get_content'
            }, '*');
            
            // 监听内容响应
            setTimeout(function() {
                if ($aceIframe[0] && $aceIframe[0].contentWindow) {
                    try {
                        $aceIframe[0].contentWindow.postMessage({
                            type: 'sync_to_ace',
                            content: window.editorContent
                        }, '*');
                        console.log('已同步内容到 ACE 编辑器');
                    } catch (e) {
                        console.warn('同步内容到 ACE 编辑器失败:', e);
                    }
                }
            }, 100);
        } catch (e) {
            console.warn('从 KindEditor 获取内容失败:', e);
        }
    }
}

// 初始化编辑器内容
function initializeEditorContent() {
    // 可以在这里设置初始内容
    window.editorContent = '';
    
    // 通知 KindEditor iframe 设置初始内容
    var $kindIframe = $('#kindEditorIframe');
    if ($kindIframe[0] && $kindIframe[0].contentWindow) {
        setTimeout(function() {
            try {
                $kindIframe[0].contentWindow.postMessage({
                    type: 'set_content',
                    content: window.editorContent
                }, '*');
                console.log('已设置 KindEditor 初始内容');
            } catch (e) {
                console.warn('设置 KindEditor 初始内容失败:', e);
            }
        }, 500);
    }
}

// 暴露编辑器实例函数供其他模块使用
window.getEditorInstance = function() {
    var result = {
        type: window.currentEditorType,
        content: window.editorContent,
        getContent: function() {
            return window.editorContent;
        }
    };
    return result;
};

// 获取当前编辑器内容
window.getEditorContent = function() {
    return window.editorContent;
};

// 设置编辑器内容
window.setEditorContent = function(content) {
    window.editorContent = content || '';
    
    var $aceIframe = $('#aceEditorIframe');
    var $kindIframe = $('#kindEditorIframe');
    
    if (window.currentEditorType === 'kindeditor') {
        // 设置到 KindEditor
        if ($kindIframe[0] && $kindIframe[0].contentWindow) {
            try {
                $kindIframe[0].contentWindow.postMessage({
                    type: 'set_content',
                    content: content
                }, '*');
            } catch (e) {
                console.warn('设置 KindEditor 内容失败:', e);
            }
        }
    } else {
        // 设置到 ACE
        if ($aceIframe[0] && $aceIframe[0].contentWindow) {
            try {
                $aceIframe[0].contentWindow.postMessage({
                    type: 'set_content',
                    content: content
                }, '*');
            } catch (e) {
                console.warn('设置 ACE 内容失败:', e);
            }
        }
    }
    
    console.log('编辑器内容已设置:', content ? content.substring(0, 50) + '...' : '空内容');
};
<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="WebForm1.aspx.cs" Inherits="IlikesWebEditor.WebForm1" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>ACE Editor with Language Selector</title>


    <!--ACE 导入 js 库-->
    <script src="js/JsAce/ace.js" type="text/javascript" charset="utf-8" defer></script>
    <script src="js/JsAce/ext-language_tools.js" type="text/javascript" charset="utf-8" defer></script>
    <script src="js/JsAce/ext-modelist.js" type="text/javascript" charset="utf-8" defer></script>
    <script src="js/jquery-4.0.0.min.js" type="text/javascript" charset="utf-8" defer></script>
    <!-- jQuery UI -->
    <link rel="stylesheet" href="js/jquery-ui-1.14.2.custom/jquery-ui.min.css" type="text/css" />
    <script src="js/jquery-ui-1.14.2.custom/jquery-ui.min.js" type="text/javascript" charset="utf-8" defer></script>
    
    <!-- KindEditor -->
    <link rel="stylesheet" href="js/kindeditor-master/themes/default/default.css" />
    <script charset="utf-8" src="js/kindeditor-master/kindeditor-all.js" defer></script>
    <script charset="utf-8" src="js/kindeditor-master/lang/zh-CN.js" defer></script>
    
    <script src="./EditorPage.js" type="text/javascript" charset="utf-8" defer></script>
    <script src="./EditorPageExtLanguage.js" type="text/javascript" charset="utf-8" defer></script>
    <script src="./EditorContentManager.js" type="text/javascript" charset="utf-8" defer></script>
    <script src="./file_tabs_manager.js" type="text/javascript" charset="utf-8" defer></script>
    <!-- 分享功能工具类 -->
    <script src="./share_utils.js" type="text/javascript" charset="utf-8" defer></script>
    <!-- 项目管理 -->
    <script src="./ProjectManager.js" type="text/javascript" charset="utf-8" defer></script>

    
    <link rel="stylesheet" type="text/css" href="./EditorPage.css" />
    <!-- 紧凑主题 -->
    <link rel="stylesheet" type="text/css" href="./compact_theme.css" />
    <!-- 文件标签栏样式 -->
    <link rel="stylesheet" type="text/css" href="./file_tabs.css" />


</head>
<body class="compact-theme">
    <form id="form1" runat="server">
        <!-- 主容器 -->
        <div class="container compact-theme">
            <!-- 左侧边栏 - 内容列表 -->
            <div class="sidebar compact-theme">
                <div class="sidebar-header">
                    <div class="project-selector-container">
                        <span class="sidebar-title compact-theme">📚 代码库</span>
                        <select id="projectSelect" class="project-select compact-theme" title="选择项目">
                            <option value="0">📁 所有项目</option>
                        </select>
                        <div class="project-management-buttons">
                            <button type="button" id="btnNewProject" class="project-btn compact-theme" title="新建项目">➕</button>
                            <button type="button" id="btnEditProject" class="project-btn compact-theme" title="编辑项目">✏️</button>
                            <button type="button" id="btnDeleteProject" class="project-btn compact-theme" title="删除项目">🗑️</button>
                        </div>
                    </div>
                    <button type="button" id="btnToggleSidebar" class="sidebar-toggle compact-theme" title="收缩/展开">
                        <span class="toggle-icon">◀</span>
                    </button>
                </div>
                
                <!-- 搜索框区域 -->
                <div class="search-container">
                    <input type="text" id="searchBox" class="search-box compact-theme" placeholder="🔍 搜索标题..." />
                </div>
                
                <!-- 加载按钮 -->
                <button type="button" id="btnLoadList" class="compact-button" onclick="refreshContentList()">
                    📋 刷新列表
                </button>
                
                <!-- 内容列表容器 -->
                <div id="contentListContainer" class="compact-theme">
                    <!-- 内容列表将在这里动态加载 -->
                    <div id="contentList" class="compact-theme">
                        <!-- 使用div布局的动态内容 -->
                    </div>
                </div>
            </div>
            
            <!-- 右侧主内容区 -->
            <div class="main-content compact-theme">
                <!-- 文件标签栏 -->
                <div class="file-tabs-container">
                    <div class="file-tabs-list" id="fileTabsList">
                        <!-- 文件标签将在这里动态生成 -->
                    </div>
                </div>
                
                <!-- 内容管理区 -->
                <div class="content-management-container compact-theme">
                    <!-- 第一行：标题和主要操作 -->
                    <div>
                        <span class="label compact-theme">📝 标题:</span>
                        <input type="text" id="contentTitle" class="compact-theme" placeholder="输入内容标题（必填）" />
                        <span class="label compact-theme">🏷️ 副标题:</span>
                        <input type="text" id="contentSubtitle" class="compact-theme" placeholder="简短描述" />
                    </div>
                    
                    <!-- 第二行：详细信息 -->
                    <div>
                        <span class="label compact-theme">👤 保存者:</span>
                        <span id="authorLabel" class="author-label compact-theme">当前用户</span>
                        
                        <span class="label compact-theme">📂 分类:</span>
                        <input type="text" id="contentCategory" class="compact-theme" placeholder="内容分类" />
                        
                        <span class="label compact-theme">🔥 热门标签:</span>
                        <input type="text" id="contentHotTags" class="compact-theme" placeholder="多个标签用逗号分隔" />
                    </div>
                    
                    <!-- 第三行：分享功能 -->
                    <div>
                        <span class="label compact-theme">📤 分享给:</span>
                        <button type="button" id="btnShareToggle" class="compact-theme">分享给...</button>
                        <div id="shareInputContainer" style="display: none; margin-top: 5px;">
                            <select id="contentShareTo" class="compact-theme" multiple style="width: 300px; height: 100px;" data-placeholder="选择或输入邮箱地址（多个用逗号分隔）">
                                <option value="all">所有人可见</option>
                            </select>
                            <div style="margin-top: 5px; font-size: 12px; color: #666;">
                                <div>💡 提示：</div>
                                <div>• 选择"所有人可见"表示内容对所有人开放</div>
                                <div>• 可以输入多个邮箱，用逗号分隔</div>
                                <div>• 也可以从下拉列表中选择已保存的邮箱</div>
                            </div>
                            <button type="button" id="btnShareConfirm" class="compact-theme">确认</button>
                            <button type="button" id="btnShareCancel" class="compact-theme">取消</button>
                        </div>
                    </div>
                </div>
                
                <!-- 编辑器工具栏 -->
                <div class="editor-toolbar compact-theme">
                    💻 代码编辑器:
                    <select id="languageSelect" class="compact-theme">
                        <option value="kindeditor">📝 KindEditor 富文本</option>
                    </select>
                    <button type="button" id="btnNew" class="compact-theme" title="新建文档">📄 新建</button>
                    <button type="button" id="btnSave" class="compact-theme">💾 保存</button>
                </div>
                
                <!-- 编辑器容器 - 使用 iframe 隔离 -->
                <div class="editor-container compact-theme" style="position: relative; height: 100%;">
                    <!-- Ace 代码编辑器 iframe -->
                    <iframe id="aceEditorIframe" 
                            src="ace_editor_iframe.html" 
                            style="width: 100%; height: 100%; border: none; display: none;"
                            title="ACE 代码编辑器"></iframe>
                    
                    <!-- KindEditor 富文本编辑器 iframe - 修复版 -->
                    <iframe id="kindEditorIframe" 
                            src="kindeditor_iframe_fixed.html" 
                            style="width: 100%; height: 100%; border: none; display: block;"
                            title="KindEditor 富文本编辑器"></iframe>
                </div>
                
            </div>
        </div>
    </form>
    
    <script>
        // 刷新内容列表
        function refreshContentList() {
            console.log('🔄 刷新按钮被点击！');
            console.log('window.loadContentList:', typeof window.loadContentList);
            
            // 直接调用全局函数
            if (window.loadContentList) {
                console.log('✅ 找到 loadContentList 函数，开始调用...');
                window.loadContentList();
                console.log('✅ 刷新命令已发送');
            } else {
                console.error('❌ loadContentList 函数未找到');
                console.log('可用的全局函数:', Object.keys(window).filter(k => k.includes('load') || k.includes('List')));
            }
        }
    </script>
</body>
</html>

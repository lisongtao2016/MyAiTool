// ProjectManager.js - 处理项目管理功能

$(document).ready(function() {
    console.log('ProjectManager: 初始化开始');
    
    // 初始化项目选择器
    loadProjects();
    
    // 绑定按钮事件
    $('#btnNewProject').click(showNewProjectDialog);
    $('#btnEditProject').click(showEditProjectDialog);
    $('#btnDeleteProject').click(deleteCurrentProject);
    $('#projectSelect').change(onProjectChange);
    
    console.log('ProjectManager: 初始化完成');
});

// 加载项目列表
function loadProjects() {
    console.log('加载项目列表...');
    
    $.ajax({
        type: "POST",
        url: "WebServ.asmx/GetAllProjects",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(response) {
            var result = response.d ? JSON.parse(response.d) : response;
            if (result.success) {
                populateProjectSelect(result.projects);
                console.log('成功加载', result.projects.length, '个项目');
            } else {
                console.error('加载项目列表失败:', result.message);
                showToast('加载项目列表失败: ' + result.message, 'error');
            }
        },
        error: function(xhr, status, error) {
            console.error('加载项目请求失败:', error);
            showToast('加载项目请求失败: ' + error, 'error');
        }
    });
}

// 填充项目选择器
function populateProjectSelect(projects) {
    var $projectSelect = $('#projectSelect');
    $projectSelect.empty();
    
    // 添加"所有项目"选项
    $projectSelect.append('<option value="0">📁 所有项目</option>');
    
    // 添加项目选项
    if (projects && projects.length > 0) {
        projects.forEach(function(project) {
            var optionText = project.name;
            if (project.description) {
                optionText += ' - ' + project.description;
            }
            
            $projectSelect.append('<option value="' + project.id + '">' + optionText + '</option>');
        });
    }
    
    console.log('项目选择器已更新，共', projects.length, '个项目');
}

// 项目变更事件处理
function onProjectChange() {
    var projectId = $(this).val();
    console.log('项目变更:', projectId);
    
    // 根据项目ID筛选内容列表
    filterContentByProject(projectId);
}

// 根据项目ID筛选内容
function filterContentByProject(projectId) {
    if (projectId === "0") {
        // 显示所有内容 - 选择所有项目时，不考虑项目筛选
        if (window.loadContentList) {
            window.loadContentList();
        }
    } else {
        // 筛选特定项目的内容
        loadContentsByProject(projectId);
    }
}

// 加载特定项目的内容
function loadContentsByProject(projectId) {
    console.log('加载项目内容，项目ID:', projectId);
    
    // 显示加载状态
    var loadButton = $('#btnLoadList');
    var originalText = loadButton.text();
    loadButton.text('加载中...').prop('disabled', true);
    
    $.ajax({
        type: "POST",
        url: "WebServ.asmx/GetContentsByProject",
        data: JSON.stringify({ projectId: parseInt(projectId) }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(response) {
            console.log('服务器返回项目内容数据:', response);
            
            // 安全解析JSON
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
                var allContents = result.contents || [];
                console.log('加载到的项目内容数组:', allContents);
                
                // 使用 EditorContentManager 的 displayContentList 函数显示内容
                if (window.displayContentList) {
                    window.displayContentList(allContents);
                } else {
                    // 如果全局函数不可用，直接调用 EditorContentManager 的函数
                    console.warn('window.displayContentList 不可用，尝试直接调用');
                    if (typeof displayContentList === 'function') {
                        displayContentList(allContents);
                    }
                }
                
                console.log('成功加载', allContents.length, '条项目内容');
            } else {
                showToast('加载项目内容失败: ' + (result ? result.message : '未知错误'), 'error');
                console.error('加载项目内容失败:', result ? result.message : '未知错误');
            }
            
            // 恢复按钮状态
            loadButton.text(originalText).prop('disabled', false);
        },
        error: function(xhr, status, error) {
            showToast('加载项目内容请求失败: ' + error, 'error');
            console.error('加载项目内容请求失败:', error);
            
            // 恢复按钮状态
            loadButton.text(originalText).prop('disabled', false);
        }
    });
}

// 显示新建项目对话框
function showNewProjectDialog() {
    var projectName = prompt('请输入项目名称:', '');
    if (!projectName || projectName.trim() === '') {
        return;
    }
    
    var projectDescription = prompt('请输入项目描述（可选）:', '');
    
    createProject(projectName.trim(), projectDescription ? projectDescription.trim() : '');
}

// 创建新项目
function createProject(name, description) {
    console.log('创建项目:', name, description);
    
    $.ajax({
        type: "POST",
        url: "WebServ.asmx/CreateProject",
        data: JSON.stringify({
            name: name,
            description: description
        }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(response) {
            var result = response.d ? JSON.parse(response.d) : response;
            if (result.success) {
                showToast('项目创建成功', 'success');
                console.log('项目创建成功，ID:', result.id);
                
                // 重新加载项目列表
                loadProjects();
                
                // 选中新创建的项目
                setTimeout(function() {
                    $('#projectSelect').val(result.id).trigger('change');
                }, 500);
            } else {
                showToast('项目创建失败: ' + result.message, 'error');
                console.error('项目创建失败:', result.message);
            }
        },
        error: function(xhr, status, error) {
            showToast('创建项目请求失败: ' + error, 'error');
            console.error('创建项目请求失败:', error);
        }
    });
}

// 显示编辑项目对话框
function showEditProjectDialog() {
    var $projectSelect = $('#projectSelect');
    var selectedProjectId = $projectSelect.val();
    
    if (selectedProjectId === "0") {
        showToast('请先选择一个项目', 'info');
        return;
    }
    
    var selectedProjectName = $projectSelect.find('option:selected').text().split(' - ')[0];
    var currentDescription = '';
    
    // 获取项目详情
    $.ajax({
        type: "POST",
        url: "WebServ.asmx/GetAllProjects",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(response) {
            var result = response.d ? JSON.parse(response.d) : response;
            if (result.success) {
                var project = result.projects.find(function(p) {
                    return p.id == selectedProjectId;
                });
                
                if (project) {
                    currentDescription = project.description || '';
                    
                    var newName = prompt('请输入新的项目名称:', project.name);
                    if (!newName || newName.trim() === '') {
                        return;
                    }
                    
                    var newDescription = prompt('请输入新的项目描述（可选）:', currentDescription);
                    
                    updateProject(selectedProjectId, newName.trim(), newDescription ? newDescription.trim() : '');
                }
            }
        }
    });
}

// 更新项目
function updateProject(id, name, description) {
    console.log('更新项目:', id, name, description);
    
    $.ajax({
        type: "POST",
        url: "WebServ.asmx/UpdateProject",
        data: JSON.stringify({
            id: id,
            name: name,
            description: description
        }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(response) {
            var result = response.d ? JSON.parse(response.d) : response;
            if (result.success) {
                showToast('项目更新成功', 'success');
                console.log('项目更新成功');
                
                // 重新加载项目列表
                loadProjects();
            } else {
                showToast('项目更新失败: ' + result.message, 'error');
                console.error('项目更新失败:', result.message);
            }
        },
        error: function(xhr, status, error) {
            showToast('更新项目请求失败: ' + error, 'error');
            console.error('更新项目请求失败:', error);
        }
    });
}

// 删除当前选中的项目
function deleteCurrentProject() {
    var $projectSelect = $('#projectSelect');
    var selectedProjectId = $projectSelect.val();
    
    if (selectedProjectId === "0") {
        showToast('请先选择一个项目', 'info');
        return;
    }
    
    var selectedProjectName = $projectSelect.find('option:selected').text().split(' - ')[0];
    
    if (!confirm('确定要删除项目 "' + selectedProjectName + '" 吗？\n\n注意：删除项目不会删除项目中的文档，但文档将不再属于任何项目。')) {
        return;
    }
    
    deleteProject(selectedProjectId);
}

// 删除项目
function deleteProject(id) {
    console.log('删除项目:', id);
    
    $.ajax({
        type: "POST",
        url: "WebServ.asmx/DeleteProject",
        data: JSON.stringify({ id: id }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(response) {
            var result = response.d ? JSON.parse(response.d) : response;
            if (result.success) {
                showToast('项目删除成功', 'success');
                console.log('项目删除成功');
                
                // 重新加载项目列表
                loadProjects();
                
                // 切换到"所有项目"
                $('#projectSelect').val("0").trigger('change');
            } else {
                showToast('项目删除失败: ' + result.message, 'error');
                console.error('项目删除失败:', result.message);
            }
        },
        error: function(xhr, status, error) {
            showToast('删除项目请求失败: ' + error, 'error');
            console.error('删除项目请求失败:', error);
        }
    });
}

// 获取当前选中的项目ID
function getCurrentProjectId() {
    var projectId = $('#projectSelect').val();
    return projectId === "0" ? null : parseInt(projectId);
}

// 暴露全局函数
window.loadProjects = loadProjects;
window.getCurrentProjectId = getCurrentProjectId;
// Login Page JavaScript

$(document).ready(() => {
    // 检查是否已有登录会话
    checkSession();
    
    // 检查是否有上次注册的凭据，如果有则自动填充
    autoFillLastRegisteredUser();
    
    // 回车键提交
    $('input').keypress(e => {
        if (e.which === 13) {
            $('#loginForm').is(':visible') ? login() : register();
        }
    });
});

// 切换登录/注册表单
const showLoginForm = () => {
    $('#loginForm').show();
    $('#registerForm').hide();
    clearMessages();
    
    // 移除自动填充提示（如果存在）
    $('#autoFillHint').remove();
};

const showRegisterForm = () => {
    $('#loginForm').hide();
    $('#registerForm').show();
    clearMessages();
    
    // 移除自动填充提示（如果存在）
    $('#autoFillHint').remove();
};

// 清空消息
const clearMessages = () => {
    $('#errorMessage').hide().text('');
    $('#successMessage').hide().text('');
};

// 显示错误消息
const showError = message => {
    $('#errorMessage').text(message).show();
    $('#successMessage').hide();
};

// 显示成功消息
const showSuccess = message => {
    $('#successMessage').text(message).show();
    $('#errorMessage').hide();
};

// 登录函数
const login = () => {
    const identifier = $('#loginIdentifier').val().trim();
    const password = $('#loginPassword').val();
    
    if (!identifier) {
        showError('请输入用户名或邮箱');
        return;
    }
    
    if (!password) {
        showError('请输入密码');
        return;
    }
    
    // 显示加载状态
    const $btn = $('#btnLogin');
    $btn.addClass('loading').text('登录中...');
    
    // 调用登录 WebMethod
    $.ajax({
        type: "POST",
        url: "WebServ.asmx/LoginUser",
        data: JSON.stringify({
            identifier: identifier,
            password: password
        }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: response => {
            $btn.removeClass('loading').text('登录');
            
            const result = response.d ? JSON.parse(response.d) : response;
            
            if (result?.success) {
                showSuccess('登录成功！正在跳转...');
                
                // 保存用户信息到本地存储
                localStorage.setItem('userInfo', JSON.stringify({
                    id: result.userId,
                    username: result.username,
                    displayName: result.displayName,
                    email: result.email,
                    role: result.role
                }));
                
                // 清除上次注册的凭据
                localStorage.removeItem('lastRegisteredUser');
                
                // 1.5秒后跳转到主页面
                setTimeout(() => {
                    window.location.href = 'WebForm1.aspx';
                }, 1500);
            } else {
                showError(result?.message || '登录失败');
            }
        },
        error: (xhr, status, error) => {
            $btn.removeClass('loading').text('登录');
            showError(`登录请求失败：${error}`);
        }
    });
};

// 注册函数
const register = () => {
    const username = $('#registerUsername').val().trim();
    const email = $('#registerEmail').val().trim();
    const displayName = $('#registerDisplayName').val().trim();
    const password = $('#registerPassword').val();
    const confirmPassword = $('#registerConfirmPassword').val();
    
    // 验证输入
    if (!username) {
        showError('请输入用户名');
        return;
    }
    
    if (username.length < 3 || username.length > 20) {
        showError('用户名长度应为3-20个字符');
        return;
    }
    
    if (!email) {
        showError('请输入邮箱地址');
        return;
    }
    
    // 简单的邮箱验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('请输入有效的邮箱地址');
        return;
    }
    
    if (!password) {
        showError('请输入密码');
        return;
    }
    
    if (password.length < 6) {
        showError('密码至少需要6个字符');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('两次输入的密码不一致');
        return;
    }
    
    // 显示加载状态
    const $btn = $('#btnRegister');
    $btn.addClass('loading').text('注册中...');
    
    // 调用注册 WebMethod
    $.ajax({
        type: "POST",
        url: "WebServ.asmx/RegisterUser",
        data: JSON.stringify({
            username: username,
            email: email,
            password: password,
            displayName: displayName || null
        }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: response => {
            $btn.removeClass('loading').text('注册');
            
            const result = response.d ? JSON.parse(response.d) : response;
            
            if (result?.success) {
                showSuccess('注册成功！请使用以下凭据登录');
                
                // 保存注册凭据到 localStorage
                localStorage.setItem('lastRegisteredUser', JSON.stringify({
                    username: username,
                    password: password
                }));
                
                // 切换到登录表单并自动填充
                setTimeout(() => {
                    showLoginForm();
                    $('#loginIdentifier').val(username);
                    $('#loginPassword').val(password);
                    
                    // 高亮显示登录按钮，提示用户点击
                    $('#btnLogin').css({
                        'animation': 'pulse 1.5s infinite',
                        'box-shadow': '0 0 20px rgba(74, 110, 224, 0.6)'
                    });
                    
                    // 添加提示信息
                    const $hint = $(`<div style="margin-top: 15px; padding: 10px; background: #e8f4fd; border-left: 4px solid #4a6ee0; border-radius: 4px; font-size: 13px; color: #495057;">
                        ✅ 用户名和密码已自动填充<br>👉 请点击"登录"按钮完成登录
                    </div>`);
                    $('#loginForm').append($hint);
                    
                    // 3秒后移除动画效果
                    setTimeout(() => {
                        $('#btnLogin').css({
                            'animation': '',
                            'box-shadow': ''
                        });
                    }, 3000);
                }, 1500);
            } else {
                showError(result?.message || '注册失败');
            }
        },
        error: (xhr, status, error) => {
            $btn.removeClass('loading').text('注册');
            showError(`注册请求失败：${error}`);
        }
    });
};

// 自动填充上次注册的用户
const autoFillLastRegisteredUser = () => {
    const lastUser = localStorage.getItem('lastRegisteredUser');
    if (!lastUser) return;
    
    try {
        const user = JSON.parse(lastUser);
        
        // 只有当登录表单可见且输入框为空时才填充
        if ($('#loginForm').is(':visible') && !$('#loginIdentifier').val()) {
            $('#loginIdentifier').val(user.username);
            $('#loginPassword').val(user.password);
            
            // 显示提示信息
            const $hint = $(`<div id="autoFillHint" style="margin-top: 15px; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; font-size: 13px; color: #856404;">
                💡 已自动填充上次注册的用户<br>👉 请点击"登录"按钮或修改后登录
            </div>`);
            $('#loginForm').append($hint);
            
            console.log('已自动填充用户:', user.username);
        }
    } catch (e) {
        console.warn('解析上次注册用户信息失败:', e);
    }
};

// 检查会话
const checkSession = () => {
    // 这里可以添加会话检查逻辑
    // 暂时只检查本地存储
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
        // 用户已登录，直接跳转到主页面
        // window.location.href = 'WebForm1.aspx';
    }
};

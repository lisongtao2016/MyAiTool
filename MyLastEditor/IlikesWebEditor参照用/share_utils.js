/**
 * 分享功能工具类 - 精简版
 * 提供分享按钮的切换、邮箱验证和分享确认功能
 */

// 分享功能配置
const ShareUtils = {
    // 初始化分享功能
    init: function() {
        console.log('ShareUtils: 初始化分享功能');
        
        // 绑定事件
        $('#btnShareToggle').click(this.toggleShareInput);
        $('#btnShareConfirm').click(this.confirmShare);
        $('#btnShareCancel').click(this.cancelShare);
        
        // 初始化可输入下拉框
        this.initEditableDropdown();
        
        // 初始化状态
        this.hideShareInput();
        
        // 加载已保存的邮箱列表
        this.loadSavedEmails();
    },
    
    // 初始化可输入下拉框
    initEditableDropdown: function() {
        const $select = $('#contentShareTo');
        
        // 允许输入新值
        $select.on('change', function() {
            const selectedValues = Array.from($select.val() || []);
            
            // 如果选择了"all"，清空其他选项
            if (selectedValues.includes('all')) {
                $select.val(['all']);
                ShareUtils.showMessage('已设置为所有人可见', 'info');
            }
            
            // 保存新输入的邮箱到本地存储
            ShareUtils.saveNewEmails(selectedValues);
        });
        
        // 允许输入新邮箱
        $select.on('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const input = e.target.value.trim();
                if (input && input !== 'all') {
                    ShareUtils.addNewEmailOption(input);
                    e.target.value = '';
                }
            }
        });
    },
    
    // 添加新邮箱选项
    addNewEmailOption: function(email) {
        const $select = $('#contentShareTo');
        
        // 检查是否已存在
        const existingOptions = Array.from($select.find('option')).map(opt => opt.value);
        if (!existingOptions.includes(email) && email !== 'all') {
            // 验证邮箱格式
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(email)) {
                $select.append(`<option value="${email}" selected>${email}</option>`);
                ShareUtils.saveEmailToStorage(email);
                ShareUtils.showMessage(`已添加邮箱: ${email}`, 'success');
            } else {
                ShareUtils.showMessage(`邮箱格式无效: ${email}`, 'error');
            }
        }
    },
    
    // 保存新输入的邮箱
    saveNewEmails: function(emails) {
        emails.forEach(email => {
            if (email !== 'all') {
                ShareUtils.saveEmailToStorage(email);
            }
        });
    },
    
    // 保存邮箱到本地存储
    saveEmailToStorage: function(email) {
        try {
            const savedEmails = JSON.parse(localStorage.getItem('savedEmails') || '[]');
            if (!savedEmails.includes(email)) {
                savedEmails.push(email);
                localStorage.setItem('savedEmails', JSON.stringify(savedEmails));
            }
        } catch (e) {
            console.warn('保存邮箱到本地存储失败:', e);
        }
    },
    
    // 从本地存储加载已保存的邮箱
    loadSavedEmails: function() {
        try {
            const savedEmails = JSON.parse(localStorage.getItem('savedEmails') || '[]');
            const $select = $('#contentShareTo');
            
            // 添加已保存的邮箱选项（排除已存在的）
            const existingOptions = Array.from($select.find('option')).map(opt => opt.value);
            savedEmails.forEach(email => {
                if (!existingOptions.includes(email) && email !== 'all') {
                    $select.append(`<option value="${email}">${email}</option>`);
                }
            });
        } catch (e) {
            console.warn('从本地存储加载邮箱失败:', e);
        }
    },
    
    // 切换分享输入框显示
    toggleShareInput: function() {
        const $container = $('#shareInputContainer');
        const $button = $('#btnShareToggle');
        
        if ($container.is(':visible')) {
            ShareUtils.hideShareInput();
        } else {
            ShareUtils.showShareInput();
        }
    },
    
    // 显示分享输入框
    showShareInput: function() {
        $('#shareInputContainer').show();
        $('#btnShareToggle').text('收起分享');
        $('#contentShareTo').focus();
    },
    
    // 隐藏分享输入框
    hideShareInput: function() {
        $('#shareInputContainer').hide();
        $('#btnShareToggle').text('分享给...');
    },
    
    // 确认分享
    confirmShare: function() {
        const selectedValues = $('#contentShareTo').val() || [];
        const emails = Array.from(selectedValues);
        
        if (emails.length === 0) {
            ShareUtils.showMessage('请选择或输入邮箱地址', 'info');
            return;
        }
        
        // 检查是否包含"all"
        const hasAll = emails.includes('all');
        
        if (hasAll) {
            ShareUtils.showMessage('已设置为所有人可见', 'success');
        } else {
            // 验证邮箱格式
            const invalidEmails = ShareUtils.validateEmails(emails);
            
            if (invalidEmails.length > 0) {
                ShareUtils.showMessage('以下邮箱格式无效: ' + invalidEmails.join(', '), 'error');
                return;
            }
            
            ShareUtils.showMessage('已设置分享给: ' + emails.join(', '), 'success');
        }
        
        ShareUtils.hideShareInput();
    },
    
    // 取消分享
    cancelShare: function() {
        $('#contentShareTo').val([]);
        ShareUtils.hideShareInput();
    },
    
    // 解析邮箱地址（支持多个，用逗号分隔）
    parseEmails: function(emailString) {
        return emailString.split(',')
            .map(email => email.trim())
            .filter(email => email.length > 0);
    },
    
    // 验证邮箱格式
    validateEmails: function(emails) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emails.filter(email => email !== 'all' && !emailRegex.test(email));
    },
    
    // 获取当前分享的邮箱列表
    getShareEmails: function() {
        const selectedValues = $('#contentShareTo').val() || [];
        return Array.from(selectedValues);
    },
    
    // 设置分享邮箱
    setShareEmails: function(emails) {
        $('#contentShareTo').val(emails);
    },
    
    // 显示消息（简化版）
    showMessage: function(message, type) {
        // 使用现有的showToast函数，如果不存在则使用alert
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            alert(message);
        }
    }
};

// 自动初始化（如果页面已加载）
$(document).ready(function() {
    if ($('#btnShareToggle').length) {
        ShareUtils.init();
    }
});

// 暴露到全局
window.ShareUtils = ShareUtils;
// 工具函数库

/**
 * 显示通知消息
 */
function showNotification(message, type = 'info', duration = 3000) {
    const notification = $('<div>')
        .addClass(`notification ${type}`)
        .text(message);
    
    $('body').append(notification);
    
    setTimeout(() => {
        notification.fadeOut(300, function() {
            $(this).remove();
        });
    }, duration);
}

/**
 * 显示确认对话框
 */
function showConfirm(title, message, onConfirm, onCancel) {
    $('#dialog-title').text(title);
    $('#dialog-message').text(message);
    $('#confirm-dialog').fadeIn(200);
    
    $('#dialog-confirm').off('click').on('click', function() {
        $('#confirm-dialog').fadeOut(200);
        if (onConfirm) onConfirm();
    });
    
    $('#dialog-cancel').off('click').on('click', function() {
        $('#confirm-dialog').fadeOut(200);
        if (onCancel) onCancel();
    });
}

/**
 * 格式化数字（添加千位分隔符）
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 限制数值范围
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * 计算两点之间的距离
 */
function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * 线性插值
 */
function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * 生成唯一ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * 节流函数
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 深拷贝对象
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * 更新FPS显示
 */
let lastTime = performance.now();
let frameCount = 0;
let fps = 60;

function updateFPS() {
    const currentTime = performance.now();
    frameCount++;
    
    if (currentTime - lastTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        $('#fps-counter').text(`FPS: ${fps}`);
    }
}

/**
 * 保存游戏数据到LocalStorage
 */
function saveGame(gameData) {
    try {
        localStorage.setItem('sanguo_game_save', JSON.stringify(gameData));
        showNotification('游戏已保存', 'success');
        return true;
    } catch (e) {
        console.error('保存失败:', e);
        showNotification('保存失败', 'error');
        return false;
    }
}

/**
 * 从LocalStorage加载游戏数据
 */
function loadGame() {
    try {
        const data = localStorage.getItem('sanguo_game_save');
        if (data) {
            showNotification('游戏已加载', 'success');
            return JSON.parse(data);
        }
        return null;
    } catch (e) {
        console.error('加载失败:', e);
        showNotification('加载失败', 'error');
        return null;
    }
}

/**
 * 获取地形配置
 */
function getTerrainConfig(terrainType) {
    return CONFIG.TERRAIN[terrainType.toUpperCase()] || CONFIG.TERRAIN.PLAIN;
}

/**
 * 获取设施配置
 */
function getFacilityConfig(facilityType) {
    return CONFIG.FACILITY[facilityType.toUpperCase()] || null;
}

// 游戏状态
const gameState = {
    turn: CONFIG.GAME.INITIAL_TURN,
    gold: CONFIG.GAME.INITIAL_GOLD,
    food: CONFIG.GAME.INITIAL_FOOD,
    paused: false
};

// 全局变量
let gameMap;
let renderer;
let inputHandler;
let minimapSystem;
let animationId;

/**
 * 更新UI显示
 */
function updateUI() {
    $('#turn-count').text(formatNumber(gameState.turn));
    $('#gold').text(formatNumber(gameState.gold));
    $('#food').text(formatNumber(gameState.food));
}

/**
 * 初始化游戏
 */
function initGame() {
    console.log('=== 模拟三国 游戏引擎启动 ===');
    
    // 创建地图
    gameMap = new GameMap();
    
    // 创建渲染器
    const canvas = document.getElementById('game-map');
    renderer = new MapRenderer(canvas, gameMap);
    gameMap.renderer = renderer; // 反向引用
    
    // 创建输入处理器
    inputHandler = new InputHandler(gameMap, renderer);
    
    // 创建小地图系统
    const minimapCanvas = document.getElementById('minimap');
    minimapSystem = new MinimapSystem(minimapCanvas, gameMap);
    
    // 更新UI
    updateUI();
    
    // 开始游戏循环
    startGameLoop();
    
    console.log('=== 游戏初始化完成 ===');
    showNotification('欢迎来到模拟三国！', 'success', 2000);
}

/**
 * 游戏主循环
 */
function gameLoop(timestamp) {
    if (!gameState.paused) {
        // 渲染主地图
        renderer.render();
        
        // 更新小地图
        minimapSystem.update(timestamp);
    }
    
    // 继续下一帧
    animationId = requestAnimationFrame(gameLoop);
}

/**
 * 启动游戏循环
 */
function startGameLoop() {
    animationId = requestAnimationFrame(gameLoop);
}

/**
 * 停止游戏循环
 */
function stopGameLoop() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}

/**
 * 下一回合
 */
function nextTurn() {
    gameState.turn++;
    
    // 更新设施
    gameMap.facilities.updateFacilities();
    
    // 计算资源收入（简化版）
    const facilities = gameMap.facilities.getAllFacilities();
    let goldIncome = 0;
    let foodIncome = 0;
    
    facilities.forEach(facility => {
        if (facility.built) {
            if (facility.type === 'farm') {
                foodIncome += 20;
            } else if (facility.type === 'market') {
                goldIncome += 30;
            }
        }
    });
    
    gameState.gold += goldIncome;
    gameState.food += foodIncome;
    
    updateUI();
    showNotification(`第 ${gameState.turn} 回合开始`, 'info', 1500);
}

/**
 * 保存游戏
 */
function saveGameManual() {
    const data = {
        gameState: { ...gameState },
        mapData: gameMap.exportData()
    };
    
    saveGame(data);
}

/**
 * 加载游戏
 */
function loadGameManual() {
    const data = loadGame();
    if (data) {
        gameState.turn = data.gameState.turn;
        gameState.gold = data.gameState.gold;
        gameState.food = data.gameState.food;
        
        gameMap.importData(data.mapData);
        updateUI();
        
        showNotification('游戏加载成功', 'success');
    }
}

/**
 * 键盘快捷键
 */
$(document).on('keydown', (e) => {
    switch(e.key) {
        case ' ':
            e.preventDefault();
            nextTurn();
            break;
        case 's':
            if (e.ctrlKey) {
                e.preventDefault();
                saveGameManual();
            }
            break;
        case 'l':
            if (e.ctrlKey) {
                e.preventDefault();
                loadGameManual();
            }
            break;
    }
});

/**
 * 页面加载完成后初始化
 */
$(document).ready(function() {
    // 延迟初始化，确保DOM完全加载
    setTimeout(initGame, 100);
});

/**
 * 页面卸载前清理
 */
$(window).on('beforeunload', function() {
    stopGameLoop();
    return null;
});

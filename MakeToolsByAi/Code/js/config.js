// 游戏配置
const CONFIG = {
    // 地图配置
    MAP: {
        WIDTH: 300,            // 地图宽度（格子数）
        HEIGHT: 300,           // 地图高度（格子数）
        CELL_SIZE: 64,         // 每个格子的大小（像素）- 已加倍
        MIN_ZOOM: 0.5,         // 最小缩放
        MAX_ZOOM: 3.0,         // 最大缩放
        ZOOM_STEP: 0.1,        // 缩放步长
        GRID_TYPE: 'hexagon'   // 网格类型：square(方形) 或 hexagon(六边形)
    },

    // 地形配置（三国志11风格）
    TERRAIN: {
        PLAIN: {
            type: 'plain',
            name: '平原',
            color: '#98D98E',  // 更自然的绿色
            icon: '🌱',  // 小草
            moveCost: 1,
            defenseBonus: 0,
            passable: true
        },
        FOREST: {
            type: 'forest',
            name: '森林',
            color: '#4A7C59',  // 深绿色
            icon: '🌲',  // 树木
            moveCost: 2,
            defenseBonus: 0.2,
            passable: true
        },
        WATER: {
            type: 'water',
            name: '河流',
            color: '#5B9BD5',  // 清澈的蓝色
            icon: '💧',  // 水滴
            moveCost: 3,
            defenseBonus: 0.1,
            passable: true
        },
        MOUNTAIN: {
            type: 'mountain',
            name: '山地',
            color: '#8B7355',  // 棕褐色
            icon: '⛰️',  // 山峰
            moveCost: Infinity,
            defenseBonus: 0.4,
            passable: false
        },
        PASS: {
            type: 'pass',
            name: '关隘',
            color: '#A0522D',  // 棕色
            icon: '🏯',  // 城堡
            moveCost: 1,
            defenseBonus: 0.5,
            passable: true
        }
    },

    // 设施配置
    FACILITY: {
        FARM: {
            type: 'farm',
            name: '农场',
            icon: '🌾',
            cost: 50,
            maintainCost: 5,
            buildTime: 1,
            description: '每回合产出粮草'
        },
        MARKET: {
            type: 'market',
            name: '市场',
            icon: '🏪',
            cost: 80,
            maintainCost: 8,
            buildTime: 2,
            description: '每回合产出金钱'
        },
        BARRACKS: {
            type: 'barracks',
            name: '兵舍',
            icon: '⚔️',
            cost: 100,
            maintainCost: 10,
            buildTime: 3,
            description: '提高征兵速度'
        },
        FORGE: {
            type: 'forge',
            name: '锻冶厂',
            icon: '🔨',
            cost: 120,
            maintainCost: 12,
            buildTime: 3,
            description: '制造兵装武器'
        },
        FORT: {
            type: 'fort',
            name: '阵',
            icon: '🏰',
            cost: 60,
            maintainCost: 0,
            buildTime: 1,
            description: '临时防御工事'
        },
        ARROW_TOWER: {
            type: 'arrow_tower',
            name: '箭楼',
            icon: '🏹',
            cost: 150,
            maintainCost: 0,
            buildTime: 2,
            description: '远程攻击设施'
        },
        CATAPULT: {
            type: 'catapult',
            name: '投石台',
            icon: '💣',
            cost: 200,
            maintainCost: 0,
            buildTime: 3,
            description: '范围攻击设施'
        }
    },

    // 游戏状态
    GAME: {
        INITIAL_GOLD: 1000,
        INITIAL_FOOD: 500,
        INITIAL_TURN: 1
    },

    // 渲染配置
    RENDER: {
        GRID_COLOR: 'rgba(255, 255, 255, 0.1)',
        GRID_LINE_WIDTH: 1,
        HIGHLIGHT_COLOR: 'rgba(255, 215, 0, 0.5)',
        SELECTION_COLOR: 'rgba(233, 69, 96, 0.6)'
    },

    // 性能配置
    PERFORMANCE: {
        TARGET_FPS: 60,
        VIEWPORT_PADDING: 30,  // 视口外额外渲染的格子数（进一步减小以提高性能）
        TILE_SIZE: 512,        // 瓦片大小（像素）
        MAX_TILES: 20          // 最大缓存瓦片数
    }
};

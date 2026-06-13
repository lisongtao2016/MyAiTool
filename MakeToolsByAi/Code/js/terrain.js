// 地形系统

class TerrainSystem {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        // 使用一维数组存储地形数据，优化性能
        this.terrainData = new Uint8Array(width * height);
        this.initializeTerrain();
    }

    /**
     * 初始化地形（默认全部为平原）
     */
    initializeTerrain() {
        for (let i = 0; i < this.terrainData.length; i++) {
            this.terrainData[i] = 0; // 0 = 平原
        }
    }

    /**
     * 获取地形类型索引
     */
    getTerrainIndex(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return -1;
        }
        return this.terrainData[y * this.width + x];
    }

    /**
     * 设置地形类型
     */
    setTerrain(x, y, terrainType) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        
        const typeIndex = this.terrainTypeToIndex(terrainType);
        if (typeIndex === -1) {
            return false;
        }
        
        this.terrainData[y * this.width + x] = typeIndex;
        return true;
    }

    /**
     * 获取地形配置对象
     */
    getTerrainConfig(x, y) {
        const index = this.getTerrainIndex(x, y);
        return this.indexToTerrainConfig(index);
    }

    /**
     * 地形类型字符串转索引
     */
    terrainTypeToIndex(type) {
        const typeMap = {
            'plain': 0,
            'forest': 1,
            'water': 2,
            'mountain': 3,
            'pass': 4
        };
        return typeMap[type] !== undefined ? typeMap[type] : -1;
    }

    /**
     * 索引转地形配置
     */
    indexToTerrainConfig(index) {
        const configs = [
            CONFIG.TERRAIN.PLAIN,
            CONFIG.TERRAIN.FOREST,
            CONFIG.TERRAIN.WATER,
            CONFIG.TERRAIN.MOUNTAIN,
            CONFIG.TERRAIN.PASS
        ];
        return configs[index] || CONFIG.TERRAIN.PLAIN;
    }

    /**
     * 批量设置地形（用于生成地图）
     */
    setTerrainBatch(operations) {
        operations.forEach(op => {
            this.setTerrain(op.x, op.y, op.type);
        });
    }

    /**
     * 生成随机地形
     */
    generateRandomTerrain() {
        console.log('生成随机地形...');
        
        // 基础噪声生成（简化版）
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const rand = Math.random();
                
                if (rand < 0.6) {
                    this.setTerrain(x, y, 'plain');
                } else if (rand < 0.75) {
                    this.setTerrain(x, y, 'forest');
                } else if (rand < 0.85) {
                    this.setTerrain(x, y, 'water');
                } else if (rand < 0.95) {
                    this.setTerrain(x, y, 'mountain');
                } else {
                    this.setTerrain(x, y, 'pass');
                }
            }
        }
        
        console.log('地形生成完成');
    }

    /**
     * 导出地形数据（用于保存）
     */
    exportData() {
        return Array.from(this.terrainData);
    }

    /**
     * 导入地形数据（用于加载）
     */
    importData(data) {
        if (data.length === this.terrainData.length) {
            this.terrainData = new Uint8Array(data);
            return true;
        }
        return false;
    }

    /**
     * 检查坐标是否可通行
     */
    isPassable(x, y) {
        const config = this.getTerrainConfig(x, y);
        return config.passable;
    }

    /**
     * 获取移动力消耗
     */
    getMoveCost(x, y) {
        const config = this.getTerrainConfig(x, y);
        return config.moveCost;
    }
}

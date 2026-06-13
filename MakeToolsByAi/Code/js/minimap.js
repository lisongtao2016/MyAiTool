// 小地图系统

class MinimapSystem {
    constructor(canvas, gameMap) {
        this.canvas = canvas;
        this.gameMap = gameMap;
        
        // 设置小地图大小
        this.canvas.width = 250;
        this.canvas.height = 250;
        
        // 更新频率（毫秒）
        this.updateInterval = 500;
        this.lastUpdate = 0;
    }

    /**
     * 更新小地图
     */
    update(timestamp) {
        if (timestamp - this.lastUpdate < this.updateInterval) {
            return;
        }
        
        this.lastUpdate = timestamp;
        this.render();
    }

    /**
     * 渲染小地图
     */
    render() {
        const ctx = this.canvas.getContext('2d');
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 计算缩放比例
        const scaleX = width / this.gameMap.width;
        const scaleY = height / this.gameMap.height;
        const scale = Math.min(scaleX, scaleY);
        
        // 清空小地图
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);
        
        // 渲染地形
        const offsetX = (width - this.gameMap.width * scale) / 2;
        const offsetY = (height - this.gameMap.height * scale) / 2;
        
        // 优化：每2个格子渲染一次
        for (let y = 0; y < this.gameMap.height; y += 2) {
            for (let x = 0; x < this.gameMap.width; x += 2) {
                const terrain = this.gameMap.terrain.getTerrainConfig(x, y);
                ctx.fillStyle = terrain.color;
                ctx.fillRect(
                    offsetX + x * scale,
                    offsetY + y * scale,
                    scale * 2,
                    scale * 2
                );
            }
        }
        
        // 渲染设施标记
        const facilities = this.gameMap.facilities.getAllFacilities();
        facilities.forEach(facility => {
            ctx.fillStyle = facility.built ? '#ffd700' : '#ff6b6b';
            ctx.fillRect(
                offsetX + facility.x * scale - 1,
                offsetY + facility.y * scale - 1,
                3,
                3
            );
        });
        
        // 渲染视口框
        const viewWidth = this.gameMap.renderer.canvas.width / this.gameMap.camera.zoom;
        const viewHeight = this.gameMap.renderer.canvas.height / this.gameMap.camera.zoom;
        
        const viewX = offsetX + (this.gameMap.camera.x / this.gameMap.cellSize) * scale;
        const viewY = offsetY + (this.gameMap.camera.y / this.gameMap.cellSize) * scale;
        const viewW = (viewWidth / this.gameMap.cellSize) * scale;
        const viewH = (viewHeight / this.gameMap.cellSize) * scale;
        
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        ctx.strokeRect(viewX, viewY, viewW, viewH);
    }
}

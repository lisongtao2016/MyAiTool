// 地图渲染器

class MapRenderer {
    constructor(canvas, gameMap) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false }); // 优化：关闭透明
        this.gameMap = gameMap;
        
        // 设置画布大小
        this.resize();
        
        // 性能优化：离屏Canvas缓存
        this.terrainCache = null;  // 地形缓存层
        this.cacheDirty = true;    // 缓存是否过期
        this.lastZoom = 1.0;       // 上次缩放级别
        
        // 创建离屏Canvas用于缓存
        this.createOffscreenCanvas();
    }

    /**
     * 创建离屏Canvas
     */
    createOffscreenCanvas() {
        this.terrainCache = document.createElement('canvas');
        this.terrainCache.width = this.canvas.width;
        this.terrainCache.height = this.canvas.height;
        
        // 性能优化：分块缓存系统（Tile Cache）
        this.tileCache = new Map(); // 存储已渲染的瓦片
        this.tileSize = 512; // 每个瓦片的大小（像素）
        this.maxTiles = 20; // 最大缓存瓦片数
    }

    /**
     * 调整画布大小
     */
    resize() {
        const container = $('#map-container');
        this.canvas.width = container.width();
        this.canvas.height = container.height();
        
        // 同步调整缓存画布大小
        if (this.terrainCache) {
            this.terrainCache.width = this.canvas.width;
            this.terrainCache.height = this.canvas.height;
            this.cacheDirty = true; // 标记缓存过期
        }
    }

    /**
     * 渲染整个场景（优化版 - 分层渲染 + 动态加载）
     */
    render() {
        // 检测是否需要重建缓存（提高阈值，减少重建频率）
        const currentZoom = this.gameMap.camera.zoom;
        if (Math.abs(currentZoom - this.lastZoom) > 0.1 || this.cacheDirty) {
            console.log('开始重建缓存...');
            this.rebuildTerrainCache();
            console.log('缓存重建完成');
            this.lastZoom = currentZoom;
            this.cacheDirty = false;
        }
        
        // 第1层：绘制缓存的地形（静态层）- 非常快
        this.ctx.drawImage(this.terrainCache, 0, 0);
        
        // 计算可见区域
        const visibleRange = this.getVisibleRange();
        
        // 第2层：绘制网格（半透明，可以每帧重绘）
        this.renderGrid(visibleRange);
        
        // 第3层：绘制设施（动态层）
        this.renderFacilities(visibleRange);
        
        // 第4层：绘制高亮和选中（最上层）
        this.renderHighlights();
        
        // 更新FPS
        updateFPS();
    }

    /**
     * 重建地形缓存（优化版 - 只渲染可见区域）
     */
    rebuildTerrainCache() {
        const cacheCtx = this.terrainCache.getContext('2d', { alpha: false });
        
        // 清空缓存画布
        cacheCtx.fillStyle = '#0a0a0a';
        cacheCtx.fillRect(0, 0, this.terrainCache.width, this.terrainCache.height);
        
        // 优化：扩大渲染范围，确保覆盖整个视口
        const padding = CONFIG.PERFORMANCE.VIEWPORT_PADDING * 2; // 增加padding
        const startX = Math.floor(this.gameMap.camera.x / this.gameMap.cellSize) - padding;
        const startY = Math.floor(this.gameMap.camera.y / this.gameMap.cellSize) - padding;
        
        const viewWidth = this.canvas.width / this.gameMap.camera.zoom;
        const viewHeight = this.canvas.height / this.gameMap.camera.zoom;
        
        const endX = Math.ceil((this.gameMap.camera.x + viewWidth) / this.gameMap.cellSize) + padding;
        const endY = Math.ceil((this.gameMap.camera.y + viewHeight) / this.gameMap.cellSize) + padding;
        
        const range = {
            startX: Math.max(0, startX),
            startY: Math.max(0, startY),
            endX: Math.min(this.gameMap.width, endX),
            endY: Math.min(this.gameMap.height, endY)
        };
        
        // 调试信息
        console.log(`缓存重建: 范围 [${range.startX}, ${range.startY}] -> [${range.endX}, ${range.endY}], 共 ${(range.endX - range.startX) * (range.endY - range.startY)} 格`);
        
        // 渲染地形到缓存（传入相机位置用于坐标转换）
        this.renderTerrainToCache(cacheCtx, range, this.gameMap.camera.x, this.gameMap.camera.y);
    }

    /**
     * 渲染地形到缓存画布
     */
    renderTerrainToCache(ctx, range, cameraX, cameraY) {
        const { startX, startY, endX, endY } = range;
        const cellSize = this.gameMap.cellSize * this.gameMap.camera.zoom;
        
        let renderedCount = 0;
        
        // 优化：批量绘制相同类型的格子
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const terrain = this.gameMap.terrain.getTerrainConfig(x, y);
                
                if (CONFIG.MAP.GRID_TYPE === 'hexagon') {
                    // 六边形：计算相对于缓存画布的坐标
                    const worldPos = this.gameMap.hexGridToWorld(x, y);
                    const screenX = (worldPos.x - cameraX) * this.gameMap.camera.zoom;
                    const screenY = (worldPos.y - cameraY) * this.gameMap.camera.zoom;
                    this.renderHexTerrainCellToCache(ctx, screenX, screenY, cellSize, terrain, x, y);
                } else {
                    // 方形：计算相对于缓存画布的坐标
                    const worldX = x * this.gameMap.cellSize;
                    const worldY = y * this.gameMap.cellSize;
                    const screenX = (worldX - cameraX) * this.gameMap.camera.zoom;
                    const screenY = (worldY - cameraY) * this.gameMap.camera.zoom;
                    this.renderSquareTerrainCellToCache(ctx, screenX, screenY, cellSize, terrain, x, y);
                }
                renderedCount++;
            }
        }
        
        console.log(`实际渲染了 ${renderedCount} 个格子`);
    }

    /**
     * 获取瓦片坐标
     */
    getTileCoords(gridX, gridY) {
        const tileX = Math.floor(gridX / this.tileSize);
        const tileY = Math.floor(gridY / this.tileSize);
        return `${tileX},${tileY}`;
    }

    /**
     * 清理过期瓦片（LRU策略）
     */
    cleanupTiles() {
        if (this.tileCache.size > this.maxTiles) {
            // 删除最旧的瓦片
            const firstKey = this.tileCache.keys().next().value;
            this.tileCache.delete(firstKey);
        }
    }

    /**
     * 获取可见区域范围
     */
    getVisibleRange() {
        const padding = CONFIG.PERFORMANCE.VIEWPORT_PADDING;
        
        const startX = Math.floor(this.gameMap.camera.x / this.gameMap.cellSize) - padding;
        const startY = Math.floor(this.gameMap.camera.y / this.gameMap.cellSize) - padding;
        
        const viewWidth = this.canvas.width / this.gameMap.camera.zoom;
        const viewHeight = this.canvas.height / this.gameMap.camera.zoom;
        
        const endX = Math.ceil((this.gameMap.camera.x + viewWidth) / this.gameMap.cellSize) + padding;
        const endY = Math.ceil((this.gameMap.camera.y + viewHeight) / this.gameMap.cellSize) + padding;
        
        return {
            startX: Math.max(0, startX),
            startY: Math.max(0, startY),
            endX: Math.min(this.gameMap.width, endX),
            endY: Math.min(this.gameMap.height, endY)
        };
    }

    /**
     * 渲染地形（三国志11风格 - 3D倾斜视角）
     */
    renderTerrain(range) {
        const { startX, startY, endX, endY } = range;
        const cellSize = this.gameMap.cellSize * this.gameMap.camera.zoom;
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const terrain = this.gameMap.terrain.getTerrainConfig(x, y);
                const screenPos = this.gameMap.gridToScreen(x, y);
                
                // 绘制3D倾斜效果的地形
                this.renderTerrainCell(screenPos.x, screenPos.y, cellSize, terrain, x, y);
            }
        }
    }

    /**
     * 渲染方形地形格子到缓存（简化版）
     */
    renderSquareTerrainCellToCache(ctx, x, y, size, terrain, gridX, gridY) {
        // 基础颜色
        ctx.fillStyle = terrain.color;
        ctx.fillRect(x - size/2, y - size/2, size, size);
        
        // 简化纹理：只绘制3D边框，不绘制复杂纹理
        this.renderSimple3DBorder(ctx, x - size/2, y - size/2, size, terrain);
        
        // 网格线
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - size/2, y - size/2, size, size);
        
        // 绘制地形图标（Emoji）
        if (terrain.icon) {
            this.drawTerrainIcon(ctx, x, y, size / 2, terrain.icon);
        }
    }

    /**
     * 渲染六边形地形格子到缓存（简化版）
     */
    renderHexTerrainCellToCache(ctx, centerX, centerY, size, terrain, gridX, gridY) {
        // 六边形半径 = cellSize（因为cellSize定义为外接圆半径）
        const hexRadius = size;
        
        // 绘制六边形
        this.drawHexagonToContext(ctx, centerX, centerY, hexRadius, terrain.color);
        
        // 简化3D边框
        this.renderSimpleHex3DBorder(ctx, centerX, centerY, hexRadius, terrain);
        
        // 网格线
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1.5;
        this.drawHexagonOutlineToContext(ctx, centerX, centerY, hexRadius);
        
        // 绘制地形图标（Emoji）
        if (terrain.icon) {
            this.drawTerrainIcon(ctx, centerX, centerY, hexRadius, terrain.icon);
        }
    }

    /**
     * 简化的3D边框（无随机纹理）
     */
    renderSimple3DBorder(ctx, x, y, size, terrain) {
        const borderWidth = 3;
        let shadowIntensity = 0.3;
        if (terrain.type === 'mountain') shadowIntensity = 0.5;
        if (terrain.type === 'water') shadowIntensity = 0.2;
        
        // 顶部和左侧亮边
        ctx.fillStyle = `rgba(255, 255, 255, ${shadowIntensity * 0.5})`;
        ctx.fillRect(x, y, size, borderWidth);
        ctx.fillRect(x, y, borderWidth, size);
        
        // 底部和右侧暗边
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowIntensity})`;
        ctx.fillRect(x, y + size - borderWidth, size, borderWidth);
        ctx.fillRect(x + size - borderWidth, y, borderWidth, size);
    }

    /**
     * 简化的六边形3D边框
     */
    renderSimpleHex3DBorder(ctx, centerX, centerY, radius, terrain) {
        let shadowIntensity = 0.3;
        if (terrain.type === 'mountain') shadowIntensity = 0.5;
        if (terrain.type === 'water') shadowIntensity = 0.2;
        
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            points.push({
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            });
        }
        
        // 顶部亮边
        ctx.strokeStyle = `rgba(255, 255, 255, ${shadowIntensity * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(points[5].x, points[5].y);
        ctx.lineTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.stroke();
        
        // 底部暗边
        ctx.strokeStyle = `rgba(0, 0, 0, ${shadowIntensity})`;
        ctx.beginPath();
        ctx.moveTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.lineTo(points[4].x, points[4].y);
        ctx.stroke();
    }

    /**
     * 绘制六边形到指定上下文
     */
    drawHexagonToContext(ctx, centerX, centerY, radius, fillColor) {
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
    }

    /**
     * 绘制六边形轮廓到指定上下文
     */
    drawHexagonOutlineToContext(ctx, centerX, centerY, radius) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();
    }

    /**
     * 绘制地形图标（Emoji）
     */
    drawTerrainIcon(ctx, centerX, centerY, radius, icon) {
        // 根据半径计算字体大小
        const fontSize = Math.floor(radius * 0.8); // 图标大小为半径的80%
        
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 绘制白色描边
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeText(icon, centerX, centerY);
        
        // 绘制图标
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(icon, centerX, centerY);
    }

    /**
     * 渲染方形地形格子
     */
    renderSquareTerrainCell(x, y, size, terrain, gridX, gridY) {
        const ctx = this.ctx;
        
        // 基础颜色
        ctx.fillStyle = terrain.color;
        ctx.fillRect(x - size/2, y - size/2, size, size);
        
        // 添加纹理效果
        this.applyTerrainTexture(x - size/2, y - size/2, size, terrain.type);
        
        // 添加3D边框效果（模拟高度）
        this.render3DBorder(x - size/2, y - size/2, size, terrain);
        
        // 添加网格线
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - size/2, y - size/2, size, size);
    }

    /**
     * 渲染六边形地形格子
     */
    renderHexTerrainCell(centerX, centerY, size, terrain, gridX, gridY) {
        const ctx = this.ctx;
        // 六边形半径 = cellSize
        const hexRadius = size;
        
        // 绘制六边形
        this.drawHexagon(centerX, centerY, hexRadius, terrain.color);
        
        // 添加纹理效果
        this.applyHexTerrainTexture(centerX, centerY, hexRadius, terrain.type);
        
        // 添加3D边框效果
        this.renderHex3DBorder(centerX, centerY, hexRadius, terrain);
        
        // 添加网格线
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1.5;
        this.drawHexagonOutline(centerX, centerY, hexRadius);
    }

    /**
     * 绘制六边形
     */
    drawHexagon(centerX, centerY, radius, fillColor) {
        const ctx = this.ctx;
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
    }

    /**
     * 绘制六边形轮廓
     */
    drawHexagonOutline(centerX, centerY, radius) {
        const ctx = this.ctx;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();
    }

    /**
     * 应用地形纹理（支持六边形）
     */
    applyTerrainTexture(x, y, size, terrainType) {
        if (CONFIG.MAP.GRID_TYPE === 'hexagon') {
            this.applyHexTerrainTexture(x + size/2, y + size/2, size, terrainType);
            return;
        }
        
        const ctx = this.ctx;
        const patternSize = size / 8;
        
        switch(terrainType) {
            case 'plain':
                // 平原 - 淡淡的草地纹理
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                for (let i = 0; i < 4; i++) {
                    const px = x + Math.random() * size;
                    const py = y + Math.random() * size;
                    ctx.fillRect(px, py, patternSize / 2, patternSize / 2);
                }
                break;
                
            case 'forest':
                // 森林 - 树木点缀
                ctx.fillStyle = 'rgba(0, 50, 0, 0.3)';
                const treeCount = Math.floor(size / (patternSize * 2));
                for (let i = 0; i < treeCount; i++) {
                    const tx = x + patternSize + (i % 3) * patternSize * 2;
                    const ty = y + patternSize + Math.floor(i / 3) * patternSize * 2;
                    // 简化的树形
                    ctx.beginPath();
                    ctx.arc(tx, ty, patternSize / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'water':
                // 河流 - 波纹效果
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    const wy = y + size * 0.3 + i * size * 0.2;
                    ctx.beginPath();
                    ctx.moveTo(x + 5, wy);
                    ctx.quadraticCurveTo(
                        x + size / 2, wy - 5,
                        x + size - 5, wy
                    );
                    ctx.stroke();
                }
                break;
                
            case 'mountain':
                // 山地 - 岩石纹理
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                for (let i = 0; i < 5; i++) {
                    const rx = x + Math.random() * size * 0.7;
                    const ry = y + Math.random() * size * 0.7;
                    ctx.fillRect(rx, ry, patternSize, patternSize);
                }
                // 山峰标记
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.beginPath();
                ctx.moveTo(x + size / 2, y + size * 0.2);
                ctx.lineTo(x + size * 0.3, y + size * 0.7);
                ctx.lineTo(x + size * 0.7, y + size * 0.7);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'pass':
                // 关隘 - 城墙纹理
                ctx.strokeStyle = 'rgba(139, 69, 19, 0.5)';
                ctx.lineWidth = 3;
                ctx.strokeRect(x + 5, y + 5, size - 10, size - 10);
                ctx.strokeRect(x + 10, y + 10, size - 20, size - 20);
                break;
        }
    }

    /**
     * 应用六边形地形纹理
     */
    applyHexTerrainTexture(centerX, centerY, radius, terrainType) {
        const ctx = this.ctx;
        const patternSize = radius / 4;
        
        // 简化版纹理（在六边形内部）
        switch(terrainType) {
            case 'plain':
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                for (let i = 0; i < 3; i++) {
                    const px = centerX + (Math.random() - 0.5) * radius;
                    const py = centerY + (Math.random() - 0.5) * radius;
                    ctx.fillRect(px, py, patternSize / 2, patternSize / 2);
                }
                break;
                
            case 'forest':
                ctx.fillStyle = 'rgba(0, 50, 0, 0.3)';
                for (let i = 0; i < 2; i++) {
                    const tx = centerX + (Math.random() - 0.5) * radius * 0.6;
                    const ty = centerY + (Math.random() - 0.5) * radius * 0.6;
                    ctx.beginPath();
                    ctx.arc(tx, ty, patternSize / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'water':
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(centerX - radius * 0.5, centerY);
                ctx.quadraticCurveTo(centerX, centerY - 5, centerX + radius * 0.5, centerY);
                ctx.stroke();
                break;
                
            case 'mountain':
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - radius * 0.4);
                ctx.lineTo(centerX - radius * 0.3, centerY + radius * 0.3);
                ctx.lineTo(centerX + radius * 0.3, centerY + radius * 0.3);
                ctx.closePath();
                ctx.fill();
                break;
        }
    }

    /**
     * 渲染3D边框效果（支持六边形）
     */
    render3DBorder(x, y, size, terrain) {
        if (CONFIG.MAP.GRID_TYPE === 'hexagon') {
            this.renderHex3DBorder(x + size/2, y + size/2, size, terrain);
            return;
        }
        
        const ctx = this.ctx;
        const borderWidth = 3;
        
        // 根据地形类型调整阴影强度
        let shadowIntensity = 0.3;
        if (terrain.type === 'mountain') shadowIntensity = 0.5;
        if (terrain.type === 'water') shadowIntensity = 0.2;
        
        // 顶部和左侧亮边（光源来自左上）
        ctx.fillStyle = `rgba(255, 255, 255, ${shadowIntensity * 0.5})`;
        ctx.fillRect(x, y, size, borderWidth);
        ctx.fillRect(x, y, borderWidth, size);
        
        // 底部和右侧暗边（阴影）
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowIntensity})`;
        ctx.fillRect(x, y + size - borderWidth, size, borderWidth);
        ctx.fillRect(x + size - borderWidth, y, borderWidth, size);
    }

    /**
     * 渲染六边形3D边框
     */
    renderHex3DBorder(centerX, centerY, radius, terrain) {
        const ctx = this.ctx;
        
        // 根据地形类型调整阴影强度
        let shadowIntensity = 0.3;
        if (terrain.type === 'mountain') shadowIntensity = 0.5;
        if (terrain.type === 'water') shadowIntensity = 0.2;
        
        // 绘制六边形的3D效果（简化版：上下边缘）
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            points.push({
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            });
        }
        
        // 顶部亮边
        ctx.strokeStyle = `rgba(255, 255, 255, ${shadowIntensity * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(points[5].x, points[5].y);
        ctx.lineTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.stroke();
        
        // 底部暗边
        ctx.strokeStyle = `rgba(0, 0, 0, ${shadowIntensity})`;
        ctx.beginPath();
        ctx.moveTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.lineTo(points[4].x, points[4].y);
        ctx.stroke();
    }

    /**
     * 渲染网格（三国志11风格 - 细线网格）
     */
    renderGrid(range) {
        const { startX, startY, endX, endY } = range;
        const cellSize = this.gameMap.cellSize * this.gameMap.camera.zoom;
        
        // 根据缩放级别调整网格透明度
        const zoomLevel = this.gameMap.camera.zoom;
        let gridAlpha = 0.15;
        if (zoomLevel < 0.8) gridAlpha = 0.1;
        if (zoomLevel > 1.5) gridAlpha = 0.2;
        
        this.ctx.strokeStyle = `rgba(0, 0, 0, ${gridAlpha})`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        
        // 垂直线
        for (let x = startX; x <= endX; x++) {
            const screenPos = this.gameMap.gridToScreen(x, 0);
            this.ctx.moveTo(screenPos.x, this.gameMap.gridToScreen(startX, startY).y);
            this.ctx.lineTo(screenPos.x, this.gameMap.gridToScreen(endX, endY).y + cellSize);
        }
        
        // 水平线
        for (let y = startY; y <= endY; y++) {
            const screenPos = this.gameMap.gridToScreen(0, y);
            this.ctx.moveTo(this.gameMap.gridToScreen(startX, startY).x, screenPos.y);
            this.ctx.lineTo(this.gameMap.gridToScreen(endX, endY).x + cellSize, screenPos.y);
        }
        
        this.ctx.stroke();
    }

    /**
     * 渲染设施（三国志11风格）- 支持六边形
     */
    renderFacilities(range) {
        const { startX, startY, endX, endY } = range;
        const cellSize = this.gameMap.cellSize * this.gameMap.camera.zoom;
        
        // 遍历可见区域内的设施
        const facilities = this.gameMap.facilities.getAllFacilities();
        
        facilities.forEach(facility => {
            if (facility.x >= startX && facility.x < endX && 
                facility.y >= startY && facility.y < endY) {
                
                if (CONFIG.MAP.GRID_TYPE === 'hexagon') {
                    const screenPos = this.gameMap.hexGridToScreen(facility.x, facility.y);
                    // 渲染设施底座（3D效果）
                    this.renderFacilityBase(screenPos.x, screenPos.y, cellSize, facility);
                    
                    // 渲染设施图标
                    this.renderFacilityIcon(screenPos.x, screenPos.y, cellSize, facility);
                    
                    // 如果正在建造，显示进度
                    if (!facility.built) {
                        this.renderBuildProgress(screenPos.x, screenPos.y, cellSize, facility);
                    }
                } else {
                    const screenPos = this.gameMap.gridToScreen(facility.x, facility.y);
                    
                    // 渲染设施底座（3D效果）
                    this.renderFacilityBase(screenPos.x, screenPos.y, cellSize, facility);
                    
                    // 渲染设施图标
                    this.renderFacilityIcon(screenPos.x, screenPos.y, cellSize, facility);
                    
                    // 如果正在建造，显示进度
                    if (!facility.built) {
                        this.renderBuildProgress(screenPos.x, screenPos.y, cellSize, facility);
                    }
                }
            }
        });
    }

    /**
     * 渲染设施底座
     */
    renderFacilityBase(x, y, size, facility) {
        const ctx = this.ctx;
        
        // 底座阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x + 3, y + 3, size - 3, size - 3);
        
        // 底座背景（根据设施类型不同颜色）
        let baseColor = '#8B4513'; // 默认棕色
        if (facility.type === 'farm') baseColor = '#90EE90';
        else if (facility.type === 'market') baseColor = '#FFD700';
        else if (facility.type === 'barracks') baseColor = '#CD5C5C';
        else if (facility.type === 'fort' || facility.type === 'arrow_tower' || facility.type === 'catapult') {
            baseColor = '#696969';
        }
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
        
        // 底座边框
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
    }

    /**
     * 渲染设施图标
     */
    renderFacilityIcon(x, y, size, facility) {
        const ctx = this.ctx;
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        
        // 绘制图标背景圆形
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制图标边框
        ctx.strokeStyle = facility.built ? '#FFD700' : '#FF6B6B';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 绘制图标
        ctx.font = `${size * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(facility.icon, centerX, centerY);
    }

    /**
     * 渲染建造进度
     */
    renderBuildProgress(x, y, size, facility) {
        const progress = 1 - (facility.remainingBuildTime / facility.buildTime);
        
        // 半透明遮罩
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, size, size);
        
        // 进度条背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x + 2, y + size - 8, size - 4, 6);
        
        // 进度条填充
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(x + 2, y + size - 8, (size - 4) * progress, 6);
    }

    /**
     * 渲染高亮效果（三国志11风格）- 支持六边形
     */
    renderHighlights() {
        const cellSize = this.gameMap.cellSize * this.gameMap.camera.zoom;
        
        // 渲染悬停格子
        if (this.gameMap.hoveredCell) {
            const { x, y } = this.gameMap.hoveredCell;
            
            if (CONFIG.MAP.GRID_TYPE === 'hexagon') {
                const screenPos = this.gameMap.hexGridToScreen(x, y);
                this.renderHexHighlight(screenPos.x, screenPos.y, cellSize, false);
            } else {
                const screenPos = this.gameMap.gridToScreen(x, y);
                this.renderSquareHighlight(screenPos.x, screenPos.y, cellSize, false);
            }
        }
        
        // 渲染选中格子
        if (this.gameMap.selectedCell) {
            const { x, y } = this.gameMap.selectedCell;
            
            if (CONFIG.MAP.GRID_TYPE === 'hexagon') {
                const screenPos = this.gameMap.hexGridToScreen(x, y);
                this.renderHexHighlight(screenPos.x, screenPos.y, cellSize, true);
            } else {
                const screenPos = this.gameMap.gridToScreen(x, y);
                this.renderSquareHighlight(screenPos.x, screenPos.y, cellSize, true);
            }
        }
    }

    /**
     * 渲染方形高亮
     */
    renderSquareHighlight(x, y, size, isSelected) {
        const ctx = this.ctx;
        
        if (!isSelected) {
            // 悬停高亮
            ctx.fillStyle = CONFIG.RENDER.HIGHLIGHT_COLOR;
            ctx.fillRect(x - size/2, y - size/2, size, size);
            
            // 边框闪烁效果
            const time = Date.now() / 500;
            const alpha = 0.5 + Math.sin(time * Math.PI) * 0.3;
            ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x - size/2 + 1, y - size/2 + 1, size - 2, size - 2);
        } else {
            // 选中框外层
            ctx.strokeStyle = 'rgba(233, 69, 96, 0.8)';
            ctx.lineWidth = 4;
            ctx.strokeRect(x - size/2 + 2, y - size/2 + 2, size - 4, size - 4);
            
            // 选中框内层
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - size/2 + 4, y - size/2 + 4, size - 8, size - 8);
            
            // 四角标记
            const cornerSize = 8;
            ctx.strokeStyle = '#e94560';
            ctx.lineWidth = 3;
            
            // 左上角
            ctx.beginPath();
            ctx.moveTo(x - size/2 + 4, y - size/2 + 4 + cornerSize);
            ctx.lineTo(x - size/2 + 4, y - size/2 + 4);
            ctx.lineTo(x - size/2 + 4 + cornerSize, y - size/2 + 4);
            ctx.stroke();
            
            // 右上角
            ctx.beginPath();
            ctx.moveTo(x + size/2 - 4 - cornerSize, y - size/2 + 4);
            ctx.lineTo(x + size/2 - 4, y - size/2 + 4);
            ctx.lineTo(x + size/2 - 4, y - size/2 + 4 + cornerSize);
            ctx.stroke();
            
            // 左下角
            ctx.beginPath();
            ctx.moveTo(x - size/2 + 4, y + size/2 - 4 - cornerSize);
            ctx.lineTo(x - size/2 + 4, y + size/2 - 4);
            ctx.lineTo(x - size/2 + 4 + cornerSize, y + size/2 - 4);
            ctx.stroke();
            
            // 右下角
            ctx.beginPath();
            ctx.moveTo(x + size/2 - 4 - cornerSize, y + size/2 - 4);
            ctx.lineTo(x + size/2 - 4, y + size/2 - 4);
            ctx.lineTo(x + size/2 - 4, y + size/2 - 4 - cornerSize);
            ctx.stroke();
        }
    }

    /**
     * 渲染六边形高亮
     */
    renderHexHighlight(centerX, centerY, radius, isSelected) {
        const ctx = this.ctx;
        
        if (!isSelected) {
            // 悬停高亮 - 半透明填充
            ctx.fillStyle = CONFIG.RENDER.HIGHLIGHT_COLOR;
            this.drawHexagon(centerX, centerY, radius * 0.95);
            
            // 边框闪烁效果
            const time = Date.now() / 500;
            const alpha = 0.5 + Math.sin(time * Math.PI) * 0.3;
            ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
            ctx.lineWidth = 3;
            this.drawHexagonOutline(centerX, centerY, radius * 0.95);
        } else {
            // 选中框 - 双层六边形
            ctx.strokeStyle = 'rgba(233, 69, 96, 0.8)';
            ctx.lineWidth = 5;
            this.drawHexagonOutline(centerX, centerY, radius * 0.9);
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 3;
            this.drawHexagonOutline(centerX, centerY, radius * 0.8);
        }
    }

    /**
     * 渲染小地图
     */
    renderMinimap(minimapCanvas) {
        const ctx = minimapCanvas.getContext('2d');
        const width = minimapCanvas.width;
        const height = minimapCanvas.height;
        
        // 计算缩放比例
        const scaleX = width / this.gameMap.width;
        const scaleY = height / this.gameMap.height;
        const scale = Math.min(scaleX, scaleY);
        
        // 清空小地图
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);
        
        // 渲染地形（简化版，每个格子1像素）
        const offsetX = (width - this.gameMap.width * scale) / 2;
        const offsetY = (height - this.gameMap.height * scale) / 2;
        
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
        
        // 渲染视口框
        const viewX = offsetX + (this.gameMap.camera.x / this.gameMap.cellSize) * scale;
        const viewY = offsetY + (this.gameMap.camera.y / this.gameMap.cellSize) * scale;
        const viewWidth = (this.canvas.width / this.gameMap.camera.zoom / this.gameMap.cellSize) * scale;
        const viewHeight = (this.canvas.height / this.gameMap.camera.zoom / this.gameMap.cellSize) * scale;
        
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        ctx.strokeRect(viewX, viewY, viewWidth, viewHeight);
    }
}

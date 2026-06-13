// 地图系统 - 核心类

class GameMap {
    constructor() {
        this.width = CONFIG.MAP.WIDTH;
        this.height = CONFIG.MAP.HEIGHT;
        this.cellSize = CONFIG.MAP.CELL_SIZE;
        
        // 地形和设施系统
        this.terrain = new TerrainSystem(this.width, this.height);
        this.facilities = new FacilitySystem();
        
        // 相机/视口
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1.0
        };
        
        // 选中状态
        this.selectedCell = null;
        this.hoveredCell = null;
        
        // 初始化
        this.initialize();
    }

    /**
     * 初始化地图
     */
    initialize() {
        console.log('初始化地图...');
        
        // 生成随机地形（可以后续改为加载存档）
        this.terrain.generateRandomTerrain();
        
        // 设置相机到地图中心
        this.centerCamera();
        
        console.log('地图初始化完成');
    }

    /**
     * 将屏幕坐标转换为地图格子坐标（支持六边形）
     */
    screenToGrid(screenX, screenY) {
        const worldX = (screenX / this.camera.zoom) + this.camera.x;
        const worldY = (screenY / this.camera.zoom) + this.camera.y;
        
        if (CONFIG.MAP.GRID_TYPE === 'hexagon') {
            // 六边形网格转换
            return this.screenToHexGrid(worldX, worldY);
        } else {
            // 方形网格转换
            const gridX = Math.floor(worldX / this.cellSize);
            const gridY = Math.floor(worldY / this.cellSize);
            return { x: gridX, y: gridY };
        }
    }

    /**
     * 屏幕坐标转六边形网格坐标
     */
    screenToHexGrid(worldX, worldY) {
        const size = this.cellSize;
        const hexWidth = size * Math.sqrt(3);
        const hexHeight = size * 2;
        
        // 六边形网格计算
        const col = Math.floor(worldX / hexWidth);
        const row = Math.floor(worldY / (hexHeight * 0.75));
        
        // 修正偏移
        const xOffset = (row % 2) * (hexWidth / 2);
        const adjustedCol = Math.floor((worldX - xOffset) / hexWidth);
        
        return { x: adjustedCol, y: row };
    }

    /**
     * 将地图格子坐标转换为屏幕坐标（支持六边形）
     */
    gridToScreen(gridX, gridY) {
        if (CONFIG.MAP.GRID_TYPE === 'hexagon') {
            return this.hexGridToScreen(gridX, gridY);
        } else {
            const worldX = gridX * this.cellSize;
            const worldY = gridY * this.cellSize;
            
            const screenX = (worldX - this.camera.x) * this.camera.zoom;
            const screenY = (worldY - this.camera.y) * this.camera.zoom;
            
            return { x: screenX, y: screenY };
        }
    }

    /**
     * 六边形网格坐标转屏幕坐标
     */
    hexGridToScreen(gridX, gridY) {
        const radius = this.cellSize;
        // 平顶六边形的标准间距
        const horizSpacing = 1.5 * radius;  // 水平间距 = 1.5r
        const vertSpacing = Math.sqrt(3) * radius;  // 垂直间距 = √3r
        
        // 计算六边形中心位置
        const xOffset = (gridY % 2) * (horizSpacing / 2);  // 奇偶行偏移
        const worldX = gridX * horizSpacing + xOffset + horizSpacing / 2;
        const worldY = gridY * vertSpacing + vertSpacing / 2;
        
        const screenX = (worldX - this.camera.x) * this.camera.zoom;
        const screenY = (worldY - this.camera.y) * this.camera.zoom;
        
        return { x: screenX, y: screenY };
    }

    /**
     * 六边形网格坐标转世界坐标（不含相机偏移）
     */
    hexGridToWorld(gridX, gridY) {
        const radius = this.cellSize;
        // 平顶六边形的标准间距
        const horizSpacing = 1.5 * radius;
        const vertSpacing = Math.sqrt(3) * radius;
        
        // 计算六边形中心位置
        const xOffset = (gridY % 2) * (horizSpacing / 2);
        const worldX = gridX * horizSpacing + xOffset + horizSpacing / 2;
        const worldY = gridY * vertSpacing + vertSpacing / 2;
        
        return { x: worldX, y: worldY };
    }

    /**
     * 移动相机
     */
    moveCamera(deltaX, deltaY) {
        this.camera.x += deltaX;
        this.camera.y += deltaY;
        
        // 限制相机范围
        this.clampCamera();
    }

    /**
     * 缩放相机
     */
    zoomCamera(deltaZoom, centerX, centerY) {
        const oldZoom = this.camera.zoom;
        const newZoom = clamp(oldZoom + deltaZoom, CONFIG.MAP.MIN_ZOOM, CONFIG.MAP.MAX_ZOOM);
        
        if (newZoom === oldZoom) return;
        
        // 以鼠标位置为中心缩放
        const worldX = (centerX / oldZoom) + this.camera.x;
        const worldY = (centerY / oldZoom) + this.camera.y;
        
        this.camera.zoom = newZoom;
        
        this.camera.x = worldX - (centerX / newZoom);
        this.camera.y = worldY - (centerY / newZoom);
        
        this.clampCamera();
    }

    /**
     * 限制相机范围
     */
    clampCamera() {
        const mapPixelWidth = this.width * this.cellSize;
        const mapPixelHeight = this.height * this.cellSize;
        
        const canvasWidth = $('#game-map').width();
        const canvasHeight = $('#game-map').height();
        
        const viewWidth = canvasWidth / this.camera.zoom;
        const viewHeight = canvasHeight / this.camera.zoom;
        
        // 限制左边界
        this.camera.x = Math.max(0, Math.min(this.camera.x, mapPixelWidth - viewWidth));
        // 限制上边界
        this.camera.y = Math.max(0, Math.min(this.camera.y, mapPixelHeight - viewHeight));
    }

    /**
     * 相机居中到地图
     */
    centerCamera() {
        const canvasWidth = $('#game-map').width();
        const canvasHeight = $('#game-map').height();
        
        const mapPixelWidth = this.width * this.cellSize;
        const mapPixelHeight = this.height * this.cellSize;
        
        const viewWidth = canvasWidth / this.camera.zoom;
        const viewHeight = canvasHeight / this.camera.zoom;
        
        this.camera.x = (mapPixelWidth - viewWidth) / 2;
        this.camera.y = (mapPixelHeight - viewHeight) / 2;
    }

    /**
     * 选中格子
     */
    selectCell(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            this.selectedCell = null;
            return;
        }
        
        this.selectedCell = { x, y };
        this.updateCellInfo();
    }

    /**
     * 更新格子信息显示
     */
    updateCellInfo() {
        if (!this.selectedCell) {
            $('#cell-coords').text('-');
            $('#cell-terrain').text('-');
            $('#cell-facility').text('无');
            return;
        }
        
        const { x, y } = this.selectedCell;
        const terrain = this.terrain.getTerrainConfig(x, y);
        const facility = this.facilities.getFacility(x, y);
        
        $('#cell-coords').text(`(${x}, ${y})`);
        $('#cell-terrain').text(terrain.name);
        $('#cell-facility').text(facility ? facility.name : '无');
    }

    /**
     * 在选中位置建造设施
     */
    buildAtSelected(facilityType) {
        if (!this.selectedCell) {
            showNotification('请先选择一个位置', 'warning');
            return false;
        }
        
        const { x, y } = this.selectedCell;
        const config = getFacilityConfig(facilityType);
        
        if (!config) {
            showNotification('无效的设施类型', 'error');
            return false;
        }
        
        // 检查金钱
        if (gameState.gold < config.cost) {
            showNotification('金钱不足！', 'error');
            return false;
        }
        
        // 建造设施
        if (this.facilities.buildFacility(x, y, facilityType)) {
            gameState.gold -= config.cost;
            updateUI();
            showNotification(`${config.name} 开始建造`, 'success');
            
            // 标记渲染器缓存为过期（设施是动态层，不需要重建地形缓存）
            // 但为了保险起见，还是标记一下
            if (this.renderer) {
                this.renderer.cacheDirty = true;
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * 在选中位置设置地形
     */
    setTerrainAtSelected(terrainType) {
        if (!this.selectedCell) {
            showNotification('请先选择一个位置', 'warning');
            return false;
        }
        
        const { x, y } = this.selectedCell;
        
        if (this.terrain.setTerrain(x, y, terrainType)) {
            const config = getTerrainConfig(terrainType);
            showNotification(`地形已设置为 ${config.name}`, 'success');
            this.updateCellInfo();
            
            // 标记渲染器缓存为过期，需要重新渲染
            if (this.renderer) {
                this.renderer.cacheDirty = true;
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * 导出地图数据
     */
    exportData() {
        return {
            width: this.width,
            height: this.height,
            terrain: this.terrain.exportData(),
            facilities: this.facilities.exportData(),
            camera: { ...this.camera }
        };
    }

    /**
     * 导入地图数据
     */
    importData(data) {
        if (data.width !== this.width || data.height !== this.height) {
            console.error('地图尺寸不匹配');
            return false;
        }
        
        this.terrain.importData(data.terrain);
        this.facilities.importData(data.facilities);
        this.camera = { ...data.camera };
        
        return true;
    }
}

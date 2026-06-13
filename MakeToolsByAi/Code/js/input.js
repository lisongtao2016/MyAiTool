// 输入处理系统

class InputHandler {
    constructor(gameMap, renderer) {
        this.gameMap = gameMap;
        this.renderer = renderer;
        
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.currentMode = 'view'; // view, build, terrain
        
        this.selectedFacilityType = null;
        this.selectedTerrainType = null;
        
        this.initializeEventListeners();
    }

    /**
     * 初始化事件监听
     */
    initializeEventListeners() {
        const canvas = this.renderer.canvas;
        
        // 鼠标按下
        $(canvas).on('mousedown', (e) => this.handleMouseDown(e));
        
        // 鼠标移动
        $(canvas).on('mousemove', (e) => this.handleMouseMove(e));
        
        // 鼠标释放
        $(canvas).on('mouseup', (e) => this.handleMouseUp(e));
        
        // 鼠标滚轮（缩放）
        $(canvas).on('wheel', (e) => this.handleWheel(e));
        
        // 阻止右键菜单
        $(canvas).on('contextmenu', (e) => e.preventDefault());
        
        // 窗口大小改变
        $(window).on('resize', () => {
            this.renderer.resize();
        });
        
        // UI按钮事件
        this.initializeUIEvents();
    }

    /**
     * 初始化UI事件
     */
    initializeUIEvents() {
        // 模式切换按钮
        $('#btn-view-mode').on('click', () => this.setMode('view'));
        $('#btn-build-mode').on('click', () => this.setMode('build'));
        $('#btn-terrain-mode').on('click', () => this.setMode('terrain'));
        
        // 设施选择按钮
        $('.facility-btn').on('click', (e) => {
            const type = $(e.currentTarget).data('type');
            this.selectFacility(type);
        });
        
        // 地形选择按钮
        $('.terrain-btn').on('click', (e) => {
            const type = $(e.currentTarget).data('type');
            this.selectTerrain(type);
        });
        
        // 小地图点击
        $('#minimap').on('click', (e) => this.handleMinimapClick(e));
    }

    /**
     * 设置当前模式
     */
    setMode(mode) {
        this.currentMode = mode;
        
        // 更新按钮状态
        $('.btn').removeClass('active');
        $(`#btn-${mode}-mode`).addClass('active');
        
        // 显示/隐藏选项面板
        $('#build-options').toggle(mode === 'build');
        $('#terrain-options').toggle(mode === 'terrain');
        
        showNotification(`切换到${this.getModeName(mode)}模式`, 'info', 1500);
    }

    /**
     * 获取模式名称
     */
    getModeName(mode) {
        const names = {
            'view': '查看',
            'build': '建造',
            'terrain': '地形编辑'
        };
        return names[mode] || mode;
    }

    /**
     * 选择设施类型
     */
    selectFacility(type) {
        this.selectedFacilityType = type;
        const config = getFacilityConfig(type);
        showNotification(`选择了 ${config.name} (花费: ${config.cost})`, 'info', 2000);
    }

    /**
     * 选择地形类型
     */
    selectTerrain(type) {
        this.selectedTerrainType = type;
        const config = getTerrainConfig(type);
        showNotification(`选择了 ${config.name}`, 'info', 2000);
        $('#selected-terrain').text(config.name);
    }

    /**
     * 鼠标按下处理
     */
    handleMouseDown(e) {
        if (e.button === 0) { // 左键
            this.isDragging = false; // 默认不拖拽
            this.dragStartPos = { x: e.clientX, y: e.clientY }; // 记录起始位置
            this.lastMousePos = { x: e.clientX, y: e.clientY };
        }
    }

    /**
     * 鼠标移动处理
     */
    handleMouseMove(e) {
        const rect = this.renderer.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // 计算悬停的格子
        const gridPos = this.gameMap.screenToGrid(mouseX, mouseY);
        this.gameMap.hoveredCell = gridPos;
        
        // 检测是否开始拖拽（移动距离超过5像素）
        if (this.dragStartPos) {
            const moveDistance = Math.sqrt(
                Math.pow(e.clientX - this.dragStartPos.x, 2) + 
                Math.pow(e.clientY - this.dragStartPos.y, 2)
            );
            
            // 只有移动超过5像素且是查看模式才认为是拖拽
            if (moveDistance > 5 && this.currentMode === 'view') {
                this.isDragging = true;
            }
        }
        
        // 拖拽移动相机
        if (this.isDragging && this.currentMode === 'view') {
            const deltaX = (e.clientX - this.lastMousePos.x) / this.gameMap.camera.zoom;
            const deltaY = (e.clientY - this.lastMousePos.y) / this.gameMap.camera.zoom;
            
            this.gameMap.moveCamera(-deltaX, -deltaY);
            this.lastMousePos = { x: e.clientX, y: e.clientY };
        }
    }

    /**
     * 鼠标释放处理
     */
    handleMouseUp(e) {
        if (e.button === 0) { // 左键
            // 如果不是拖拽，则处理点击
            if (!this.isDragging) {
                const rect = this.renderer.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                const gridPos = this.gameMap.screenToGrid(mouseX, mouseY);
                
                // 检查是否在地图范围内
                if (gridPos.x >= 0 && gridPos.x < this.gameMap.width &&
                    gridPos.y >= 0 && gridPos.y < this.gameMap.height) {
                    
                    this.handleCellClick(gridPos.x, gridPos.y);
                }
            }
            
            // 重置状态
            this.isDragging = false;
            this.dragStartPos = null;
        }
    }

    /**
     * 格子点击处理
     */
    handleCellClick(x, y) {
        switch (this.currentMode) {
            case 'view':
                this.gameMap.selectCell(x, y);
                break;
                
            case 'build':
                if (this.selectedFacilityType) {
                    this.gameMap.selectCell(x, y);
                    this.gameMap.buildAtSelected(this.selectedFacilityType);
                } else {
                    showNotification('请先选择要建造的设施', 'warning');
                }
                break;
                
            case 'terrain':
                if (this.selectedTerrainType) {
                    this.gameMap.selectCell(x, y);
                    this.gameMap.setTerrainAtSelected(this.selectedTerrainType);
                } else {
                    showNotification('请先选择地形类型', 'warning');
                }
                break;
        }
    }

    /**
     * 鼠标滚轮处理（缩放）
     */
    handleWheel(e) {
        e.preventDefault();
        
        const rect = this.renderer.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const delta = e.originalEvent.deltaY > 0 ? -CONFIG.MAP.ZOOM_STEP : CONFIG.MAP.ZOOM_STEP;
        this.gameMap.zoomCamera(delta, mouseX, mouseY);
    }

    /**
     * 小地图点击处理
     */
    handleMinimapClick(e) {
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // 计算在小地图中的相对位置
        const scale = Math.min(
            canvas.width / this.gameMap.width,
            canvas.height / this.gameMap.height
        );
        
        const offsetX = (canvas.width - this.gameMap.width * scale) / 2;
        const offsetY = (canvas.height - this.gameMap.height * scale) / 2;
        
        // 转换为地图坐标
        const mapX = (mouseX - offsetX) / scale;
        const mapY = (mouseY - offsetY) / scale;
        
        // 移动相机到该位置
        this.gameMap.camera.x = mapX * this.gameMap.cellSize - 
            (this.renderer.canvas.width / this.gameMap.camera.zoom) / 2;
        this.gameMap.camera.y = mapY * this.gameMap.cellSize - 
            (this.renderer.canvas.height / this.gameMap.camera.zoom) / 2;
        
        this.gameMap.clampCamera();
    }
}

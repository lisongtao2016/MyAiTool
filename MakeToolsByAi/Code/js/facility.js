// 设施系统

class FacilitySystem {
    constructor() {
        // 使用 Map 存储设施，key为 "x,y"，value为设施对象
        this.facilities = new Map();
    }

    /**
     * 在指定位置建造设施
     */
    buildFacility(x, y, facilityType) {
        const key = `${x},${y}`;
        
        // 检查是否已有设施
        if (this.facilities.has(key)) {
            showNotification('该位置已有设施', 'warning');
            return false;
        }
        
        const config = getFacilityConfig(facilityType);
        if (!config) {
            showNotification('无效的设施类型', 'error');
            return false;
        }
        
        // 创建设施对象
        const facility = {
            id: generateId(),
            type: facilityType,
            x: x,
            y: y,
            name: config.name,
            icon: config.icon,
            cost: config.cost,
            maintainCost: config.maintainCost,
            buildTime: config.buildTime,
            remainingBuildTime: config.buildTime,
            hp: 100,
            maxHp: 100,
            built: false
        };
        
        this.facilities.set(key, facility);
        console.log(`在 (${x}, ${y}) 建造了 ${config.name}`);
        
        return true;
    }

    /**
     * 获取指定位置的设施
     */
    getFacility(x, y) {
        const key = `${x},${y}`;
        return this.facilities.get(key) || null;
    }

    /**
     * 移除设施
     */
    removeFacility(x, y) {
        const key = `${x},${y}`;
        if (this.facilities.has(key)) {
            this.facilities.delete(key);
            return true;
        }
        return false;
    }

    /**
     * 更新设施（每回合调用）
     */
    updateFacilities() {
        this.facilities.forEach((facility, key) => {
            if (!facility.built) {
                // 正在建造中
                facility.remainingBuildTime--;
                if (facility.remainingBuildTime <= 0) {
                    facility.built = true;
                    showNotification(`${facility.name} 建造完成！`, 'success');
                }
            } else {
                // 已建成的设施，扣除维护费
                // 这里可以添加设施效果逻辑
            }
        });
    }

    /**
     * 获取指定范围内的所有设施
     */
    getFacilitiesInRange(centerX, centerY, range) {
        const result = [];
        
        this.facilities.forEach((facility, key) => {
            const dist = distance(centerX, centerY, facility.x, facility.y);
            if (dist <= range) {
                result.push(facility);
            }
        });
        
        return result;
    }

    /**
     * 获取所有设施
     */
    getAllFacilities() {
        return Array.from(this.facilities.values());
    }

    /**
     * 检查位置是否有设施
     */
    hasFacility(x, y) {
        const key = `${x},${y}`;
        return this.facilities.has(key);
    }

    /**
     * 导出设施数据
     */
    exportData() {
        return Array.from(this.facilities.entries());
    }

    /**
     * 导入设施数据
     */
    importData(data) {
        this.facilities = new Map(data);
    }

    /**
     * 清空所有设施
     */
    clear() {
        this.facilities.clear();
    }

    /**
     * 获取设施数量
     */
    getCount() {
        return this.facilities.size;
    }
}

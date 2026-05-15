# 企业级日程管理系统

基于SQLite数据库的日程表系统，使用 .NET Framework 4.5+ 后端和原生 JavaScript 前端。

## 技术栈

- **前端**: HTML5 Canvas, 原生 JavaScript (ES6+)
- **后端**: .NET Framework 4.5+ (C#)
- **数据库**: SQLite 3
- **通信**: RESTful API, CORS支持

## 项目结构

- `src/frontend/` - 前端界面文件
  - `richengbiao.html` - 日程表前端界面（Canvas甘特图）
  - `map.html` - 地图前端界面
- `ScheduleApi/` - .NET Framework 4.5+ 后端API服务
  - `Program.cs` - 主程序入口
  - `Models/Task.cs` - 数据模型
  - `Services/DatabaseHelper.cs` - 数据库辅助类
  - `ScheduleApi.csproj` - 项目配置文件
- `data/` - 数据相关文件
  - `schema.sql` - SQLite数据库架构定义
  - `schedule.db` - SQLite数据库文件（自动创建）
- `tests/` - 测试文件目录
- `DOC/` - 文档目录
  - `地图需求` - 地图功能需求文档
  - `日程表需求` - 日程表功能需求文档
- `assets/` - 静态资源
  - `map.png` - 地图图片资源

## 快速开始

### 1. 启动后端服务器
```bash
# 进入 ScheduleApi 目录
cd ScheduleApi

# 使用 .NET CLI 运行
dotnet run
```

服务器启动后，访问 http://localhost:3001/api/tasks 测试API。

### 2. 打开前端界面
直接在浏览器中打开 `src/frontend/richengbiao.html` 文件，或者使用：
```bash
# Windows
start src/frontend/richengbiao.html
```

### 3. 初始化数据库（如果需要重新创建）
```bash
sqlite3 data/schedule.db ".read data/schema.sql"
```

## 功能特性

### 数据库功能
- ✅ SQLite数据库存储任务数据
- ✅ 完整的CRUD操作（GET/POST/PUT/DELETE）
- ✅ 支持中文数据存储
- ✅ 自动记录创建和更新时间
- ✅ 索引优化查询性能

### 前端功能
- ✅ Canvas绘制甘特图
- ✅ 实时编辑任务信息
- ✅ 按负责人搜索过滤
- ✅ 导出PNG图片
- ✅ 拖拽查看完整日程

### API接口
- `GET /api/tasks` - 获取所有任务
- `GET /api/tasks/search?owner=张三` - 按负责人搜索
- `POST /api/tasks` - 创建新任务
- `PUT /api/tasks/:id` - 更新任务
- `DELETE /api/tasks/:id` - 删除任务
- `GET /health` - 健康检查

## 数据库架构

```sql
-- 项目表
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务表
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    group_name TEXT NOT NULL,      -- 项目分组
    sub_group TEXT NOT NULL,       -- 子模块
    name TEXT NOT NULL,            -- 任务名称
    start_date DATE NOT NULL,      -- 开始日期
    end_date DATE NOT NULL,        -- 结束日期
    start_day INTEGER NOT NULL,    -- 开始天数
    duration INTEGER NOT NULL,     -- 持续时间
    plan INTEGER NOT NULL,         -- 计划进度
    actual INTEGER NOT NULL,       -- 实际进度
    owner TEXT NOT NULL,           -- 负责人
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

## 开发说明

### 数据流
1. 前端加载时调用 `GET /api/tasks` 获取数据
2. 用户编辑单元格时调用 `PUT /api/tasks/:id` 保存更改
3. 搜索时调用 `GET /api/tasks/search` 过滤数据
4. 所有数据持久化存储在SQLite数据库中

### 扩展建议
1. 添加用户认证功能
2. 支持多个项目切换
3. 添加任务依赖关系
4. 支持导入/导出Excel
5. 添加实时协作功能

## 故障排除

### 常见问题

#### 1. 服务器无法启动
- 检查端口3000是否被占用
- 确保Python 3.9+已安装
- 检查数据库文件是否存在

#### 2. 前端无法加载数据
- 确保后端服务器正在运行
- 检查浏览器控制台错误信息
- 验证API端点可访问性

#### 3. 数据库问题
```bash
# 检查数据库状态
sqlite3 data/schedule.db ".tables"
sqlite3 data/schedule.db "SELECT COUNT(*) FROM tasks"
```

### 测试工具
```bash
# 直接查询数据库
sqlite3 data/schedule.db "SELECT * FROM tasks LIMIT 5"
```

## 许可证

本项目仅供学习和演示使用。
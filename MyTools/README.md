# 团队协作日程管理系统 - 功能说明文档

## 📋 项目概述

这是一个基于 **HTML + Python (Flask) + SQLite** 开发的团队协作日程管理系统。系统支持多用户注册、项目管理、团队成员协作以及日程任务的分配与跟踪。

---

## 🎯 核心功能

### 1. 用户认证系统 🔐

#### 1.1 用户注册
- **功能描述**: 新用户可以通过注册页面创建账号
- **必填字段**:
  - 用户名 (唯一，不能重复)
  - 邮箱 (有效的电子邮件地址)
  - 密码 (使用 SHA256 加密存储)
- **验证规则**:
  - 用户名不能与已有用户重复
  - 所有字段都不能为空
- **成功后**: 自动跳转到登录页面

#### 1.2 用户登录
- **功能描述**: 已注册用户通过用户名和密码登录系统
- **验证方式**: 
  - 密码经过 SHA256 哈希后与数据库比对
  - 登录成功后创建 Session 会话
- **Session 管理**: 
  - 保存用户 ID 和用户名
  - 用于后续 API 请求的身份验证
- **失败提示**: 用户名或密码错误时显示错误信息

#### 1.3 用户登出
- **功能描述**: 清除当前用户的 Session 会话
- **效果**: 返回到登录页面
- **安全性**: 完全清除会话数据

#### 1.4 获取当前用户信息
- **API**: `GET /api/auth/me`
- **用途**: 前端页面加载时检查登录状态
- **返回**: 用户 ID 和用户名

---

### 2. 项目管理系统 📁

#### 2.1 创建项目
- **功能描述**: 用户可以创建新的项目
- **必填字段**: 项目名称
- **可选字段**: 项目描述
- **自动操作**:
  - 创建者自动成为项目所有者 (Owner)
  - 自动添加到项目成员列表
- **权限**: 只有登录用户可以创建项目

#### 2.2 查看项目列表
- **显示位置**: 左侧边栏
- **数据来源**: 当前用户参与的所有项目
- **排序**: 按创建时间倒序排列
- **交互**:
  - 点击项目切换当前选中项目
  - 选中项目高亮显示
  - 项目所有者可以看到"+"按钮添加成员

#### 2.3 添加项目成员
- **功能描述**: 项目所有者可以邀请其他用户加入项目
- **输入**: 
  - 用户名 (必须是已注册的用户)
  - 角色 (Member 成员 / Admin 管理员)
- **验证**:
  - 检查用户是否存在
  - 防止重复添加同一用户
- **显示**: 模态框中显示当前所有成员列表

#### 2.4 查看项目成员
- **显示内容**:
  - 用户名
  - 邮箱
  - 角色 (Owner/Admin/Member)
- **用途**: 
  - 了解项目团队构成
  - 为日程分配提供人员选择

---

### 3. 日程管理系统 📅

#### 3.1 创建日程
- **必填字段**:
  - 标题: 日程的简短描述
  - 日期: YYYY-MM-DD 格式
  - 项目: 必须选择一个项目
- **可选字段**:
  - 时间: HH:MM 格式
  - 优先级: 高/中/低 (默认: 中)
  - 状态: 待完成/已完成 (默认: 待完成)
  - 描述: 详细说明
  - 分配给: 从项目成员中选择
- **自动记录**:
  - 创建者 ID
  - 创建时间

#### 3.2 查看日程列表
- **显示方式**: 卡片式布局
- **显示内容**:
  - 标题
  - 日期和时间
  - 优先级标签 (颜色区分)
    - 🔴 红色: 高优先级
    - 🟡 黄色: 中优先级
    - 🟢 绿色: 低优先级
  - 状态标签
    - 🔵 蓝色: 待完成
    - 🟢 绿色: 已完成
  - 分配给的用户名
  - 描述 (如果有)
- **排序**: 按日期降序，时间升序
- **筛选**: 支持多维度筛选

#### 3.3 编辑日程
- **功能**: 修改日程的任何字段
- **操作**: 点击"编辑"按钮，表单自动填充当前数据
- **更新**: 提交后实时更新数据库

#### 3.4 标记完成
- **快捷操作**: 一键将状态改为"已完成"
- **条件**: 只有"待完成"状态的日程显示此按钮
- **反馈**: 显示成功消息并刷新列表

#### 3.5 删除日程
- **确认机制**: 删除前弹出确认对话框
- **权限**: 项目成员可以删除日程
- **不可恢复**: 删除后数据无法恢复

#### 3.6 日程筛选
- **按日期筛选**: 查看特定日期的所有日程
- **按优先级筛选**: 高/中/低优先级
- **按状态筛选**: 待完成/已完成
- **清除筛选**: 一键恢复显示所有日程

---

### 4. 统计面板 📊

#### 4.1 统计数据
- **总日程数**: 当前项目下的所有日程数量
- **待完成**: 状态为"pending"的日程数量
- **已完成**: 状态为"completed"的日程数量
- **实时更新**: 每次加载日程时自动更新

#### 4.2 显示位置
- 主内容区顶部
- 三个渐变色卡片并排显示
- 数字醒目，便于快速了解进度

---

## 🗄️ 数据库设计

### 表结构

#### 1. users (用户表)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,      -- 用户名 (唯一)
    password TEXT NOT NULL,              -- 密码 (SHA256加密)
    email TEXT NOT NULL,                 -- 邮箱
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- 注册时间
)
```

#### 2. projects (项目表)
```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                  -- 项目名称
    description TEXT,                    -- 项目描述
    owner_id INTEGER NOT NULL,           -- 所有者ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
    FOREIGN KEY (owner_id) REFERENCES users (id)
)
```

#### 3. project_members (项目成员表)
```sql
CREATE TABLE project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,         -- 项目ID
    user_id INTEGER NOT NULL,            -- 用户ID
    role TEXT DEFAULT 'member',          -- 角色: owner/admin/member
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- 加入时间
    FOREIGN KEY (project_id) REFERENCES projects (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(project_id, user_id)          -- 防止重复添加
)
```

#### 4. schedules (日程表)
```sql
CREATE TABLE schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,                 -- 标题
    date TEXT NOT NULL,                  -- 日期
    time TEXT,                           -- 时间
    description TEXT,                    -- 描述
    priority TEXT DEFAULT 'medium',      -- 优先级: high/medium/low
    status TEXT DEFAULT 'pending',       -- 状态: pending/completed
    project_id INTEGER NOT NULL,         -- 所属项目ID
    assigned_to INTEGER,                 -- 分配给的用户ID
    created_by INTEGER NOT NULL,         -- 创建者ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
    FOREIGN KEY (project_id) REFERENCES projects (id),
    FOREIGN KEY (assigned_to) REFERENCES users (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
)
```

---

## 🔌 API 接口文档

### 认证接口

#### POST /api/auth/register
**用户注册**
- **请求体**:
```json
{
  "username": "张三",
  "email": "zhangsan@example.com",
  "password": "password123"
}
```
- **成功响应**: `{"success": true, "message": "注册成功"}`
- **失败响应**: `{"success": false, "message": "用户名已存在"}`

#### POST /api/auth/login
**用户登录**
- **请求体**:
```json
{
  "username": "张三",
  "password": "password123"
}
```
- **成功响应**: 
```json
{
  "success": true,
  "message": "登录成功",
  "user": {"id": 1, "username": "张三", "email": "zhangsan@example.com"}
}
```

#### POST /api/auth/logout
**用户登出**
- **成功响应**: `{"success": true, "message": "已登出"}`

#### GET /api/auth/me
**获取当前用户**
- **成功响应**: `{"success": true, "user": {"id": 1, "username": "张三"}}`
- **未登录**: 返回 401 错误

---

### 项目接口

#### POST /api/projects
**创建项目** (需要登录)
- **请求头**: Session Cookie
- **请求体**:
```json
{
  "name": "项目开发",
  "description": "新产品开发项目"
}
```
- **成功响应**: `{"success": true, "message": "项目创建成功", "project_id": 1}`

#### GET /api/projects
**获取我的项目** (需要登录)
- **成功响应**:
```json
{
  "success": true,
  "data": [
    {"id": 1, "name": "项目开发", "description": "...", "owner_id": 1, "created_at": "..."}
  ]
}
```

#### POST /api/projects/{project_id}/members
**添加项目成员** (需要登录)
- **请求体**:
```json
{
  "username": "李四",
  "role": "member"
}
```
- **成功响应**: `{"success": true, "message": "成员添加成功"}`

#### GET /api/projects/{project_id}/members
**获取项目成员** (需要登录)
- **成功响应**:
```json
{
  "success": true,
  "data": [
    {"id": 1, "username": "张三", "email": "...", "role": "owner"},
    {"id": 2, "username": "李四", "email": "...", "role": "member"}
  ]
}
```

---

### 日程接口

#### GET /api/schedules
**获取日程列表** (需要登录)
- **查询参数**:
  - `project_id`: 项目ID (必需)
  - `date`: 日期筛选 (可选)
- **成功响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "会议",
      "date": "2026-05-01",
      "time": "14:00",
      "description": "项目讨论",
      "priority": "high",
      "status": "pending",
      "project_id": 1,
      "assigned_to": 2,
      "assigned_username": "李四",
      "created_by": 1,
      "created_at": "..."
    }
  ]
}
```

#### POST /api/schedules
**创建日程** (需要登录)
- **请求体**:
```json
{
  "title": "会议",
  "date": "2026-05-01",
  "time": "14:00",
  "description": "项目讨论",
  "priority": "high",
  "status": "pending",
  "project_id": 1,
  "assigned_to": 2
}
```

#### PUT /api/schedules/{schedule_id}
**更新日程** (需要登录)
- **请求体**: 同创建日程

#### DELETE /api/schedules/{schedule_id}
**删除日程** (需要登录)
- **成功响应**: `{"success": true, "message": "日程删除成功"}`

---

## 🎨 界面设计

### 登录/注册页面
- **居中布局**: 白色卡片悬浮在渐变背景上
- **标签切换**: 登录/注册两个标签页
- **表单验证**: 实时验证必填字段
- **消息提示**: 成功/失败消息以彩色条显示

### 主应用页面

#### 顶部导航栏
- **渐变紫色背景**
- **左侧**: 系统标题
- **右侧**: 当前用户名 + 退出登录按钮

#### 左侧边栏
- **浅灰色背景**
- **项目列表**: 垂直排列的项目卡片
- **创建按钮**: "+ 创建项目"
- **交互效果**: 悬停和选中状态有动画
- **添加成员**: 项目所有者看到"+"按钮

#### 主内容区

**统计卡片区域**
- 三列网格布局
- 渐变色卡片
- 大数字显示

**表单区域**
- 灰色背景区块
- 多行表单布局
- 响应式网格

**筛选区域**
- 三个下拉/输入框
- 清除筛选按钮

**日程列表区域**
- 卡片式设计
- 悬停效果
- 操作按钮组

---

## 🔒 安全特性

### 1. 密码加密
- **算法**: SHA256 哈希
- **存储**: 数据库中只存储哈希值
- **验证**: 登录时对比哈希值

### 2. Session 管理
- **密钥**: 随机生成的 32 字节密钥
- **存储**: 服务器端 Session
- **有效期**: 浏览器关闭后失效

### 3. 权限控制
- **登录装饰器**: `@login_required`
- **API 保护**: 所有业务接口需要登录
- **项目权限**: 只能查看自己参与的项目
- **数据隔离**: 不同项目的数据相互隔离

### 4. SQL 注入防护
- **参数化查询**: 所有 SQL 使用 `?` 占位符
- **输入验证**: 前后端双重验证

---

## 🚀 技术栈

### 后端
- **Python 3.9+**
- **Flask 3.1.3**: Web 框架
- **SQLite3**: 数据库
- **hashlib**: 密码加密
- **secrets**: Session 密钥生成

### 前端
- **HTML5**: 页面结构
- **CSS3**: 样式设计 (Flexbox, Grid, 渐变)
- **JavaScript (ES6+)**: 交互逻辑
- **Fetch API**: AJAX 请求

### 数据库
- **SQLite**: 轻量级关系型数据库
- **外键约束**: 保证数据完整性
- **事务支持**: ACID 特性

---

## 📦 项目结构

```
MyTools/
├── app.py                      # Flask 后端主程序
│   ├── 用户认证 API
│   ├── 项目管理 API
│   └── 日程管理 API
├── database.py                 # 数据库管理器 (备用)
├── templates/
│   └── index.html             # 前端单页应用
│       ├── 登录/注册界面
│       ├── 项目管理界面
│       └── 日程管理界面
├── mytools.db                 # SQLite 数据库文件 (自动生成)
└── README.md                  # 本说明文档
```

---

## 💡 使用场景

### 场景 1: 小团队协作
1. 团队领导注册账号并创建项目
2. 邀请团队成员注册并加入项目
3. 为每个成员分配任务日程
4. 跟踪任务完成进度

### 场景 2: 个人多项目管理
1. 个人用户注册账号
2. 创建多个项目 (工作、学习、生活)
3. 为每个项目添加日程
4. 通过筛选查看不同项目的任务

### 场景 3: 跨部门协作
1. 各部门负责人创建各自项目
2. 添加跨部门成员
3. 分配跨部门协作任务
4. 统一跟踪所有项目进度

---

## 🔧 部署说明

### 本地开发环境

#### 1. 安装依赖
```bash
pip3 install flask
```

#### 2. 运行应用
```bash
cd /Users/ilike/Documents/GitHub/Personal_AI_TOOLS_DEV/MyTools
python3 app.py
```

#### 3. 访问应用
打开浏览器访问: `http://127.0.0.1:5000`

### 生产环境建议

1. **Web 服务器**: 使用 Nginx + Gunicorn
2. **数据库**: 考虑迁移到 PostgreSQL 或 MySQL
3. **HTTPS**: 配置 SSL 证书
4. **环境变量**: 使用 `.env` 文件管理配置
5. **日志**: 启用详细日志记录
6. **备份**: 定期备份数据库文件

---

## 🐛 已知限制

1. **密码强度**: 目前没有密码复杂度要求
2. **邮箱验证**: 注册时不验证邮箱真实性
3. **文件上传**: 不支持附件上传
4. **通知系统**: 没有邮件或站内通知
5. **日历视图**: 只有列表视图，没有月历/周历视图
6. **导出功能**: 不支持导出为 Excel/PDF

---

## 🎯 未来扩展方向

### 短期优化
- [ ] 密码强度验证
- [ ] 邮箱验证功能
- [ ] 日程提醒通知
- [ ] 日历视图 (月历/周历)
- [ ] 日程导出 (Excel/CSV)

### 中期扩展
- [ ] 文件附件上传
- [ ] 日程评论功能
- [ ] 甘特图视图
- [ ] 移动端适配优化
- [ ] API 速率限制

### 长期规划
- [ ] 实时协作 (WebSocket)
- [ ] 第三方集成 (Google Calendar)
- [ ] AI 智能推荐
- [ ] 多语言支持
- [ ] 数据分析报表

---

## 📞 技术支持

如有问题或建议，请联系开发团队。

---

**版本**: 1.0.0  
**更新日期**: 2026-04-30  
**开发者**: AI Assistant

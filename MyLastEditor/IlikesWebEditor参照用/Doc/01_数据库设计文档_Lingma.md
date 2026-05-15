# 数据库表结构定义

**数据库文件**: `App_Data/EditorContent.db`  
**数据库类型**: SQLite 3  
**设计规范**: 第三范式 + 必要反范式优化

---

## 📋 EditorContents - 编辑器内容表

**用途**: 存储用户创建的代码片段和富文本文档

| # | 字段 | 类型 | 约束 | 说明 |
|---|------|------|------|------|
| 1 | Id | INTEGER | PK, AUTOINCREMENT | 主键ID |
| 2 | Title | NVARCHAR(255) | NOT NULL | 标题 |
| 3 | Subtitle | NVARCHAR(500) | - | 副标题 |
| 4 | Content | TEXT | NOT NULL | 内容（HTML/代码） |
| 5 | PlainText | TEXT | - | 纯文本（搜索用，反范式冗余） |
| 6 | Language | NVARCHAR(50) | NOT NULL | 语言/编辑器类型 |
| 7 | Author | NVARCHAR(100) | - | 作者姓名 |
| 8 | Category | NVARCHAR(100) | - | 分类标签 |
| 9 | HotTags | NVARCHAR(500) | - | 热门标签（逗号分隔） |
| 10 | ShareTo | NVARCHAR(500) | - | 分享对象（邮箱列表） |
| 11 | ProjectId | INTEGER | - | 项目ID（外键→Projects.Id） |
| 12 | CreatedDate | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| 13 | ModifiedDate | DATETIME | DEFAULT CURRENT_TIMESTAMP | 修改时间 |

**索引设计**:
- `idx_created_date`: CreatedDate DESC（按时间排序列表）
- `idx_language`: Language（按语言筛选）
- `idx_author`: Author（按作者查询）
- `idx_plaintext`: PlainText（全文搜索）
- `idx_project`: ProjectId（按项目筛选）

**建表SQL**:
```sql
CREATE TABLE IF NOT EXISTS EditorContents (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Title NVARCHAR(255) NOT NULL,
    Subtitle NVARCHAR(500),
    Content TEXT NOT NULL,
    PlainText TEXT,
    Language NVARCHAR(50) NOT NULL,
    Author NVARCHAR(100),
    Category NVARCHAR(100),
    HotTags NVARCHAR(500),
    ShareTo NVARCHAR(500),
    ProjectId INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedDate DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📁 Projects - 项目表

**用途**: 组织和管理编辑器内容的项目分组

| # | 字段 | 类型 | 约束 | 说明 |
|---|------|------|------|------|
| 1 | Id | INTEGER | PK, AUTOINCREMENT | 主键ID |
| 2 | Name | NVARCHAR(100) | NOT NULL, UNIQUE | 项目名称 |
| 3 | Description | NVARCHAR(500) | - | 项目描述 |
| 4 | CreatedBy | NVARCHAR(100) | - | 创建者用户名 |
| 5 | IsActive | TINYINT | DEFAULT 1 | 是否激活（0=禁用/删除） |
| 6 | CreatedDate | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| 7 | ModifiedDate | DATETIME | DEFAULT CURRENT_TIMESTAMP | 修改时间 |

**索引设计**:
- `idx_projects_name`: Name（唯一索引，快速查找）
- `idx_projects_active`: IsActive（筛选活跃项目）

**建表SQL**:
```sql
CREATE TABLE IF NOT EXISTS Projects (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name NVARCHAR(100) NOT NULL UNIQUE,
    Description NVARCHAR(500),
    CreatedBy NVARCHAR(100),
    IsActive TINYINT DEFAULT 1,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedDate DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 👤 Users - 用户表

**用途**: 系统用户认证和基本信息管理

| # | 字段 | 类型 | 约束 | 说明 |
|---|------|------|------|------|
| 1 | Id | INTEGER | PK, AUTOINCREMENT | 主键ID |
| 2 | Username | NVARCHAR(50) | NOT NULL, UNIQUE | 用户名（登录用） |
| 3 | Email | NVARCHAR(255) | NOT NULL, UNIQUE | 邮箱地址 |
| 4 | PasswordHash | CHAR(64) | NOT NULL | 密码哈希（SHA256十六进制） |
| 5 | DisplayName | NVARCHAR(100) | - | 显示名称 |
| 6 | Avatar | NVARCHAR(500) | - | 头像URL（Base64或路径） |
| 7 | Role | NVARCHAR(20) | DEFAULT 'user' | 角色（user/admin） |
| 8 | IsActive | TINYINT | DEFAULT 1 | 是否激活（0=禁用） |
| 9 | LastLoginDate | DATETIME | - | 最后登录时间 |
| 10 | CreatedDate | DATETIME | DEFAULT CURRENT_TIMESTAMP | 注册时间 |
| 11 | ModifiedDate | DATETIME | DEFAULT CURRENT_TIMESTAMP | 修改时间 |

**索引设计**:
- `idx_users_username`: Username（唯一索引，登录验证）
- `idx_users_email`: Email（唯一索引，邮箱查找）
- `idx_users_role`: Role（按角色筛选）
- `idx_users_active`: IsActive（筛选活跃用户）

**建表SQL**:
```sql
CREATE TABLE IF NOT EXISTS Users (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash CHAR(64) NOT NULL,
    DisplayName NVARCHAR(100),
    Avatar NVARCHAR(500),
    Role NVARCHAR(20) DEFAULT 'user',
    IsActive TINYINT DEFAULT 1,
    LastLoginDate DATETIME,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedDate DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔑 设计要点

### 1. 数据类型优化
- **PasswordHash**: 使用 `CHAR(64)` 而非 `NVARCHAR(255)`，SHA256固定64字符，节省空间
- **IsActive/Role**: 使用 `TINYINT` 和短 `NVARCHAR`，减少存储开销
- **Username**: 限制50字符（原100），足够且节省空间

### 2. 反范式优化
- **PlainText**: 冗余存储纯文本，避免每次搜索时解析HTML，提升搜索性能
- **Author**: 冗余存储作者姓名，避免Join Users表

### 3. 软删除策略
- **Projects.IsActive**: 0表示已删除，保留历史数据
- **Users.IsActive**: 0表示已禁用，不物理删除

### 4. 头像存储方案
- **Avatar字段**: 支持两种格式
  - Base64: `data:image/png;base64,iVBORw0KG...`
  - 文件路径: `/uploads/avatars/user_123.png`
- **默认值**: NULL（使用默认头像）

### 5. 元数据闭环
- 所有表都有 `CreatedDate` 和 `ModifiedDate`
- 自动维护时间戳，便于审计和统计

---

## 🔄 字段迁移支持

数据库支持动态添加新字段（向后兼容）：

```csharp
// 示例：添加 Avatar 字段
try {
    SELECT Avatar FROM Users LIMIT 1;
} catch {
    ALTER TABLE Users ADD COLUMN Avatar NVARCHAR(500);
}
```

---

*版本: 2.0*  
*最后更新: 2026-04-07*  
*更新内容: 添加 Users.Avatar 字段，优化数据类型，完善索引设计*

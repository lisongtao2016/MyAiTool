修改目标：根据最新优化的 SQLite 架构，同步生成结构化的中文数据库设计文档，并存至指定目录。

保持不变：保留原有的表名、字段用途定义及软删除业务逻辑。

代码实现（文档内容）：

---

# DOC/数据库设计说明书.md

## 1. 概述
* **数据库文件**: `App_Data/EditorContent.db`
* **数据库类型**: SQLite 3
* **编码格式**: UTF-8
* **设计原则**: 极致精简、存储优化、约束严谨。

## 2. 表结构详解

### 2.1 EditorContents (编辑器内容表)
存储代码片段与富文本文档。

| 字段 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| Id | INTEGER | PK, AUTOINC | 唯一标识 |
| Title | TEXT | NOT NULL | 标题 |
| Content | TEXT | NOT NULL | 存储 HTML 或原始代码 |
| PlainText | TEXT | - | 冗余字段，用于提升全文搜索效率 |
| Language | TEXT | NOT NULL | 编辑器语言类型 (max: 50) |
| ProjectId | INTEGER | FK | 关联 `Projects.Id`, 级联设置为 SET NULL |
| CreatedDate | DATETIME | DEFAULT NOW | 创建时间 (LocalTime) |
| ModifiedDate | DATETIME | DEFAULT NOW | 自动更新的最后修改时间 |

### 2.2 Projects (项目分组表)
| 字段 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| Id | INTEGER | PK, AUTOINC | 唯一标识 |
| Name | TEXT | NOT NULL, UNIQUE | 项目名称 |
| IsActive | TINYINT | DEFAULT 1 | 状态: 1-活跃, 0-禁用/软删除 |

### 2.3 Users (用户认证表)
| 字段 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| Id | INTEGER | PK, AUTOINC | 唯一标识 |
| Username | TEXT | NOT NULL, UNIQUE | 登录账号 |
| Email | TEXT | NOT NULL, UNIQUE | 格式校验: `CHECK(Email LIKE '%@%')` |
| PasswordHash | CHAR(64) | NOT NULL | SHA256 哈希值 (固定长度优化) |
| Role | TEXT | DEFAULT 'user' | 权限约束: `CHECK(Role IN ('user', 'admin'))` |

## 3. 核心优化特性
* **触发器自维**: 建立 `trg_EditorContents_update` 触发器，在数据变动时由数据库层自动刷新 `ModifiedDate`，确保审计真实性。
* **外键完整性**: 显式声明 `REFERENCES` 约束，防止产生失效的项目关联。
* **存储极致化**: 
    * 取消冗余的 `NVARCHAR` 声明，统一使用 SQLite 原生 `TEXT` 提升解析速度。
    * `PasswordHash` 使用 `CHAR(64)` 锁定静态存储空间。
* **时间戳统一**: 使用 `datetime('now', 'localtime')` 规避应用层时区差异引发的逻辑 Bug。

---

回归自检：
* **规范检查**：文件名包含中文，路径指向 `DOC/`。
* **内容完整性**：涵盖了所有表字段、约束说明及优化点。
* **精简程度**：文档排版紧凑，无冗余说明。

冲突预警：
由于 SQLite 默认可能不开启外键约束，请确保在应用连接字符串中添加 `Foreign Keys=True`，否则 `ProjectId` 的级联约束将失效。
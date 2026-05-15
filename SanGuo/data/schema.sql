-- SQLite 数据库架构 for 日程表系统
-- 数据库极致存储优化：使用最小空间占用类型

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 主键ID
    name TEXT NOT NULL,  -- 项目名称
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- 创建时间
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 主键ID
    project_id INTEGER,  -- 项目ID（外键）
    group_name TEXT NOT NULL,  -- 项目分组
    sub_group TEXT NOT NULL,  -- 子模块
    name TEXT NOT NULL,  -- 任务名称
    start_date DATE NOT NULL,  -- 开始日期
    end_date DATE NOT NULL,  -- 结束日期
    start_day INTEGER NOT NULL DEFAULT 0,  -- 开始天数（甘特图偏移量）
    duration INTEGER NOT NULL,  -- 持续时间（天）
    plan INTEGER NOT NULL DEFAULT 100,  -- 计划进度（百分比）
    actual INTEGER NOT NULL DEFAULT 0,  -- 实际进度（百分比）
    owner TEXT NOT NULL,  -- 负责人
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 更新时间
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_end_date ON tasks(end_date);

-- 插入示例数据
INSERT INTO projects (name) VALUES ('核心A项目');

INSERT INTO tasks (project_id, group_name, sub_group, name, start_date, end_date, start_day, duration, plan, actual, owner)
VALUES 
    (1, '核心A项目', '模块0', '开发任务 #0', '2026-04-06', '2026-04-15', 0, 5, 100, 45, '张三'),
    (1, '核心A项目', '模块1', '开发任务 #1', '2026-04-06', '2026-04-15', 1, 6, 100, 78, '李四'),
    (1, '核心A项目', '模块2', '开发任务 #2', '2026-04-06', '2026-04-15', 2, 7, 100, 32, '王五'),
    (1, '核心A项目', '模块3', '开发任务 #3', '2026-04-06', '2026-04-15', 3, 8, 100, 90, '张三'),
    (1, '核心A项目', '模块4', '开发任务 #4', '2026-04-06', '2026-04-15', 4, 9, 100, 67, '李四'),
    (1, '核心A项目', '模块0', '开发任务 #5', '2026-04-06', '2026-04-15', 5, 10, 100, 23, '王五'),
    (1, '核心A项目', '模块1', '开发任务 #6', '2026-04-06', '2026-04-15', 6, 11, 100, 88, '张三'),
    (1, '核心A项目', '模块2', '开发任务 #7', '2026-04-06', '2026-04-15', 7, 12, 100, 54, '李四'),
    (1, '核心A项目', '模块3', '开发任务 #8', '2026-04-06', '2026-04-15', 8, 13, 100, 76, '王五'),
    (1, '核心A项目', '模块4', '开发任务 #9', '2026-04-06', '2026-04-15', 9, 14, 100, 92, '张三');
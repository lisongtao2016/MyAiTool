# 项目配置信息

> **说明**: 本文件仅包含当前项目的特定配置，通用开发规范请参考 `.cursorrules`

## 一、技术栈

### 1.1 核心技术
- **前端**: JavaScript (ES6+) + HTML5 / CSS3
- **UI库**: jQuery 3.x
- **后端**: Python 3.8+ + Flask/FastAPI
- **数据库**: SQLite 3 (本地文件数据库)
- **开发工具**: Visual Studio Code (VSCode)

## 二、项目目录结构

```
根目录/Code/
├── index.html          # 主页面入口
├── css/                # 样式文件
│   ├── style.css       # 主样式
│   └── components.css  # 组件样式
├── js/                 # JavaScript 文件
│   ├── app.js          # 主应用逻辑
│   ├── utils.js        # 工具函数
│   └── api.js          # API 请求封装
├── libs/               # 第三方库
│   └── jquery.min.js   # jQuery 库
├── server/             # Python 后端
│   ├── app.py          # Flask/FastAPI 主文件
│   ├── routes/         # API 路由
│   ├── models/         # 数据模型
│   └── database.py     # 数据库操作
├── data/               # SQLite 数据库文件
│   └── app.db          # 主数据库
├── assets/             # 静态资源
│   ├── images/         # 图片
│   └── fonts/          # 字体
├── docs/               # 文档
├── requirements.txt    # Python 依赖包
└── .gitignore          # Git 忽略文件
```

## 三、VSCode 开发环境配置

### 3.1 必需扩展
在 VSCode 中安装以下扩展：
- **Live Server**: 实时预览 HTML 页面（自动刷新）
- **Python**: Python 语言支持（微软官方）
- **Pylance**: Python 智能提示和类型检查
- **SQLite Viewer**: 查看和管理 SQLite 数据库文件
- **JavaScript (ES6) code snippets**: ES6 代码片段
- **HTML CSS Support**: HTML/CSS 智能提示
- **Auto Rename Tag**: 自动重命名配对的 HTML 标签
- **Path Intellisense**: 文件路径自动补全

### 3.2 推荐扩展
- **Prettier - Code formatter**: 代码格式化
- **ESLint**: JavaScript 代码检查
- **jQuery Code Snippets**: jQuery 代码片段
- **Bracket Pair Colorizer**: 括号配对高亮
- **Image preview**: 图片预览
- **Python Indent**: Python 缩进优化
- **DotENV**: .env 文件支持

### 3.3 VSCode 设置
在 `.vscode/settings.json` 中添加：
```json
{
  "editor.formatOnSave": true,
  "editor.tabSize": 2,
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  },
  "liveServer.settings.donotShowInfoMsg": true,
  "python.defaultInterpreterPath": "./venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true
}
```

### 3.4 工作区推荐设置
- 启用自动保存 (File > Auto Save)
- 启用格式保存 (Format On Save)
- Tab 大小: 2 空格
- 启用最小地图 (Minimap)
- 启用面包屑导航 (Breadcrumbs)

### 3.5 Python 环境配置

#### 创建虚拟环境
```bash
# 在项目根目录执行
cd Code
python -m venv venv

# Windows 激活
venv\Scripts\activate

# macOS/Linux 激活
source venv/bin/activate
```

#### 安装依赖
```bash
# Flask 方案
pip install flask flask-cors better-sqlite3

# 或 FastAPI 方案
pip install fastapi uvicorn sqlalchemy aiosqlite

# 保存依赖
pip freeze > requirements.txt
```

### 3.6 配置文件示例

#### Python 配置 (server/config.py)
```python
# server/config.py
import os

class Config:
    DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'app.db')
    DEBUG = True
    PAGE_SIZE = 20
    SECRET_KEY = 'your-secret-key-here'
```

#### JavaScript 配置 (js/config.js)
```javascript
// js/config.js
const CONFIG = {
  API_BASE_URL: 'http://localhost:5000/api',  // Flask 默认端口
  // API_BASE_URL: 'http://localhost:8000/api',  // FastAPI 默认端口
  DEBUG_MODE: true,
  PAGE_SIZE: 20
};
```

## 四、Python 后端开发规范

### 4.1 Flask 基础示例
```python
# server/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)  # 允许跨域请求

def get_db():
    conn = sqlite3.connect('data/app.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/users', methods=['GET'])
def get_users():
    db = get_db()
    users = db.execute('SELECT * FROM users').fetchall()
    return jsonify([dict(user) for user in users])

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    db = get_db()
    db.execute(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        (data['name'], data['email'])
    )
    db.commit()
    return jsonify({'message': '用户创建成功'}), 201

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

### 4.2 FastAPI 基础示例
```python
# server/app.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
from pydantic import BaseModel

app = FastAPI()

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserCreate(BaseModel):
    name: str
    email: str

def get_db():
    conn = sqlite3.connect('data/app.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/api/users")
def get_users():
    db = get_db()
    users = db.execute('SELECT * FROM users').fetchall()
    return [dict(user) for user in users]

@app.post("/api/users")
def create_user(user: UserCreate):
    db = get_db()
    db.execute(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        (user.name, user.email)
    )
    db.commit()
    return {'message': '用户创建成功'}

# 运行: uvicorn server.app:app --reload --port 8000
```

### 4.3 SQLite 参数化查询（防止SQL注入）
```python
# server/database.py
import sqlite3

def get_connection():
    conn = sqlite3.connect('data/app.db')
    conn.row_factory = sqlite3.Row
    return conn

# ❌ 错误 - SQL注入风险
def get_user_bad(username):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM users WHERE name = '{username}'")  # 危险！
    return cursor.fetchone()

# ✅ 正确 - 参数化查询
def get_user_good(username):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE name = ?", (username,))
    return cursor.fetchone()

# ✅ 更好 - 使用上下文管理器
def insert_user(name, email):
    with get_connection() as conn:
        conn.execute(
            'INSERT INTO users (name, email) VALUES (?, ?)',
            (name, email)
        )
        conn.commit()
```

## 五、jQuery + Python API 交互规范

### 5.1 jQuery AJAX 统一封装
```javascript
// js/api.js - API 请求封装
const API_BASE = 'http://localhost:5000/api';  // Flask
// const API_BASE = 'http://localhost:8000/api';  // FastAPI

function apiRequest(endpoint, method = 'GET', data = null) {
  return $.ajax({
    url: `${API_BASE}${endpoint}`,
    method: method,
    contentType: 'application/json',
    data: data ? JSON.stringify(data) : null,
    dataType: 'json',
    timeout: 5000,
    beforeSend: function() {
      // 显示加载状态
    },
    success: function(response) {
      // 处理成功响应
    },
    error: function(xhr, status, error) {
      console.error('API请求失败:', error);
      alert('请求失败，请重试');
    }
  });
}

// 使用示例
// apiRequest('/users', 'GET').then(users => { console.log(users); });
// apiRequest('/users', 'POST', { name: '张三', email: 'test@example.com' });
```

### 5.2 XSS 防护
```javascript
// ❌ 错误 - XSS风险
$('#output').html(userInput);

// ✅ 正确 - 安全输出
$('#output').text(userInput);
```

### 5.3 事件委托优化
```javascript
// ❌ 错误 - 多次绑定事件
$('.item').on('click', function() { ... });

// ✅ 正确 - 事件委托
$('#parent').on('click', '.item', function() { ... });
```

## 六、性能优化要点

### 6.1 Python 后端优化
- 使用数据库连接池
- 实现 API 响应缓存
- 异步处理耗时操作（FastAPI 天然支持）
- 使用 Gunicorn/Uvicorn 生产服务器

### 6.2 JavaScript 前端优化
- 减少 DOM 操作次数，批量更新
- 使用事件委托减少事件绑定
- 避免在循环中进行 DOM 查询
- 使用防抖（debounce）和节流（throttle）

### 6.3 SQLite 优化
- 为常用查询字段添加索引
- 使用事务批量执行插入/更新
- 定期执行 `VACUUM` 优化数据库
- 使用分页避免一次性加载大量数据

```sql
-- 创建索引
CREATE INDEX idx_user_name ON users(name);

-- 使用事务
BEGIN TRANSACTION;
INSERT INTO users VALUES (...);
INSERT INTO users VALUES (...);
COMMIT;
```

### 6.4 前端资源优化
- 压缩 CSS 和 JavaScript 文件
- 合并多个文件减少 HTTP 请求
- 图片使用合适格式和尺寸
- 启用浏览器缓存

---

**使用说明：**
1. 本文件专注项目特定配置，通用规范参考 `.cursorrules`
2. 根据项目进展及时更新配置
3. AI 助手会同时遵循 `.cursorrules` 和本文件的规则

**最后更新时间：** 2026-05-15

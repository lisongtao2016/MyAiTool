from flask import Flask, render_template, request, jsonify, session
import sqlite3
import os
import hashlib
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)  # 用于session加密

# 数据库路径
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mytools.db')


def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # 使结果可以通过列名访问
    return conn


def init_db():
    """初始化数据库表"""
    conn = get_db_connection()
    
    # 用户表
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            email TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 项目表
    conn.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            owner_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES users (id)
        )
    ''')
    
    # 项目成员表
    conn.execute('''
        CREATE TABLE IF NOT EXISTS project_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role TEXT DEFAULT 'member',
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(project_id, user_id)
        )
    ''')
    
    # 日程表
    conn.execute('''
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT,
            description TEXT,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'pending',
            project_id INTEGER NOT NULL,
            assigned_to INTEGER,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id),
            FOREIGN KEY (assigned_to) REFERENCES users (id),
            FOREIGN KEY (created_by) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✓ 数据库初始化完成")


def hash_password(password):
    """密码哈希"""
    return hashlib.sha256(password.encode()).hexdigest()


def login_required(f):
    """登录装饰器"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        return f(*args, **kwargs)
    return decorated_function


# ==================== 页面路由 ====================

@app.route('/')
def index():
    """主页"""
    return render_template('index.html')


# ==================== 用户认证 API ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """用户注册"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password') or not data.get('email'):
        return jsonify({'success': False, 'message': '用户名、密码和邮箱不能为空'}), 400
    
    try:
        conn = get_db_connection()
        hashed_pwd = hash_password(data['password'])
        conn.execute(
            'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
            (data['username'], hashed_pwd, data['email'])
        )
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '注册成功'})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': '用户名已存在'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'success': False, 'message': '用户名和密码不能为空'}), 400
    
    try:
        conn = get_db_connection()
        hashed_pwd = hash_password(data['password'])
        user = conn.execute(
            'SELECT * FROM users WHERE username = ? AND password = ?',
            (data['username'], hashed_pwd)
        ).fetchone()
        conn.close()
        
        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            return jsonify({
                'success': True, 
                'message': '登录成功',
                'user': {'id': user['id'], 'username': user['username'], 'email': user['email']}
            })
        else:
            return jsonify({'success': False, 'message': '用户名或密码错误'}), 401
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """用户登出"""
    session.clear()
    return jsonify({'success': True, 'message': '已登出'})


@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    """获取当前用户信息"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    return jsonify({
        'success': True,
        'user': {'id': session['user_id'], 'username': session['username']}
    })


# ==================== 项目管理 API ====================

@app.route('/api/projects', methods=['POST'])
@login_required
def create_project():
    """创建项目"""
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'success': False, 'message': '项目名称不能为空'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.execute(
            'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)',
            (data['name'], data.get('description', ''), session['user_id'])
        )
        project_id = cursor.lastrowid
        
        # 创建者自动成为项目成员
        conn.execute(
            'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
            (project_id, session['user_id'], 'owner')
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '项目创建成功', 'project_id': project_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/projects', methods=['GET'])
@login_required
def get_projects():
    """获取用户参与的所有项目"""
    try:
        conn = get_db_connection()
        projects = conn.execute('''
            SELECT DISTINCT p.* FROM projects p
            JOIN project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = ?
            ORDER BY p.created_at DESC
        ''', (session['user_id'],)).fetchall()
        conn.close()
        
        projects_list = [dict(project) for project in projects]
        return jsonify({'success': True, 'data': projects_list})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/projects/<int:project_id>/members', methods=['POST'])
@login_required
def add_project_member(project_id):
    """添加项目成员"""
    data = request.get_json()
    
    if not data or not data.get('username'):
        return jsonify({'success': False, 'message': '用户名不能为空'}), 400
    
    try:
        conn = get_db_connection()
        
        # 查找用户
        user = conn.execute('SELECT id FROM users WHERE username = ?', (data['username'],)).fetchone()
        if not user:
            conn.close()
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        # 添加为成员
        conn.execute(
            'INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
            (project_id, user['id'], data.get('role', 'member'))
        )
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '成员添加成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/projects/<int:project_id>/members', methods=['GET'])
@login_required
def get_project_members(project_id):
    """获取项目成员列表"""
    try:
        conn = get_db_connection()
        members = conn.execute('''
            SELECT u.id, u.username, u.email, pm.role
            FROM project_members pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
        ''', (project_id,)).fetchall()
        conn.close()
        
        members_list = [dict(member) for member in members]
        return jsonify({'success': True, 'data': members_list})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== 日程管理 API ====================

@app.route('/api/schedules', methods=['GET'])
@login_required
def get_schedules():
    """获取日程(支持按项目筛选)"""
    conn = get_db_connection()
    project_id = request.args.get('project_id')
    date_filter = request.args.get('date')
    
    query = '''
        SELECT s.*, u.username as assigned_username, p.name as project_name
        FROM schedules s
        LEFT JOIN users u ON s.assigned_to = u.id
        JOIN projects p ON s.project_id = p.id
        JOIN project_members pm ON s.project_id = pm.project_id
        WHERE pm.user_id = ?
    '''
    params = [session['user_id']]
    
    if project_id:
        query += ' AND s.project_id = ?'
        params.append(project_id)
    
    if date_filter:
        query += ' AND s.date = ?'
        params.append(date_filter)
    
    query += ' ORDER BY s.date DESC, s.time ASC'
    
    schedules = conn.execute(query, params).fetchall()
    conn.close()
    
    schedules_list = [dict(schedule) for schedule in schedules]
    return jsonify({'success': True, 'data': schedules_list})


@app.route('/api/schedules', methods=['POST'])
@login_required
def add_schedule():
    """添加日程"""
    data = request.get_json()
    
    if not data or not data.get('title') or not data.get('date') or not data.get('project_id'):
        return jsonify({'success': False, 'message': '标题、日期和项目不能为空'}), 400
    
    try:
        conn = get_db_connection()
        conn.execute(
            'INSERT INTO schedules (title, date, time, description, priority, status, project_id, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                data['title'], 
                data['date'], 
                data.get('time'), 
                data.get('description', ''),
                data.get('priority', 'medium'),
                data.get('status', 'pending'),
                data['project_id'],
                data.get('assigned_to'),
                session['user_id']
            )
        )
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '日程添加成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/schedules/<int:schedule_id>', methods=['PUT'])
@login_required
def update_schedule(schedule_id):
    """更新日程"""
    data = request.get_json()
    
    try:
        conn = get_db_connection()
        conn.execute(
            'UPDATE schedules SET title = ?, date = ?, time = ?, description = ?, priority = ?, status = ?, assigned_to = ? WHERE id = ?',
            (
                data['title'], 
                data['date'], 
                data.get('time'), 
                data.get('description', ''),
                data.get('priority', 'medium'),
                data.get('status', 'pending'),
                data.get('assigned_to'),
                schedule_id
            )
        )
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '日程更新成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/schedules/<int:schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    """删除日程"""
    try:
        conn = get_db_connection()
        conn.execute('DELETE FROM schedules WHERE id = ?', (schedule_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '日程删除成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


if __name__ == '__main__':
    # 初始化数据库
    init_db()
    
    # 启动 Flask 应用
    print("\n" + "=" * 50)
    print("🚀 服务器启动中...")
    print("📍 访问地址: http://127.0.0.1:5000")
    print("=" * 50 + "\n")
    
    app.run(debug=True, host='127.0.0.1', port=5000)

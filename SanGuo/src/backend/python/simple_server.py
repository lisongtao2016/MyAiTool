#!/usr/bin/env python3
"""
极简日程表服务器 - 无需任何第三方包
使用 Python 标准库
"""

import sqlite3
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# 数据库路径 - 从当前文件向上3级到项目根目录，然后进入 data 文件夹
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
DATABASE = os.path.join(project_root, 'data', 'schedule.db')
PORT = 3002

class Handler(BaseHTTPRequestHandler):
    
    def do_GET(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/api/tasks':
            self.get_tasks()
        elif parsed.path == '/api/tasks/search':
            self.search_tasks(parsed)
        elif parsed.path == '/health':
            self.send_json(200, {'status': 'ok'})
        else:
            self.send_json(404, {'error': 'Not found'})
    
    def do_POST(self):
        if self.path == '/api/tasks':
            self.create_task()
        else:
            self.send_json(404, {'error': 'Not found'})
    
    def do_PUT(self):
        if self.path.startswith('/api/tasks/'):
            task_id = self.path.split('/')[-1]
            self.update_task(task_id)
        else:
            self.send_json(404, {'error': 'Not found'})
    
    def do_DELETE(self):
        if self.path.startswith('/api/tasks/'):
            task_id = self.path.split('/')[-1]
            self.delete_task(task_id)
        else:
            self.send_json(404, {'error': 'Not found'})
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def send_json(self, status, data):
        self.send_response(status)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode())
    
    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def get_tasks(self):
        try:
            conn = sqlite3.connect(DATABASE)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT id, group_name as "group", sub_group as "subGroup", name, start_date as startDate, end_date as endDate, start_day as startDay, duration, plan, actual, owner FROM tasks ORDER BY id')
            tasks = [dict(row) for row in cursor.fetchall()]
            conn.close()
            self.send_json(200, tasks)
        except Exception as e:
            self.send_json(500, {'error': str(e)})
    
    def search_tasks(self, parsed):
        try:
            query = parse_qs(parsed.query)
            owner = query.get('owner', [''])[0]
            
            conn = sqlite3.connect(DATABASE)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            if owner:
                cursor.execute('SELECT id, group_name as "group", sub_group as "subGroup", name, start_date as startDate, end_date as endDate, start_day as startDay, duration, plan, actual, owner FROM tasks WHERE owner LIKE ? ORDER BY id', ('%' + owner + '%',))
            else:
                cursor.execute('SELECT id, group_name as "group", sub_group as "subGroup", name, start_date as startDate, end_date as endDate, start_day as startDay, duration, plan, actual, owner FROM tasks ORDER BY id')
            
            tasks = [dict(row) for row in cursor.fetchall()]
            conn.close()
            self.send_json(200, tasks)
        except Exception as e:
            self.send_json(500, {'error': str(e)})
    
    def create_task(self):
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode())
            
            conn = sqlite3.connect(DATABASE)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO tasks (group_name, sub_group, name, start_date, end_date, start_day, duration, plan, actual, owner)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.get('group', '默认分组'),
                data.get('subGroup', '默认模块'),
                data.get('name', '新任务'),
                data.get('startDate', '2026-04-08'),
                data.get('endDate', '2026-04-15'),
                0,
                7,
                100,
                0,
                data.get('owner', '未分配')
            ))
            conn.commit()
            last_id = cursor.lastrowid
            conn.close()
            
            self.send_json(201, {'message': 'Task created', 'id': last_id})
        except Exception as e:
            self.send_json(500, {'error': str(e)})
    
    def update_task(self, task_id):
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode())
            
            conn = sqlite3.connect(DATABASE)
            cursor = conn.cursor()
            
            set_clauses = []
            params = []
            
            if 'group' in data:
                set_clauses.append('group_name = ?')
                params.append(data['group'])
            if 'subGroup' in data:
                set_clauses.append('sub_group = ?')
                params.append(data['subGroup'])
            if 'owner' in data:
                set_clauses.append('owner = ?')
                params.append(data['owner'])
            if 'actual' in data:
                set_clauses.append('actual = ?')
                params.append(data['actual'])
            
            if not set_clauses:
                self.send_json(400, {'error': 'No fields to update'})
                return
            
            params.append(task_id)
            cursor.execute(f'UPDATE tasks SET {", ".join(set_clauses)}, updated_at = datetime("now") WHERE id = ?', params)
            conn.commit()
            changes = cursor.rowcount
            conn.close()
            
            if changes > 0:
                self.send_json(200, {'message': 'Updated', 'changes': changes})
            else:
                self.send_json(404, {'error': 'Not found'})
        except Exception as e:
            self.send_json(500, {'error': str(e)})
    
    def delete_task(self, task_id):
        try:
            conn = sqlite3.connect(DATABASE)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
            conn.commit()
            changes = cursor.rowcount
            conn.close()
            
            if changes > 0:
                self.send_json(200, {'message': 'Deleted', 'changes': changes})
            else:
                self.send_json(404, {'error': 'Not found'})
        except Exception as e:
            self.send_json(500, {'error': str(e)})
    
    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}")

if __name__ == '__main__':
    print('=' * 40)
    print('  日程表服务器 (Python 标准库版)')
    print('=' * 40)
    print()
    print(f'数据库: {DATABASE}')
    print(f'存在: {os.path.exists(DATABASE)}')
    print(f'端口: {PORT}')
    print()
    
    if not os.path.exists(DATABASE):
        print('❌ 数据库不存在!')
        print('请运行: sqlite3 data/schedule.db ".read data/schema.sql"')
        exit(1)
    
    server = HTTPServer(('localhost', PORT), Handler)
    print('✅ 服务器启动成功!')
    print(f'API: http://localhost:{PORT}/api/tasks')
    print()
    print('按 Ctrl+C 停止...')
    print()
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n服务器已停止')

import sqlite3
import os
from datetime import datetime


class DatabaseManager:
    """SQLite 数据库管理器"""
    
    def __init__(self, db_name="mytools.db"):
        """
        初始化数据库连接
        
        Args:
            db_name: 数据库文件名,默认保存在当前目录下
        """
        # 获取数据库文件的完整路径
        self.db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), db_name)
        self.connection = None
        self.cursor = None
        self.connect()
    
    def connect(self):
        """建立数据库连接"""
        try:
            self.connection = sqlite3.connect(self.db_path)
            self.cursor = self.connection.cursor()
            # 启用外键支持
            self.cursor.execute("PRAGMA foreign_keys = ON")
            print(f"✓ 成功连接到 SQLite 数据库: {self.db_path}")
        except sqlite3.Error as e:
            print(f"✗ 连接数据库时出错: {e}")
            raise
    
    def close(self):
        """关闭数据库连接"""
        if self.connection:
            self.connection.close()
            print("✓ 数据库连接已关闭")
    
    def create_table(self, table_name, columns):
        """
        创建数据表
        
        Args:
            table_name: 表名
            columns: 列定义,例如: "id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, age INTEGER"
        """
        try:
            sql = f"CREATE TABLE IF NOT EXISTS {table_name} ({columns})"
            self.cursor.execute(sql)
            self.connection.commit()
            print(f"✓ 表 '{table_name}' 创建成功或已存在")
        except sqlite3.Error as e:
            print(f"✗ 创建表时出错: {e}")
            self.connection.rollback()
    
    def insert(self, table_name, data):
        """
        插入数据
        
        Args:
            table_name: 表名
            data: 字典类型的数据,键为列名,值为数据
            
        Returns:
            最后插入行的 rowid
        """
        try:
            columns = ', '.join(data.keys())
            placeholders = ', '.join(['?' for _ in data])
            values = tuple(data.values())
            
            sql = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
            self.cursor.execute(sql, values)
            self.connection.commit()
            print(f"✓ 数据插入成功, ID: {self.cursor.lastrowid}")
            return self.cursor.lastrowid
        except sqlite3.Error as e:
            print(f"✗ 插入数据时出错: {e}")
            self.connection.rollback()
            return None
    
    def select(self, table_name, columns="*", condition=None, params=None):
        """
        查询数据
        
        Args:
            table_name: 表名
            columns: 要查询的列,默认为 *
            condition: WHERE 条件,例如: "age > ? AND name = ?"
            params: 条件参数元组
            
        Returns:
            查询结果列表
        """
        try:
            sql = f"SELECT {columns} FROM {table_name}"
            if condition:
                sql += f" WHERE {condition}"
            
            if params:
                self.cursor.execute(sql, params)
            else:
                self.cursor.execute(sql)
            
            results = self.cursor.fetchall()
            return results
        except sqlite3.Error as e:
            print(f"✗ 查询数据时出错: {e}")
            return []
    
    def update(self, table_name, data, condition, params):
        """
        更新数据
        
        Args:
            table_name: 表名
            data: 要更新的字段字典
            condition: WHERE 条件
            params: 条件参数元组
            
        Returns:
            影响的行数
        """
        try:
            set_clause = ', '.join([f"{key} = ?" for key in data.keys()])
            values = list(data.values()) + list(params)
            
            sql = f"UPDATE {table_name} SET {set_clause} WHERE {condition}"
            self.cursor.execute(sql, values)
            self.connection.commit()
            print(f"✓ 更新了 {self.cursor.rowcount} 行数据")
            return self.cursor.rowcount
        except sqlite3.Error as e:
            print(f"✗ 更新数据时出错: {e}")
            self.connection.rollback()
            return 0
    
    def delete(self, table_name, condition, params=None):
        """
        删除数据
        
        Args:
            table_name: 表名
            condition: WHERE 条件
            params: 条件参数元组
            
        Returns:
            影响的行数
        """
        try:
            sql = f"DELETE FROM {table_name} WHERE {condition}"
            if params:
                self.cursor.execute(sql, params)
            else:
                self.cursor.execute(sql)
            self.connection.commit()
            print(f"✓ 删除了 {self.cursor.rowcount} 行数据")
            return self.cursor.rowcount
        except sqlite3.Error as e:
            print(f"✗ 删除数据时出错: {e}")
            self.connection.rollback()
            return 0
    
    def execute_query(self, sql, params=None):
        """
        执行自定义 SQL 查询
        
        Args:
            sql: SQL 语句
            params: 参数元组
            
        Returns:
            查询结果
        """
        try:
            if params:
                self.cursor.execute(sql, params)
            else:
                self.cursor.execute(sql)
            self.connection.commit()
            return self.cursor.fetchall()
        except sqlite3.Error as e:
            print(f"✗ 执行查询时出错: {e}")
            self.connection.rollback()
            return []


# 使用示例
if __name__ == "__main__":
    print("=" * 50)
    print("SQLite 数据库测试")
    print("=" * 50)
    
    # 创建数据库管理器实例
    db = DatabaseManager("mytools.db")
    
    # 创建示例表
    print("\n1. 创建用户表:")
    db.create_table(
        "users",
        """
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        age INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """
    )
    
    # 插入数据
    print("\n2. 插入数据:")
    user_data = {
        "username": "张三",
        "email": "zhangsan@example.com",
        "age": 25
    }
    db.insert("users", user_data)
    
    user_data2 = {
        "username": "李四",
        "email": "lisi@example.com",
        "age": 30
    }
    db.insert("users", user_data2)
    
    user_data3 = {
        "username": "王五",
        "email": "wangwu@example.com",
        "age": 28
    }
    db.insert("users", user_data3)
    
    # 查询所有数据
    print("\n3. 查询所有用户:")
    results = db.select("users")
    for row in results:
        print(f"   {row}")
    
    # 条件查询
    print("\n4. 查询年龄大于 25 的用户:")
    results = db.select("users", condition="age > ?", params=(25,))
    for row in results:
        print(f"   {row}")
    
    # 更新数据
    print("\n5. 更新张三的年龄:")
    db.update("users", {"age": 26}, "username = ?", ("张三",))
    
    # 再次查询验证更新
    results = db.select("users", condition="username = ?", params=("张三",))
    print(f"   更新后的数据: {results[0]}")
    
    # 删除数据
    print("\n6. 删除李四:")
    db.delete("users", "username = ?", ("李四",))
    
    # 查询剩余数据
    print("\n7. 剩余用户:")
    results = db.select("users")
    for row in results:
        print(f"   {row}")
    
    # 关闭连接
    print("\n8. 关闭数据库连接:")
    db.close()
    
    print("\n" + "=" * 50)
    print("测试完成!")
    print("=" * 50)

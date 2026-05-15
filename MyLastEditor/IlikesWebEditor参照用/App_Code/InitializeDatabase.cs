using System;
using System.Data.SQLite;
using System.IO;


    public class DatabaseInitializer
    {
        private static string databasePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"App_Data", "EditorContent.db");
        private static string connectionString = $"Data Source={databasePath};Version=3;";

        public static void InitializeDatabase()
        {
            if (!File.Exists(databasePath))
            {
                SQLiteConnection.CreateFile(databasePath);
            }

            using (var connection = new SQLiteConnection(connectionString))
            {
                connection.Open();

                // 创建 EditorContents 表（如果不存在）
                string createEditorContentsTable = @"
                CREATE TABLE IF NOT EXISTS EditorContents (
                    Id INTEGER PRIMARY KEY AUTOINCREMENT,
                    Title NVARCHAR(255) NOT NULL,
                    Subtitle NVARCHAR(500),
                    Content TEXT NOT NULL,
                    Language NVARCHAR(50) NOT NULL,
                    Author NVARCHAR(100),
                    HotTags NVARCHAR(500),
                    ShareTo NVARCHAR(500),
                    Category NVARCHAR(100),   -- 新增：内容分类
                    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                    ModifiedDate DATETIME DEFAULT CURRENT_TIMESTAMP
                );";

                using (var command = new SQLiteCommand(createEditorContentsTable, connection))
                {
                    command.ExecuteNonQuery();
                }

                // 检查并添加 PlainText 字段（如果不存在）
                try
                {
                    string checkColumnSql = "SELECT PlainText FROM EditorContents LIMIT 1";
                    using (var checkCmd = new SQLiteCommand(checkColumnSql, connection))
                    {
                        checkCmd.ExecuteNonQuery();
                    }
                }
                catch
                {
                    // PlainText 字段不存在，添加它
                    string addColumnSql = "ALTER TABLE EditorContents ADD COLUMN PlainText TEXT;";
                    using (var addCmd = new SQLiteCommand(addColumnSql, connection))
                    {
                        addCmd.ExecuteNonQuery();
                    }
                }

                // 检查并添加 Category 字段（如果不存在）
                try
                {
                    string checkColumnSql = "SELECT Category FROM EditorContents LIMIT 1";
                    using (var checkCmd = new SQLiteCommand(checkColumnSql, connection))
                    {
                        checkCmd.ExecuteNonQuery();
                    }
                }
                catch
                {
                    // Category 字段不存在，添加它
                    string addColumnSql = "ALTER TABLE EditorContents ADD COLUMN Category NVARCHAR(100);";
                    using (var addCmd = new SQLiteCommand(addColumnSql, connection))
                    {
                        addCmd.ExecuteNonQuery();
                    }
                }

                // 检查并添加 ProjectId 字段（如果不存在）
                try
                {
                    string checkColumnSql = "SELECT ProjectId FROM EditorContents LIMIT 1";
                    using (var checkCmd = new SQLiteCommand(checkColumnSql, connection))
                    {
                        checkCmd.ExecuteNonQuery();
                    }
                }
                catch
                {
                    // ProjectId 字段不存在，添加它
                    string addColumnSql = "ALTER TABLE EditorContents ADD COLUMN ProjectId INTEGER;";
                    using (var addCmd = new SQLiteCommand(addColumnSql, connection))
                    {
                        addCmd.ExecuteNonQuery();
                    }
                }

                // 创建 Projects 表（如果不存在）
                string createProjectsTable = @"
                CREATE TABLE IF NOT EXISTS Projects (
                    Id INTEGER PRIMARY KEY AUTOINCREMENT,
                    Name NVARCHAR(100) NOT NULL UNIQUE,
                    Description NVARCHAR(500),
                    CreatedBy NVARCHAR(100),
                    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                    ModifiedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                    IsActive BOOLEAN DEFAULT 1
                );";
                
                using (var command = new SQLiteCommand(createProjectsTable, connection))
                {
                    command.ExecuteNonQuery();
                }
                
                // 创建 Users 表（如果不存在）
                string createUsersTable = @"
                CREATE TABLE IF NOT EXISTS Users (
                    Id INTEGER PRIMARY KEY AUTOINCREMENT,
                    Username NVARCHAR(100) NOT NULL UNIQUE,
                    Email NVARCHAR(255) NOT NULL UNIQUE,
                    PasswordHash NVARCHAR(255) NOT NULL,
                    DisplayName NVARCHAR(100),
                    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                    LastLoginDate DATETIME,
                    IsActive BOOLEAN DEFAULT 1,
                    Role NVARCHAR(50) DEFAULT 'user'
                );";

                using (var command = new SQLiteCommand(createUsersTable, connection))
                {
                    command.ExecuteNonQuery();
                }

                // 创建索引
                string createIndexes = @"
                CREATE INDEX IF NOT EXISTS idx_created_date ON EditorContents(CreatedDate);
                CREATE INDEX IF NOT EXISTS idx_language ON EditorContents(Language);
                CREATE INDEX IF NOT EXISTS idx_author ON EditorContents(Author);
                CREATE INDEX IF NOT EXISTS idx_plaintext ON EditorContents(PlainText);
                CREATE INDEX IF NOT EXISTS idx_users_username ON Users(Username);
                CREATE INDEX IF NOT EXISTS idx_users_email ON Users(Email);
                CREATE INDEX IF NOT EXISTS idx_users_created_date ON Users(CreatedDate);";

                using (var command = new SQLiteCommand(createIndexes, connection))
                {
                    command.ExecuteNonQuery();
                }
            }
        }

        public static string GetConnectionString()
        {
            return connectionString;
        }
    }

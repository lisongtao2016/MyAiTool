using System;
using System.Data.SQLite;
using System.Security.Cryptography;
using System.Text;

namespace IlikesWebEditor
{
    public class UserRepository
    {
        private string connectionString;

        public UserRepository()
        {
            connectionString = DatabaseInitializer.GetConnectionString();
            // 确保数据库表已创建
            DatabaseInitializer.InitializeDatabase();
        }

        // 注册新用户
        public User RegisterUser(string username, string email, string password, string displayName = null)
        {
            // 检查用户名是否已存在
            if (GetUserByUsername(username) != null)
            {
                throw new Exception("用户名已存在");
            }

            // 检查邮箱是否已存在
            if (GetUserByEmail(email) != null)
            {
                throw new Exception("邮箱已注册");
            }

            // 密码哈希
            string passwordHash = HashPassword(password);

            using (var connection = new SQLiteConnection(connectionString))
            {
                connection.Open();

                string sql = @"
                INSERT INTO Users (Username, Email, PasswordHash, DisplayName, CreatedDate, LastLoginDate, IsActive, Role)
                VALUES (@Username, @Email, @PasswordHash, @DisplayName, @CreatedDate, @LastLoginDate, @IsActive, @Role);
                SELECT last_insert_rowid();";

                using (var command = new SQLiteCommand(sql, connection))
                {
                    command.Parameters.AddWithValue("@Username", username);
                    command.Parameters.AddWithValue("@Email", email);
                    command.Parameters.AddWithValue("@PasswordHash", passwordHash);
                    command.Parameters.AddWithValue("@DisplayName", displayName ?? username);
                    command.Parameters.AddWithValue("@CreatedDate", DateTime.Now);
                    command.Parameters.AddWithValue("@LastLoginDate", (object)DBNull.Value);
                    command.Parameters.AddWithValue("@IsActive", true);
                    command.Parameters.AddWithValue("@Role", "user");

                    var result = command.ExecuteScalar();
                    int userId = Convert.ToInt32(result);

                    // 返回新创建的用户
                    return GetUserById(userId);
                }
            }
        }

        // 用户登录验证
        public User AuthenticateUser(string identifier, string password)
        {
            // 标识符可以是用户名或邮箱
            User user = GetUserByUsername(identifier) ?? GetUserByEmail(identifier);
            
            if (user == null || !VerifyPassword(password, user.PasswordHash))
            {
                return null;
            }

            // 更新最后登录时间
            UpdateLastLoginDate(user.Id);

            return user;
        }

        // 通过ID获取用户
        public User GetUserById(int id)
        {
            using (var connection = new SQLiteConnection(connectionString))
            {
                connection.Open();

                string sql = "SELECT * FROM Users WHERE Id = @Id";

                using (var command = new SQLiteCommand(sql, connection))
                {
                    command.Parameters.AddWithValue("@Id", id);

                    using (var reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return MapReaderToUser(reader);
                        }
                    }
                }
            }

            return null;
        }

        // 通过用户名获取用户
        public User GetUserByUsername(string username)
        {
            using (var connection = new SQLiteConnection(connectionString))
            {
                connection.Open();

                string sql = "SELECT * FROM Users WHERE Username = @Username";

                using (var command = new SQLiteCommand(sql, connection))
                {
                    command.Parameters.AddWithValue("@Username", username);

                    using (var reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return MapReaderToUser(reader);
                        }
                    }
                }
            }

            return null;
        }

        // 通过邮箱获取用户
        public User GetUserByEmail(string email)
        {
            using (var connection = new SQLiteConnection(connectionString))
            {
                connection.Open();

                string sql = "SELECT * FROM Users WHERE Email = @Email";

                using (var command = new SQLiteCommand(sql, connection))
                {
                    command.Parameters.AddWithValue("@Email", email);

                    using (var reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return MapReaderToUser(reader);
                        }
                    }
                }
            }

            return null;
        }

        // 更新用户最后登录时间
        private void UpdateLastLoginDate(int userId)
        {
            using (var connection = new SQLiteConnection(connectionString))
            {
                connection.Open();

                string sql = "UPDATE Users SET LastLoginDate = @LastLoginDate WHERE Id = @Id";

                using (var command = new SQLiteCommand(sql, connection))
                {
                    command.Parameters.AddWithValue("@Id", userId);
                    command.Parameters.AddWithValue("@LastLoginDate", DateTime.Now);
                    command.ExecuteNonQuery();
                }
            }
        }

        // 密码哈希
        private string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(password);
                var hash = sha256.ComputeHash(bytes);
                return Convert.ToBase64String(hash);
            }
        }

        // 验证密码
        private bool VerifyPassword(string password, string storedHash)
        {
            var hashOfInput = HashPassword(password);
            return hashOfInput == storedHash;
        }

        // 从DataReader映射到User对象
        private User MapReaderToUser(SQLiteDataReader reader)
        {
            return new User
            {
                Id = Convert.ToInt32(reader["Id"]),
                Username = reader["Username"].ToString(),
                Email = reader["Email"].ToString(),
                PasswordHash = reader["PasswordHash"].ToString(),
                DisplayName = reader["DisplayName"] != null ? reader["DisplayName"].ToString() : reader["Username"].ToString(),
                CreatedDate = Convert.ToDateTime(reader["CreatedDate"]),
                LastLoginDate = reader["LastLoginDate"] != DBNull.Value ? Convert.ToDateTime(reader["LastLoginDate"]) : (DateTime?)null,
                IsActive = Convert.ToBoolean(reader["IsActive"]),
                Role = reader["Role"].ToString()
            };
        }
    }
}
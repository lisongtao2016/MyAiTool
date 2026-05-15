using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.Linq;

namespace IlikesWebEditor
{
    public class ProjectRepository
    {
        private string connectionString;

        public ProjectRepository()
        {
            connectionString = DatabaseInitializer.GetConnectionString();
        }

    // 获取所有项目
    public List<Project> GetAllProjects()
    {
        var projects = new List<Project>();

        using (var connection = new SQLiteConnection(connectionString))
        {
            connection.Open();
            string sql = "SELECT * FROM Projects WHERE IsActive = 1 ORDER BY Name";

            using (var command = new SQLiteCommand(sql, connection))
            using (var reader = command.ExecuteReader())
            {
                while (reader.Read())
                {
                    projects.Add(MapProjectFromReader(reader));
                }
            }
        }

        return projects;
    }

    // 获取项目详情
    public Project GetProjectById(int id)
    {
        using (var connection = new SQLiteConnection(connectionString))
        {
            connection.Open();
            string sql = "SELECT * FROM Projects WHERE Id = @Id AND IsActive = 1";

            using (var command = new SQLiteCommand(sql, connection))
            {
                command.Parameters.AddWithValue("@Id", id);

                using (var reader = command.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        return MapProjectFromReader(reader);
                    }
                }
            }
        }

        return null;
    }

    // 创建新项目
    public int CreateProject(Project project)
    {
        using (var connection = new SQLiteConnection(connectionString))
        {
            connection.Open();
            string sql = @"INSERT INTO Projects (Name, Description, CreatedBy, CreatedDate, ModifiedDate, IsActive) 
                              VALUES (@Name, @Description, @CreatedBy, @CreatedDate, @ModifiedDate, @IsActive);
                              SELECT last_insert_rowid();";

            using (var command = new SQLiteCommand(sql, connection))
            {
                command.Parameters.AddWithValue("@Name", project.Name);
                command.Parameters.AddWithValue("@Description", project.Description ?? "");
                command.Parameters.AddWithValue("@CreatedBy", project.CreatedBy ?? "");
                command.Parameters.AddWithValue("@CreatedDate", DateTime.Now);
                command.Parameters.AddWithValue("@ModifiedDate", DateTime.Now);
                command.Parameters.AddWithValue("@IsActive", true);

                var result = command.ExecuteScalar();
                return Convert.ToInt32(result);
            }
        }
    }

    // 更新项目
    public bool UpdateProject(Project project)
    {
        using (var connection = new SQLiteConnection(connectionString))
        {
            connection.Open();
            string sql = @"UPDATE Projects 
                              SET Name = @Name, 
                                  Description = @Description, 
                                  ModifiedDate = @ModifiedDate
                              WHERE Id = @Id";

            using (var command = new SQLiteCommand(sql, connection))
            {
                command.Parameters.AddWithValue("@Id", project.Id);
                command.Parameters.AddWithValue("@Name", project.Name);
                command.Parameters.AddWithValue("@Description", project.Description ?? "");
                command.Parameters.AddWithValue("@ModifiedDate", DateTime.Now);

                int rowsAffected = command.ExecuteNonQuery();
                return rowsAffected > 0;
            }
        }
    }

    // 删除项目（软删除）
    public bool DeleteProject(int id)
    {
        using (var connection = new SQLiteConnection(connectionString))
        {
            connection.Open();
            string sql = "UPDATE Projects SET IsActive = 0, ModifiedDate = @ModifiedDate WHERE Id = @Id";

            using (var command = new SQLiteCommand(sql, connection))
            {
                command.Parameters.AddWithValue("@Id", id);
                command.Parameters.AddWithValue("@ModifiedDate", DateTime.Now);

                int rowsAffected = command.ExecuteNonQuery();
                return rowsAffected > 0;
            }
        }
    }

    // 检查项目名称是否已存在
    public bool ProjectNameExists(string name, int? excludeId = null)
    {
        using (var connection = new SQLiteConnection(connectionString))
        {
            connection.Open();
            string sql = "SELECT COUNT(*) FROM Projects WHERE Name = @Name AND IsActive = 1";

            if (excludeId.HasValue)
            {
                sql += " AND Id != @ExcludeId";
            }

            using (var command = new SQLiteCommand(sql, connection))
            {
                command.Parameters.AddWithValue("@Name", name);

                if (excludeId.HasValue)
                {
                    command.Parameters.AddWithValue("@ExcludeId", excludeId.Value);
                }

                var count = Convert.ToInt32(command.ExecuteScalar());
                return count > 0;
            }
        }
    }

    // 从DataReader映射Project对象
    private Project MapProjectFromReader(SQLiteDataReader reader)
    {
        return new Project
        {
            Id = Convert.ToInt32(reader["Id"]),
            Name = reader["Name"].ToString(),
            Description = reader["Description"].ToString(),
            CreatedBy = reader["CreatedBy"].ToString(),
            CreatedDate = Convert.ToDateTime(reader["CreatedDate"]),
            ModifiedDate = Convert.ToDateTime(reader["ModifiedDate"]),
            IsActive = Convert.ToBoolean(reader["IsActive"])
        };
    }
}
}

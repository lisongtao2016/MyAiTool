using System.Data;
using ScheduleApi.Models;
using Microsoft.Data.Sqlite;
using System.Threading.Tasks;

namespace ScheduleApi.Services;

public class DatabaseHelper
{
    private readonly string _connectionString;

    public DatabaseHelper()
    {
        var dbPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "schedule.db");
        _connectionString = $"Data Source={dbPath}";
    }

    public async Task<List<Models.Task>> GetAllTasksAsync()
    {
        var tasks = new List<Models.Task>();

        using (var connection = new SqliteConnection(_connectionString))
        {
            await connection.OpenAsync();
            var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT 
                    id, project_id, group_name, sub_group, name, 
                    start_date, end_date, start_day, duration, plan, actual, owner,
                    created_at, updated_at
                FROM tasks
                ORDER BY id";

            using (var reader = await command.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    tasks.Add(new Models.Task
                    {
                        Id = reader.GetInt32(0),
                        ProjectId = reader.IsDBNull(1) ? null : reader.GetInt32(1),
                        Group = reader.GetString(2),
                        SubGroup = reader.GetString(3),
                        Name = reader.GetString(4),
                        StartDate = reader.GetString(5),
                        EndDate = reader.GetString(6),
                        StartDay = reader.GetInt32(7),
                        Duration = reader.GetInt32(8),
                        Plan = reader.GetInt32(9),
                        Actual = reader.GetInt32(10),
                        Owner = reader.GetString(11),
                        CreatedAt = reader.GetDateTime(12),
                        UpdatedAt = reader.GetDateTime(13)
                    });
                }
            }
        }

        return tasks;
    }

    public async Task<List<Models.Task>> SearchTasksByOwnerAsync(string owner)
    {
        var tasks = new List<Task>();

        using (var connection = new SqliteConnection(_connectionString))
        {
            await connection.OpenAsync();
            var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT 
                    id, project_id, group_name, sub_group, name, 
                    start_date, end_date, start_day, duration, plan, actual, owner,
                    created_at, updated_at
                FROM tasks
                WHERE owner LIKE @owner
                ORDER BY id";
            command.Parameters.AddWithValue("@owner", $"%{owner}%");

            using (var reader = await command.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    tasks.Add(new Task
                    {
                        Id = reader.GetInt32(0),
                        ProjectId = reader.IsDBNull(1) ? null : reader.GetInt32(1),
                        Group = reader.GetString(2),
                        SubGroup = reader.GetString(3),
                        Name = reader.GetString(4),
                        StartDate = reader.GetString(5),
                        EndDate = reader.GetString(6),
                        StartDay = reader.GetInt32(7),
                        Duration = reader.GetInt32(8),
                        Plan = reader.GetInt32(9),
                        Actual = reader.GetInt32(10),
                        Owner = reader.GetString(11),
                        CreatedAt = reader.GetDateTime(12),
                        UpdatedAt = reader.GetDateTime(13)
                    });
                }
            }
        }

        return tasks;
    }

    public async Task<bool> UpdateTaskAsync(int taskId, TaskUpdateDto updates)
    {
        using (var connection = new SqliteConnection(_connectionString))
        {
            await connection.OpenAsync();
            
            // 构建动态更新语句
            var setClauses = new List<string>();
            var parameters = new List<SqliteParameter>();

            if (updates.Group != null)
            {
                setClauses.Add("group_name = @group");
                parameters.Add(new SqliteParameter("@group", updates.Group));
            }

            if (updates.SubGroup != null)
            {
                setClauses.Add("sub_group = @subGroup");
                parameters.Add(new SqliteParameter("@subGroup", updates.SubGroup));
            }

            if (updates.Name != null)
            {
                setClauses.Add("name = @name");
                parameters.Add(new SqliteParameter("@name", updates.Name));
            }

            if (updates.StartDate != null)
            {
                setClauses.Add("start_date = @startDate");
                parameters.Add(new SqliteParameter("@startDate", updates.StartDate));
            }

            if (updates.EndDate != null)
            {
                setClauses.Add("end_date = @endDate");
                parameters.Add(new SqliteParameter("@endDate", updates.EndDate));
            }

            if (updates.StartDay.HasValue)
            {
                setClauses.Add("start_day = @startDay");
                parameters.Add(new SqliteParameter("@startDay", updates.StartDay.Value));
            }

            if (updates.Duration.HasValue)
            {
                setClauses.Add("duration = @duration");
                parameters.Add(new SqliteParameter("@duration", updates.Duration.Value));
            }

            if (updates.Plan.HasValue)
            {
                setClauses.Add("plan = @plan");
                parameters.Add(new SqliteParameter("@plan", updates.Plan.Value));
            }

            if (updates.Actual.HasValue)
            {
                setClauses.Add("actual = @actual");
                parameters.Add(new SqliteParameter("@actual", updates.Actual.Value));
            }

            if (updates.Owner != null)
            {
                setClauses.Add("owner = @owner");
                parameters.Add(new SqliteParameter("@owner", updates.Owner));
            }

            if (setClauses.Count == 0)
            {
                return false; // 没有更新内容
            }

            var setClause = string.Join(", ", setClauses);
            
            var command = connection.CreateCommand();
            command.CommandText = $@"
                UPDATE tasks 
                SET {setClause}, updated_at = datetime('now')
                WHERE id = @taskId";
            
            command.Parameters.AddWithValue("@taskId", taskId);
            command.Parameters.AddRange(parameters.ToArray());

            var rowsAffected = await command.ExecuteNonQueryAsync();
            return rowsAffected > 0;
        }
    }

    public async Task<bool> CheckDatabaseExistsAsync()
    {
        try
        {
            var dbPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "schedule.db");
            return File.Exists(dbPath);
        }
        catch
        {
            return false;
        }
    }
}
using System.Data.SQLite;

namespace ScheduleApi;

public static class SimpleApi
{
    private static string GetConnectionString()
    {
        var dbPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "schedule.db");
        return $"Data Source={dbPath};Version=3;";
    }

    public static void MapRoutes(WebApplication app)
    {
        // 允许CORS
        app.UseCors(policy => policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());

        // 获取所有任务
        app.MapGet("/api/tasks", async () =>
        {
            var tasks = new List<object>();
            
            using (var connection = new SQLiteConnection(GetConnectionString()))
            {
                await connection.OpenAsync();
                var command = connection.CreateCommand();
                command.CommandText = @"
                    SELECT 
                        id, project_id, group_name, sub_group, name, 
                        start_date, end_date, start_day, duration, plan, actual, owner
                    FROM tasks
                    ORDER BY id";

                using (var reader = await command.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        tasks.Add(new
                        {
                            Id = reader.GetInt32(0),
                            ProjectId = reader.IsDBNull(1) ? (int?)null : reader.GetInt32(1),
                            Group = reader.GetString(2),
                            SubGroup = reader.GetString(3),
                            Name = reader.GetString(4),
                            StartDate = reader.GetString(5),
                            EndDate = reader.GetString(6),
                            StartDay = reader.GetInt32(7),
                            Duration = reader.GetInt32(8),
                            Plan = reader.GetInt32(9),
                            Actual = reader.GetInt32(10),
                            Owner = reader.GetString(11)
                        });
                    }
                }
            }

            return Results.Ok(tasks);
        });

        // 按负责人搜索任务
        app.MapGet("/api/tasks/search", async (string? owner) =>
        {
            var tasks = new List<object>();
            
            using (var connection = new SQLiteConnection(GetConnectionString()))
            {
                await connection.OpenAsync();
                var command = connection.CreateCommand();
                
                if (string.IsNullOrEmpty(owner))
                {
                    command.CommandText = @"
                        SELECT 
                            id, project_id, group_name, sub_group, name, 
                            start_date, end_date, start_day, duration, plan, actual, owner
                        FROM tasks
                        ORDER BY id";
                }
                else
                {
                    command.CommandText = @"
                        SELECT 
                            id, project_id, group_name, sub_group, name, 
                            start_date, end_date, start_day, duration, plan, actual, owner
                        FROM tasks
                        WHERE owner LIKE @owner
                        ORDER BY id";
                    command.Parameters.AddWithValue("@owner", $"%{owner}%");
                }

                using (var reader = await command.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        tasks.Add(new
                        {
                            Id = reader.GetInt32(0),
                            ProjectId = reader.IsDBNull(1) ? (int?)null : reader.GetInt32(1),
                            Group = reader.GetString(2),
                            SubGroup = reader.GetString(3),
                            Name = reader.GetString(4),
                            StartDate = reader.GetString(5),
                            EndDate = reader.GetString(6),
                            StartDay = reader.GetInt32(7),
                            Duration = reader.GetInt32(8),
                            Plan = reader.GetInt32(9),
                            Actual = reader.GetInt32(10),
                            Owner = reader.GetString(11)
                        });
                    }
                }
            }

            return Results.Ok(tasks);
        });

        // 更新任务
        app.MapPut("/api/tasks/{id}", async (int id, TaskUpdateRequest request) =>
        {
            using (var connection = new SQLiteConnection(GetConnectionString()))
            {
                await connection.OpenAsync();
                
                var setClauses = new List<string>();
                var parameters = new List<SQLiteParameter>();

                if (request.Group != null)
                {
                    setClauses.Add("group_name = @group");
                    parameters.Add(new SQLiteParameter("@group", request.Group));
                }

                if (request.SubGroup != null)
                {
                    setClauses.Add("sub_group = @subGroup");
                    parameters.Add(new SQLiteParameter("@subGroup", request.SubGroup));
                }

                if (request.Name != null)
                {
                    setClauses.Add("name = @name");
                    parameters.Add(new SQLiteParameter("@name", request.Name));
                }

                if (request.StartDate != null)
                {
                    setClauses.Add("start_date = @startDate");
                    parameters.Add(new SQLiteParameter("@startDate", request.StartDate));
                }

                if (request.EndDate != null)
                {
                    setClauses.Add("end_date = @endDate");
                    parameters.Add(new SQLiteParameter("@endDate", request.EndDate));
                }

                if (request.StartDay.HasValue)
                {
                    setClauses.Add("start_day = @startDay");
                    parameters.Add(new SQLiteParameter("@startDay", request.StartDay.Value));
                }

                if (request.Duration.HasValue)
                {
                    setClauses.Add("duration = @duration");
                    parameters.Add(new SQLiteParameter("@duration", request.Duration.Value));
                }

                if (request.Plan.HasValue)
                {
                    setClauses.Add("plan = @plan");
                    parameters.Add(new SQLiteParameter("@plan", request.Plan.Value));
                }

                if (request.Actual.HasValue)
                {
                    setClauses.Add("actual = @actual");
                    parameters.Add(new SQLiteParameter("@actual", request.Actual.Value));
                }

                if (request.Owner != null)
                {
                    setClauses.Add("owner = @owner");
                    parameters.Add(new SQLiteParameter("@owner", request.Owner));
                }

                if (setClauses.Count == 0)
                {
                    return Results.BadRequest(new { error = "No fields to update" });
                }

                var setClause = string.Join(", ", setClauses);
                
                var command = connection.CreateCommand();
                command.CommandText = $@"
                    UPDATE tasks 
                    SET {setClause}, updated_at = datetime('now')
                    WHERE id = @id";
                
                command.Parameters.AddWithValue("@id", id);
                command.Parameters.AddRange(parameters.ToArray());

                var rowsAffected = await command.ExecuteNonQueryAsync();
                
                if (rowsAffected > 0)
                {
                    return Results.Ok(new { message = "Task updated successfully", changes = rowsAffected });
                }
                else
                {
                    return Results.NotFound(new { error = "Task not found" });
                }
            }
        });

        // 健康检查
        app.MapGet("/health", () => 
        {
            var dbPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "schedule.db");
            var exists = File.Exists(dbPath);
            return Results.Ok(new 
            { 
                status = "OK", 
                database = exists ? "Exists" : "Not found",
                timestamp = DateTime.UtcNow
            });
        });
    }
}

public class TaskUpdateRequest
{
    public string? Group { get; set; }
    public string? SubGroup { get; set; }
    public string? Name { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public int? StartDay { get; set; }
    public int? Duration { get; set; }
    public int? Plan { get; set; }
    public int? Actual { get; set; }
    public string? Owner { get; set; }
}
using Microsoft.Data.Sqlite;

var builder = WebApplication.CreateBuilder(args);

// 添加服务
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 添加健康检查
builder.Services.AddHealthChecks();

var app = builder.Build();

// 配置中间件
app.UseCors("AllowAll");
app.UseHealthChecks("/health");

// 辅助方法：获取数据库连接字符串
static string GetConnectionString()
{
    // 从当前目录向上找到 data/schedule.db
    var currentDir = Directory.GetCurrentDirectory();
    var dbPath = Path.Combine(currentDir, "..", "..", "data", "schedule.db");
    var fullPath = Path.GetFullPath(dbPath);
    
    // 如果找不到，尝试其他可能的路径
    if (!File.Exists(fullPath))
    {
        // 尝试直接在当前目录查找
        var altPath = Path.Combine(currentDir, "schedule.db");
        if (File.Exists(altPath))
        {
            fullPath = altPath;
        }
        else
        {
            // 尝试项目根目录
            var rootPath = Path.Combine(currentDir, "..", "..", "..", "data", "schedule.db");
            fullPath = Path.GetFullPath(rootPath);
        }
    }
    
    Console.WriteLine($"Database path: {fullPath}");
    Console.WriteLine($"Database exists: {File.Exists(fullPath)}");
    
    return $"Data Source={fullPath}";
}

// API端点
app.MapGet("/api/tasks", async () =>
{
    var tasks = new List<object>();
    
    using (var connection = new SqliteConnection(GetConnectionString()))
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

app.MapGet("/api/tasks/search", async (string? owner) =>
{
    var tasks = new List<object>();
    
    using (var connection = new SqliteConnection(GetConnectionString()))
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

app.MapPut("/api/tasks/{id}", async (int id, TaskUpdateRequest request) =>
{
    using (var connection = new SqliteConnection(GetConnectionString()))
    {
        await connection.OpenAsync();
        
        var setClauses = new List<string>();
        var parameters = new List<SqliteParameter>();

        if (request.Group != null)
        {
            setClauses.Add("group_name = @group");
            parameters.Add(new SqliteParameter("@group", request.Group));
        }

        if (request.SubGroup != null)
        {
            setClauses.Add("sub_group = @subGroup");
            parameters.Add(new SqliteParameter("@subGroup", request.SubGroup));
        }

        if (request.Name != null)
        {
            setClauses.Add("name = @name");
            parameters.Add(new SqliteParameter("@name", request.Name));
        }

        if (request.StartDate != null)
        {
            setClauses.Add("start_date = @startDate");
            parameters.Add(new SqliteParameter("@startDate", request.StartDate));
        }

        if (request.EndDate != null)
        {
            setClauses.Add("end_date = @endDate");
            parameters.Add(new SqliteParameter("@endDate", request.EndDate));
        }

        if (request.StartDay.HasValue)
        {
            setClauses.Add("start_day = @startDay");
            parameters.Add(new SqliteParameter("@startDay", request.StartDay.Value));
        }

        if (request.Duration.HasValue)
        {
            setClauses.Add("duration = @duration");
            parameters.Add(new SqliteParameter("@duration", request.Duration.Value));
        }

        if (request.Plan.HasValue)
        {
            setClauses.Add("plan = @plan");
            parameters.Add(new SqliteParameter("@plan", request.Plan.Value));
        }

        if (request.Actual.HasValue)
        {
            setClauses.Add("actual = @actual");
            parameters.Add(new SqliteParameter("@actual", request.Actual.Value));
        }

        if (request.Owner != null)
        {
            setClauses.Add("owner = @owner");
            parameters.Add(new SqliteParameter("@owner", request.Owner));
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

// API: 创建新任务
app.MapPost("/api/tasks", async (TaskCreateRequest request) =>
{
    // 验证必填字段
    if (string.IsNullOrEmpty(request.Group))
        return Results.BadRequest(new { error = "Group is required" });
    if (string.IsNullOrEmpty(request.SubGroup))
        return Results.BadRequest(new { error = "SubGroup is required" });
    if (string.IsNullOrEmpty(request.Name))
        return Results.BadRequest(new { error = "Name is required" });
    if (string.IsNullOrEmpty(request.StartDate))
        return Results.BadRequest(new { error = "StartDate is required" });
    if (string.IsNullOrEmpty(request.EndDate))
        return Results.BadRequest(new { error = "EndDate is required" });
    if (string.IsNullOrEmpty(request.Owner))
        return Results.BadRequest(new { error = "Owner is required" });

    using (var connection = new SqliteConnection(GetConnectionString()))
    {
        await connection.OpenAsync();
        
        var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO tasks 
            (project_id, group_name, sub_group, name, start_date, end_date, start_day, duration, plan, actual, owner)
            VALUES (@projectId, @group, @subGroup, @name, @startDate, @endDate, @startDay, @duration, @plan, @actual, @owner)";
        
        command.Parameters.AddWithValue("@projectId", request.ProjectId ?? DBNull.Value);
        command.Parameters.AddWithValue("@group", request.Group);
        command.Parameters.AddWithValue("@subGroup", request.SubGroup);
        command.Parameters.AddWithValue("@name", request.Name);
        command.Parameters.AddWithValue("@startDate", request.StartDate);
        command.Parameters.AddWithValue("@endDate", request.EndDate);
        command.Parameters.AddWithValue("@startDay", request.StartDay ?? 0);
        command.Parameters.AddWithValue("@duration", request.Duration ?? 1);
        command.Parameters.AddWithValue("@plan", request.Plan ?? 100);
        command.Parameters.AddWithValue("@actual", request.Actual ?? 0);
        command.Parameters.AddWithValue("@owner", request.Owner);

        await command.ExecuteNonQueryAsync();
        
        // 获取最后插入的ID
        var lastIdCommand = connection.CreateCommand();
        lastIdCommand.CommandText = "SELECT last_insert_rowid()";
        var lastId = Convert.ToInt32(await lastIdCommand.ExecuteScalarAsync());
        
        return Results.Created($"/api/tasks/{lastId}", new { 
            message = "Task created successfully", 
            id = lastId 
        });
    }
});

// API: 删除任务
app.MapDelete("/api/tasks/{id}", async (int id) =>
{
    using (var connection = new SqliteConnection(GetConnectionString()))
    {
        await connection.OpenAsync();
        
        var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM tasks WHERE id = @id";
        command.Parameters.AddWithValue("@id", id);

        var rowsAffected = await command.ExecuteNonQueryAsync();
        
        if (rowsAffected > 0)
        {
            return Results.Ok(new { message = "Task deleted successfully", changes = rowsAffected });
        }
        else
        {
            return Results.NotFound(new { error = "Task not found" });
        }
    }
});

// 启动服务器
app.Run("http://localhost:3001");

// 请求模型
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

public class TaskCreateRequest
{
    public int? ProjectId { get; set; }
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
using System;
using System.IO;
using System.Net;
using System.Text;
using System.Collections.Generic;
using System.Web;

namespace SimpleScheduleServer
{
    class Program
    {
        private static readonly string DbPath = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", "data", "schedule.db"));
        private static readonly int Port = 3001;
        
        // 模拟数据存储（内存中）
        private static List<Dictionary<string, object>> tasks = new List<Dictionary<string, object>>();

        static void Main(string[] args)
        {
            Console.WriteLine("========================================");
            Console.WriteLine("  日程表服务器 (无依赖版)");
            Console.WriteLine("========================================");
            Console.WriteLine();
            Console.WriteLine($"数据库路径: {DbPath}");
            Console.WriteLine($"数据库存在: {File.Exists(DbPath)}");
            Console.WriteLine($"监听端口: {Port}");
            Console.WriteLine();

            if (!File.Exists(DbPath))
            {
                Console.WriteLine("❌ 错误: 数据库文件不存在!");
                Console.WriteLine("请运行: sqlite3 data/schedule.db \".read data/schema.sql\"");
                return;
            }

            var server = new HttpListener();
            server.Prefixes.Add($"http://localhost:{Port}/");

            try
            {
                server.Start();
                Console.WriteLine("✅ 服务器启动成功!");
                Console.WriteLine($"API 地址: http://localhost:{Port}/api/tasks");
                Console.WriteLine();
                Console.WriteLine("按 Ctrl+C 停止服务器...");
                Console.WriteLine();

                while (true)
                {
                    var context = server.GetContext();
                    HandleRequest(context);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ 服务器错误: {ex.Message}");
            }
            finally
            {
                server.Stop();
            }
        }

        static void HandleRequest(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;

            // 设置 CORS
            response.Headers.Add("Access-Control-Allow-Origin", "*");
            response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

            // 处理 OPTIONS 请求
            if (request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = 200;
                response.Close();
                return;
            }

            var path = request.Url.AbsolutePath;
            Console.WriteLine($"{request.HttpMethod} {path}");

            try
            {
                if (path == "/api/tasks" && request.HttpMethod == "GET")
                {
                    GetAllTasks(response);
                }
                else if (path.StartsWith("/api/tasks/search") && request.HttpMethod == "GET")
                {
                    SearchTasks(request, response);
                }
                else if (path.StartsWith("/api/tasks/") && request.HttpMethod == "PUT")
                {
                    UpdateTask(request, response, path);
                }
                else if (path == "/api/tasks" && request.HttpMethod == "POST")
                {
                    CreateTask(request, response);
                }
                else if (path.StartsWith("/api/tasks/") && request.HttpMethod == "DELETE")
                {
                    DeleteTask(response, path);
                }
                else if (path == "/health")
                {
                    HealthCheck(response);
                }
                else
                {
                    SendJsonResponse(response, 404, new { error = "Endpoint not found" });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"错误: {ex.Message}");
                SendJsonResponse(response, 500, new { error = ex.Message });
            }
        }

        static void GetAllTasks(HttpListenerResponse response)
        {
            var tasks = new List<object>();

            using (var connection = new SQLiteConnection($"Data Source={DbPath}"))
            {
                connection.Open();
                var command = connection.CreateCommand();
                command.CommandText = "SELECT id, group_name, sub_group, name, start_date, end_date, start_day, duration, plan, actual, owner FROM tasks ORDER BY id";

                using (var reader = command.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        tasks.Add(new
                        {
                            id = reader.GetInt32(0),
                            group = reader.GetString(1),
                            subGroup = reader.GetString(2),
                            name = reader.GetString(3),
                            startDate = reader.GetString(4),
                            endDate = reader.GetString(5),
                            startDay = reader.GetInt32(6),
                            duration = reader.GetInt32(7),
                            plan = reader.GetInt32(8),
                            actual = reader.GetInt32(9),
                            owner = reader.GetString(10)
                        });
                    }
                }
            }

            SendJsonResponse(response, 200, tasks);
        }

        static void SearchTasks(HttpListenerRequest request, HttpListenerResponse response)
        {
            var query = HttpUtility.ParseQueryString(request.Url.Query);
            var owner = query["owner"] ?? "";

            var tasks = new List<object>();

            using (var connection = new SQLiteConnection($"Data Source={DbPath}"))
            {
                connection.Open();
                var command = connection.CreateCommand();

                if (string.IsNullOrEmpty(owner))
                {
                    command.CommandText = "SELECT id, group_name, sub_group, name, start_date, end_date, start_day, duration, plan, actual, owner FROM tasks ORDER BY id";
                }
                else
                {
                    command.CommandText = "SELECT id, group_name, sub_group, name, start_date, end_date, start_day, duration, plan, actual, owner FROM tasks WHERE owner LIKE @owner ORDER BY id";
                    command.Parameters.AddWithValue("@owner", $"%{owner}%");
                }

                using (var reader = command.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        tasks.Add(new
                        {
                            id = reader.GetInt32(0),
                            group = reader.GetString(1),
                            subGroup = reader.GetString(2),
                            name = reader.GetString(3),
                            startDate = reader.GetString(4),
                            endDate = reader.GetString(5),
                            startDay = reader.GetInt32(6),
                            duration = reader.GetInt32(7),
                            plan = reader.GetInt32(8),
                            actual = reader.GetInt32(9),
                            owner = reader.GetString(10)
                        });
                    }
                }
            }

            SendJsonResponse(response, 200, tasks);
        }

        static void UpdateTask(HttpListenerRequest request, HttpListenerResponse response, string path)
        {
            var taskId = path.Split('/')[3];
            var body = new StreamReader(request.InputStream).ReadToEnd();

            // 简单解析 JSON（实际生产环境应使用 JSON 库）
            var updates = ParseSimpleJson(body);

            using (var connection = new SQLiteConnection($"Data Source={DbPath}"))
            {
                connection.Open();
                var setClauses = new List<string>();
                var parameters = new List<SQLiteParameter>();

                if (updates.ContainsKey("group"))
                {
                    setClauses.Add("group_name = @group");
                    parameters.Add(new SQLiteParameter("@group", updates["group"]));
                }
                if (updates.ContainsKey("subGroup"))
                {
                    setClauses.Add("sub_group = @subGroup");
                    parameters.Add(new SQLiteParameter("@subGroup", updates["subGroup"]));
                }
                if (updates.ContainsKey("name"))
                {
                    setClauses.Add("name = @name");
                    parameters.Add(new SQLiteParameter("@name", updates["name"]));
                }
                if (updates.ContainsKey("owner"))
                {
                    setClauses.Add("owner = @owner");
                    parameters.Add(new SQLiteParameter("@owner", updates["owner"]));
                }
                if (updates.ContainsKey("actual"))
                {
                    setClauses.Add("actual = @actual");
                    parameters.Add(new SQLiteParameter("@actual", int.Parse(updates["actual"])));
                }

                if (setClauses.Count == 0)
                {
                    SendJsonResponse(response, 400, new { error = "No fields to update" });
                    return;
                }

                var command = connection.CreateCommand();
                command.CommandText = $"UPDATE tasks SET {string.Join(", ", setClauses)}, updated_at = datetime('now') WHERE id = @id";
                command.Parameters.AddWithValue("@id", int.Parse(taskId));
                command.Parameters.AddRange(parameters.ToArray());

                var rowsAffected = command.ExecuteNonQuery();

                if (rowsAffected > 0)
                {
                    SendJsonResponse(response, 200, new { message = "Task updated successfully", changes = rowsAffected });
                }
                else
                {
                    SendJsonResponse(response, 404, new { error = "Task not found" });
                }
            }
        }

        static void CreateTask(HttpListenerRequest request, HttpListenerResponse response)
        {
            var body = new StreamReader(request.InputStream).ReadToEnd();
            var data = ParseSimpleJson(body);

            using (var connection = new SQLiteConnection($"Data Source={DbPath}"))
            {
                connection.Open();
                var command = connection.CreateCommand();
                command.CommandText = @"
                    INSERT INTO tasks (group_name, sub_group, name, start_date, end_date, start_day, duration, plan, actual, owner)
                    VALUES (@group, @subGroup, @name, @startDate, @endDate, @startDay, @duration, @plan, @actual, @owner)";

                command.Parameters.AddWithValue("@group", data.GetValueOrDefault("group", "默认分组"));
                command.Parameters.AddWithValue("@subGroup", data.GetValueOrDefault("subGroup", "默认模块"));
                command.Parameters.AddWithValue("@name", data.GetValueOrDefault("name", "新任务"));
                command.Parameters.AddWithValue("@startDate", data.GetValueOrDefault("startDate", DateTime.Now.ToString("yyyy-MM-dd")));
                command.Parameters.AddWithValue("@endDate", data.GetValueOrDefault("endDate", DateTime.Now.AddDays(7).ToString("yyyy-MM-dd")));
                command.Parameters.AddWithValue("@startDay", 0);
                command.Parameters.AddWithValue("@duration", 7);
                command.Parameters.AddWithValue("@plan", 100);
                command.Parameters.AddWithValue("@actual", 0);
                command.Parameters.AddWithValue("@owner", data.GetValueOrDefault("owner", "未分配"));

                command.ExecuteNonQuery();

                var lastIdCommand = connection.CreateCommand();
                lastIdCommand.CommandText = "SELECT last_insert_rowid()";
                var lastId = Convert.ToInt32(lastIdCommand.ExecuteScalar());

                SendJsonResponse(response, 201, new { message = "Task created successfully", id = lastId });
            }
        }

        static void DeleteTask(HttpListenerResponse response, string path)
        {
            var taskId = path.Split('/')[3];

            using (var connection = new SQLiteConnection($"Data Source={DbPath}"))
            {
                connection.Open();
                var command = connection.CreateCommand();
                command.CommandText = "DELETE FROM tasks WHERE id = @id";
                command.Parameters.AddWithValue("@id", int.Parse(taskId));

                var rowsAffected = command.ExecuteNonQuery();

                if (rowsAffected > 0)
                {
                    SendJsonResponse(response, 200, new { message = "Task deleted successfully", changes = rowsAffected });
                }
                else
                {
                    SendJsonResponse(response, 404, new { error = "Task not found" });
                }
            }
        }

        static void HealthCheck(HttpListenerResponse response)
        {
            SendJsonResponse(response, 200, new { status = "ok", timestamp = DateTime.Now });
        }

        static void SendJsonResponse(HttpListenerResponse response, int statusCode, object data)
        {
            var json = SerializeToJson(data);
            var buffer = Encoding.UTF8.GetBytes(json);

            response.ContentType = "application/json; charset=utf-8";
            response.StatusCode = statusCode;
            response.ContentLength64 = buffer.Length;
            response.OutputStream.Write(buffer, 0, buffer.Length);
            response.Close();
        }

        // 简单的 JSON 序列化（仅用于基本类型）
        static string SerializeToJson(object obj)
        {
            if (obj is string str)
                return $"\"{str}\"";
            if (obj is int || obj is long)
                return obj.ToString();
            if (obj is bool b)
                return b ? "true" : "false";
            if (obj is null)
                return "null";

            var type = obj.GetType();
            
            // 处理列表
            if (obj is System.Collections.IList list)
            {
                var items = new List<string>();
                foreach (var item in list)
                {
                    items.Add(SerializeToJson(item));
                }
                return "[" + string.Join(", ", items) + "]";
            }

            // 处理对象
            var properties = type.GetProperties();
            var fields = new List<string>();
            foreach (var prop in properties)
            {
                var value = prop.GetValue(obj);
                var name = prop.Name;
                // 转换 PascalCase 到 camelCase
                name = char.ToLowerInvariant(name[0]) + name.Substring(1);
                fields.Add($"\"{name}\": {SerializeToJson(value)}");
            }
            return "{" + string.Join(", ", fields) + "}";
        }

        // 简单的 JSON 解析（仅支持扁平对象）
        static Dictionary<string, string> ParseSimpleJson(string json)
        {
            var result = new Dictionary<string, string>();
            if (string.IsNullOrWhiteSpace(json))
                return result;

            // 移除花括号
            json = json.Trim('{', '}', ' ');
            
            var pairs = json.Split(',');
            foreach (var pair in pairs)
            {
                var parts = pair.Split(':');
                if (parts.Length == 2)
                {
                    var key = parts[0].Trim().Trim('"');
                    var value = parts[1].Trim().Trim('"');
                    result[key] = value;
                }
            }

            return result;
        }
    }
}

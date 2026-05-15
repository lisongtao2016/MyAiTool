using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.Script.Serialization;

namespace IlikesWebEditor
{
    /// <summary>
    /// WebServ 的摘要说明
    /// </summary>
    [WebService(Namespace = "http://tempuri.org/")]
    [WebServiceBinding(ConformsTo = WsiProfiles.BasicProfile1_1)]
    [System.ComponentModel.ToolboxItem(false)]
    // 若要允许使用 ASP.NET AJAX 从脚本中调用此 Web 服务，请取消注释以下行。 
    [System.Web.Script.Services.ScriptService]
    public class WebServ : System.Web.Services.WebService
    {
        [WebMethod]
        public string HelloWorld()
        {
            return "Hello World";
        }

        private static string EscapeJson(string input)
        {
            if (string.IsNullOrEmpty(input))
                return "";

            return input.Replace("\\", "\\\\")
                       .Replace("\"", "\\\"")
                       .Replace("\n", "\\n")
                       .Replace("\r", "\\r")
                       .Replace("\t", "\\t");
        }

        [WebMethod]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public string SaveContent(string title, string content, string language, string subtitle, string author, string hotTags, string shareTo, string plainText = null, int? id = null, string category = null, int? projectId = null)
        {
            try
            {
                var repository = new EditorContentRepository();
                
                if (id.HasValue && id.Value > 0)
                {
                    // 更新现有内容
                    var editorContent = repository.GetContentById(id.Value);
                    if (editorContent != null)
                    {
                        editorContent.Title = title;
                        editorContent.Subtitle = subtitle;
                        editorContent.Content = content;
                        editorContent.PlainText = plainText;
                        editorContent.Language = language;
                        editorContent.Author = author;
                        editorContent.HotTags = hotTags;
                        editorContent.ShareTo = shareTo;
                        editorContent.Category = category;
                        editorContent.ProjectId = projectId;
                        editorContent.ModifiedDate = DateTime.Now;
                        
                        repository.UpdateContent(editorContent);
                        return $"{{ \"success\": true, \"id\": {id.Value}, \"message\": \"内容更新成功\" }}";
                    }
                    else
                    {
                        return $"{{ \"success\": false, \"message\": \"未找到要更新的内容\" }}";
                    }
                }
                else
                {
                    // 创建新内容
                    var editorContent = new EditorContent
                    {
                        Title = title,
                        Subtitle = subtitle,
                        Content = content,
                        PlainText = plainText,
                        Language = language,
                        Author = author,
                        HotTags = hotTags,
                        ShareTo = shareTo,
                        Category = category,
                        ProjectId = projectId,
                        CreatedDate = DateTime.Now,
                        ModifiedDate = DateTime.Now
                    };
            
                    int newId = repository.SaveContent(editorContent);
                    return $"{{ \"success\": true, \"id\": {newId}, \"message\": \"内容保存成功\" }}";
                }
            }
            catch (Exception ex)
            {
                return $"{{ \"success\": false, \"message\": \"保存失败：{ex.Message}\" }}";
            }
        }

        [WebMethod]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public string LoadContent(int id)
        {
            try
            {
                var repository = new EditorContentRepository();
                var content = repository.GetContentById(id);
        
                if (content != null)
                {
                    return $"{{\"success\": true, \"title\": \"{EscapeJson(content.Title)}\", \"subtitle\": \"{EscapeJson(content.Subtitle)}\", \"content\": \"{EscapeJson(content.Content)}\", \"language\": \"{EscapeJson(content.Language)}\", \"author\": \"{EscapeJson(content.Author)}\", \"hotTags\": \"{EscapeJson(content.HotTags)}\", \"shareTo\": \"{EscapeJson(content.ShareTo)}\", \"category\": \"{EscapeJson(content.Category)}\"}}";
                }
                else
                {
                    return $"{{\"success\": false, \"message\": \"未找到 ID 为{id}的内容\"}}";
                }
            }
            catch (Exception ex)
            {
                return $"{{\"success\": false, \"message\": \"加载失败：{ex.Message}\"}}";
            }
        }

        [WebMethod]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public string GetAllContents()
        {
            try
            {
                var repository = new EditorContentRepository();
                var contents = repository.GetAllContents();
        
                var contentList = new List<string>();
                foreach (var content in contents)
                {
                    contentList.Add($"{{\"id\": {content.Id}, \"title\": \"{EscapeJson(content.Title)}\", \"subtitle\": \"{EscapeJson(content.Subtitle)}\", \"author\": \"{EscapeJson(content.Author)}\", \"hotTags\": \"{EscapeJson(content.HotTags)}\", \"language\": \"{EscapeJson(content.Language)}\", \"createdDate\": \"{content.CreatedDate:yyyy-MM-dd HH:mm:ss}\"}}");
                }
        
                return $"{{\"success\": true, \"contents\": [{string.Join(",", contentList)}]}}";
            }
            catch (Exception ex)
            {
                return $"{{\"success\": false, \"message\": \"获取列表失败：{ex.Message}\"}}";
            }
        }

        [WebMethod]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public string GetContentsByProject(int projectId = 0)
        {
            try
            {
                var repository = new EditorContentRepository();
                int? nullableProjectId = projectId > 0 ? (int?)projectId : null;
                var contents = repository.GetContentsByProject(nullableProjectId);
        
                var contentList = new List<string>();
                foreach (var content in contents)
                {
                    contentList.Add($"{{\"id\": {content.Id}, \"title\": \"{EscapeJson(content.Title)}\", \"subtitle\": \"{EscapeJson(content.Subtitle)}\", \"author\": \"{EscapeJson(content.Author)}\", \"hotTags\": \"{EscapeJson(content.HotTags)}\", \"language\": \"{EscapeJson(content.Language)}\", \"createdDate\": \"{content.CreatedDate:yyyy-MM-dd HH:mm:ss}\"}}");
                }
        
                return $"{{\"success\": true, \"contents\": [{string.Join(",", contentList)}]}}";
            }
            catch (Exception ex)
            {
                // 记录详细错误信息
                System.Diagnostics.Debug.WriteLine("GetContentsByProject error: " + ex.Message);
                System.Diagnostics.Debug.WriteLine("Stack trace: " + ex.StackTrace);
                return $"{{\"success\": false, \"message\": \"获取项目内容失败：{EscapeJson(ex.Message)}\"}}";
            }
        }

        [WebMethod]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public string DeleteContent(int id)
        {
            try
            {
                var repository = new EditorContentRepository();
                repository.DeleteContent(id);
                return $"{{ \"success\": true, \"message\": \"内容删除成功\" }}";
            }
            catch (Exception ex)
            {
                return $"{{ \"success\": false, \"message\": \"删除失败：{ex.Message}\" }}";
            }
        }
        
        [WebMethod]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public string SearchContents(string searchText)
        {
            try
            {
                // 确保数据库已初始化
                DatabaseInitializer.InitializeDatabase();
                        
                var repository = new EditorContentRepository();
                List<EditorContent> contents;
                                        
                if (string.IsNullOrWhiteSpace(searchText))
                {
                    // 空搜索返回所有记录
                    contents = repository.GetAllContents();
                }
                else
                {
                    // 执行搜索
                    contents = repository.SearchContents(searchText);
                }
                
                var contentList = new List<string>();
                foreach (var content in contents)
                {
                    contentList.Add($"{{\"id\": {content.Id}, \"title\": \"{EscapeJson(content.Title)}\", \"subtitle\": \"{EscapeJson(content.Subtitle)}\", \"author\": \"{EscapeJson(content.Author)}\", \"hotTags\": \"{EscapeJson(content.HotTags)}\", \"language\": \"{EscapeJson(content.Language)}\", \"createdDate\": \"{content.CreatedDate:yyyy-MM-dd HH:mm:ss}\"}}");
                }
                
                return $"{{\"success\": true, \"contents\": [{string.Join(",", contentList)}]}}";
            }
            catch (Exception ex)
            {
                // 记录详细错误信息到控制台（调试用）
                System.Diagnostics.Debug.WriteLine("Search error: " + ex.Message);
                System.Diagnostics.Debug.WriteLine("Stack trace: " + ex.StackTrace);
                                    
                return $"{{\"success\": false, \"message\": \"Search failed: {ex.Message}\"}}";
            }
        }

        [WebMethod]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public string RegisterUser(string username, string email, string password, string displayName = null)
        {
            try
            {
                // 确保数据库已初始化
                DatabaseInitializer.InitializeDatabase();
                
                var userRepository = new UserRepository();
                var user = userRepository.RegisterUser(username, email, password, displayName);
                
                return $"{{\"success\": true, \"message\": \"注册成功\", \"userId\": {user.Id}, \"displayName\": \"{EscapeJson(user.DisplayName)}\"}}";
            }
            catch (Exception ex)
            {
                return $"{{\"success\": false, \"message\": \"注册失败：{EscapeJson(ex.Message)}\"}}";
            }
        }

        [WebMethod]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public string LoginUser(string identifier, string password)
        {
            try
            {
                // 确保数据库已初始化
                DatabaseInitializer.InitializeDatabase();
                
                var userRepository = new UserRepository();
                var user = userRepository.AuthenticateUser(identifier, password);
                
                if (user == null)
                {
                    return $"{{\"success\": false, \"message\": \"用户名/邮箱或密码错误\"}}";
                }
                
                if (!user.IsActive)
                {
                    return $"{{\"success\": false, \"message\": \"账户已被禁用\"}}";
                }
                
                return $"{{\"success\": true, \"message\": \"登录成功\", \"userId\": {user.Id}, \"username\": \"{EscapeJson(user.Username)}\", \"displayName\": \"{EscapeJson(user.DisplayName)}\", \"email\": \"{EscapeJson(user.Email)}\", \"role\": \"{EscapeJson(user.Role)}\"}}";
            }
            catch (Exception ex)
            {
                return $"{{\"success\": false, \"message\": \"登录失败：{EscapeJson(ex.Message)}\"}}";
            }
        }

        [WebMethod]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public string CheckSession()
        {
            try
            {
                // 这里可以添加会话检查逻辑
                // 目前返回一个简单的成功响应，表示服务器正常运行
                return $"{{\"success\": true, \"message\": \"系统就绪\"}}";
            }
            catch (Exception ex)
            {
                return $"{{\"success\": false, \"message\": \"会话检查失败：{EscapeJson(ex.Message)}\"}}";
            }
        }

        // 项目管理API
        [WebMethod]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public string GetAllProjects()
        {
            try
            {
                // 确保数据库已初始化
                DatabaseInitializer.InitializeDatabase();
                
                var repository = new ProjectRepository();
                var projects = repository.GetAllProjects();
        
                var projectList = new List<string>();
                foreach (var project in projects)
                {
                    projectList.Add($"{{\"id\": {project.Id}, \"name\": \"{EscapeJson(project.Name)}\", \"description\": \"{EscapeJson(project.Description)}\", \"createdBy\": \"{EscapeJson(project.CreatedBy)}\", \"createdDate\": \"{project.CreatedDate:yyyy-MM-dd HH:mm:ss}\"}}");
                }
        
                return $"{{\"success\": true, \"projects\": [{string.Join(",", projectList)}]}}";
            }
            catch (Exception ex)
            {
                return $"{{\"success\": false, \"message\": \"获取项目列表失败：{ex.Message}\"}}";
            }
        }

        [WebMethod]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public string CreateProject(string name, string description)
        {
            try
            {
                // 确保数据库已初始化
                DatabaseInitializer.InitializeDatabase();
                
                var repository = new ProjectRepository();
                
                // 检查项目名称是否已存在
                if (repository.ProjectNameExists(name))
                {
                    return $"{{\"success\": false, \"message\": \"项目名称已存在\"}}";
                }
                
                // 获取当前用户
                var currentUser = GetCurrentUser();
                var createdBy = currentUser?.DisplayName ?? currentUser?.Username ?? "匿名";
                
                var project = new Project
                {
                    Name = name,
                    Description = description,
                    CreatedBy = createdBy
                };
                
                int newId = repository.CreateProject(project);
                return $"{{\"success\": true, \"id\": {newId}, \"message\": \"项目创建成功\"}}";
            }
            catch (Exception ex)
            {
                return $"{{\"success\": false, \"message\": \"创建项目失败：{EscapeJson(ex.Message)}\"}}";
            }
        }

        [WebMethod]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public string UpdateProject(int id, string name, string description)
        {
            try
            {
                var repository = new ProjectRepository();
                
                // 检查项目是否存在
                var existingProject = repository.GetProjectById(id);
                if (existingProject == null)
                {
                    return $"{{\"success\": false, \"message\": \"项目不存在\"}}";
                }
                
                // 检查项目名称是否已存在（排除当前项目）
                if (repository.ProjectNameExists(name, id))
                {
                    return $"{{\"success\": false, \"message\": \"项目名称已存在\"}}";
                }
                
                existingProject.Name = name;
                existingProject.Description = description;
                
                bool success = repository.UpdateProject(existingProject);
                if (success)
                {
                    return $"{{\"success\": true, \"message\": \"项目更新成功\"}}";
                }
                else
                {
                    return $"{{\"success\": false, \"message\": \"项目更新失败\"}}";
                }
            }
            catch (Exception ex)
            {
                return $"{{\"success\": false, \"message\": \"更新项目失败：{EscapeJson(ex.Message)}\"}}";
            }
        }

        [WebMethod]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public string DeleteProject(int id)
        {
            try
            {
                var repository = new ProjectRepository();
                
                // 检查项目是否存在
                var existingProject = repository.GetProjectById(id);
                if (existingProject == null)
                {
                    return $"{{\"success\": false, \"message\": \"项目不存在\"}}";
                }
                
                bool success = repository.DeleteProject(id);
                if (success)
                {
                    return $"{{\"success\": true, \"message\": \"项目删除成功\"}}";
                }
                else
                {
                    return $"{{\"success\": false, \"message\": \"项目删除失败\"}}";
                }
            }
            catch (Exception ex)
            {
                return $"{{\"success\": false, \"message\": \"删除项目失败：{EscapeJson(ex.Message)}\"}}";
            }
        }

        // 获取当前用户信息（从会话或本地存储）
        private User GetCurrentUser()
        {
            // 这里可以从会话中获取用户信息
            // 目前返回null，实际使用时需要实现用户认证
            return null;
        }
    }
}

using System;
using System.Collections.Generic;
using System.Data.SQLite;

namespace IlikesWebEditor
{
    public class EditorContentRepository
    {
        private string connectionString;

        public EditorContentRepository()
        {
            connectionString = DatabaseInitializer.GetConnectionString();
        }

        public int SaveContent(EditorContent content)
        {
            using (var connection = new SQLiteConnection(connectionString))
            {
                connection.Open();

                string sql = @"
                INSERT INTO EditorContents (Title, Subtitle, Content, PlainText, Language, Author, HotTags, ShareTo, Category, ProjectId, CreatedDate, ModifiedDate)
                VALUES (@Title, @Subtitle, @Content, @PlainText, @Language, @Author, @HotTags, @ShareTo, @Category, @ProjectId, @CreatedDate, @ModifiedDate);
                SELECT last_insert_rowid();";

                using (var command = new SQLiteCommand(sql, connection))
                {
                    command.Parameters.AddWithValue("@Title", content.Title);
                    command.Parameters.AddWithValue("@Subtitle", content.Subtitle ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@Content", content.Content);
                    command.Parameters.AddWithValue("@PlainText", content.PlainText ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@Language", content.Language);
                    command.Parameters.AddWithValue("@Author", content.Author ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@HotTags", content.HotTags ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@ShareTo", content.ShareTo ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@Category", content.Category ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@ProjectId", content.ProjectId ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@CreatedDate", content.CreatedDate);
                    command.Parameters.AddWithValue("@ModifiedDate", content.ModifiedDate);

                    var result = command.ExecuteScalar();
                    return Convert.ToInt32(result);
                }
            }
        }

        public void UpdateContent(EditorContent content)
        {
            using (var connection = new SQLiteConnection(connectionString))
            {
                connection.Open();

                string sql = @"
                UPDATE EditorContents 
                SET Title = @Title, 
                    Subtitle = @Subtitle,
                    Content = @Content, 
                    PlainText = @PlainText,
                    Language = @Language, 
                    Author = @Author,
                    HotTags = @HotTags,
                    ShareTo = @ShareTo,
                    Category = @Category,
                    ProjectId = @ProjectId,
                    ModifiedDate = @ModifiedDate
                WHERE Id = @Id";

                using (var command = new SQLiteCommand(sql, connection))
                {
                    command.Parameters.AddWithValue("@Id", content.Id);
                    command.Parameters.AddWithValue("@Title", content.Title);
                    command.Parameters.AddWithValue("@Subtitle", content.Subtitle ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@Content", content.Content);
                    command.Parameters.AddWithValue("@PlainText", content.PlainText ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@Language", content.Language);
                    command.Parameters.AddWithValue("@Author", content.Author ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@HotTags", content.HotTags ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@ShareTo", content.ShareTo ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@Category", content.Category ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@ProjectId", content.ProjectId ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@ModifiedDate", DateTime.Now);

                    command.ExecuteNonQuery();
                }
            }
        }

        public EditorContent GetContentById(int id)
        {
            using (var connection = new SQLiteConnection(connectionString))
            {
                connection.Open();

                string sql = "SELECT * FROM EditorContents WHERE Id = @Id";

                using (var command = new SQLiteCommand(sql, connection))
                {
                    command.Parameters.AddWithValue("@Id", id);

                    using (var reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return MapReaderToEditorContent(reader);
                        }
                    }
                }
            }

            return null;
        }

        public List<EditorContent> GetAllContents()
        {
            var contents = new List<EditorContent>();

            using (var connection = new SQLiteConnection(connectionString))
            {
                connection.Open();

                string sql = "SELECT * FROM EditorContents ORDER BY CreatedDate DESC LIMIT 100";

                using (var command = new SQLiteCommand(sql, connection))
                {
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            contents.Add(MapReaderToEditorContent(reader));
                        }
                    }
                }
            }

            return contents;
        }

        public List<EditorContent> SearchContents(string searchText)
        {
            var contents = new List<EditorContent>();

            try
            {
                using (var connection = new SQLiteConnection(connectionString))
                {
                    connection.Open();

                    // 更新 SQL 查询，添加 PlainText 字段的搜索
                    string sql = "SELECT * FROM EditorContents WHERE (Title LIKE @SearchText OR Subtitle LIKE @SearchText OR Author LIKE @SearchText OR HotTags LIKE @SearchText OR PlainText LIKE @SearchText) ORDER BY CreatedDate DESC LIMIT 100";

                    using (var command = new SQLiteCommand(sql, connection))
                    {
                        // 处理空搜索的情况
                        if (string.IsNullOrEmpty(searchText))
                        {
                            searchText = "";
                        }
                        command.Parameters.AddWithValue("@SearchText", "%" + searchText + "%");

                        using (var reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                contents.Add(MapReaderToEditorContent(reader));
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Search failed: " + ex.Message);
            }

            return contents;
        }

        public List<EditorContent> GetContentsByLanguage(string language)
        {
            var contents = new List<EditorContent>();

            using (var connection = new SQLiteConnection(connectionString))
            {
                connection.Open();

                string sql = "SELECT * FROM EditorContents WHERE Language = @Language ORDER BY CreatedDate DESC";

                using (var command = new SQLiteCommand(sql, connection))
                {
                    command.Parameters.AddWithValue("@Language", language);

                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            contents.Add(MapReaderToEditorContent(reader));
                        }
                    }
                }
            }

            return contents;
        }

        public List<EditorContent> GetContentsByProject(int? projectId)
        {
            var contents = new List<EditorContent>();

            using (var connection = new SQLiteConnection(connectionString))
            {
                connection.Open();

                string sql;
                if (projectId.HasValue && projectId.Value > 0)
                {
                    // 筛选特定项目的内容
                    sql = "SELECT * FROM EditorContents WHERE ProjectId = @ProjectId ORDER BY CreatedDate DESC LIMIT 100";
                }
                else
                {
                    // 获取所有项目的内容（包括 ProjectId 为 NULL 的）
                    sql = "SELECT * FROM EditorContents ORDER BY CreatedDate DESC LIMIT 100";
                }

                using (var command = new SQLiteCommand(sql, connection))
                {
                    if (projectId.HasValue && projectId.Value > 0)
                    {
                        command.Parameters.AddWithValue("@ProjectId", projectId.Value);
                    }

                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            contents.Add(MapReaderToEditorContent(reader));
                        }
                    }
                }
            }

            return contents;
        }

        public void DeleteContent(int id)
        {
            using (var connection = new SQLiteConnection(connectionString))
            {
                connection.Open();

                string sql = "DELETE FROM EditorContents WHERE Id = @Id";

                using (var command = new SQLiteCommand(sql, connection))
                {
                    command.Parameters.AddWithValue("@Id", id);
                    command.ExecuteNonQuery();
                }
            }
        }

        private EditorContent MapReaderToEditorContent(SQLiteDataReader reader)
        {
            return new EditorContent
            {
                Id = Convert.ToInt32(reader["Id"]),
                Title = reader["Title"].ToString(),
                Subtitle = reader["Subtitle"] != null ? reader["Subtitle"].ToString() : "",
                Content = reader["Content"].ToString(),
                PlainText = reader["PlainText"] != null ? reader["PlainText"].ToString() : "",
                Language = reader["Language"].ToString(),
                Author = reader["Author"] != null ? reader["Author"].ToString() : "",
                HotTags = reader["HotTags"] != null ? reader["HotTags"].ToString() : "",
                ShareTo = reader["ShareTo"] != null ? reader["ShareTo"].ToString() : "",
                Category = reader["Category"] != null ? reader["Category"].ToString() : "",
                ProjectId = reader["ProjectId"] != DBNull.Value ? Convert.ToInt32(reader["ProjectId"]) : (int?)null,
                CreatedDate = Convert.ToDateTime(reader["CreatedDate"]),
                ModifiedDate = Convert.ToDateTime(reader["ModifiedDate"])
            };
        }
    }
}
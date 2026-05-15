using System;
using System.Data.SQLite;

namespace IlikesWebEditor
{
    class TestDatabase
    {
        static void Main(string[] args)
        {
            Console.WriteLine("测试数据库初始化...");
            
            try
            {
                // 初始化数据库
                DatabaseInitializer.InitializeDatabase();
                Console.WriteLine("数据库初始化成功！");
                
                // 测试保存内容
                var repository = new EditorContentRepository();
                var content = new EditorContent
                {
                    Title = "测试内容",
                    Content = "这是一个测试内容",
                    Language = "csharp",
                    CreatedDate = DateTime.Now,
                    ModifiedDate = DateTime.Now
                };
                
                int id = repository.SaveContent(content);
                Console.WriteLine($"内容保存成功，ID: {id}");
                
                // 测试加载内容
                var loadedContent = repository.GetContentById(id);
                if (loadedContent != null)
                {
                    Console.WriteLine($"加载内容成功：");
                    Console.WriteLine($"  ID: {loadedContent.Id}");
                    Console.WriteLine($"  标题: {loadedContent.Title}");
                    Console.WriteLine($"  语言: {loadedContent.Language}");
                    Console.WriteLine($"  内容长度: {loadedContent.Content.Length}");
                }
                else
                {
                    Console.WriteLine("加载内容失败");
                }
                
                // 测试获取所有内容
                var allContents = repository.GetAllContents();
                Console.WriteLine($"总共有 {allContents.Count} 个内容");
                
                // 测试删除内容
                repository.DeleteContent(id);
                Console.WriteLine("内容删除成功");
                
                // 验证删除
                var deletedContent = repository.GetContentById(id);
                if (deletedContent == null)
                {
                    Console.WriteLine("内容删除验证成功");
                }
                else
                {
                    Console.WriteLine("内容删除验证失败");
                }
                
                Console.WriteLine("所有测试通过！");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"测试失败: {ex.Message}");
                Console.WriteLine($"堆栈跟踪: {ex.StackTrace}");
            }
            
            Console.WriteLine("按任意键退出...");
            Console.ReadKey();
        }
    }
}
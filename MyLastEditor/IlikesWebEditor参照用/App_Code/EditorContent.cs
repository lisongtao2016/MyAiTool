using System;

namespace IlikesWebEditor
{
    public class EditorContent
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Subtitle { get; set; }
        public string Content { get; set; }
        public string PlainText { get; set; }  // 新增：纯文本内容，用于检索
        public string Language { get; set; }
        public string Author { get; set; }
        public string HotTags { get; set; }
        public string ShareTo { get; set; }
        public string Category { get; set; }   // 新增：内容分类
        public int? ProjectId { get; set; }    // 新增：项目ID
        public DateTime CreatedDate { get; set; }
        public DateTime ModifiedDate { get; set; }
    }
}

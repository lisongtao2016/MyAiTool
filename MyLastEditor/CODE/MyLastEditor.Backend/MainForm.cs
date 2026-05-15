using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System;
using System.Drawing;
using System.IO;
using System.Text.Json;
using System.Windows.Forms;

namespace MyLastEditor.Backend
{
    public partial class MainForm : Form
    {
        private WebView2? webView;
        private string? currentFilePath;
        private readonly FileService fileService;

        public MainForm()
        {
            InitializeComponent();
            fileService = new FileService();
            InitializeWebView();
            SetupMenu();
        }

        private void InitializeComponent()
        {
            this.Text = "MyLastEditor";
            this.Size = new Size(1200, 800);
            this.StartPosition = FormStartPosition.CenterScreen;
        }

        private async void InitializeWebView()
        {
            webView = new WebView2
            {
                Dock = DockStyle.Fill,
                CreationProperties = new CoreWebView2CreationProperties()
            };

            this.Controls.Add(webView);

            try
            {
                await webView.EnsureCoreWebView2Async(null);
                
                // 设置WebView2选项
                webView.CoreWebView2.Settings.IsScriptEnabled = true;
                webView.CoreWebView2.Settings.AreDefaultScriptDialogsEnabled = true;
                webView.CoreWebView2.Settings.IsWebMessageEnabled = true;
                webView.CoreWebView2.Settings.AreDevToolsEnabled = true;

                // 注册JavaScript到C#的通信
                webView.CoreWebView2.AddHostObjectToScript("backend", new BackendBridge(this));

                // 加载本地WebUI
                string webUIPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "MyLastEditor.WebUI", "index.html");
                if (File.Exists(webUIPath))
                {
                    webView.CoreWebView2.Navigate($"file:///{webUIPath.Replace("\\", "/")}");
                }
                else
                {
                    // 如果本地文件不存在，显示默认页面
                    webView.CoreWebView2.NavigateToString("<html><body><h1>MyLastEditor Loading...</h1></body></html>");
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"初始化WebView2失败: {ex.Message}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void SetupMenu()
        {
            var menuStrip = new MenuStrip();
            
            // 文件菜单
            var fileMenu = new ToolStripMenuItem("文件(&F)");
            fileMenu.DropDownItems.Add("新建(&N)", null, (s, e) => NewFile());
            fileMenu.DropDownItems.Add("打开(&O)...", null, (s, e) => OpenFile());
            fileMenu.DropDownItems.Add("保存(&S)", null, (s, e) => SaveFile());
            fileMenu.DropDownItems.Add("另存为(&A)...", null, (s, e) => SaveFileAs());
            fileMenu.DropDownItems.Add(new ToolStripSeparator());
            fileMenu.DropDownItems.Add("退出(&X)", null, (s, e) => Application.Exit());
            
            // 编辑菜单
            var editMenu = new ToolStripMenuItem("编辑(&E)");
            editMenu.DropDownItems.Add("撤销(&Z)", null, (s, e) => ExecuteEditorCommand("undo"));
            editMenu.DropDownItems.Add("重做(&Y)", null, (s, e) => ExecuteEditorCommand("redo"));
            editMenu.DropDownItems.Add(new ToolStripSeparator());
            editMenu.DropDownItems.Add("剪切(&X)", null, (s, e) => ExecuteEditorCommand("cut"));
            editMenu.DropDownItems.Add("复制(&C)", null, (s, e) => ExecuteEditorCommand("copy"));
            editMenu.DropDownItems.Add("粘贴(&V)", null, (s, e) => ExecuteEditorCommand("paste"));
            
            // 视图菜单
            var viewMenu = new ToolStripMenuItem("视图(&V)");
            viewMenu.DropDownItems.Add("放大", null, (s, e) => ExecuteEditorCommand("zoomIn"));
            viewMenu.DropDownItems.Add("缩小", null, (s, e) => ExecuteEditorCommand("zoomOut"));
            viewMenu.DropDownItems.Add("重置缩放", null, (s, e) => ExecuteEditorCommand("resetZoom"));
            
            menuStrip.Items.Add(fileMenu);
            menuStrip.Items.Add(editMenu);
            menuStrip.Items.Add(viewMenu);
            
            this.MainMenuStrip = menuStrip;
            this.Controls.Add(menuStrip);
        }

        private void NewFile()
        {
            currentFilePath = null;
            ExecuteEditorCommand("newFile");
        }

        private void OpenFile()
        {
            using var dialog = new OpenFileDialog
            {
                Filter = "文本文件 (*.txt)|*.txt|所有文件 (*.*)|*.*",
                Title = "打开文件"
            };

            if (dialog.ShowDialog() == DialogResult.OK)
            {
                currentFilePath = dialog.FileName;
                var content = fileService.ReadFile(currentFilePath);
                LoadContentToEditor(content);
            }
        }

        private void SaveFile()
        {
            if (string.IsNullOrEmpty(currentFilePath))
            {
                SaveFileAs();
                return;
            }

            GetContentFromEditor(content =>
            {
                fileService.WriteFile(currentFilePath, content);
                MessageBox.Show("文件保存成功", "提示", MessageBoxButtons.OK, MessageBoxIcon.Information);
            });
        }

        private void SaveFileAs()
        {
            using var dialog = new SaveFileDialog
            {
                Filter = "文本文件 (*.txt)|*.txt|所有文件 (*.*)|*.*",
                Title = "另存为"
            };

            if (dialog.ShowDialog() == DialogResult.OK)
            {
                currentFilePath = dialog.FileName;
                SaveFile();
            }
        }

        private void LoadContentToEditor(string content)
        {
            if (webView?.CoreWebView2 != null)
            {
                var escapedContent = JsonSerializer.Serialize(content);
                webView.CoreWebView2.ExecuteScriptAsync($"loadContent({escapedContent})");
            }
        }

        private void GetContentFromEditor(Action<string> callback)
        {
            if (webView?.CoreWebView2 != null)
            {
                webView.CoreWebView2.ExecuteScriptAsync("getContent()")
                    .ContinueWith(task =>
                    {
                        if (task.IsCompletedSuccessfully)
                        {
                            var result = task.Result;
                            if (!string.IsNullOrEmpty(result) && result.Length > 2)
                            {
                                var content = JsonSerializer.Deserialize<string>(result);
                                callback?.Invoke(content);
                            }
                        }
                    });
            }
        }

        private void ExecuteEditorCommand(string command)
        {
            if (webView?.CoreWebView2 != null)
            {
                webView.CoreWebView2.ExecuteScriptAsync($"executeCommand('{command}')");
            }
        }

        // 供JavaScript调用的后端桥接类
        [System.Runtime.InteropServices.ComVisible(true)]
        public class BackendBridge
        {
            private readonly MainForm mainForm;

            public BackendBridge(MainForm form)
            {
                mainForm = form;
            }

            public void SaveFile(string content)
            {
                if (!string.IsNullOrEmpty(mainForm.currentFilePath))
                {
                    mainForm.fileService.WriteFile(mainForm.currentFilePath, content);
                }
            }

            public string ReadFile(string path)
            {
                return mainForm.fileService.ReadFile(path);
            }

            public string[] GetFilesInDirectory(string path)
            {
                return mainForm.fileService.GetFilesInDirectory(path);
            }

            public void ShowMessage(string message)
            {
                MessageBox.Show(message, "MyLastEditor", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }
    }
}
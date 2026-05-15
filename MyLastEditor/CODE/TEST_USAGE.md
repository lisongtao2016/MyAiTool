# MyLastEditor 使用指南

## 项目概述
MyLastEditor 是一个基于 C# + Web 技术的跨平台文本编辑器，结合了：
- **C# 后端**: 处理文件操作和系统集成
- **Electron 外壳**: 提供跨平台桌面应用容器
- **Web 编辑器 UI**: 基于 Web 技术的现代化编辑器界面
- **WebView2 控件**: 在 C# 中嵌入 Web 技术

## 快速开始

### 方式一：使用 C# + WebView2（Windows）
1. 打开 Visual Studio 2022
2. 打开项目：`MyLastEditor.Backend\MyLastEditor.Backend.csproj`
3. 构建项目：`Ctrl+Shift+B`
4. 运行项目：`F5`

### 方式二：使用 Electron（跨平台）
1. 安装 Node.js 16+ 和 npm
2. 进入 Electron 目录：
   ```bash
   cd MyLastEditor.Electron
   ```
3. 安装依赖：
   ```bash
   npm install
   ```
4. 启动应用：
   ```bash
   npm start
   ```

### 方式三：使用构建脚本
1. 打开 PowerShell
2. 运行构建脚本：
   ```powershell
   .\build.ps1
   ```
3. 选择相应的选项进行构建或运行

## 功能特性

### 基本功能
- ✅ 新建、打开、保存文件
- ✅ 多标签页编辑
- ✅ 撤销/重做
- ✅ 复制/剪切/粘贴
- ✅ 查找替换（基础功能）
- ✅ 语法高亮（基础支持）
- ✅ 主题切换（深色/浅色/高对比度）

### 高级功能
- ✅ 文件资源管理器
- ✅ 最近打开文件列表
- ✅ 缩放控制
- ✅ 状态栏显示
- ✅ 设置面板
- ✅ 键盘快捷键

### 技术特性
- ✅ 跨平台支持（Windows、macOS、Linux）
- ✅ 现代化 UI 设计
- ✅ 响应式布局
- ✅ 本地文件系统访问
- ✅ 配置持久化

## 开发指南

### 项目结构
```
CODE/
├── MyLastEditor.Backend/     # C# 后端项目
│   ├── MainForm.cs          # 主窗体（包含 WebView2）
│   ├── FileService.cs       # 文件操作服务
│   ├── Program.cs           # 程序入口
│   └── MyLastEditor.Backend.csproj
├── MyLastEditor.Electron/   # Electron 外壳
│   ├── main.js             # 主进程
│   ├── preload.js          # 预加载脚本
│   ├── package.json        # 项目配置
│   └── assets/             # 资源文件
└── MyLastEditor.WebUI/     # Web 编辑器 UI
    ├── index.html          # 主页面
    ├── styles.css          # 样式表
    └── editor.js           # 编辑器逻辑
```

### 扩展功能

#### 添加新的文件类型支持
1. 在 `editor.js` 中的 `languageMap` 添加新的文件扩展名映射
2. 在 `main.js` 中的文件对话框过滤器添加新的扩展名

#### 添加新的编辑器功能
1. 在 `editor.js` 中的 `MyLastEditor` 类添加新方法
2. 在 HTML 中添加相应的 UI 控件
3. 在 CSS 中添加样式

#### 集成高级编辑器
可以替换 `simple-editor` 为：
- **Monaco Editor** (VS Code 编辑器)
- **CodeMirror**
- **Ace Editor**

## 构建和部署

### C# 项目构建
```bash
cd MyLastEditor.Backend
dotnet publish -c Release -r win-x64 --self-contained
```

### Electron 应用构建
```bash
cd MyLastEditor.Electron
# Windows
npm run build:win
# macOS
npm run build:mac
# Linux
npm run build:linux
```

### 打包为安装程序
Electron 应用会自动打包为：
- Windows: `.exe` 安装程序
- macOS: `.dmg` 镜像
- Linux: `.AppImage` 或 `.deb` 包

## 故障排除

### 常见问题

#### 1. C# 项目无法构建
- 确保安装了 .NET 6.0 SDK
- 检查 Visual Studio 2022 是否安装完整
- 运行 `dotnet restore` 恢复 NuGet 包

#### 2. Electron 应用无法启动
- 确保 Node.js 版本 >= 16
- 运行 `npm install` 安装依赖
- 检查网络连接（首次安装需要下载 Electron）

#### 3. WebView2 无法加载
- 确保系统已安装 WebView2 Runtime
- 可以在 [Microsoft 官网](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) 下载

#### 4. 文件操作权限问题
- Electron 应用需要文件系统访问权限
- 在 macOS/Linux 上可能需要额外权限配置

### 调试技巧

#### C# 调试
- 在 Visual Studio 中设置断点
- 使用 `Debug.WriteLine()` 输出调试信息
- 检查 Windows 事件查看器

#### Electron 调试
- 启动时添加 `--dev` 参数打开开发者工具
- 使用 `console.log()` 输出调试信息
- 检查主进程和渲染进程日志

#### Web UI 调试
- 在浏览器中打开开发者工具（F12）
- 检查控制台输出
- 使用网络面板查看请求

## 性能优化

### 建议配置
- 使用 SSD 存储提高文件读写速度
- 为大型文件启用虚拟滚动
- 合理设置自动保存间隔
- 使用 Web Workers 处理复杂计算

### 内存管理
- 及时关闭不需要的文件标签页
- 清理不再使用的编辑器实例
- 监控内存使用情况

## 贡献指南

### 开发流程
1. Fork 项目仓库
2. 创建功能分支
3. 提交代码更改
4. 创建 Pull Request

### 代码规范
- C#: 遵循 Microsoft C# 编码规范
- JavaScript: 使用 ESLint 规范
- CSS: 使用 BEM 命名规范
- 提交信息: 使用 Conventional Commits

### 测试要求
- 新功能需要包含单元测试
- UI 更改需要手动测试
- 跨平台兼容性测试

## 许可证
本项目采用 MIT 许可证。详见 LICENSE 文件。

## 支持与反馈
- 问题报告: 使用 GitHub Issues
- 功能请求: 创建 Feature Request
- 文档问题: 提交文档更新

---

**开始使用 MyLastEditor，享受现代化的文本编辑体验！**
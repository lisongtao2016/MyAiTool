# MyLastEditor - 基于C# + Web技术的跨平台文本编辑器

## 项目概述
MyLastEditor是一个现代化的跨平台文本编辑器，结合了C#的强大文件处理能力和Web技术的灵活UI。

## 技术架构
- **桌面外壳**: Electron (JavaScript/TypeScript)
- **编辑核心**: WebView2控件嵌入Web技术
- **后端处理**: C# .NET Core
- **UI框架**: 基于Web技术（Monaco Editor/CodeMirror）

## 项目结构
```
CODE/
├── MyLastEditor.Backend/     # C#后端项目
├── MyLastEditor.Electron/    # Electron外壳应用
└── MyLastEditor.WebUI/       # Web编辑器UI
```

## 核心优势
1. **一次开发，多平台运行**：基于Electron支持Windows、macOS、Linux
2. **兼具桌面和Web优势**：本地文件操作能力 + Web技术灵活性
3. **现代化编辑器功能**：语法高亮、代码补全、多标签等
4. **高性能**：WebView2提供原生渲染性能

## 开发环境要求
- Visual Studio 2022
- Node.js 16+
- .NET 6.0 SDK
- Electron 25+

## 快速开始
1. 安装依赖：`npm install` (Electron项目)
2. 构建C#后端：`dotnet build`
3. 启动开发服务器：`npm run dev`
4. 打包应用：`npm run build`

## 功能特性
- [ ] 文件打开/保存/另存为
- [ ] 语法高亮（多种语言）
- [ ] 代码补全
- [ ] 多标签编辑
- [ ] 查找替换
- [ ] 主题切换
- [ ] 插件系统
- [ ] 终端集成
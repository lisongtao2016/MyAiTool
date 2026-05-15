# C# 日程表API服务器

基于ASP.NET Core 8.0和SQLite的REST API服务器，为日程表系统提供数据库服务。

## 环境要求

- .NET 8.0 SDK
- SQLite数据库 (`schedule.db`)

## 快速开始

### 1. 解决依赖问题

由于网络问题无法自动下载NuGet包，请手动下载以下包：

1. 下载 `Microsoft.Data.Sqlite` 包：
   - 从 https://www.nuget.org/packages/Microsoft.Data.Sqlite/8.0.0 下载
   - 或者使用命令（需要网络）：`dotnet add package Microsoft.Data.Sqlite --version 8.0.0`

2. 手动解决方法（如果网络正常）：
   ```bash
   # 在项目目录中运行
   cd ScheduleApi
   
   # 清除NuGet缓存
   dotnet nuget locals all --clear
   
   # 添加包引用
   dotnet add package Microsoft.Data.Sqlite --version 8.0.0
   ```

### 2. 启动服务器

```bash
cd ScheduleApi
dotnet run
```

服务器将在 http://localhost:3001 启动。

### 3. API端点

- `GET /health` - 健康检查
- `GET /api/tasks` - 获取所有任务
- `GET /api/tasks/search?owner=张三` - 按负责人搜索任务
- `PUT /api/tasks/{id}` - 更新任务

## 手动构建项目

如果无法使用NuGet，可以尝试以下方法：

### 方法1：使用本地包
```bash
# 创建本地包源
mkdir packages
# 下载Microsoft.Data.Sqlite包并放到packages目录
dotnet add package Microsoft.Data.Sqlite --source ./packages
```

### 方法2：修改项目文件使用已安装的包
编辑 `ScheduleApi.csproj`，确保包含：
```xml
<ItemGroup>
  <PackageReference Include="Microsoft.Data.Sqlite" Version="8.0.0" />
</ItemGroup>
```

## 故障排除

### 常见问题

#### 1. 网络连接问题
```bash
# 使用代理（如果需要）
set HTTP_PROXY=http://proxy-server:port
set HTTPS_PROXY=http://proxy-server:port
```

#### 2. NuGet源问题
```bash
# 添加其他NuGet源
dotnet nuget add source https://pkgs.dev.azure.com/...
```

#### 3. 直接编译
```bash
# 尝试直接编译而不还原
dotnet build --no-restore
```

## 备选方案

如果无法解决C#依赖问题，可以使用以下备选方案：

### 1. 使用Python版本
```bash
python schedule_server.py
```

### 2. 使用Node.js版本
```bash
node server.js
```

## 数据库位置

确保 `schedule.db` 数据库文件位于项目根目录或上级目录中。

## 手动编译脚本

创建一个 `build.bat` 文件：
```batch
@echo off
cd ScheduleApi
echo 正在构建项目...
dotnet restore
dotnet build
dotnet run
# 日程表系统 - 诊断与启动脚本
# 使用方法: .\start_with_diagnostics.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  日程表系统 - 诊断与启动" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 .NET SDK
Write-Host "[1/5] 检查 .NET SDK..." -ForegroundColor Yellow
try {
    $dotnetVersion = dotnet --version
    Write-Host "✅ .NET SDK 版本: $dotnetVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ .NET SDK 未安装或不在 PATH 中" -ForegroundColor Red
    Write-Host "   请下载: https://dotnet.microsoft.com/download" -ForegroundColor Red
    exit 1
}

# 2. 检查数据库文件
Write-Host ""
Write-Host "[2/5] 检查数据库文件..." -ForegroundColor Yellow
$dbPath = Join-Path $PSScriptRoot "data" "schedule.db"
if (Test-Path $dbPath) {
    Write-Host "✅ 数据库文件存在: $dbPath" -ForegroundColor Green
    
    # 检查是否有数据
    try {
        $result = sqlite3 $dbPath "SELECT COUNT(*) FROM tasks;" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 数据库中有 $result 条任务记录" -ForegroundColor Green
        } else {
            Write-Host "⚠️  数据库表可能不存在，需要初始化" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  无法查询数据库（sqlite3 可能未安装）" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ 数据库文件不存在: $dbPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "正在初始化数据库..." -ForegroundColor Cyan
    
    $schemaPath = Join-Path $PSScriptRoot "data" "schema.sql"
    if (Test-Path $schemaPath) {
        try {
            sqlite3 $dbPath ".read $schemaPath"
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ 数据库初始化成功" -ForegroundColor Green
            } else {
                Write-Host "❌ 数据库初始化失败" -ForegroundColor Red
                exit 1
            }
        } catch {
            Write-Host "❌ sqlite3 未安装，请手动初始化数据库" -ForegroundColor Red
            Write-Host "   命令: sqlite3 data/schedule.db `".read data/schema.sql`"" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "❌ schema.sql 文件不存在" -ForegroundColor Red
        exit 1
    }
}

# 3. 检查端口占用
Write-Host ""
Write-Host "[3/5] 检查端口 3001..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "⚠️  端口 3001 已被占用" -ForegroundColor Yellow
    Write-Host "   进程 ID: $($portInUse.OwningProcess)" -ForegroundColor Yellow
    
    $process = Get-Process -Id $portInUse.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "   进程名称: $($process.ProcessName)" -ForegroundColor Yellow
    }
    
    $choice = Read-Host "是否终止该进程? (Y/N)"
    if ($choice -eq 'Y' -or $choice -eq 'y') {
        Stop-Process -Id $portInUse.OwningProcess -Force
        Write-Host "✅ 进程已终止" -ForegroundColor Green
        Start-Sleep -Seconds 1
    } else {
        Write-Host "❌ 请先手动释放端口 3001" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ 端口 3001 可用" -ForegroundColor Green
}

# 4. 检查前端文件
Write-Host ""
Write-Host "[4/5] 检查前端文件..." -ForegroundColor Yellow
$frontendPath = Join-Path $PSScriptRoot "src" "frontend"
if (Test-Path $frontendPath) {
    $richengbiao = Join-Path $frontendPath "richengbiao.html"
    $testPage = Join-Path $frontendPath "test_schedule_api.html"
    
    if (Test-Path $richengbiao) {
        Write-Host "✅ 主界面: richengbiao.html" -ForegroundColor Green
    } else {
        Write-Host "❌ 主界面文件缺失" -ForegroundColor Red
    }
    
    if (Test-Path $testPage) {
        Write-Host "✅ 测试页面: test_schedule_api.html" -ForegroundColor Green
    } else {
        Write-Host "⚠️  测试页面缺失" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ 前端目录不存在" -ForegroundColor Red
}

# 5. 启动后端服务器
Write-Host ""
Write-Host "[5/5] 启动后端服务器..." -ForegroundColor Yellow
Write-Host ""

$apiProjectPath = Join-Path $PSScriptRoot "ScheduleApi"
Set-Location $apiProjectPath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  正在启动服务器..." -ForegroundColor Cyan
Write-Host "  API 地址: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  按 Ctrl+C 停止服务器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 启动服务器（后台运行）
$serverProcess = Start-Process -FilePath "dotnet" -ArgumentList "run" -NoNewWindow -PassThru -WorkingDirectory $apiProjectPath

# 等待服务器启动
Write-Host "等待服务器启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 测试 API 连接
Write-Host ""
Write-Host "测试 API 连接..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 服务器启动成功！" -ForegroundColor Green
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  🎉 系统就绪！" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "下一步操作:" -ForegroundColor Cyan
        Write-Host "1. 打开浏览器访问测试页面:" -ForegroundColor White
        Write-Host "   file:///$((Join-Path $PSScriptRoot 'src\frontend\test_schedule_api.html').Replace('\', '/'))" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "2. 或直接打开主界面:" -ForegroundColor White
        Write-Host "   file:///$((Join-Path $PSScriptRoot 'src\frontend\richengbiao.html').Replace('\', '/'))" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "3. 在浏览器中按 F12 打开控制台查看日志" -ForegroundColor White
        Write-Host ""
        
        # 自动打开测试页面
        $openChoice = Read-Host "是否自动打开测试页面? (Y/N)"
        if ($openChoice -eq 'Y' -or $openChoice -eq 'y') {
            Start-Process (Join-Path $PSScriptRoot "src\frontend\test_schedule_api.html")
        }
        
    } else {
        Write-Host "❌ 服务器响应异常: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ 无法连接到服务器" -ForegroundColor Red
    Write-Host "   错误: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查:" -ForegroundColor Yellow
    Write-Host "1. 服务器是否成功启动（查看上方日志）" -ForegroundColor White
    Write-Host "2. 防火墙是否阻止了端口 3001" -ForegroundColor White
    Write-Host "3. 数据库路径是否正确" -ForegroundColor White
}

# 保持脚本运行
Write-Host ""
Write-Host "服务器正在运行中... 按任意键关闭服务器并退出" -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# 清理
if ($serverProcess -and !$serverProcess.HasExited) {
    Stop-Process -Id $serverProcess.Id -Force
    Write-Host "✅ 服务器已停止" -ForegroundColor Green
}

# MyLastEditor 构建脚本
# 作者: MyLastEditor Team
# 描述: 构建和运行MyLastEditor项目的PowerShell脚本

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "MyLastEditor 构建脚本" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 检查必要的工具
function Check-Command {
    param($command)
    $exists = $null -ne (Get-Command $command -ErrorAction SilentlyContinue)
    if (-not $exists) {
        Write-Host "错误: 未找到 $command" -ForegroundColor Red
        return $false
    }
    return $true
}

# 显示菜单
function Show-Menu {
    Clear-Host
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "MyLastEditor 构建菜单" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "1. 构建C#后端项目" -ForegroundColor Yellow
    Write-Host "2. 安装Electron依赖" -ForegroundColor Yellow
    Write-Host "3. 启动Electron应用" -ForegroundColor Yellow
    Write-Host "4. 构建Electron应用" -ForegroundColor Yellow
    Write-Host "5. 启动Web开发服务器" -ForegroundColor Yellow
    Write-Host "6. 完整构建流程" -ForegroundColor Green
    Write-Host "7. 清理构建文件" -ForegroundColor Red
    Write-Host "0. 退出" -ForegroundColor Gray
    Write-Host "=========================================" -ForegroundColor Cyan
}

# 构建C#后端项目
function Build-CSharpBackend {
    Write-Host "构建C#后端项目..." -ForegroundColor Blue
    
    $backendPath = "MyLastEditor.Backend"
    
    if (-not (Test-Path $backendPath)) {
        Write-Host "错误: 找不到C#后端项目目录" -ForegroundColor Red
        return
    }
    
    Set-Location $backendPath
    
    try {
        # 恢复NuGet包
        Write-Host "恢复NuGet包..." -ForegroundColor Gray
        dotnet restore
        
        # 构建项目
        Write-Host "构建项目..." -ForegroundColor Gray
        dotnet build --configuration Release
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "C#后端项目构建成功!" -ForegroundColor Green
        } else {
            Write-Host "C#后端项目构建失败!" -ForegroundColor Red
        }
    } catch {
        Write-Host "构建过程中出现错误: $_" -ForegroundColor Red
    } finally {
        Set-Location ".."
    }
}

# 安装Electron依赖
function Install-ElectronDependencies {
    Write-Host "安装Electron依赖..." -ForegroundColor Blue
    
    $electronPath = "MyLastEditor.Electron"
    
    if (-not (Test-Path $electronPath)) {
        Write-Host "错误: 找不到Electron项目目录" -ForegroundColor Red
        return
    }
    
    Set-Location $electronPath
    
    try {
        # 检查Node.js
        if (-not (Check-Command "node")) {
            Write-Host "请先安装Node.js" -ForegroundColor Red
            return
        }
        
        # 检查npm
        if (-not (Check-Command "npm")) {
            Write-Host "请先安装npm" -ForegroundColor Red
            return
        }
        
        # 安装依赖
        Write-Host "正在安装依赖..." -ForegroundColor Gray
        npm install
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Electron依赖安装成功!" -ForegroundColor Green
        } else {
            Write-Host "Electron依赖安装失败!" -ForegroundColor Red
        }
    } catch {
        Write-Host "安装过程中出现错误: $_" -ForegroundColor Red
    } finally {
        Set-Location ".."
    }
}

# 启动Electron应用
function Start-ElectronApp {
    Write-Host "启动Electron应用..." -ForegroundColor Blue
    
    $electronPath = "MyLastEditor.Electron"
    
    if (-not (Test-Path $electronPath)) {
        Write-Host "错误: 找不到Electron项目目录" -ForegroundColor Red
        return
    }
    
    Set-Location $electronPath
    
    try {
        # 检查依赖是否已安装
        if (-not (Test-Path "node_modules")) {
            Write-Host "依赖未安装，正在安装..." -ForegroundColor Yellow
            npm install
        }
        
        # 启动Electron应用
        Write-Host "正在启动Electron应用..." -ForegroundColor Gray
        npm start
        
    } catch {
        Write-Host "启动过程中出现错误: $_" -ForegroundColor Red
    } finally {
        Set-Location ".."
    }
}

# 构建Electron应用
function Build-ElectronApp {
    Write-Host "构建Electron应用..." -ForegroundColor Blue
    
    $electronPath = "MyLastEditor.Electron"
    
    if (-not (Test-Path $electronPath)) {
        Write-Host "错误: 找不到Electron项目目录" -ForegroundColor Red
        return
    }
    
    Set-Location $electronPath
    
    try {
        # 检查依赖是否已安装
        if (-not (Test-Path "node_modules")) {
            Write-Host "依赖未安装，正在安装..." -ForegroundColor Yellow
            npm install
        }
        
        # 检查electron-builder是否已安装
        $electronBuilderInstalled = npm list electron-builder --depth=0 2>$null
        if (-not $electronBuilderInstalled) {
            Write-Host "安装electron-builder..." -ForegroundColor Yellow
            npm install --save-dev electron-builder
        }
        
        # 构建应用
        Write-Host "正在构建Electron应用..." -ForegroundColor Gray
        
        # 根据平台选择构建目标
        $platform = "win"
        if ($IsWindows) {
            $platform = "win"
        } elseif ($IsMacOS) {
            $platform = "mac"
        } elseif ($IsLinux) {
            $platform = "linux"
        }
        
        Write-Host "为 $platform 平台构建..." -ForegroundColor Gray
        npm run build:$platform
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Electron应用构建成功!" -ForegroundColor Green
            Write-Host "输出目录: $electronPath\dist" -ForegroundColor Gray
        } else {
            Write-Host "Electron应用构建失败!" -ForegroundColor Red
        }
    } catch {
        Write-Host "构建过程中出现错误: $_" -ForegroundColor Red
    } finally {
        Set-Location ".."
    }
}

# 启动Web开发服务器
function Start-WebServer {
    Write-Host "启动Web开发服务器..." -ForegroundColor Blue
    
    $webUIPath = "MyLastEditor.WebUI"
    
    if (-not (Test-Path $webUIPath)) {
        Write-Host "错误: 找不到WebUI目录" -ForegroundColor Red
        return
    }
    
    # 检查是否安装了http-server
    $httpServerInstalled = $null -ne (Get-Command http-server -ErrorAction SilentlyContinue)
    
    if (-not $httpServerInstalled) {
        Write-Host "安装http-server..." -ForegroundColor Yellow
        npm install -g http-server
    }
    
    Set-Location $webUIPath
    
    try {
        Write-Host "Web开发服务器启动在 http://localhost:3000" -ForegroundColor Green
        Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Yellow
        http-server -p 3000 -c-1
    } catch {
        Write-Host "启动过程中出现错误: $_" -ForegroundColor Red
    } finally {
        Set-Location ".."
    }
}

# 完整构建流程
function Full-Build {
    Write-Host "开始完整构建流程..." -ForegroundColor Green
    
    # 1. 构建C#后端
    Build-CSharpBackend
    
    # 2. 安装Electron依赖
    Install-ElectronDependencies
    
    # 3. 构建Electron应用
    Build-ElectronApp
    
    Write-Host "完整构建流程完成!" -ForegroundColor Green
}

# 清理构建文件
function Clean-Build {
    Write-Host "清理构建文件..." -ForegroundColor Blue
    
    # 清理C#构建文件
    $backendPath = "MyLastEditor.Backend"
    if (Test-Path $backendPath) {
        Set-Location $backendPath
        Write-Host "清理C#构建文件..." -ForegroundColor Gray
        dotnet clean
        Remove-Item -Path "bin", "obj" -Recurse -Force -ErrorAction SilentlyContinue
        Set-Location ".."
    }
    
    # 清理Electron构建文件
    $electronPath = "MyLastEditor.Electron"
    if (Test-Path $electronPath) {
        Set-Location $electronPath
        Write-Host "清理Electron构建文件..." -ForegroundColor Gray
        Remove-Item -Path "dist", "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        Set-Location ".."
    }
    
    Write-Host "构建文件清理完成!" -ForegroundColor Green
}

# 主循环
function Main {
    do {
        Show-Menu
        $choice = Read-Host "请选择操作 (0-7)"
        
        switch ($choice) {
            "1" { Build-CSharpBackend; Pause }
            "2" { Install-ElectronDependencies; Pause }
            "3" { Start-ElectronApp; Pause }
            "4" { Build-ElectronApp; Pause }
            "5" { Start-WebServer; Pause }
            "6" { Full-Build; Pause }
            "7" { Clean-Build; Pause }
            "0" { Write-Host "再见!" -ForegroundColor Cyan; break }
            default { Write-Host "无效选择，请重试" -ForegroundColor Red; Pause }
        }
    } while ($choice -ne "0")
}

# 运行主函数
Main
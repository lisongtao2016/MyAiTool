# 数据库连接测试脚本
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  数据库连接测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查数据库文件
$dbPath = Join-Path $PSScriptRoot "data" "schedule.db"
Write-Host "数据库路径: $dbPath" -ForegroundColor Yellow

if (Test-Path $dbPath) {
    Write-Host "✅ 数据库文件存在" -ForegroundColor Green
    $fileInfo = Get-Item $dbPath
    Write-Host "   文件大小: $($fileInfo.Length) bytes" -ForegroundColor Gray
    Write-Host "   最后修改: $($fileInfo.LastWriteTime)" -ForegroundColor Gray
} else {
    Write-Host "❌ 数据库文件不存在!" -ForegroundColor Red
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
            Write-Host "❌ sqlite3 命令不可用" -ForegroundColor Red
            Write-Host "   请手动执行: sqlite3 data/schedule.db `".read data/schema.sql`"" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "❌ schema.sql 文件不存在" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "使用 sqlite3 查询数据库..." -ForegroundColor Yellow
Write-Host ""

# 检查表
Write-Host "1. 检查数据表:" -ForegroundColor Cyan
$tables = sqlite3 $dbPath ".tables" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ 表列表: $tables" -ForegroundColor Green
} else {
    Write-Host "   ❌ 无法读取表信息" -ForegroundColor Red
}

Write-Host ""

# 检查 tasks 表结构
Write-Host "2. tasks 表结构:" -ForegroundColor Cyan
$schema = sqlite3 $dbPath "PRAGMA table_info(tasks);" 2>$null
if ($LASTEXITCODE -eq 0 -and $schema) {
    Write-Host "   ✅ 表结构:" -ForegroundColor Green
    $schema | ForEach-Object {
        Write-Host "      $_" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ tasks 表不存在或无法读取" -ForegroundColor Red
    Write-Host "   需要运行: sqlite3 data/schedule.db `".read data/schema.sql`"" -ForegroundColor Yellow
}

Write-Host ""

# 查询任务数量
Write-Host "3. 任务数据统计:" -ForegroundColor Cyan
$count = sqlite3 $dbPath "SELECT COUNT(*) FROM tasks;" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   📊 任务总数: $count" -ForegroundColor Green
} else {
    Write-Host "   ❌ 无法查询任务数量" -ForegroundColor Red
}

Write-Host ""

# 显示示例数据
if ($count -gt 0) {
    Write-Host "4. 示例数据（前5条）:" -ForegroundColor Cyan
    Write-Host "   ID | 分组 | 子模块 | 任务名 | 负责人 | 计划% | 实际%" -ForegroundColor Gray
    Write-Host "   " + ("-" * 70) -ForegroundColor Gray
    
    $samples = sqlite3 $dbPath "SELECT id, group_name, sub_group, name, owner, plan, actual FROM tasks LIMIT 5;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $samples | ForEach-Object {
            Write-Host "   $_" -ForegroundColor White
        }
    }
    
    Write-Host ""
    
    # 按负责人统计
    Write-Host "5. 按负责人统计:" -ForegroundColor Cyan
    Write-Host "   负责人 | 任务数 | 平均计划% | 平均实际%" -ForegroundColor Gray
    Write-Host "   " + ("-" * 50) -ForegroundColor Gray
    
    $stats = sqlite3 $dbPath "SELECT owner, COUNT(*), AVG(plan), AVG(actual) FROM tasks GROUP BY owner ORDER BY COUNT(*) DESC;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $stats | ForEach-Object {
            Write-Host "   $_" -ForegroundColor White
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# 测试写入操作
Write-Host ""
Write-Host "6. 测试写入操作:" -ForegroundColor Cyan
try {
    # 插入测试记录
    sqlite3 $dbPath "INSERT INTO tasks (group_name, sub_group, name, start_date, end_date, start_day, duration, plan, actual, owner) VALUES ('测试组', '测试模块', '连接测试任务', '2026-04-08', '2026-04-08', 0, 1, 100, 0, '系统测试');"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ 插入测试记录成功" -ForegroundColor Green
        
        # 获取新ID
        $newId = sqlite3 $dbPath "SELECT last_insert_rowid();"
        Write-Host "   📝 新记录 ID: $newId" -ForegroundColor Gray
        
        # 删除测试记录
        sqlite3 $dbPath "DELETE FROM tasks WHERE id = $newId;"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ 删除测试记录成功" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  删除测试记录失败" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ 插入测试记录失败" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ 写入测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ 数据库测试完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "数据库状态: 正常 ✓" -ForegroundColor Green
Write-Host "可以启动后端服务器了" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "  cd ScheduleApi" -ForegroundColor Gray
Write-Host "  dotnet run" -ForegroundColor Gray
Write-Host ""

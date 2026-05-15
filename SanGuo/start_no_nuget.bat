@echo off
chcp 65001 >nul
echo ========================================
echo   日程表服务器 (无需NuGet包)
echo ========================================
echo.

REM 检查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python 未安装
    echo 请安装 Python: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✅ Python 已安装
echo.

REM 检查数据库
if not exist "..\data\schedule.db" (
    echo ⚠️  数据库不存在，正在初始化...
    if exist "..\data\schema.sql" (
        sqlite3 ..\data\schedule.db ".read ..\data\schema.sql"
        if errorlevel 1 (
            echo ❌ 初始化失败
            pause
            exit /b 1
        )
        echo ✅ 数据库初始化成功
    ) else (
        echo ❌ schema.sql 不存在
        pause
        exit /b 1
    )
) else (
    echo ✅ 数据库存在
)

echo.
echo 启动服务器...
echo.

cd ..\src\backend\python
python simple_server.py

pause

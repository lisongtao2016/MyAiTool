@echo off
chcp 65001 >nul
echo ========================================
echo   启动日程表服务器（Python版）
echo ========================================
echo.

REM 检查 Python 是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python 未安装
    echo 请安装 Python 3.9+ : https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✅ Python 已安装
echo.

REM 检查数据库
if not exist "..\data\schedule.db" (
    echo ❌ 数据库不存在
    echo 正在初始化...
    sqlite3 ..\data\schedule.db ".read ..\data\schema.sql"
    if errorlevel 1 (
        echo ❌ 初始化失败
        pause
        exit /b 1
    )
    echo ✅ 数据库初始化成功
) else (
    echo ✅ 数据库存在
)

echo.
echo 启动服务器...
echo API 地址: http://localhost:3001/api/tasks
echo.
echo 按 Ctrl+C 停止服务器
echo.

cd ..\src\backend\python
python schedule_server.py

pause

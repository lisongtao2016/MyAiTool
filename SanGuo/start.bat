@echo off
chcp 65001 >nul
echo ========================================
echo   日程表系统 - 快速启动
echo ========================================
echo.

echo [1/3] 检查数据库...
if not exist "data\schedule.db" (
    echo 数据库不存在，正在初始化...
    sqlite3 data\schedule.db ".read data\schema.sql"
    if errorlevel 1 (
        echo 错误: sqlite3 未安装或初始化失败
        echo 请手动执行: sqlite3 data\schedule.db ".read data\schema.sql"
        pause
        exit /b 1
    )
    echo 数据库初始化成功
) else (
    echo 数据库文件存在
)
echo.

echo [2/3] 启动后端服务器...
cd ScheduleApi
start "日程表后端服务器" cmd /k "dotnet run"
cd ..
echo 服务器正在启动，请稍候...
timeout /t 5 /nobreak >nul
echo.

echo [3/3] 打开前端界面...
echo.
echo ========================================
echo   系统启动完成！
echo ========================================
echo.
echo 请选择要打开的页面:
echo   1. API 测试页面（推荐）
echo   2. 主界面（甘特图）
echo   3. 两者都打开
echo   4. 取消
echo.
set /p choice="请输入选项 (1-4): "

if "%choice%"=="1" (
    start src\frontend\test_schedule_api.html
) else if "%choice%"=="2" (
    start src\frontend\richengbiao.html
) else if "%choice%"=="3" (
    start src\frontend\test_schedule_api.html
    start src\frontend\richengbiao.html
) else (
    echo 已取消
)

echo.
echo 提示: 
echo - 后端服务器在新窗口中运行
echo - 按 Ctrl+C 可停止服务器
echo - 浏览器中按 F12 可查看控制台日志
echo.
pause

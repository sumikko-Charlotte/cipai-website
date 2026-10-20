@echo off
setlocal
cd /d "%~dp0"
chcp 936 >nul
title 伴奏一键启动

REM ============================================================
REM  一键启动：后端(8000) + 前端(7100) + 自动打开浏览器
REM  停止服务：关掉标题为「伴奏后端」「伴奏前端」的两个最小化窗口
REM  说明：本脚本已做成跨机器自适应——
REM    项目路径取本文件所在目录（%~dp0），Python 逐级探测
REM    （先找带依赖的，找不到再退回任意 Python 并询问自动装依赖），
REM    任何一台克隆了仓库的电脑都能直接双击使用。
REM  注意：本文件必须保存为 ANSI/GBK 编码（cmd 按 GBK 解析批处理）
REM ============================================================

REM ---- 1. 探测 Python：先找「带依赖」的，同时记下任意一个可用的 ----
set "PY="
set "PY_ANY="
for %%P in (python python3 py) do (
    if not defined PY_ANY (
        %%P --version 1>nul 2>&1
        if not errorlevel 1 set "PY_ANY=%%P"
    )
    if not defined PY (
        %%P -c "import librosa, fastapi, mido" 1>nul 2>&1
        if not errorlevel 1 set "PY=%%P"
    )
)
REM 常见安装目录兜底（用户目录下的 python、官方安装器默认位置）
for /d %%D in ("%USERPROFILE%\python" "%LOCALAPPDATA%\Programs\Python\Python3*") do (
    if exist "%%D\python.exe" (
        if not defined PY_ANY set "PY_ANY=%%D\python.exe"
        if not defined PY (
            "%%D\python.exe" -c "import librosa, fastapi, mido" 1>nul 2>&1
            if not errorlevel 1 set "PY=%%D\python.exe"
        )
    )
)

if not defined PY_ANY (
    echo [启动失败] 未找到 Python。请先安装 Python 3.10+（安装时勾选 Add to PATH）。
    echo 下载地址：https://www.python.org/downloads/
    pause
    exit /b 1
)
if not defined PY (
    echo 找到 Python：%PY_ANY%（尚未安装依赖）。
    set "PY=%PY_ANY%"
    goto :INSTALL_DEPS
)
echo 使用 Python：%PY%（依赖已就绪）
goto :DEPS_DONE

:INSTALL_DEPS
set /p "ANS=是否现在自动安装 backend\requirements.txt？[Y/N]："
if /i "%ANS%"=="Y" goto :DO_INSTALL
echo 已取消。稍后请手动执行：
echo     "%PY%" -m pip install -r backend\requirements.txt
pause
exit /b 1

:DO_INSTALL
"%PY%" -m pip install -r backend\requirements.txt
if errorlevel 1 (
    echo [启动失败] 依赖安装失败，请把上方报错截图发给组长。
    pause
    exit /b 1
)

:DEPS_DONE

REM ---- 2. 检查 node（没有 node 则改用 dist 单文件页面，后端照常）----
set "USE_DIST=0"
where node 1>nul 2>&1
if errorlevel 1 (
    set "USE_DIST=1"
    echo [提示] 未找到 node，前端将改用 dist\index.html 单文件页面（功能一致）。
)

REM ---- 3. 启动后端 :8000（uvicorn 必须在 backend/ 下运行；已占用则复用）----
set "START_BE=1"
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    set "START_BE=0"
    echo [提示] 8000 端口已有服务在跑，将直接复用，不再新开后端窗口。
)
if "%START_BE%"=="1" (
    pushd backend
    start "伴奏后端 :8000" /min "%PY%" -m uvicorn app:app --host 127.0.0.1 --port 8000
    popd
)

REM ---- 4. 启动前端 :7100（node 方式）或直接用 dist 页面 ----
if "%USE_DIST%"=="1" goto :OPEN_DIST
set "START_FE=1"
netstat -ano | findstr ":7100" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    set "START_FE=0"
    echo [提示] 7100 端口已有服务在跑，将直接复用。
)
if "%START_FE%"=="1" (
    pushd frontend
    start "伴奏前端 :7100" /min node server.js --port 7100
    popd
)
timeout /t 3 /nobreak >nul
start "" "http://localhost:7100/"
goto :CHECK

:OPEN_DIST
start "" "%~dp0dist\index.html"

:CHECK
REM ---- 5. 自检：后端到底起没起（主窗口直接告诉你，不用找）----
set "BE=未响应（请把「伴奏后端」最小化窗口里的报错发给组长）"
curl -s -m 5 http://127.0.0.1:8000/api/health 2>nul | findstr "status" >nul
if not errorlevel 1 set "BE=运行中"

echo.
echo ============================================================
if "%USE_DIST%"=="1" (
    echo  前端页面： dist\index.html（已自动打开）
) else (
    echo  前端页面： http://localhost:7100/
)
echo  后端状态： %BE%
echo  后端接口： http://127.0.0.1:8000/docs
echo  关闭「伴奏后端」「伴奏前端」两个最小化窗口即停止全部服务。
echo ============================================================
pause

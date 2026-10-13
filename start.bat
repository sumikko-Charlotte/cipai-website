@echo off
setlocal
cd /d "%~dp0"

REM ============================================================
REM  一键启动：后端(8000) + 前端(7100) + 自动打开浏览器
REM  停止服务：关掉标题为「伴奏后端」「伴奏前端」的两个最小化窗口
REM  注意：本文件必须保存为 ANSI/GBK 编码（cmd 按 GBK 解析批处理）
REM ============================================================

REM ---- 1. 找到装好依赖的 Python（优先 PATH，回退到本机常用路径）----
set "PY=python"
%PY% -c "import librosa" 1>nul 2>&1
if errorlevel 1 set "PY=C:\Users\XYJ\python\python.exe"
%PY% -c "import librosa" 1>nul 2>&1
if errorlevel 1 (
    echo [启动失败] 找不到装好依赖的 Python。
    echo 请先执行：%PY% -m pip install -r backend\requirements.txt
    pause
    exit /b 1
)
echo 使用 Python：%PY%

REM ---- 2. 检查 node ----
where node 1>nul 2>&1
if errorlevel 1 (
    echo [启动失败] 未找到 node，前端无法启动。请先安装 Node.js。
    pause
    exit /b 1
)

REM ---- 3. 启动后端 :8000（uvicorn 必须在 backend/ 下运行）----
pushd backend
start "伴奏后端 :8000" /min "%PY%" -m uvicorn app:app --host 127.0.0.1 --port 8000
popd

REM ---- 4. 启动前端 :7100 ----
pushd frontend
start "伴奏前端 :7100" /min node server.js --port 7100
popd

REM ---- 5. 等服务起来后打开浏览器 ----
timeout /t 3 /nobreak >nul
start "" "http://localhost:7100/"

REM ---- 6. 自检：后端到底起没起（主窗口直接告诉你，不用找）----
set "BE=未响应（请看「伴奏后端」最小化窗口里的报错）"
curl -s -m 5 http://127.0.0.1:8000/api/health 2>nul | findstr "status" >nul
if not errorlevel 1 set "BE=运行中"

echo.
echo ============================================================
echo  前端页面： http://localhost:7100/
echo  后端状态： %BE%
echo  后端接口： http://127.0.0.1:8000/docs
echo  关闭两个最小化窗口即停止全部服务。
echo ============================================================
pause

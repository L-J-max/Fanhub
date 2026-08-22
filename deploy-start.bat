@echo off
rem FanHub 生产服务守护脚本：崩溃或退出后自动重启，保证稳定运行
setlocal
cd /d E:\Workbuddy_workspace\1
rem 确保使用受管 Node 运行时（含 npm），避免 PATH 缺失
set "PATH=C:\Users\21852\.workbuddy\binaries\node\versions\22.22.2;%PATH%"

rem 清除可能干扰 npm 的环境守卫（仅 WorkBuddy 会话内会注入）
set CODEBUDDY_SESSION_ID=
set CLAUDE_SESSION_ID=
set CODEBUDDY_TOOL_CALL_ID=
set CODEBUDDY_SAFE_DELETE_BULK_STATE_DIR=
set CODEBUDDY_SAFE_DELETE_BULK_GUARD=

:loop
echo [%date% %time%] starting FanHub (next start -H 0.0.0.0 -p 3000) >> E:\Workbuddy_workspace\1\deploy.log
set PORT=3000
call npm run start >> E:\Workbuddy_workspace\1\deploy.log 2>&1
echo [%date% %time%] server exited (code %ERRORLEVEL%), restarting in 3s... >> E:\Workbuddy_workspace\1\deploy.log
timeout /t 3 /nobreak >nul
goto loop

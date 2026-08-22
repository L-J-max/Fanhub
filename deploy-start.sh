#!/usr/bin/env bash
# FanHub 生产服务守护脚本（崩溃/退出自动重启）
cd /e/Workbuddy_workspace/1
unset CODEBUDDY_SESSION_ID CLAUDE_SESSION_ID CODEBUDDY_TOOL_CALL_ID CODEBUDDY_SAFE_DELETE_BULK_STATE_DIR CODEBUDDY_SAFE_DELETE_BULK_GUARD
export PATH="/c/Users/21852/.workbuddy/binaries/node/versions/22.22.2:$PATH"
while true; do
  echo "[$(date)] starting FanHub (next start -H 0.0.0.0 -p 3000)" >> /e/Workbuddy_workspace/1/deploy.log
  PORT=3000 npm run start >> /e/Workbuddy_workspace/1/deploy.log 2>&1
  echo "[$(date)] exited (code $?), restarting in 3s..." >> /e/Workbuddy_workspace/1/deploy.log
  sleep 3
done

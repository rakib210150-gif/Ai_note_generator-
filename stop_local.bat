@echo off
echo ========================================================
echo   Stopping Brain Nest (Freeing Ports 4000 & 8081)
echo ========================================================

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4000 ^| findstr LISTENING') do (
    echo Killing Backend PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8081 ^| findstr LISTENING') do (
    echo Killing Frontend PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo Brain Nest stopped successfully.
pause


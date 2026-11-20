@echo off
echo ========================================================
echo   Starting Brain Nest (Backend & Frontend)
echo ========================================================

echo Starting Backend Server on port 4000...
start "Brain Nest Backend (Port 4000)" cmd /k "cd backend && npx tsx src/server.ts"

timeout /t 3 /nobreak >nul

echo Starting Frontend Studio on port 8081...
start "Brain Nest Frontend (Port 8081)" cmd /k "cd hue-inspired-design-studio && npx vite --port 8081 --open"

echo.
echo ========================================================
echo   Brain Nest is now running!
echo   Frontend: http://localhost:8081
echo   Backend:  http://localhost:4000
echo ========================================================


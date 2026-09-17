@echo off
color 0C
cls
echo.
echo ===================================================
echo   AI DISASTER RELIEF - AUTO LAUNCHER
echo ===================================================
echo.
echo Starting Backend Server (Port 8000)...
start "Backend - AI Disaster Relief" cmd /k "c:\Users\JOSHIKA S\Desktop\AI-BASED DISASTER RELIEF RESOURCE ALLOCATION\backend\run_backend.bat"

timeout /t 2 /nobreak

echo Starting Frontend Server (Port 5173)...
start "Frontend - AI Disaster Relief" cmd /k "c:\Users\JOSHIKA S\Desktop\AI-BASED DISASTER RELIEF RESOURCE ALLOCATION\frontend\run_frontend.bat"

timeout /t 3 /nobreak

echo.
echo ===================================================
echo   ✅ BOTH SERVERS LAUNCHED!
echo ===================================================
echo.
echo Backend Window: Shows "Application startup complete"
echo Frontend Window: Shows "Local: http://localhost:5173/"
echo.
echo 🌐 Open your browser:
echo    http://localhost:5173
echo.
echo 🔐 Login with:
echo    Email: admin@disaster.ai
echo    Password: Admin@123
echo.
echo Keep both windows open while using the application!
echo.
echo ===================================================
echo.
pause

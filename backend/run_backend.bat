@echo off
color 0A
cls
echo.
echo ========================================
echo   BACKEND SERVER - PORT 8000
echo ========================================
echo.
cd /d "c:\Users\JOSHIKA S\Desktop\AI-BASED DISASTER RELIEF RESOURCE ALLOCATION\backend"
call venv\Scripts\activate.bat
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
pause

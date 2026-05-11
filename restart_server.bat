@echo off
echo ========================================
echo TB Trading Bot - Server Restart
echo ========================================
echo.

echo [1/3] Stopping existing Python processes on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    echo Killing process %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo [2/3] Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo [3/3] Starting Flask server...
echo.
python main.py

pause

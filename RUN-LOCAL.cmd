@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\react-scripts\bin\react-scripts.js" (
  call npm ci
  if errorlevel 1 (
    echo Dependency installation failed. Check that Node.js and npm are installed.
    pause
    exit /b 1
  )
)
call npm start
endlocal

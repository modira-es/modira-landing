@echo off
setlocal enabledelayedexpansion

echo ===== run-drizzle-debug-cmd =====
echo DATABASE_URL_ENABLED
echo DBASE=%DATABASE_URL%
echo PATH=%PATH%
echo CURRENT_DIR=%cd%

if exist "..\migrate-debug.log" del "..\migrate-debug.log"
call "..\node_modules\.bin\drizzle-kit.cmd" migrate --config "drizzle.config.ts" > "..\migrate-debug.log" 2>&1
echo EXIT=%ERRORLEVEL%
type "..\migrate-debug.log"
endlocal

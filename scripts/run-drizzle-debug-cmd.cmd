@echo off
setlocal enabledelayedexpansion

echo ===== run-drizzle-debug-cmd =====
set DATABASE_URL=postgresql://postgres.ddjlsuceyqhhfhuiexat:Amira040567wW@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
echo DATABASE_URL_ENABLED
echo DBASE=%DATABASE_URL%
echo PATH=%PATH%
echo CURRENT_DIR=%cd%

if exist "..\migrate-debug.log" del "..\migrate-debug.log"
call "..\node_modules\.bin\drizzle-kit.cmd" migrate --config "drizzle.config.ts" > "..\migrate-debug.log" 2>&1
echo EXIT=%ERRORLEVEL%
type "..\migrate-debug.log"
endlocal

@echo off
setlocal
set DATABASE_URL=postgresql://postgres.ddjlsuceyqhhfhuiexat:Amira040567wW@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
cd /d "%~dp0\.."
"%~dp0\..\node_modules\.bin\drizzle-kit.cmd" migrate --config drizzle.config.ts > "%~dp0\..\migrate.log" 2>&1
echo EXIT=%ERRORLEVEL%
type "%~dp0\..\migrate.log"
endlocal
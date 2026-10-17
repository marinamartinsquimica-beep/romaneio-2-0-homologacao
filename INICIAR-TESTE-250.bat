@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
 start "" "http://localhost:8765/integracao/central-conexao.html"
 py -m http.server 8765 --bind 127.0.0.1
 goto :fim
)
where python >nul 2>nul
if %errorlevel%==0 (
 start "" "http://localhost:8765/integracao/central-conexao.html"
 python -m http.server 8765 --bind 127.0.0.1
 goto :fim
)
echo Python nao encontrado. Abra a pasta no VS Code e use a extensao Live Server.
pause
:fim
endlocal

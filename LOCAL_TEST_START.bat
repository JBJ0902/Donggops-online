@echo off
cd /d "%~dp0"
echo Starting local web server...
echo Open http://127.0.0.1:8000 in Chrome / Firefox / Safari
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    py -3 -m http.server 8000
) else (
    python -m http.server 8000
)
pause

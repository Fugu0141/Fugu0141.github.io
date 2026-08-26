@echo off
set PORT=8000
cd /d "%~dp0"

echo Fugu portfolio local preview
echo URL: http://localhost:%PORT%/index.html
echo.
echo content\home-promos and content\projects PNG files are read directly.
echo Press Ctrl+C to stop.
echo.

start "" "http://localhost:%PORT%/index.html"

where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server %PORT%
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server %PORT%
  goto :eof
)

echo Python was not found.
echo Please use VS Code Live Server or another local HTTP server from this repository root.
pause

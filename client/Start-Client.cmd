@echo off
cd /d "%~dp0"
if exist "runtime\node.exe" (
  "runtime\node.exe" launcher.mjs
) else (
  node launcher.mjs
)
if errorlevel 1 pause

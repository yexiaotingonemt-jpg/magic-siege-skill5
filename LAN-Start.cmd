@echo off
cd /d "%~dp0"
set "PORT=5183"
set "HOST=0.0.0.0"
node start.mjs

@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\verify.ps1" %*
endlocal

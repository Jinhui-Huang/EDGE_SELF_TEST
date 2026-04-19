@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\uninstall-native-host.ps1" %*

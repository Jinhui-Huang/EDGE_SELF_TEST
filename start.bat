@echo off
setlocal EnableExtensions

cd /d "%~dp0"
set "REPO_ROOT=%CD%"
set "MAVEN_REPO_LOCAL=%REPO_ROOT%\.m2\repository"
set "LOCAL_ADMIN_API_PORT=8787"
set "ADMIN_CONSOLE_PORT=5173"
set "EXTENSION_ID="
set "RUN_SMOKE=0"

:parseArgs
if "%~1"=="" goto afterArgs
if /i "%~1"=="--with-smoke" (
    set "RUN_SMOKE=1"
    shift
    goto parseArgs
)
if /i "%~1"=="--install-native-host" (
    if "%~2"=="" (
        echo [ERROR] Missing extension id after --install-native-host
        exit /b 1
    )
    set "EXTENSION_ID=%~2"
    shift
    shift
    goto parseArgs
)
if /i "%~1"=="--help" goto usage
if /i "%~1"=="-h" goto usage
echo [ERROR] Unknown argument: %~1
goto usage

:afterArgs
call :requireCommand mvn Maven || exit /b 1
call :requireCommand npm Node.js/npm || exit /b 1

if not exist "%REPO_ROOT%\ui\admin-console\node_modules" (
    echo [1/5] Installing admin console dependencies...
    pushd "%REPO_ROOT%\ui\admin-console"
    call npm install
    if errorlevel 1 (
        popd
        echo [ERROR] npm install failed.
        exit /b 1
    )
    popd
) else (
    echo [1/5] Admin console dependencies already present.
)

echo [2/5] Building Java modules required for local startup...
call mvn "-Dmaven.repo.local=%MAVEN_REPO_LOCAL%" -pl apps/local-admin-api -am install -DskipTests
if errorlevel 1 (
    echo [ERROR] Maven install failed.
    exit /b 1
)

if defined EXTENSION_ID (
    echo [3/5] Installing Edge native host for extension %EXTENSION_ID%...
    call "%REPO_ROOT%\install-native-host.bat" -ExtensionId %EXTENSION_ID% -MavenRepoLocal "%MAVEN_REPO_LOCAL%"
    if errorlevel 1 (
        echo [ERROR] Native host installation failed.
        exit /b 1
    )
) else (
    echo [3/5] Native host installation skipped.
)

echo [4/5] Starting local admin API in a new window...
start "edge-self-test local-admin-api" cmd /k "cd /d ""%REPO_ROOT%"" && mvn ""-Dmaven.repo.local=%MAVEN_REPO_LOCAL%"" -f apps/local-admin-api/pom.xml org.codehaus.mojo:exec-maven-plugin:3.3.0:java ""-Dexec.mainClass=com.example.webtest.admin.LocalAdminApiApp"""

echo [5/5] Starting admin console in a new window...
start "edge-self-test admin-console" cmd /k "cd /d ""%REPO_ROOT%\ui\admin-console"" && npm run dev -- --host 127.0.0.1 --port %ADMIN_CONSOLE_PORT%"

if "%RUN_SMOKE%"=="1" (
    echo [extra] Running core-platform DSL smoke in this window...
    call mvn "-Dmaven.repo.local=%MAVEN_REPO_LOCAL%" -pl apps/core-platform -am install -DskipTests
    if errorlevel 1 (
        echo [ERROR] Core platform build failed before smoke.
        exit /b 1
    )
    pushd "%REPO_ROOT%\apps\core-platform"
    call mvn "-Dmaven.repo.local=%MAVEN_REPO_LOCAL%" org.codehaus.mojo:exec-maven-plugin:3.3.0:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"
    set "SMOKE_EXIT=%ERRORLEVEL%"
    popd
    if not "%SMOKE_EXIT%"=="0" (
        echo [ERROR] DSL smoke failed.
        exit /b %SMOKE_EXIT%
    )
)

echo.
echo Local startup launched.
echo - Admin console: http://127.0.0.1:%ADMIN_CONSOLE_PORT%
echo - Local admin API: http://127.0.0.1:%LOCAL_ADMIN_API_PORT%/api/phase3/admin-console
if defined EXTENSION_ID (
    echo - Native host installed for extension id: %EXTENSION_ID%
) else (
    echo - Native host not installed. If you need the Edge popup bridge, run:
    echo   start.bat --install-native-host YOUR_EXTENSION_ID
)
if "%RUN_SMOKE%"=="1" (
    echo - DSL smoke was executed in this window.
) else (
    echo - DSL smoke not executed. Add --with-smoke if needed.
)
exit /b 0

:requireCommand
where /q %~1
if errorlevel 1 (
    echo [ERROR] %~2 not found in PATH.
    exit /b 1
)
exit /b 0

:usage
echo Usage:
echo   start.bat [--install-native-host EXTENSION_ID] [--with-smoke]
echo.
echo Options:
echo   --install-native-host EXTENSION_ID  Build and register the local Edge native host.
echo   --with-smoke                        Also run the core-platform DSL smoke flow.
exit /b 1

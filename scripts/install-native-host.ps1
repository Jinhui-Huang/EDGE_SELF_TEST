param(
    [Parameter(Mandatory = $true)]
    [string]$ExtensionId,
    [string]$ApiBaseUrl = "http://127.0.0.1:8787",
    [string]$HostName = "com.example.webtest.phase3.nativehost",
    [string]$MavenRepoLocal = ".m2/repository",
    [switch]$SkipBuild,
    [switch]$NoRegistryWrite,
    [switch]$KeepDirectLaunchPolicy
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    Write-Host ""
    Write-Host "==> $Name" -ForegroundColor Cyan
    & $Action
}

function Assert-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$rootPomPath = Join-Path $repoRoot "pom.xml"
[xml]$rootPom = Get-Content $rootPomPath
$version = $rootPom.project.version
$runtimeDir = Join-Path $repoRoot "build/native-host/runtime"
$jarName = "native-host-$version-jar-with-dependencies.jar"
$jarPath = Join-Path $repoRoot "apps/native-host/target/$jarName"
$runtimeJarPath = Join-Path $runtimeDir $jarName
$launcherPath = Join-Path $runtimeDir "native-host.cmd"
$manifestPath = Join-Path $runtimeDir "$HostName.json"
$registryPath = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"
$policyPath = "HKCU:\Software\Policies\Microsoft\Edge"
$allowedOrigin = "chrome-extension://$ExtensionId/"

Assert-Command "java"
if (-not $SkipBuild) {
    Assert-Command "mvn"
}

Push-Location $repoRoot
try {
    if (-not $SkipBuild) {
        Invoke-Step "Build native host package" {
            & mvn "-Dmaven.repo.local=$MavenRepoLocal" -pl apps/native-host -am package -DskipTests
            if ($LASTEXITCODE -ne 0) {
                throw "Native host Maven package failed."
            }
        }
    }

    if (-not (Test-Path $jarPath)) {
        throw "Native host runtime jar not found at $jarPath. Run the package step first or omit -SkipBuild."
    }

    Invoke-Step "Prepare local runtime files" {
        New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
        Copy-Item -LiteralPath $jarPath -Destination $runtimeJarPath -Force

        $launcherLines = @(
            "@echo off",
            "setlocal",
            "set ""SCRIPT_DIR=%~dp0""",
            "java -jar ""%SCRIPT_DIR%$jarName"" --api-base-url=$ApiBaseUrl %*"
        )
        Set-Content -LiteralPath $launcherPath -Value $launcherLines -Encoding ASCII

        $manifest = [ordered]@{
            name = $HostName
            description = "Enterprise Web Test Phase 3 native host"
            path = $launcherPath
            type = "stdio"
            allowed_origins = @($allowedOrigin)
        } | ConvertTo-Json -Depth 4
        Set-Content -LiteralPath $manifestPath -Value $manifest -Encoding ASCII
    }

    if (-not $NoRegistryWrite) {
        Invoke-Step "Register Edge native host" {
            New-Item -Path $registryPath -Force -Value $manifestPath | Out-Null
            Set-Item -Path $registryPath -Value $manifestPath
        }

        if (-not $KeepDirectLaunchPolicy) {
            Invoke-Step "Set Edge compatibility policy for cmd wrapper" {
                New-Item -Path $policyPath -Force | Out-Null
                New-ItemProperty -Path $policyPath -Name "NativeHostsExecutablesLaunchDirectly" -PropertyType DWord -Value 0 -Force | Out-Null
            }
        }
    }

    Write-Host ""
    Write-Host "Native host prepared." -ForegroundColor Green
    Write-Host "Host name: $HostName"
    Write-Host "Allowed origin: $allowedOrigin"
    Write-Host "Manifest: $manifestPath"
    Write-Host "Launcher: $launcherPath"
    if ($NoRegistryWrite) {
        Write-Host "Registry write skipped (-NoRegistryWrite)." -ForegroundColor Yellow
    } else {
        Write-Host "Registry key: $registryPath"
    }
    if ($KeepDirectLaunchPolicy) {
        Write-Host "Direct-launch policy left unchanged." -ForegroundColor Yellow
    } elseif (-not $NoRegistryWrite) {
        Write-Host "Edge policy set: NativeHostsExecutablesLaunchDirectly=0"
    }
    Write-Host "Restart Microsoft Edge after installation if it is already running."
} finally {
    Pop-Location
}

param(
    [string]$HostName = "com.example.webtest.phase3.nativehost",
    [switch]$KeepRuntimeFiles,
    [switch]$KeepPolicy
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $repoRoot "build/native-host/runtime"
$registryPath = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"
$policyPath = "HKCU:\Software\Policies\Microsoft\Edge"

if (Test-Path $registryPath) {
    Remove-Item -LiteralPath $registryPath -Recurse -Force
    Write-Host "Removed registry key: $registryPath"
} else {
    Write-Host "Registry key not present: $registryPath"
}

if (-not $KeepPolicy -and (Test-Path $policyPath)) {
    Remove-ItemProperty -Path $policyPath -Name "NativeHostsExecutablesLaunchDirectly" -ErrorAction SilentlyContinue
    Write-Host "Removed Edge compatibility policy: NativeHostsExecutablesLaunchDirectly"
}

if (-not $KeepRuntimeFiles -and (Test-Path $runtimeDir)) {
    Remove-Item -LiteralPath $runtimeDir -Recurse -Force
    Write-Host "Removed runtime files: $runtimeDir"
}

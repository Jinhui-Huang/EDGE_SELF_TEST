param(
    [string]$MavenRepoLocal = ".m2/repository"
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

$repoRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repoRoot
try {
    Invoke-Step "Java tests" {
        & mvn "-Dmaven.repo.local=$MavenRepoLocal" test
        if ($LASTEXITCODE -ne 0) {
            throw "Java test run failed."
        }
    }

    Invoke-Step "Admin console tests" {
        Push-Location (Join-Path $repoRoot "ui/admin-console")
        try {
            & npm test
            if ($LASTEXITCODE -ne 0) {
                throw "Admin console tests failed."
            }
        } finally {
            Pop-Location
        }
    }

    Invoke-Step "Admin console production build" {
        Push-Location (Join-Path $repoRoot "ui/admin-console")
        try {
            & npm run build
            if ($LASTEXITCODE -ne 0) {
                throw "Admin console production build failed."
            }
        } finally {
            Pop-Location
        }
    }

    Write-Host ""
    Write-Host "Verification completed successfully." -ForegroundColor Green
} finally {
    Pop-Location
}

$ErrorActionPreference = "Stop"

Write-Host "== B2BAK Docker Desktop fix ==" -ForegroundColor Cyan

function Assert-Admin {
  $current = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($current)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    throw "Run this script in PowerShell as Administrator."
  }
}

Assert-Admin

Write-Host "[1/6] Stopping Docker Desktop processes..." -ForegroundColor Yellow
Get-Process "Docker Desktop" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process "com.docker.backend" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process "com.docker.proxy" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "[2/6] Restarting WSL backend..." -ForegroundColor Yellow
wsl --shutdown
Start-Sleep -Seconds 2

Write-Host "[3/6] Starting Docker Windows service..." -ForegroundColor Yellow
sc.exe start com.docker.service | Out-Host

Write-Host "[4/6] Starting Docker Desktop..." -ForegroundColor Yellow
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

Write-Host "[5/6] Waiting for dockerDesktopLinuxEngine pipe..." -ForegroundColor Yellow
$ok = $false
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 2
  $exists = Test-Path "\\.\pipe\dockerDesktopLinuxEngine"
  if ($exists) {
    $ok = $true
    break
  }
}
if (-not $ok) {
  throw "Pipe \\.\pipe\dockerDesktopLinuxEngine did not appear. Reboot Windows and run script again."
}

Write-Host "[6/6] Verifying Docker daemon..." -ForegroundColor Yellow
docker context use desktop-linux | Out-Host
docker info | Out-Host

Write-Host "Docker daemon is ready. You can now run:" -ForegroundColor Green
Write-Host "  cd C:\Users\User\Desktop\b2b" -ForegroundColor Green
Write-Host "  docker compose up --build" -ForegroundColor Green

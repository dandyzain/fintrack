# Connects ADB to a local BlueStacks 5 instance and opens the Expo dev server in it.
# Usage (PowerShell, from apps/mobile):
#   ./scripts/connect-bluestacks.ps1 -ExpoUrl "exp://<your-LAN-IP>:8081"
param(
  [string]$ExpoUrl = $env:EXPO_DEV_URL,
  [string]$Adb = "C:\Program Files\BlueStacks_nxt\HD-Adb.exe",
  [string]$Device = "127.0.0.1:5555"
)

if (-not $ExpoUrl) {
  Write-Host "Pass -ExpoUrl exp://<LAN-IP>:8081 (shown by 'pnpm --filter @fintrack/mobile start') or set EXPO_DEV_URL." -ForegroundColor Yellow
  exit 1
}

Write-Host "Connecting ADB to $Device..." -ForegroundColor Gray
& $Adb connect $Device
$devices = & $Adb devices
Write-Host $devices

if ($devices -match [regex]::Escape($Device) + "\s+device") {
  Write-Host "`n[OK] BlueStacks connected. Opening $ExpoUrl" -ForegroundColor Green
  & $Adb shell am start -a android.intent.action.VIEW -d $ExpoUrl
} else {
  Write-Host "`n[INFO] Make sure BlueStacks 5 is running and ADB is enabled in its settings." -ForegroundColor Yellow
}

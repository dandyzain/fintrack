$adb = "C:\Program Files\BlueStacks_nxt\HD-Adb.exe"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  MENGHUBUNGKAN ADB KE BLUESTACKS 5       " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "Mencoba connect ke 127.0.0.1:5555..." -ForegroundColor Gray
& $adb connect 127.0.0.1:5555

$devices = & $adb devices
Write-Host $devices

if ($devices -match "127.0.0.1:5555\s+device") {
    Write-Host "`n[SUKSES] BlueStacks terdeteksi dan terhubung!" -ForegroundColor Green
    Write-Host "Membuka aplikasi mobile di BlueStacks..." -ForegroundColor Cyan
    $env:PATH = "C:\laragon\bin\nodejs\node-v22;C:\Program Files\BlueStacks_nxt;$env:PATH"
    & $adb shell am start -a android.intent.action.VIEW -d "exp://192.168.0.115:8081"
} else {
    Write-Host "`n[INFO] Pastikan BlueStacks 5 sudah dibuka di desktop Windows Anda." -ForegroundColor Yellow
}

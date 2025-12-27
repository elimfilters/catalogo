$jsonContent = Get-Content "service-account-new.json" -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonContent)
$base64 = [System.Convert]::ToBase64String($bytes)

$env:GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 = $base64
$env:SPREADSHEET_ID = "1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U"
$env:PORT = "8080"

Write-Host "🚀 Iniciando ELIMFILTERS API..." -ForegroundColor Green
node server-fixed.js

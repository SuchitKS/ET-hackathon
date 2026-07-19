Write-Host "Starting Suryanagar Refinery Backend..." -ForegroundColor Green
Start-Process -NoNewWindow -FilePath "e:\ET_Hackthon\venv\Scripts\python.exe" -ArgumentList "-m uvicorn api.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory "e:\ET_Hackthon"

Write-Host "Installing Frontend Dependencies..." -ForegroundColor Green
Set-Location -Path "e:\ET_Hackthon\frontend"
npm install

Write-Host "Starting Strata Frontend..." -ForegroundColor Green
Start-Process -NoNewWindow -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory "e:\ET_Hackthon\frontend"

Write-Host "Both services are starting! The frontend will be available at http://localhost:5173" -ForegroundColor Cyan

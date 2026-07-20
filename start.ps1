Write-Host "Starting Suryanagar Refinery Backend..." -ForegroundColor Green
Start-Process -NoNewWindow -FilePath "E:\ET_Hackthon\ET-hackathon\venv\Scripts\python.exe" -ArgumentList "-m uvicorn api.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory "E:\ET_Hackthon\ET-hackathon"

Write-Host "Installing Frontend Dependencies..." -ForegroundColor Green
Set-Location -Path "E:\ET_Hackthon\ET-hackathon\frontend"
npm install

Write-Host "Starting Strata Frontend..." -ForegroundColor Green
Start-Process -NoNewWindow -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory "E:\ET_Hackthon\ET-hackathon\frontend"

Write-Host "Both services are starting! The frontend will be available at http://localhost:5173" -ForegroundColor Cyan

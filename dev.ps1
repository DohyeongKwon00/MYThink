# Start backend and frontend concurrently
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; uvicorn app.main:app --reload" -PassThru
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -PassThru

Write-Host "Backend PID: $($backend.Id), Frontend PID: $($frontend.Id)"
Write-Host "Press Enter to stop both..."
Read-Host

Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
Write-Host "Stopped."

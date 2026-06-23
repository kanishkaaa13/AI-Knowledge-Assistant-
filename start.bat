@echo off
echo Starting Ollama...
start "Ollama" cmd /k "ollama serve"
timeout /t 5

echo Starting Backend...
start "Backend" cmd /k "cd backend && .venv\Scripts\activate && uvicorn app.main:app --host 127.0.0.1 --port 8000"
timeout /t 3

echo Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo All services starting. Check each window for errors.
pause

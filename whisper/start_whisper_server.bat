@echo off
echo ========================================
echo Whisper GPU Server (RTX 5090)
echo ========================================
echo.

cd /d %~dp0

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Check CUDA
python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')"

echo.
echo Starting Whisper Server...
echo Server will run on: http://0.0.0.0:8001
echo Access from network: http://YOUR-WINDOWS-IP:8001
echo.
echo Press Ctrl+C to stop
echo.

python whisper_server_windows.py

pause

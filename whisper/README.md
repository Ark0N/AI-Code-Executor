# Whisper Voice Transcription Server

Voice input server for AI Code Executor using Whisper large-v3.

## Quick Start (Windows)

1. **Install whisper.cpp:**
   ```bash
   git clone https://github.com/ggerganov/whisper.cpp
   cd whisper.cpp
   ```

2. **Download model:**
   ```bash
   bash ./models/download-ggml-model.sh large-v3
   ```

3. **Build with GPU support:**
   ```bash
   cmake -B build -DGGML_CUDA=ON
   cmake --build build --config Release
   ```

4. **Start server:**
   ```bash
   start_whisper_server.bat
   ```

## Requirements

- CUDA-capable GPU (NVIDIA recommended)
- Python 3.8+
- whisper.cpp compiled with CUDA

## Files

- `whisper_server_windows.py` - Server implementation
- `start_whisper_server.bat` - Windows startup script
- `requirements.txt` - Python dependencies

## Documentation

See `docs/features/whisper/` for detailed setup guides:
- WHISPER_SETUP.md - Complete installation
- WHISPER_TRANSLATION_SETUP.md - Translation features
- MICROPHONE_FIX.md - Audio input fixes
- GPU_SETUP.md - GPU-specific setup

## Usage

Server runs on `http://localhost:5001` by default.

Configure in AI Code Executor settings:
1. Enable "Voice Input"
2. Set Whisper URL: `http://localhost:5001`
3. Click microphone button to transcribe

## API

POST `/transcribe`
- Input: Audio file (wav, mp3, etc.)
- Output: JSON with transcribed text

POST `/translate`
- Input: Audio file (any language)
- Output: JSON with English translation

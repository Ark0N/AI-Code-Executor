# Whisper Voice Input Installation

## Prerequisites

Whisper requires ffmpeg for audio processing.

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

### macOS
```bash
brew install ffmpeg
```

### Windows (WSL2)
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

## Python Dependencies

Already included in requirements.txt:
```bash
pip install openai-whisper
```

This will also install:
- torch
- torchaudio
- numpy
- ffmpeg-python

## Model Download

The first time you use voice input, Whisper will automatically download the "base" model (~142 MB).

Available models (auto-downloaded on first use):
- **tiny**: ~75 MB - Fastest, less accurate
- **base**: ~142 MB - Good balance (default)
- **small**: ~466 MB - Better accuracy
- **medium**: ~1.5 GB - High accuracy
- **large**: ~3 GB - Best accuracy

To change model size, edit `backend/whisper_client.py`:
```python
whisper_client = WhisperClient(model_name="small")  # or "medium", "large"
```

## Usage

1. Click the 🎤 microphone button next to the message input
2. Speak in any language (German, English, Swiss German, etc.)
3. Click ⏹️ to stop recording
4. Whisper transcribes and translates to English
5. Preview shows:
   - Original text (if not English)
   - English translation
   - Detected language with flag
6. English text is inserted into the prompt
7. Review and edit before sending

## Supported Languages

Whisper auto-detects and translates from:
- 🇩🇪 German
- 🇨🇭 Swiss German
- 🇫🇷 French
- 🇮🇹 Italian
- 🇪🇸 Spanish
- 🇵🇹 Portuguese
- 🇬🇧 English (no translation needed)
- And 90+ more languages!

## Troubleshooting

### Microphone permission denied
- Browser will prompt for microphone access
- Allow access in browser settings

### ffmpeg not found
```bash
# Check if installed
ffmpeg -version

# If not installed, install it (see Prerequisites above)
```

### Model download fails
- Check internet connection
- Models are cached in `~/.cache/whisper/`
- Manual download: https://github.com/openai/whisper/blob/main/whisper/__init__.py

### Audio quality issues
- Speak clearly and close to microphone
- Reduce background noise
- Try a different model size (small or medium)

## Performance

**Model size vs speed (CPU):**
- tiny: ~5-10 seconds per minute of audio
- base: ~10-15 seconds per minute of audio
- small: ~20-30 seconds per minute of audio

**GPU acceleration:**
If you have CUDA GPU:
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

## Privacy

- All transcription happens locally (no data sent to OpenAI)
- Audio is processed on your server
- Temporary audio files are deleted after transcription
- No cloud services involved

# Whisper GPU Server Setup

## 🚀 Use your NVIDIA GPU for Whisper!

Modern NVIDIA GPUs can process the **large-v3** model in **real-time** (~1-2 seconds per minute of audio)!

## Windows 11 Setup (Gaming PC with NVIDIA GPU)

### 1. Install PyTorch with CUDA

```bash
# CUDA PyTorch for modern NVIDIA GPUs (CUDA 12.x)
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### 2. Install Whisper

```bash
pip install -U openai-whisper
```

### 3. Test GPU

```bash
python
>>> import torch
>>> torch.cuda.is_available()
True
>>> torch.cuda.get_device_name(0)
'NVIDIA GeForce ...'  # Your GPU name
>>> torch.version.cuda
'12.1'  # Or your CUDA version
```

### 4. Test Whisper

```bash
python
>>> import whisper
>>> model = whisper.load_model("large-v3")
Downloading model...
>>> model.device
device(type='cuda', index=0)  # ← GPU! ✅
```

### 5. Run Server

```bash
python whisper_server_windows.py
```

Server läuft auf: `http://localhost:5001`

## Linux Setup (Server with NVIDIA GPU)

Same steps, but use:
```bash
sudo apt install python3-pip
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip3 install -U openai-whisper
```

## SSH Tunnel (Optional)

If you want to run Whisper on a remote machine:

```bash
ssh -L 5001:localhost:5001 user@gpu-machine
```

Then configure AI Code Executor to use: `http://localhost:5001`

## Configuration

In AI Code Executor settings:

1. Enable "Voice Input"
2. Set Whisper Server URL: `http://localhost:5001`
3. Test connection (should show green ✅)

## Performance

| Model | Platform | Speed | Quality |
|-------|----------|-------|---------|
| **tiny** | CPU | ~5s | ⭐⭐ |
| **base** | CPU | ~10s | ⭐⭐⭐ |
| **small** | CPU | ~30s | ⭐⭐⭐⭐ |
| **medium** | GPU | ~5s | ⭐⭐⭐⭐⭐ |
| **large-v3** | **GPU** | **~1-2s** | **⭐⭐⭐⭐⭐⭐** |

(Per minute of audio)

**large-v3 (GPU):**
- Best accuracy
- Multilingual
- Real-time transcription
- Translation to English

## Troubleshooting

### GPU not detected

```bash
# Check CUDA
nvidia-smi

# Reinstall PyTorch with CUDA
pip3 uninstall torch torchvision torchaudio
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### CUDA version mismatch

```bash
# Check CUDA version
nvcc --version

# Install matching PyTorch:
# CUDA 11.8: --index-url https://download.pytorch.org/whl/cu118
# CUDA 12.1: --index-url https://download.pytorch.org/whl/cu121
```

### Driver too old

Update NVIDIA drivers:
- Windows: GeForce Experience or nvidia.com
- Linux: `sudo ubuntu-drivers autoinstall`

Minimum driver versions:
- CUDA 11.8: Driver 450.x+
- CUDA 12.1: Driver 530.x+

### Out of memory

Use a smaller model:
```python
model = whisper.load_model("medium")  # Instead of large-v3
```

Or increase GPU memory:
- Close other GPU applications
- Reduce batch size in server settings

## Server API

### Transcribe

```bash
POST http://localhost:5001/transcribe
Content-Type: multipart/form-data

file: audio.wav
```

Response:
```json
{
  "text": "Transcribed text here",
  "language": "en",
  "model": "large-v3"
}
```

### Translate

```bash
POST http://localhost:5001/translate
Content-Type: multipart/form-data

file: audio.wav
```

Translates any language to English.

## Cost Analysis

### Cloud vs Local GPU

**OpenAI Whisper API:**
- $0.006 per minute
- 1000 minutes = $6
- Good for occasional use

**Local GPU:**
- One-time hardware cost
- Free after purchase
- Best for frequent use
- Full privacy control

**Break-even:**
After ~100-200 hours of use, local GPU pays for itself.

## Advanced Configuration

### Custom Model Path

```python
# In whisper_server_windows.py
model = whisper.load_model("large-v3", download_root="/path/to/models")
```

### Multiple Languages

The large-v3 model supports 100+ languages:
- English, German, French, Spanish, Italian
- Chinese, Japanese, Korean, Arabic
- And many more!

Auto-detection works great, no configuration needed.

### Translation Mode

Any language → English translation:
```bash
curl -X POST http://localhost:5001/translate -F "file=@audio.mp3"
```

## Production Deployment

For production use:

1. Use systemd service (Linux) or Windows Service
2. Add authentication
3. Rate limiting
4. HTTPS with SSL certificate
5. Load balancing for multiple GPUs

Example systemd service:
```ini
[Unit]
Description=Whisper GPU Server
After=network.target

[Service]
Type=simple
User=whisper
WorkingDirectory=/opt/whisper
ExecStart=/usr/bin/python3 whisper_server_windows.py
Restart=always

[Install]
WantedBy=multi-user.target
```

## Resources

- Whisper GitHub: https://github.com/openai/whisper
- PyTorch: https://pytorch.org/
- CUDA Toolkit: https://developer.nvidia.com/cuda-downloads
- NVIDIA Drivers: https://www.nvidia.com/drivers

## Support

If you have issues:
1. Check GPU detection: `nvidia-smi`
2. Verify CUDA: `nvcc --version`
3. Test PyTorch: `python -c "import torch; print(torch.cuda.is_available())"`
4. Check server logs
5. Open GitHub issue with error details

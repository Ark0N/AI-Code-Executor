"""
Whisper API Server for Windows with GPU acceleration
Run on local machine with CUDA GPU, connect from server
"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import whisper
import tempfile
import os
import torch

app = FastAPI(title="Whisper GPU Server")

# CORS for cross-network access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model on GPU
print(f"CUDA Available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")

print("Loading Whisper large-v3 model on GPU...")
model = whisper.load_model("large-v3", device="cuda")
print("Model loaded!")

@app.get("/")
async def root():
    return {
        "status": "running",
        "model": "large-v3",
        "device": "cuda",
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "none"
    }

@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """Transcribe audio using Whisper on RTX 5090"""
    
    # Save uploaded audio
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        content = await audio.read()
        temp_audio.write(content)
        temp_audio_path = temp_audio.name
    
    try:
        print(f"Transcribing: {len(content)} bytes")
        
        # Transcribe in original language
        result = model.transcribe(temp_audio_path, task="transcribe")
        
        original_text = result["text"].strip()
        detected_language = result["language"]
        
        print(f"Language: {detected_language}, Text: {original_text[:50]}...")
        
        # Language names
        language_names = {
            "en": "English",
            "de": "German",
            "gsw": "Swiss German",
            "fr": "French",
            "it": "Italian",
            "es": "Spanish"
        }
        
        language_name = language_names.get(detected_language, detected_language.upper())
        
        # If English, no translation needed
        if detected_language == "en":
            return {
                "original_text": original_text,
                "english_text": original_text,
                "language": "en",
                "language_name": "English"
            }
        
        # Translate to English
        print(f"Translating {language_name} to English...")
        translation_result = model.transcribe(temp_audio_path, task="translate")
        english_text = translation_result["text"].strip()
        
        print(f"Translation: {english_text[:50]}...")
        
        return {
            "original_text": original_text,
            "english_text": english_text,
            "language": detected_language,
            "language_name": language_name
        }
        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Cleanup
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

if __name__ == "__main__":
    import uvicorn
    # Listen on all interfaces for network access
    uvicorn.run(app, host="0.0.0.0", port=8001)

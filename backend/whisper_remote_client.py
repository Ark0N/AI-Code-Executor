import httpx
import os
import subprocess
import tempfile
from typing import Dict

class WhisperRemoteClient:
    def __init__(self, server_url: str = None):
        self.server_url = server_url or os.getenv("WHISPER_SERVER_URL")
        if not self.server_url:
            raise ValueError("WHISPER_SERVER_URL environment variable is not set!")
        print(f"[WHISPER] Using remote GPU server: {self.server_url}")
    
    async def transcribe_and_translate(self, audio_file_path: str) -> Dict[str, str]:
        print(f"[WHISPER] Converting audio: {audio_file_path}")
        
        wav_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
        wav_path = wav_file.name
        wav_file.close()
        
        try:
            result = subprocess.run([
                'ffmpeg', '-i', audio_file_path,
                '-ar', '16000', '-ac', '1', '-f', 'wav', '-y', wav_path
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                raise Exception(f"Audio conversion failed: {result.stderr}")
            
            print(f"[WHISPER] Sending to GPU server...")
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                with open(wav_path, 'rb') as f:
                    files = {'file': ('audio.wav', f, 'audio/wav')}
                    data = {'temperature': '0.0', 'temperature_inc': '0.2', 'response_format': 'json'}
                    
                    response = await client.post(f"{self.server_url}/inference", files=files, data=data)
                    
                    if response.status_code != 200:
                        raise Exception(f"Remote server error: {response.status_code} - {response.text}")
                    
                    result = response.json()
                    text = result.get('text', '').strip()
                    lang = result.get('language', 'unknown')
                    
                    lang_names = {"en": "English", "de": "German", "gsw": "Swiss German", "fr": "French"}
                    lang_name = lang_names.get(lang, lang.upper())
                    
                    print(f"[WHISPER] Detected: {lang_name}, Text: {text[:100] if text else '(empty)'}...")
                    
                    if not text:
                        text = "(No speech detected)"
                    
                    return {
                        "original_text": text,
                        "english_text": text,
                        "language": lang,
                        "language_name": lang_name
                    }
        finally:
            if os.path.exists(wav_path):
                os.remove(wav_path)

# Don't create global instance - it will be created on demand by get_whisper_client()
# whisper_remote_client = WhisperRemoteClient()

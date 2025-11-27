import whisper
import os
from typing import Dict

class WhisperClient:
    def __init__(self, model_name: str = "base"):
        """
        Initialize Whisper client
        
        Model sizes:
        - tiny: ~75 MB, fastest but least accurate
        - base: ~142 MB, good balance (default)
        - small: ~466 MB, better accuracy
        - medium: ~1.5 GB, high accuracy
        - large: ~3 GB, best accuracy
        """
        self.model = None
        self.model_name = model_name
    
    def load_model(self):
        """Lazy load model when first needed"""
        if self.model is None:
            print(f"[WHISPER] Loading {self.model_name} model...")
            self.model = whisper.load_model(self.model_name)
            print(f"[WHISPER] Model loaded successfully")
        return self.model
    
    def transcribe_and_translate(self, audio_file_path: str) -> Dict[str, str]:
        """
        Transcribe audio and translate to English if needed.
        
        Returns:
            {
                "original_text": str,
                "english_text": str,
                "language": str (code like "de", "en"),
                "language_name": str (full name like "German")
            }
        """
        model = self.load_model()
        
        print(f"[WHISPER] Transcribing audio file: {audio_file_path}")
        
        # First: Transcribe in original language
        result = model.transcribe(audio_file_path, task="transcribe")
        
        original_text = result["text"].strip()
        detected_language = result["language"]
        
        print(f"[WHISPER] Detected language: {detected_language}")
        print(f"[WHISPER] Original text: {original_text}")
        
        # Language code to name mapping
        language_names = {
            "en": "English",
            "de": "German",
            "gsw": "Swiss German",
            "fr": "French",
            "it": "Italian",
            "es": "Spanish",
            "pt": "Portuguese",
            "nl": "Dutch",
            "pl": "Polish",
            "ru": "Russian",
            "ja": "Japanese",
            "zh": "Chinese",
            "ko": "Korean",
            "ar": "Arabic",
            "hi": "Hindi"
        }
        
        language_name = language_names.get(detected_language, detected_language.upper())
        
        # If already English, no translation needed
        if detected_language == "en":
            print("[WHISPER] Already in English, no translation needed")
            return {
                "original_text": original_text,
                "english_text": original_text,
                "language": "en",
                "language_name": "English"
            }
        
        # Translate to English
        print(f"[WHISPER] Translating {language_name} to English...")
        translation_result = model.transcribe(audio_file_path, task="translate")
        english_text = translation_result["text"].strip()
        
        print(f"[WHISPER] English translation: {english_text}")
        
        return {
            "original_text": original_text,
            "english_text": english_text,
            "language": detected_language,
            "language_name": language_name
        }

# Global client instance
whisper_client = WhisperClient(model_name="base")

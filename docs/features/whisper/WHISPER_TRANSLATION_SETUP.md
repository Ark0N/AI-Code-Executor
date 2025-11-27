# Whisper.cpp Übersetzung Setup

## Problem

Whisper.cpp kann entweder:
1. **Original Sprache** transkribieren (ohne `--translate`)
2. **Direkt zu Englisch** übersetzen (mit `--translate`)

Aber **nicht beides gleichzeitig**!

## 🎯 Empfohlene Lösung: Server MIT --translate

### Warum?

- ✅ User spricht Deutsch/Schweizerdeutsch
- ✅ Prompt wird auf Englisch ausgefüllt (für AI)
- ✅ AI versteht Englisch besser
- ⚠️ Original geht verloren (aber nicht so wichtig)

### Setup

**Windows (whisper.cpp Server):**

```powershell
cd C:\w-server\whisper.cpp

# Mit --translate starten (WICHTIG!)
.\build\bin\Release\server.exe -m models\ggml-large-v3.bin --port 8001 --host 0.0.0.0 --translate
```

**Update start_whisper_server.bat:**
```batch
@echo off
cd /d C:\w-server\whisper.cpp
echo Starting Whisper.cpp Server with AUTO-TRANSLATE...
echo Server: http://0.0.0.0:8001
echo.
.\build\bin\Release\server.exe -m models\ggml-large-v3.bin --port 8001 --host 0.0.0.0 --translate
pause
```

**Linux (.env):**
```bash
WHISPER_SERVER_URL=http://192.168.8.113:8001
```

### Resultat

```
User spricht: "Hallo, wie geht es dir? Ich brauche Hilfe mit Python."
↓
Whisper übersetzt direkt zu Englisch
↓
Prompt wird ausgefüllt: "Hello, how are you? I need help with Python."
↓
Preview zeigt:
- Original: (nicht verfügbar)
- English: "Hello, how are you? I need help with Python."
```

---

## 🔧 Alternative Lösung: ZWEI Server (für Original + Translation)

### Nur wenn du BEIDES brauchst!

**Server 1 - Original (Port 8001):**
```powershell
.\build\bin\Release\server.exe -m models\ggml-large-v3.bin --port 8001 --host 0.0.0.0
```

**Server 2 - Translation (Port 8002):**
```powershell
.\build\bin\Release\server.exe -m models\ggml-large-v3.bin --port 8002 --host 0.0.0.0 --translate
```

**Backend anpassen:**
```python
# In whisper_remote_client.py
# Zwei Requests machen:
# 1. POST http://192.168.8.113:8001/inference → Original
# 2. POST http://192.168.8.113:8002/inference → English
```

**Nachteil:**
- ❌ Doppelte GPU Last
- ❌ Doppelte Zeit (~2-4 Sekunden statt 1-2)
- ❌ Komplexerer Code

---

## 💡 Was ich empfehle

**Nutze nur EIN Server MIT --translate:**

1. **Einfacher Setup**
2. **Schneller** (nur ein Request)
3. **Englisch ist wichtiger** (für AI Prompt)
4. **Original zeigen nicht essentiell** (User weiß was er gesagt hat)

### .env auf Linux:

```bash
WHISPER_SERVER_URL=http://192.168.8.113:8001
```

### Windows Server starten:

```powershell
cd C:\w-server\whisper.cpp
.\build\bin\Release\server.exe -m models\ggml-large-v3.bin --port 8001 --host 0.0.0.0 --translate
```

**Fertig!** 🎉

---

## Test

1. Click 🎤 Mikrofon
2. Sprich Deutsch: "Hallo Claude, schreibe mir ein Python Script"
3. Preview zeigt: "Hello Claude, write me a Python script"
4. Prompt wird mit Englisch ausgefüllt ✅
5. AI bekommt guten English Prompt ✅

Perfekt!

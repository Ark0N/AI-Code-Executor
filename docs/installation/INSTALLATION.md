# Claude Code Executor - Installation

## Schnellstart 🚀

1. **Archiv herunterladen**
   - `claude-code-executor-complete.tar.gz`
   - `INSTALL.sh`

2. **In einen Ordner legen**
   ```bash
   mkdir claude-coder
   cd claude-coder
   # Beide Dateien hierher kopieren
   ```

3. **Installieren**
   ```bash
   chmod +x INSTALL.sh
   ./INSTALL.sh
   ```

4. **Starten**
   ```bash
   ./start.sh
   ```

5. **Browser öffnen**
   ```
   http://localhost:8000
   ```

Das wars! 🎉

## Was ist enthalten?

Nach dem Entpacken:
```
.
├── backend/              # Python Backend
│   ├── __init__.py
│   ├── main.py
│   ├── database.py
│   ├── code_executor.py
│   └── anthropic_client.py
├── frontend/             # Web Interface
│   ├── index.html
│   ├── style.css
│   └── app.js
├── Dockerfile           # Docker Container für Code
├── requirements.txt     # Python Dependencies
├── .env.example        # Konfig-Template
└── README.md           # Vollständige Doku
```

## Voraussetzungen

- Ubuntu/Linux
- Python 3.8+
- Docker (installiert und laufend)
- User in docker Gruppe: `sudo usermod -aG docker $USER`
- Anthropic API Key

## Bei Problemen

```bash
# Logs ansehen
./start.sh  # Zeigt alle Logs

# Container prüfen
docker ps

# Neustart
./stop.sh
./start.sh
```

#!/bin/bash
# Stop Claude Code Executor

echo "⏹️  Stopping Claude Code Executor..."

# Kill uvicorn process
pkill -f "uvicorn backend.main:app" || echo "Kein laufender Server gefunden"

# Clean up Docker containers
echo "🧹 Cleaning up Docker containers..."
docker ps -a --filter "ancestor=claude-code-executor:latest" --format "{{.ID}}" | xargs -r docker stop 2>/dev/null
docker ps -a --filter "ancestor=claude-code-executor:latest" --format "{{.ID}}" | xargs -r docker rm 2>/dev/null

echo "✅ Gestoppt!"

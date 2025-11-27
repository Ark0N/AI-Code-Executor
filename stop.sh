#!/bin/bash
echo "🛑 Stopping..."
pkill -f "uvicorn backend.main:app" 2>/dev/null && echo "✓ Server stopped" || echo "  Not running"
CMD="docker"; command -v docker &>/dev/null && docker ps &>/dev/null 2>&1 || CMD="podman"
N=$($CMD ps --filter "ancestor=ai-code-executor:latest" -q 2>/dev/null | wc -l)
[ "$N" -gt 0 ] && read -p "Stop $N container(s)? (y/N): " -n1 -r && echo && [[ $REPLY =~ ^[Yy]$ ]] && $CMD ps --filter "ancestor=ai-code-executor:latest" -q | xargs -r $CMD rm -f
echo "✓ Done"

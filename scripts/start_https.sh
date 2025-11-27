#!/bin/bash
# Start Claude Code Executor with HTTPS

cd "$(dirname "$0")"

# Check if certificates exist
if [ ! -f "certs/cert.pem" ] || [ ! -f "certs/key.pem" ]; then
    echo "❌ SSL certificates not found!"
    echo "Run ./generate_ssl.sh first"
    exit 1
fi

# Activate virtual environment
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found! Run ./install.sh first."
    exit 1
fi

source venv/bin/activate

# Set PYTHONPATH to include current directory
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

echo "🚀 Starting AI Code Executor with HTTPS..."
echo "🔒 Server running on: https://localhost:8000"
echo "🔒 Or: https://$(hostname -I | awk '{print $1}'):8000"
echo "⏹️  Stop with: CTRL+C or ./stop.sh"
echo ""
echo "⚠️  Browser will show security warning (self-signed cert)"
echo "   Click 'Advanced' → 'Proceed to localhost'"
echo ""

# Start server with HTTPS
python -m uvicorn backend.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --ssl-keyfile=certs/key.pem \
    --ssl-certfile=certs/cert.pem \
    --reload

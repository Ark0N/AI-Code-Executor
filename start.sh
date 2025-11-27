#!/bin/bash
# Start AI Code Executor

cd "$(dirname "$0")"

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
else
    echo "❌ Virtual environment not found! Run ./INSTALL.sh first."
    exit 1
fi

# Load environment
[ -f ".env" ] && export $(grep -v '^#' .env | xargs 2>/dev/null)

HOST=${HOST:-0.0.0.0}
PORT=${PORT:-8000}

# Set PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Fix for macOS multiprocessing with --reload
# See: https://github.com/encode/uvicorn/issues/1045
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES

echo ""
echo "🚀 Starting AI Code Executor..."
echo ""
echo "   URL: http://localhost:$PORT"
echo ""
echo "   Press Ctrl+C to stop"
echo ""

# Start server
# Use --reload for development (auto-restart on code changes)
python -m uvicorn backend.main:app --host $HOST --port $PORT --reload

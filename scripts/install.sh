#!/bin/bash

# AI Code Executor - Installation Script
# This script sets up the complete environment

set -e  # Exit on error

echo "🚀 AI Code Executor - Installation"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Please do not run as root${NC}"
    exit 1
fi

# Check Docker
echo "📦 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker ps &> /dev/null; then
    echo -e "${RED}❌ Docker is not running or you don't have permission${NC}"
    echo "Try: sudo usermod -aG docker $USER"
    echo "Then log out and back in"
    exit 1
fi

echo -e "${GREEN}✓ Docker is ready${NC}"

# Check Python
echo "🐍 Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo -e "${GREEN}✓ Python $PYTHON_VERSION found${NC}"

# Check pip
if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}❌ pip3 is not installed${NC}"
    exit 1
fi

# Create virtual environment
echo ""
echo "📂 Setting up virtual environment..."
if [ -d "venv" ]; then
    echo -e "${YELLOW}⚠ Virtual environment already exists, removing...${NC}"
    rm -rf venv
fi

python3 -m venv venv
source venv/bin/activate

echo -e "${GREEN}✓ Virtual environment created${NC}"

# Install Python dependencies
echo ""
echo "📥 Installing Python dependencies..."
pip install --upgrade pip > /dev/null
pip install -r requirements.txt

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Create .env file if it doesn't exist
echo ""
echo "⚙️  Setting up environment..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ .env file created${NC}"
    else
        echo -e "${YELLOW}⚠ No .env.example found, creating basic .env${NC}"
        cat > .env << 'ENVEOF'
# AI Code Executor Configuration

# Anthropic API Key (for Claude models)
ANTHROPIC_API_KEY=your_key_here

# OpenAI API Key (for GPT models)
OPENAI_API_KEY=your_key_here

# Google Gemini API Key
GEMINI_API_KEY=your_key_here

# Ollama Host (for local models)
OLLAMA_HOST=http://localhost:11434

# Docker Settings (can be changed in Settings UI)
DOCKER_CPU_CORES=2
DOCKER_MEMORY_LIMIT=8g
DOCKER_STORAGE_LIMIT=10g
DOCKER_EXECUTION_TIMEOUT=30

# Server Settings
HOST=0.0.0.0
PORT=8000
ENVEOF
        echo -e "${GREEN}✓ .env file created${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env file already exists${NC}"
fi

# Build Docker image
echo ""
echo "🐳 Building Docker image..."
echo "This may take 5-10 minutes on first run..."

if docker build -t ai-code-executor:latest . > /tmp/docker-build.log 2>&1; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    echo "Check /tmp/docker-build.log for details"
    exit 1
fi

# Create start script
echo ""
echo "📝 Creating start script..."
cat > start.sh << 'STARTEOF'
#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
STARTEOF
chmod +x start.sh
echo -e "${GREEN}✓ start.sh created${NC}"

# Create stop script
cat > stop.sh << 'STOPEOF'
#!/bin/bash
echo "Stopping AI Code Executor..."
pkill -f "uvicorn backend.main:app"
echo "✓ Server stopped"

# Optional: Stop all containers
read -p "Stop all Docker containers? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker ps -a | grep ai-code-executor | awk '{print $1}' | xargs -r docker rm -f
    echo "✓ Containers stopped"
fi
STOPEOF
chmod +x stop.sh
echo -e "${GREEN}✓ stop.sh created${NC}"

# Installation complete
echo ""
echo "=========================================="
echo -e "${GREEN}✅ Installation complete!${NC}"
echo "=========================================="
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Configure API keys (optional):"
echo "   - Edit .env file with your API keys"
echo "   - Or configure in Settings UI after starting"
echo ""
echo "2. Start the server:"
echo -e "   ${YELLOW}./start.sh${NC}"
echo ""
echo "3. Open in browser:"
echo -e "   ${YELLOW}http://localhost:8000${NC}"
echo ""
echo "4. Stop the server:"
echo -e "   ${YELLOW}./stop.sh${NC}"
echo ""
echo "📚 Documentation:"
echo "   - GitHub: https://github.com/your-repo"
echo "   - Supports: Claude, GPT, Gemini, Ollama"
echo ""
echo "🎉 Happy coding!"
echo ""

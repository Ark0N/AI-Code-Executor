# =============================================================================
# AI Code Executor - Application Container
# =============================================================================
# This Dockerfile packages the entire AI Code Executor application.
# It requires Docker socket access to create code execution containers.
# =============================================================================

FROM python:3.11-slim

LABEL maintainer="AI Code Executor"
LABEL description="AI Code Executor - Execute code with AI assistance in Docker containers"

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# =============================================================================
# Install System Dependencies
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Docker CLI (to communicate with host Docker via socket)
    curl \
    gnupg \
    lsb-release \
    ca-certificates \
    # FFmpeg for Whisper audio processing
    ffmpeg \
    # Build tools for Python packages
    build-essential \
    gcc \
    # Cleanup
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI only (we use host's Docker daemon via socket)
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends docker-ce-cli && \
    rm -rf /var/lib/apt/lists/*

# =============================================================================
# Set Up Application
# =============================================================================
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY Dockerfile ./Dockerfile
COPY .env.example ./.env.example

# Create directories for data persistence
RUN mkdir -p /app/data /app/docker_images_exported

# =============================================================================
# Configuration
# =============================================================================

# Default environment variables
ENV HOST=0.0.0.0
ENV PORT=8000
ENV DATABASE_URL=sqlite+aiosqlite:///./data/conversations.db
ENV DOCKER_EXPORT_PATH=/app/docker_images_exported

# Expose the web interface port
EXPOSE 8000

# =============================================================================
# Health Check
# =============================================================================
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# =============================================================================
# Entrypoint
# =============================================================================
# Use exec form for proper signal handling
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

#!/bin/bash

# ============================================================
# AI Code Executor - Universal Installation Script v2.0
# ============================================================
# Fully supports:
#   - Linux (Ubuntu, Debian, Fedora, RHEL, CentOS, Arch, Alpine)
#   - macOS (Intel & Apple Silicon)
#   - WSL2 (Windows Subsystem for Linux)
#
# Container Runtimes:
#   - Docker Desktop, Docker Engine, Docker CE/EE
#   - Podman (with Docker compatibility)
#   - Colima, Rancher Desktop, Lima
# ============================================================

set -e

# ============================================================
# CONFIGURATION
# ============================================================
REQUIRED_PYTHON_VERSION="3.8"
DOCKER_IMAGE_NAME="ai-code-executor"
DEFAULT_PORT=8000

# ============================================================
# COLORS & FORMATTING
# ============================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ============================================================
# LOGGING FUNCTIONS
# ============================================================
log_info() { echo -e "${BLUE}ℹ${NC}  $1"; }
log_success() { echo -e "${GREEN}✓${NC}  $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC}  $1"; }
log_error() { echo -e "${RED}✗${NC}  $1"; }
log_step() { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}\n"; }
log_substep() { echo -e "${DIM}   → $1${NC}"; }

# ============================================================
# HEADER
# ============================================================
show_header() {
    clear
    echo -e "${MAGENTA}${BOLD}"
    cat << 'HEADER'
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║     █████╗ ██╗     ██████╗ ██████╗ ██████╗ ███████╗           ║
    ║    ██╔══██╗██║    ██╔════╝██╔═══██╗██╔══██╗██╔════╝           ║
    ║    ███████║██║    ██║     ██║   ██║██║  ██║█████╗             ║
    ║    ██╔══██║██║    ██║     ██║   ██║██║  ██║██╔══╝             ║
    ║    ██║  ██║██║    ╚██████╗╚██████╔╝██████╔╝███████╗           ║
    ║    ╚═╝  ╚═╝╚═╝     ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝           ║
    ║                                                               ║
    ║              E X E C U T O R   v 2 . 0                        ║
    ║                                                               ║
    ║         🚀 AI-Powered Code Execution Platform 🚀              ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
HEADER
    echo -e "${NC}"
    echo ""
}

# ============================================================
# OS DETECTION
# ============================================================
OS_TYPE=""
OS_NAME=""
OS_VERSION=""
OS_ARCH=""
OS_PACKAGE_MANAGER=""
IS_WSL=false
IS_ARM=false
IS_APPLE_SILICON=false
HAS_SUDO=false

detect_os() {
    log_step "Detecting Operating System"
    
    # Detect architecture
    OS_ARCH=$(uname -m)
    case $OS_ARCH in
        x86_64|amd64)
            OS_ARCH="x86_64"
            ;;
        arm64|aarch64)
            OS_ARCH="arm64"
            IS_ARM=true
            ;;
        armv7l|armhf)
            OS_ARCH="armv7"
            IS_ARM=true
            ;;
    esac
    
    # Detect OS type
    case "$(uname -s)" in
        Linux*)
            OS_TYPE="linux"
            
            # Check for WSL
            if grep -qi microsoft /proc/version 2>/dev/null; then
                IS_WSL=true
                log_info "Detected: Windows Subsystem for Linux (WSL)"
            fi
            
            # Detect Linux distribution
            if [ -f /etc/os-release ]; then
                . /etc/os-release
                OS_NAME=$ID
                OS_VERSION=$VERSION_ID
                
                # Determine package manager
                case $OS_NAME in
                    ubuntu|debian|linuxmint|pop|elementary|zorin|kali)
                        OS_PACKAGE_MANAGER="apt"
                        ;;
                    fedora|rhel|centos|rocky|alma|oracle)
                        if command -v dnf &> /dev/null; then
                            OS_PACKAGE_MANAGER="dnf"
                        else
                            OS_PACKAGE_MANAGER="yum"
                        fi
                        ;;
                    arch|manjaro|endeavouros|garuda)
                        OS_PACKAGE_MANAGER="pacman"
                        ;;
                    opensuse*|sles)
                        OS_PACKAGE_MANAGER="zypper"
                        ;;
                    alpine)
                        OS_PACKAGE_MANAGER="apk"
                        ;;
                    gentoo)
                        OS_PACKAGE_MANAGER="emerge"
                        ;;
                    void)
                        OS_PACKAGE_MANAGER="xbps"
                        ;;
                    nixos)
                        OS_PACKAGE_MANAGER="nix"
                        ;;
                    *)
                        OS_PACKAGE_MANAGER="unknown"
                        ;;
                esac
            elif [ -f /etc/redhat-release ]; then
                OS_NAME="rhel"
                OS_PACKAGE_MANAGER="yum"
            else
                OS_NAME="unknown"
                OS_PACKAGE_MANAGER="unknown"
            fi
            ;;
        Darwin*)
            OS_TYPE="macos"
            OS_NAME="macos"
            OS_VERSION=$(sw_vers -productVersion 2>/dev/null || echo "unknown")
            OS_PACKAGE_MANAGER="brew"
            
            # Check for Apple Silicon
            if [ "$OS_ARCH" = "arm64" ]; then
                IS_APPLE_SILICON=true
                log_info "Detected: Apple Silicon Mac"
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            OS_TYPE="windows"
            OS_NAME="windows"
            log_error "Native Windows is not supported. Please use WSL2."
            echo ""
            echo "Install WSL2 (run in PowerShell as Admin):"
            echo "  wsl --install"
            echo ""
            echo "Then run this installer inside WSL2."
            exit 1
            ;;
        *)
            OS_TYPE="unknown"
            OS_NAME="unknown"
            ;;
    esac
    
    # Check for sudo
    if command -v sudo &> /dev/null; then
        HAS_SUDO=true
    fi
    
    # Display detection results
    echo -e "  ${BOLD}OS Type:${NC}      $OS_TYPE"
    echo -e "  ${BOLD}Distribution:${NC} $OS_NAME $OS_VERSION"
    echo -e "  ${BOLD}Architecture:${NC} $OS_ARCH"
    echo -e "  ${BOLD}Package Mgr:${NC}  $OS_PACKAGE_MANAGER"
    [ "$IS_WSL" = true ] && echo -e "  ${BOLD}Environment:${NC} WSL2"
    [ "$IS_APPLE_SILICON" = true ] && echo -e "  ${BOLD}Chip:${NC}         Apple Silicon"
    echo ""
    log_success "OS detection complete"
}

# ============================================================
# HOMEBREW (macOS)
# ============================================================
check_homebrew() {
    if [ "$OS_TYPE" != "macos" ]; then
        return 0
    fi
    
    log_step "Checking Homebrew"
    
    if command -v brew &> /dev/null; then
        BREW_VERSION=$(brew --version | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "installed")
        log_success "Homebrew $BREW_VERSION is installed"
        
        # Update Homebrew
        log_substep "Updating Homebrew..."
        brew update &> /dev/null || true
        return 0
    fi
    
    log_warning "Homebrew is not installed"
    echo ""
    echo -e "${BOLD}Homebrew is the recommended package manager for macOS.${NC}"
    echo "It makes installing Docker, Python, and other tools easy."
    echo ""
    echo -e "${CYAN}One-line install:${NC}"
    echo ""
    echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    echo ""
    
    read -p "Would you like to install Homebrew now? (Y/n): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        log_info "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add Homebrew to PATH for Apple Silicon
        if [ "$IS_APPLE_SILICON" = true ]; then
            echo '' >> ~/.zprofile
            echo '# Homebrew' >> ~/.zprofile
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/opt/homebrew/bin/brew shellenv)"
            log_info "Added Homebrew to PATH (Apple Silicon location)"
        else
            # Intel Mac
            echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile 2>/dev/null || true
            eval "$(/usr/local/bin/brew shellenv)" 2>/dev/null || true
        fi
        
        log_success "Homebrew installed successfully"
    else
        log_warning "Skipping Homebrew installation"
        log_warning "You may need to install dependencies manually"
    fi
}

# ============================================================
# PACKAGE INSTALLATION HELPERS
# ============================================================
install_package() {
    local package=$1
    local package_name=${2:-$1}
    
    log_info "Installing $package_name..."
    
    case $OS_PACKAGE_MANAGER in
        apt)
            sudo apt-get update -qq
            sudo apt-get install -y -qq $package
            ;;
        dnf)
            sudo dnf install -y -q $package
            ;;
        yum)
            sudo yum install -y -q $package
            ;;
        pacman)
            sudo pacman -S --noconfirm --quiet $package
            ;;
        zypper)
            sudo zypper install -y -q $package
            ;;
        apk)
            sudo apk add --quiet $package
            ;;
        brew)
            brew install $package
            ;;
        *)
            log_error "Unknown package manager. Please install $package_name manually."
            return 1
            ;;
    esac
}

show_install_instructions() {
    local tool=$1
    
    echo ""
    echo -e "${BOLD}Installation instructions for $tool:${NC}"
    echo ""
    
    case $tool in
        docker)
            case $OS_TYPE in
                linux)
                    echo -e "${CYAN}Option 1: Docker Engine (Quick Install)${NC}"
                    echo "  curl -fsSL https://get.docker.com | sh"
                    echo "  sudo usermod -aG docker \$USER"
                    echo "  newgrp docker  # or logout/login"
                    echo ""
                    echo -e "${CYAN}Option 2: Package Manager${NC}"
                    case $OS_PACKAGE_MANAGER in
                        apt)
                            echo "  sudo apt update"
                            echo "  sudo apt install docker.io docker-compose"
                            echo "  sudo systemctl enable --now docker"
                            echo "  sudo usermod -aG docker \$USER"
                            ;;
                        dnf)
                            echo "  sudo dnf install docker docker-compose"
                            echo "  sudo systemctl enable --now docker"
                            echo "  sudo usermod -aG docker \$USER"
                            ;;
                        pacman)
                            echo "  sudo pacman -S docker docker-compose"
                            echo "  sudo systemctl enable --now docker"
                            echo "  sudo usermod -aG docker \$USER"
                            ;;
                        *)
                            echo "  Install docker via your package manager"
                            ;;
                    esac
                    echo ""
                    if [ "$IS_WSL" = true ]; then
                        echo -e "${CYAN}Option 3: Docker Desktop for Windows${NC}"
                        echo "  Install Docker Desktop on Windows"
                        echo "  Enable WSL2 integration in Docker Desktop settings"
                        echo "  https://docs.docker.com/desktop/wsl/"
                        echo ""
                    fi
                    echo -e "${CYAN}Option 4: Podman (Rootless)${NC}"
                    case $OS_PACKAGE_MANAGER in
                        apt) echo "  sudo apt install podman" ;;
                        dnf) echo "  sudo dnf install podman" ;;
                        pacman) echo "  sudo pacman -S podman" ;;
                        *) echo "  Install podman via your package manager" ;;
                    esac
                    ;;
                macos)
                    echo -e "${CYAN}Option 1: Docker Desktop (GUI - Easiest)${NC}"
                    echo "  brew install --cask docker"
                    echo "  # Then open Docker.app"
                    echo ""
                    echo -e "${CYAN}Option 2: Colima (CLI - Lightweight)${NC}"
                    echo "  brew install colima docker docker-compose"
                    echo "  colima start"
                    echo ""
                    echo -e "${CYAN}Option 3: Podman${NC}"
                    echo "  brew install podman"
                    echo "  podman machine init"
                    echo "  podman machine start"
                    echo ""
                    echo -e "${CYAN}Option 4: Rancher Desktop${NC}"
                    echo "  brew install --cask rancher"
                    ;;
            esac
            ;;
        python)
            case $OS_TYPE in
                linux)
                    case $OS_PACKAGE_MANAGER in
                        apt)
                            echo "  sudo apt update"
                            echo "  sudo apt install python3 python3-pip python3-venv"
                            ;;
                        dnf)
                            echo "  sudo dnf install python3 python3-pip python3-devel"
                            ;;
                        pacman)
                            echo "  sudo pacman -S python python-pip"
                            ;;
                        zypper)
                            echo "  sudo zypper install python3 python3-pip"
                            ;;
                        apk)
                            echo "  sudo apk add python3 py3-pip py3-virtualenv"
                            ;;
                        *)
                            echo "  Install python3, pip, and venv via your package manager"
                            ;;
                    esac
                    ;;
                macos)
                    echo "  brew install python@3.11"
                    echo ""
                    echo "  Or download from: https://www.python.org/downloads/"
                    ;;
            esac
            ;;
        git)
            case $OS_TYPE in
                linux)
                    case $OS_PACKAGE_MANAGER in
                        apt) echo "  sudo apt install git" ;;
                        dnf) echo "  sudo dnf install git" ;;
                        pacman) echo "  sudo pacman -S git" ;;
                        *) echo "  Install git via your package manager" ;;
                    esac
                    ;;
                macos)
                    echo "  brew install git"
                    echo "  # Or install Xcode CLI tools:"
                    echo "  xcode-select --install"
                    ;;
            esac
            ;;
        curl)
            case $OS_PACKAGE_MANAGER in
                apt) echo "  sudo apt install curl" ;;
                dnf) echo "  sudo dnf install curl" ;;
                pacman) echo "  sudo pacman -S curl" ;;
                apk) echo "  sudo apk add curl" ;;
                brew) echo "  brew install curl" ;;
                *) echo "  Install curl via your package manager" ;;
            esac
            ;;
    esac
    echo ""
}

# ============================================================
# DEPENDENCY CHECKS
# ============================================================
check_curl() {
    if ! command -v curl &> /dev/null; then
        log_warning "curl is not installed"
        
        read -p "Install curl now? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            install_package curl
            log_success "curl installed"
        else
            show_install_instructions curl
            exit 1
        fi
    fi
}

check_git() {
    log_substep "Checking git..."
    
    if ! command -v git &> /dev/null; then
        log_warning "git is not installed (optional but recommended)"
    else
        log_success "git is available"
    fi
}

# ============================================================
# PYTHON CHECK & INSTALLATION
# ============================================================
PYTHON_CMD=""

check_python() {
    log_step "Checking Python"
    
    # Try different Python commands
    for cmd in python3.12 python3.11 python3.10 python3.9 python3 python; do
        if command -v $cmd &> /dev/null; then
            VERSION=$($cmd --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
            MAJOR=$(echo $VERSION | cut -d. -f1)
            MINOR=$(echo $VERSION | cut -d. -f2)
            
            if [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 8 ]; then
                PYTHON_CMD=$cmd
                log_success "Found $cmd version $VERSION"
                break
            else
                log_substep "$cmd version $VERSION (need 3.8+)"
            fi
        fi
    done
    
    if [ -z "$PYTHON_CMD" ]; then
        log_error "Python 3.8+ is required but not found"
        
        read -p "Install Python now? (Y/n): " -n 1 -r
        echo
        
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            case $OS_TYPE in
                linux)
                    case $OS_PACKAGE_MANAGER in
                        apt)
                            sudo apt-get update
                            sudo apt-get install -y python3 python3-pip python3-venv
                            ;;
                        dnf)
                            sudo dnf install -y python3 python3-pip python3-devel
                            ;;
                        pacman)
                            sudo pacman -S --noconfirm python python-pip
                            ;;
                        zypper)
                            sudo zypper install -y python3 python3-pip
                            ;;
                        apk)
                            sudo apk add python3 py3-pip py3-virtualenv
                            ;;
                        *)
                            show_install_instructions python
                            exit 1
                            ;;
                    esac
                    PYTHON_CMD="python3"
                    ;;
                macos)
                    if command -v brew &> /dev/null; then
                        brew install python@3.11
                        PYTHON_CMD="python3"
                    else
                        log_error "Install Homebrew first, then re-run"
                        exit 1
                    fi
                    ;;
            esac
            log_success "Python installed"
        else
            show_install_instructions python
            exit 1
        fi
    fi
    
    # Check pip
    log_substep "Checking pip..."
    if ! $PYTHON_CMD -m pip --version &> /dev/null; then
        log_warning "pip not found, installing..."
        $PYTHON_CMD -m ensurepip --upgrade 2>/dev/null || {
            case $OS_PACKAGE_MANAGER in
                apt) sudo apt-get install -y python3-pip ;;
                dnf) sudo dnf install -y python3-pip ;;
                *) log_error "Please install pip manually" && exit 1 ;;
            esac
        }
    fi
    log_success "pip is available"
    
    # Check venv
    log_substep "Checking venv module..."
    if ! $PYTHON_CMD -m venv --help &> /dev/null 2>&1; then
        log_warning "venv not found, installing..."
        case $OS_PACKAGE_MANAGER in
            apt) sudo apt-get install -y python3-venv ;;
            dnf) sudo dnf install -y python3-venv 2>/dev/null || true ;;
            *) true ;;
        esac
    fi
    log_success "venv is available"
    
    export PYTHON_CMD
}

# ============================================================
# CONTAINER RUNTIME DETECTION
# ============================================================
CONTAINER_RUNTIME=""
CONTAINER_RUNTIME_VERSION=""
CONTAINER_RUNTIME_TYPE=""
CONTAINER_CMD=""

detect_container_runtime() {
    log_step "Detecting Container Runtime"
    
    # Check for Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        
        # Check if it's Podman in disguise
        if docker --version 2>/dev/null | grep -qi "podman"; then
            CONTAINER_RUNTIME="podman"
            CONTAINER_RUNTIME_VERSION=$DOCKER_VERSION
            CONTAINER_RUNTIME_TYPE="podman-docker"
            CONTAINER_CMD="docker"
            log_info "Found Podman (Docker alias) v$DOCKER_VERSION"
        else
            CONTAINER_RUNTIME="docker"
            CONTAINER_RUNTIME_VERSION=$DOCKER_VERSION
            CONTAINER_CMD="docker"
            
            # Detect Docker variant
            DOCKER_INFO=$(docker info 2>/dev/null || echo "")
            
            if echo "$DOCKER_INFO" | grep -qi "docker desktop"; then
                CONTAINER_RUNTIME_TYPE="docker-desktop"
                log_info "Found Docker Desktop v$DOCKER_VERSION"
            elif echo "$DOCKER_INFO" | grep -qi "colima"; then
                CONTAINER_RUNTIME_TYPE="colima"
                log_info "Found Colima v$DOCKER_VERSION"
            elif echo "$DOCKER_INFO" | grep -qi "rancher"; then
                CONTAINER_RUNTIME_TYPE="rancher-desktop"
                log_info "Found Rancher Desktop v$DOCKER_VERSION"
            elif echo "$DOCKER_INFO" | grep -qi "lima"; then
                CONTAINER_RUNTIME_TYPE="lima"
                log_info "Found Lima v$DOCKER_VERSION"
            else
                CONTAINER_RUNTIME_TYPE="docker-engine"
                log_info "Found Docker Engine v$DOCKER_VERSION"
            fi
        fi
    # Check for native Podman
    elif command -v podman &> /dev/null; then
        CONTAINER_RUNTIME="podman"
        CONTAINER_RUNTIME_VERSION=$(podman --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        CONTAINER_RUNTIME_TYPE="podman-native"
        CONTAINER_CMD="podman"
        log_info "Found Podman v$CONTAINER_RUNTIME_VERSION"
    # Check for nerdctl
    elif command -v nerdctl &> /dev/null; then
        CONTAINER_RUNTIME="nerdctl"
        CONTAINER_RUNTIME_VERSION=$(nerdctl --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        CONTAINER_RUNTIME_TYPE="nerdctl"
        CONTAINER_CMD="nerdctl"
        log_info "Found nerdctl v$CONTAINER_RUNTIME_VERSION"
    fi
    
    # No runtime found
    if [ -z "$CONTAINER_RUNTIME" ]; then
        log_error "No container runtime found!"
        echo ""
        
        read -p "Install Docker now? (Y/n): " -n 1 -r
        echo
        
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            install_docker_interactive
        else
            show_install_instructions docker
            exit 1
        fi
    fi
}

install_docker_interactive() {
    echo ""
    echo -e "${BOLD}Select installation method:${NC}"
    echo ""
    
    case $OS_TYPE in
        linux)
            echo "  1) Docker Engine (quick script) - Recommended"
            echo "  2) Docker via package manager"
            echo "  3) Podman (rootless, no daemon)"
            echo "  4) Show manual instructions"
            echo "  5) Skip"
            echo ""
            read -p "Choose [1-5]: " -n 1 -r
            echo
            
            case $REPLY in
                1)
                    log_info "Installing Docker Engine..."
                    curl -fsSL https://get.docker.com | sh
                    sudo usermod -aG docker $USER
                    sudo systemctl enable docker
                    sudo systemctl start docker
                    CONTAINER_RUNTIME="docker"
                    CONTAINER_RUNTIME_TYPE="docker-engine"
                    CONTAINER_CMD="docker"
                    CONTAINER_RUNTIME_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
                    log_success "Docker installed!"
                    log_warning "Log out/in or run: newgrp docker"
                    newgrp docker 2>/dev/null || true
                    ;;
                2)
                    case $OS_PACKAGE_MANAGER in
                        apt)
                            sudo apt-get update
                            sudo apt-get install -y docker.io docker-compose
                            sudo systemctl enable docker
                            sudo systemctl start docker
                            sudo usermod -aG docker $USER
                            ;;
                        dnf)
                            sudo dnf install -y docker docker-compose
                            sudo systemctl enable docker
                            sudo systemctl start docker
                            sudo usermod -aG docker $USER
                            ;;
                        pacman)
                            sudo pacman -S --noconfirm docker docker-compose
                            sudo systemctl enable docker
                            sudo systemctl start docker
                            sudo usermod -aG docker $USER
                            ;;
                        *)
                            log_error "Not supported for $OS_PACKAGE_MANAGER"
                            show_install_instructions docker
                            exit 1
                            ;;
                    esac
                    CONTAINER_RUNTIME="docker"
                    CONTAINER_RUNTIME_TYPE="docker-engine"
                    CONTAINER_CMD="docker"
                    CONTAINER_RUNTIME_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
                    log_success "Docker installed!"
                    ;;
                3)
                    case $OS_PACKAGE_MANAGER in
                        apt) sudo apt-get install -y podman ;;
                        dnf) sudo dnf install -y podman ;;
                        pacman) sudo pacman -S --noconfirm podman ;;
                        *) log_error "Install podman manually" && exit 1 ;;
                    esac
                    CONTAINER_RUNTIME="podman"
                    CONTAINER_RUNTIME_TYPE="podman-native"
                    CONTAINER_CMD="podman"
                    CONTAINER_RUNTIME_VERSION=$(podman --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
                    log_success "Podman installed!"
                    ;;
                4)
                    show_install_instructions docker
                    exit 0
                    ;;
                *)
                    log_warning "Skipping"
                    exit 1
                    ;;
            esac
            ;;
        macos)
            echo "  1) Docker Desktop (GUI)"
            echo "  2) Colima (CLI, lightweight)"
            echo "  3) Podman"
            echo "  4) Show instructions"
            echo "  5) Skip"
            echo ""
            read -p "Choose [1-5]: " -n 1 -r
            echo
            
            case $REPLY in
                1)
                    if command -v brew &> /dev/null; then
                        log_info "Installing Docker Desktop..."
                        brew install --cask docker
                        log_success "Docker Desktop installed!"
                        echo ""
                        log_warning "Open Docker.app from Applications, then re-run installer"
                        read -p "Press Enter after Docker Desktop is running..." -r
                        CONTAINER_RUNTIME="docker"
                        CONTAINER_RUNTIME_TYPE="docker-desktop"
                        CONTAINER_CMD="docker"
                        CONTAINER_RUNTIME_VERSION=$(docker --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "unknown")
                    else
                        log_error "Homebrew required"
                        exit 1
                    fi
                    ;;
                2)
                    if command -v brew &> /dev/null; then
                        log_info "Installing Colima..."
                        brew install colima docker docker-compose
                        log_info "Starting Colima..."
                        colima start
                        CONTAINER_RUNTIME="docker"
                        CONTAINER_RUNTIME_TYPE="colima"
                        CONTAINER_CMD="docker"
                        CONTAINER_RUNTIME_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
                        log_success "Colima running!"
                    else
                        log_error "Homebrew required"
                        exit 1
                    fi
                    ;;
                3)
                    if command -v brew &> /dev/null; then
                        log_info "Installing Podman..."
                        brew install podman
                        podman machine init
                        podman machine start
                        CONTAINER_RUNTIME="podman"
                        CONTAINER_RUNTIME_TYPE="podman-native"
                        CONTAINER_CMD="podman"
                        CONTAINER_RUNTIME_VERSION=$(podman --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
                        log_success "Podman running!"
                    else
                        log_error "Homebrew required"
                        exit 1
                    fi
                    ;;
                4)
                    show_install_instructions docker
                    exit 0
                    ;;
                *)
                    log_warning "Skipping"
                    exit 1
                    ;;
            esac
            ;;
    esac
}

# ============================================================
# CONTAINER RUNTIME TESTING
# ============================================================
test_container_runtime() {
    log_step "Testing Container Runtime"
    
    log_substep "Testing daemon..."
    if ! $CONTAINER_CMD ps &> /dev/null 2>&1; then
        log_error "Cannot connect to $CONTAINER_RUNTIME"
        echo ""
        
        case $CONTAINER_RUNTIME_TYPE in
            docker-desktop)
                echo "Make sure Docker Desktop is running"
                ;;
            colima)
                echo "Start Colima: colima start"
                ;;
            docker-engine)
                echo "Start Docker: sudo systemctl start docker"
                echo "Fix permissions: sudo usermod -aG docker \$USER && newgrp docker"
                ;;
            podman-native)
                [ "$OS_TYPE" = "macos" ] && echo "Start: podman machine start"
                [ "$OS_TYPE" = "linux" ] && echo "Check: podman info"
                ;;
        esac
        echo ""
        read -p "Press Enter after fixing..." -r
        
        if ! $CONTAINER_CMD ps &> /dev/null 2>&1; then
            log_error "Still cannot connect"
            exit 1
        fi
    fi
    log_success "Daemon accessible"
    
    # Setup Podman compatibility
    if [ "$CONTAINER_RUNTIME" = "podman" ] && [ "$CONTAINER_RUNTIME_TYPE" = "podman-native" ]; then
        if ! command -v docker &> /dev/null; then
            log_substep "Creating docker alias..."
            mkdir -p "$HOME/.local/bin"
            ln -sf "$(which podman)" "$HOME/.local/bin/docker" 2>/dev/null || true
            export PATH="$HOME/.local/bin:$PATH"
        fi
        
        [ "$OS_TYPE" = "linux" ] && systemctl --user enable --now podman.socket 2>/dev/null || true
    fi
    
    log_success "Container runtime ready"
}

# ============================================================
# PYTHON ENVIRONMENT
# ============================================================
setup_python_environment() {
    log_step "Setting Up Python Environment"
    
    if [ -d "venv" ]; then
        log_warning "Existing venv found"
        read -p "Recreate? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf venv
        else
            source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
            return 0
        fi
    fi
    
    log_substep "Creating virtual environment..."
    $PYTHON_CMD -m venv venv
    source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
    
    log_substep "Upgrading pip..."
    pip install --upgrade pip wheel setuptools -q
    
    log_success "Virtual environment ready"
}

install_python_dependencies() {
    log_step "Installing Dependencies"
    
    [ ! -f "requirements.txt" ] && log_error "requirements.txt not found!" && exit 1
    
    if [ -d "packages" ] && [ "$(ls -A packages 2>/dev/null)" ]; then
        log_info "Installing from offline packages..."
        pip install --no-index --find-links=packages -r requirements.txt -q
    else
        log_info "Installing from PyPI..."
        pip install -r requirements.txt -q
    fi
    
    log_success "Dependencies installed"
}

# ============================================================
# CONFIGURATION
# ============================================================
setup_configuration() {
    log_step "Configuration"
    
    if [ -f ".env" ]; then
        log_info ".env exists"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        [[ ! $REPLY =~ ^[Yy]$ ]] && return 0
    fi
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        cat > .env << 'ENVEOF'
# AI Code Executor Configuration
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
OLLAMA_HOST=http://localhost:11434
WHISPER_SERVER_URL=
DOCKER_EXECUTION_TIMEOUT=30
AUTO_FIX_MAX_ATTEMPTS=10
HOST=0.0.0.0
PORT=8000
ENVEOF
    fi
    log_success "Created .env"
}

# ============================================================
# BUILD IMAGE
# ============================================================
build_docker_image() {
    log_step "Building Docker Image"
    
    if $CONTAINER_CMD images | grep -q "$DOCKER_IMAGE_NAME"; then
        log_info "Image exists"
        read -p "Rebuild? (y/N): " -n 1 -r
        echo
        [[ ! $REPLY =~ ^[Yy]$ ]] && return 0
    fi
    
    log_info "Building (5-10 min on first run)..."
    
    if $CONTAINER_CMD build -t ${DOCKER_IMAGE_NAME}:latest . ; then
        log_success "Image built"
    else
        log_error "Build failed"
        echo "Try: $CONTAINER_CMD build -t ${DOCKER_IMAGE_NAME}:latest . --no-cache"
        exit 1
    fi
}

# ============================================================
# SCRIPTS
# ============================================================
create_launcher_scripts() {
    log_step "Creating Scripts"
    
    cat > start.sh << 'STARTEOF'
#!/bin/bash
cd "$(dirname "$0")"
[ -f "venv/bin/activate" ] && source venv/bin/activate
[ -f "venv/Scripts/activate" ] && source venv/Scripts/activate
[ -f ".env" ] && export $(grep -v '^#' .env | xargs)
HOST=${HOST:-0.0.0.0}
PORT=${PORT:-8000}
echo "🚀 AI Code Executor starting..."
echo "   http://localhost:$PORT"
echo "   Ctrl+C to stop"
echo ""
uvicorn backend.main:app --host $HOST --port $PORT --reload
STARTEOF
    chmod +x start.sh
    log_success "Created start.sh"
    
    cat > stop.sh << 'STOPEOF'
#!/bin/bash
echo "🛑 Stopping..."
pkill -f "uvicorn backend.main:app" 2>/dev/null && echo "✓ Server stopped" || echo "  Not running"
CMD="docker"; command -v docker &>/dev/null && docker ps &>/dev/null 2>&1 || CMD="podman"
N=$($CMD ps --filter "ancestor=ai-code-executor:latest" -q 2>/dev/null | wc -l)
[ "$N" -gt 0 ] && read -p "Stop $N container(s)? (y/N): " -n1 -r && echo && [[ $REPLY =~ ^[Yy]$ ]] && $CMD ps --filter "ancestor=ai-code-executor:latest" -q | xargs -r $CMD rm -f
echo "✓ Done"
STOPEOF
    chmod +x stop.sh
    log_success "Created stop.sh"
}

cleanup_old_containers() {
    log_step "Cleanup"
    OLD=$($CONTAINER_CMD ps -a --filter "ancestor=${DOCKER_IMAGE_NAME}:latest" -q 2>/dev/null | wc -l)
    if [ "$OLD" -gt 0 ]; then
        log_info "Removing $OLD old container(s)..."
        $CONTAINER_CMD ps -a --filter "ancestor=${DOCKER_IMAGE_NAME}:latest" -q | xargs -r $CONTAINER_CMD rm -f 2>/dev/null
        log_success "Cleaned"
    fi
}

# ============================================================
# COMPLETION
# ============================================================
show_completion() {
    echo ""
    echo -e "${GREEN}${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                 ✅ INSTALLATION COMPLETE!                     ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${BOLD}System:${NC} $OS_NAME | Python $($PYTHON_CMD --version 2>&1 | grep -oE '[0-9.]+') | $CONTAINER_RUNTIME v$CONTAINER_RUNTIME_VERSION"
    echo ""
    echo -e "${BOLD}Commands:${NC}"
    echo -e "  ${GREEN}./start.sh${NC}  Start server"
    echo -e "  ${GREEN}./stop.sh${NC}   Stop all"
    echo ""
    echo -e "${BOLD}URL:${NC} ${CYAN}http://localhost:$DEFAULT_PORT${NC}"
    echo ""
    echo -e "${BOLD}Config:${NC} Edit ${YELLOW}.env${NC} or use ⚙️ Settings"
    echo ""
    
    read -p "🚀 Start now? (Y/n): " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Nn]$ ]] && ./start.sh || echo -e "\nRun ${GREEN}./start.sh${NC} when ready!"
}

# ============================================================
# MAIN
# ============================================================
main() {
    show_header
    detect_os
    [ "$OS_TYPE" = "macos" ] && check_homebrew
    check_curl
    check_python
    detect_container_runtime
    test_container_runtime
    setup_python_environment
    install_python_dependencies
    setup_configuration
    build_docker_image
    create_launcher_scripts
    cleanup_old_containers
    show_completion
}

main "$@"

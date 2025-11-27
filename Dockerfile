FROM ubuntu:22.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install Python, Node.js, and basic utilities
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    nodejs \
    npm \
    bash \
    curl \
    wget \
    git \
    vim \
    nano \
    emacs-nox \
    less \
    htop \
    tree \
    jq \
    unzip \
    zip \
    tar \
    gzip \
    grep \
    sed \
    gawk \
    man-db \
    build-essential \
    net-tools \
    iputils-ping \
    telnet \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /workspace

# Set Python 3.11 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# Install common Python packages
RUN pip3 install --no-cache-dir \
    numpy \
    pandas \
    requests \
    beautifulsoup4 \
    matplotlib \
    pillow \
    flask \
    fastapi \
    httpx \
    pytest \
    ipython \
    jupyter \
    scikit-learn \
    seaborn \
    python-dotenv

# Default command
CMD ["/bin/bash"]

# Configure vim
RUN echo "set number" >> /etc/vim/vimrc \
    && echo "set mouse=a" >> /etc/vim/vimrc \
    && echo "syntax on" >> /etc/vim/vimrc \
    && echo "set expandtab" >> /etc/vim/vimrc \
    && echo "set tabstop=4" >> /etc/vim/vimrc \
    && echo "set shiftwidth=4" >> /etc/vim/vimrc

# Configure nano
RUN echo "set autoindent" >> /etc/nanorc \
    && echo "set tabsize 4" >> /etc/nanorc \
    && echo "set tabstospaces" >> /etc/nanorc

# Add helpful aliases
RUN echo 'alias ll="ls -lah"' >> /root/.bashrc \
    && echo 'alias la="ls -A"' >> /root/.bashrc \
    && echo 'alias l="ls -CF"' >> /root/.bashrc \
    && echo 'alias python="python3"' >> /root/.bashrc \
    && echo 'alias pip="pip3"' >> /root/.bashrc

# Set colorful prompt
RUN echo 'export PS1="\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "' >> /root/.bashrc

# Create helpful info file
RUN echo '#!/bin/bash' > /usr/local/bin/tools \
    && echo 'echo "📦 Tools: vim, nano, python3.11, node, git, curl, htop, tree, jq"' >> /usr/local/bin/tools \
    && echo 'echo "📚 Packages: numpy, pandas, flask, fastapi, pytest, jupyter"' >> /usr/local/bin/tools \
    && chmod +x /usr/local/bin/tools

# Show tools on bash start
RUN echo 'tools' >> /root/.bashrc

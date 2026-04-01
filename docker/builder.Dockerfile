FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 20 via NodeSource
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Tauri system dependencies + Python toolchain
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    libwebkit2gtk-4.1-dev \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    patchelf \
    file \
    python3 \
    python3-pip \
    python3-venv \
    libpython3.10 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Rust stable
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
ENV PATH="/root/.cargo/bin:$PATH"

# Smoke test
RUN cargo --version && rustc --version && node --version && python3 --version

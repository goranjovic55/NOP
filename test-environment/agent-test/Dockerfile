# Simple Ubuntu test host for agent testing
FROM ubuntu:22.04

# Install Python and network tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    wget \
    net-tools \
    iputils-ping \
    iproute2 \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies that agents might need
RUN pip3 install --no-cache-dir \
    requests \
    websockets \
    aiohttp \
    psutil

# Create working directory
WORKDIR /opt/agent

# Copy download script
COPY download-agent.sh /opt/agents/
RUN chmod +x /opt/agents/download-agent.sh

# Keep container running
CMD ["tail", "-f", "/dev/null"]

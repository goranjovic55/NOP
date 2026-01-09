FROM ubuntu:22.04

# Install required tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    wget \
    net-tools \
    iputils-ping \
    iproute2 \
    tcpdump \
    nmap \
    netcat \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for agent
RUN pip3 install --no-cache-dir \
    websockets \
    psutil \
    scapy \
    cryptography \
    requests

# Create working directory
WORKDIR /opt/agent

# Copy helper scripts
COPY download_agent.sh /opt/agent/
COPY test_agent_pov.py /opt/agent/
RUN chmod +x /opt/agent/*.sh

# Keep container running
CMD ["tail", "-f", "/dev/null"]

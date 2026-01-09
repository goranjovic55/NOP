FROM ubuntu:22.04

# Install required packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    wget \
    nmap \
    net-tools \
    iputils-ping \
    iproute2 \
    iptables \
    tcpdump \
    netcat \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages for agent
RUN pip3 install \
    requests \
    websockets \
    psutil \
    netifaces \
    python-nmap

# Create directories
RUN mkdir -p /downloads /agent

# Add agent download and execution scripts
COPY download-agent.sh /usr/local/bin/download-agent.sh
COPY run-agent.sh /usr/local/bin/run-agent.sh
COPY check-network.sh /usr/local/bin/check-network.sh

RUN chmod +x /usr/local/bin/*.sh

# Network configuration
RUN echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf

WORKDIR /agent

CMD ["/bin/bash"]

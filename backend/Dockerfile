FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    nmap \
    net-tools \
    iputils-ping \
    curl \
    libpcap-dev \
    ca-certificates \
    hping3 \
    traceroute \
    tcptraceroute \
    dnsutils \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates

# Install exploitdb from git
RUN git clone --depth 1 https://gitlab.com/exploit-database/exploitdb.git /opt/exploitdb \
    && ln -sf /opt/exploitdb/searchsploit /usr/local/bin/searchsploit \
    && cp -n /opt/exploitdb/.searchsploit_rc ~/ || true

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY start.sh .

# Make start.sh executable
RUN chmod +x start.sh

# Create directories
RUN mkdir -p /app/evidence /app/logs

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Run the application
CMD ["./start.sh"]

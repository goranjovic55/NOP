# Vulnerable service simulator for testing NOP vulnerability workflows
# This is a SIMULATED vulnerable service for testing purposes only
FROM alpine:3.19

# Install dependencies
RUN apk add --no-cache python3 py3-pip bash openssh nmap netcat-openbsd

# Create fake vulnerable services
RUN mkdir -p /opt/vuln-sim

# Create a Python script that simulates vulnerable services
COPY vuln-sim.py /opt/vuln-sim/vuln-sim.py

# Create test user for SSH
RUN ssh-keygen -A && \
    sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    echo "root:vuln123" | chpasswd

# Expose ports:
# 22 - SSH
# 8080 - Simulated HTTP with known version
# 3306 - Simulated MySQL with version info
EXPOSE 22 8080 3306

# Startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]

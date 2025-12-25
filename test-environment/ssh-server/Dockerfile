FROM alpine:latest

# Install OpenSSH
RUN apk add --no-cache openssh-server openssh-client

# Create SSH host keys
RUN ssh-keygen -A

# Create test user
RUN adduser -D -s /bin/sh testuser && \
    echo "testuser:testpass123" | chpasswd

# Create admin user
RUN adduser -D -s /bin/sh admin && \
    echo "admin:admin123" | chpasswd && \
    addgroup admin wheel

# Configure SSH
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    echo "root:rootpass123" | chpasswd

# Create some test files
RUN mkdir -p /home/testuser/documents && \
    echo "This is a test document" > /home/testuser/documents/readme.txt && \
    echo "#!/bin/sh\necho 'Hello from test script'" > /home/testuser/test.sh && \
    chmod +x /home/testuser/test.sh && \
    chown -R testuser:testuser /home/testuser

# Expose SSH port
EXPOSE 22

# Start SSH daemon
CMD ["/usr/sbin/sshd", "-D", "-e"]
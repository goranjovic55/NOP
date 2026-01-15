# Simple SSH server for testing
FROM alpine:3.19

# Install OpenSSH server
RUN apk add --no-cache openssh bash

# Configure SSH
RUN ssh-keygen -A && \
    sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    echo "root:toor" | chpasswd && \
    adduser -D -s /bin/bash testuser && \
    echo "testuser:test123" | chpasswd

# Create some system info for testing
RUN echo "NOP Test SSH Server" > /etc/motd

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D", "-e"]

# Simple FTP server for testing NOP workflows
FROM alpine:3.19

# Install vsftpd
RUN apk add --no-cache vsftpd

# Create test user and directories
RUN adduser -D -s /bin/bash ftpuser && \
    echo "ftpuser:ftp123" | chpasswd && \
    mkdir -p /home/ftpuser/uploads && \
    mkdir -p /home/ftpuser/downloads && \
    echo "Test file content for NOP workflows" > /home/ftpuser/downloads/test.txt && \
    echo "Config backup data" > /home/ftpuser/downloads/config.bak && \
    chown -R ftpuser:ftpuser /home/ftpuser

# Configure vsftpd
RUN echo "anonymous_enable=NO" >> /etc/vsftpd/vsftpd.conf && \
    echo "local_enable=YES" >> /etc/vsftpd/vsftpd.conf && \
    echo "write_enable=YES" >> /etc/vsftpd/vsftpd.conf && \
    echo "local_umask=022" >> /etc/vsftpd/vsftpd.conf && \
    echo "chroot_local_user=YES" >> /etc/vsftpd/vsftpd.conf && \
    echo "allow_writeable_chroot=YES" >> /etc/vsftpd/vsftpd.conf && \
    echo "seccomp_sandbox=NO" >> /etc/vsftpd/vsftpd.conf && \
    echo "pasv_enable=YES" >> /etc/vsftpd/vsftpd.conf && \
    echo "pasv_min_port=30000" >> /etc/vsftpd/vsftpd.conf && \
    echo "pasv_max_port=30009" >> /etc/vsftpd/vsftpd.conf

EXPOSE 21 30000-30009

CMD ["/usr/sbin/vsftpd", "/etc/vsftpd/vsftpd.conf"]

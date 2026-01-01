# vsftpd 2.3.4 with backdoor - CVE-2011-2523
FROM ubuntu:12.04

# Install vsftpd from old repos
RUN sed -i -e 's/archive.ubuntu.com\|security.ubuntu.com/old-releases.ubuntu.com/g' /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y vsftpd=2.3.4-1ubuntu1

# Create FTP user
RUN useradd -m -s /bin/bash ftpuser && \
    echo "ftpuser:password" | chpasswd

# Configure vsftpd
RUN echo "listen=YES" > /etc/vsftpd.conf && \
    echo "local_enable=YES" >> /etc/vsftpd.conf && \
    echo "write_enable=NO" >> /etc/vsftpd.conf && \
    echo "anonymous_enable=NO" >> /etc/vsftpd.conf && \
    echo "ftpd_banner=Welcome to NOP Test FTP (vsftpd 2.3.4)" >> /etc/vsftpd.conf && \
    echo "seccomp_sandbox=NO" >> /etc/vsftpd.conf

EXPOSE 21 6200

CMD ["/usr/sbin/vsftpd", "/etc/vsftpd.conf"]

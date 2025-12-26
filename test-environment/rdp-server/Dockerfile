FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    xfce4 \
    xfce4-goodies \
    xrdp \
    xorgxrdp \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Create a user with RDP access
RUN useradd -m -s /bin/bash rdpuser && \
    echo "rdpuser:rdp123" | chpasswd && \
    echo "xfce4-session" > /home/rdpuser/.xsession && \
    chown rdpuser:rdpuser /home/rdpuser/.xsession

# Allow anyone to start X server (needed for xrdp)
RUN sed -i 's/allowed_users=console/allowed_users=anybody/' /etc/X11/Xwrapper.config 2>/dev/null || true

# Configure xrdp
RUN sed -i 's/3389/3389/g' /etc/xrdp/xrdp.ini && \
    sed -i 's/max_bpp=32/max_bpp=24/g' /etc/xrdp/xrdp.ini && \
    sed -i 's/xserverbpp=24/xserverbpp=24/g' /etc/xrdp/xrdp.ini

# Add rdpuser to ssl-cert group for xrdp
RUN usermod -aG ssl-cert rdpuser 2>/dev/null || true

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 3389

CMD ["/start.sh"]

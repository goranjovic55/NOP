FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    x11vnc \
    xvfb \
    openbox \
    supervisor \
    xterm \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Create a user with password for VNC
RUN useradd -m -s /bin/bash vncuser && \
    echo "vncuser:vnc123" | chpasswd

# Create openbox autostart file
RUN mkdir -p /root/.config/openbox && \
    echo '#!/bin/bash' > /root/.config/openbox/autostart && \
    echo 'xterm -geometry 80x24+50+50 -title "VNC Test Server" -e "echo Welcome to VNC Test Server && echo User: vncuser && echo This is a real VNC connection && /bin/bash" &' >> /root/.config/openbox/autostart && \
    chmod +x /root/.config/openbox/autostart

COPY supervisord.conf /etc/supervisor/supervisord.conf

EXPOSE 5900

CMD ["/usr/bin/supervisord"]

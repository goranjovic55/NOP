FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install VNC server and lightweight desktop
RUN apt-get update && apt-get install -y \
    x11vnc \
    xvfb \
    fluxbox \
    xterm \
    && rm -rf /var/lib/apt/lists/*

# Set VNC password
RUN mkdir -p ~/.vnc && x11vnc -storepasswd vnc123 ~/.vnc/passwd

# Create startup script
RUN echo '#!/bin/bash\n\
Xvfb :0 -screen 0 1024x768x16 &\n\
sleep 2\n\
DISPLAY=:0 fluxbox &\n\
sleep 2\n\
DISPLAY=:0 xterm -geometry 80x24+100+100 -e "echo VNC Test Server Ready && bash" &\n\
x11vnc -display :0 -forever -shared -rfbport 5900 -rfbauth ~/.vnc/passwd -nopw\n\
' > /start.sh && chmod +x /start.sh

EXPOSE 5900

CMD ["/start.sh"]

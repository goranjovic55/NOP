FROM alpine:latest

RUN apk add --no-cache \
    xvfb \
    x11vnc \
    openbox \
    supervisor \
    bash

# Create a user
RUN adduser -D -h /home/vncuser vncuser && \
    echo "vncuser:vnc123" | chpasswd

COPY supervisord.conf /etc/supervisord.conf

EXPOSE 5900

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]

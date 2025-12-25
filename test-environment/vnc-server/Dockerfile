FROM alpine:latest

RUN apk add --no-cache     xvfb     x11vnc     fluxbox     supervisor     bash

# Create a user
RUN adduser -D -h /home/vncuser vncuser &&     echo "vncuser:vnc123" | chpasswd

COPY supervisord.conf /etc/supervisord.conf

EXPOSE 5900

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
EOF > test-environment/vnc-server/Dockerfile
FROM alpine:latest

RUN apk add --no-cache     xvfb     x11vnc     fluxbox     supervisor     bash

# Create a user
RUN adduser -D -h /home/vncuser vncuser &&     echo "vncuser:vnc123" | chpasswd

COPY supervisord.conf /etc/supervisord.conf

EXPOSE 5900

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]

# Multi-arch Guacamole daemon (guacd)
# Supports: linux/amd64, linux/arm64

FROM alpine:3.19

# Install dependencies
RUN apk add --no-cache \
    cairo \
    libjpeg-turbo \
    libpng \
    pango \
    libssh2 \
    libvncserver \
    pulseaudio \
    freerdp \
    ffmpeg \
    libwebsockets \
    && rm -rf /var/cache/apk/*

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps \
    build-base \
    cairo-dev \
    libjpeg-turbo-dev \
    libpng-dev \
    pango-dev \
    libssh2-dev \
    libvncserver-dev \
    pulseaudio-dev \
    freerdp-dev \
    ffmpeg-dev \
    libwebsockets-dev \
    libtool \
    autoconf \
    automake \
    wget \
    && rm -rf /var/cache/apk/*

# Download and build guacd 1.6.0
WORKDIR /tmp
RUN wget https://downloads.apache.org/guacamole/1.6.0/source/guacamole-server-1.6.0.tar.gz \
    && tar -xzf guacamole-server-1.6.0.tar.gz \
    && cd guacamole-server-1.6.0 \
    && ./configure --prefix=/usr/local \
        --disable-guacenc \
        --disable-guaclog \
        --with-vnc \
        --with-rdp \
        --with-ssh \
    && make -j$(nproc) \
    && make install \
    && cd / \
    && rm -rf /tmp/guacamole-server-1.6.0* \
    && apk del .build-deps

# Create guacd user
RUN addgroup -S guacd && adduser -S -G guacd guacd

# Expose default port (14822 to avoid conflicts with system guacd)
EXPOSE 14822

# Run guacd on high port
USER guacd
CMD ["/usr/local/sbin/guacd", "-b", "0.0.0.0", "-l", "14822", "-f"]

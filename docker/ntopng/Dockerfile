FROM ubuntu:22.04

# Install ntopng and dependencies
RUN apt-get update && apt-get install -y \
    ntopng \
    redis-server \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create ntopng configuration directory
RUN mkdir -p /etc/ntopng /var/lib/ntopng

# Copy configuration
COPY ntopng.conf /etc/ntopng/ntopng.conf

# Create data directory
RUN mkdir -p /var/lib/ntopng && chown ntopng:ntopng /var/lib/ntopng

# Expose ports
EXPOSE 3000

# Start ntopng
CMD ["ntopng", "/etc/ntopng/ntopng.conf"]
FROM alpine:latest

# Install Samba
RUN apk add --no-cache samba samba-common-tools

# Create test directories and files
RUN mkdir -p /shared/public /shared/private && \
    echo "This is a public file" > /shared/public/readme.txt && \
    echo "This is a private file" > /shared/private/confidential.txt && \
    echo "Sample document content" > /shared/public/document.txt

# Create Samba users
RUN adduser -D -s /bin/false smbuser && \
    echo -e "smbpass123\nsmbpass123" | smbpasswd -a -s smbuser

# Copy Samba configuration
COPY smb.conf /etc/samba/smb.conf

# Set permissions
RUN chown -R smbuser:smbuser /shared && \
    chmod 755 /shared/public && \
    chmod 700 /shared/private

# Expose Samba ports
EXPOSE 139 445

# Start Samba
CMD ["smbd", "--foreground", "--no-process-group"]
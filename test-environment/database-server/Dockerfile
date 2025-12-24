FROM mysql:8.0

# Set environment variables
ENV MYSQL_ROOT_PASSWORD=rootpass123
ENV MYSQL_DATABASE=testdb
ENV MYSQL_USER=testuser
ENV MYSQL_PASSWORD=testpass123

# Copy initialization script
COPY init.sql /docker-entrypoint-initdb.d/

# Expose MySQL port
EXPOSE 3306
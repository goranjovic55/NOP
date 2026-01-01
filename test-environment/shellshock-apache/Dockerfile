# Shellshock vulnerable Apache (CVE-2014-6271)
# Using Debian with vulnerable bash
FROM debian:jessie

# Install Apache and vulnerable bash
RUN echo "deb http://archive.debian.org/debian jessie main" > /etc/apt/sources.list && \
    echo "deb http://archive.debian.org/debian-security jessie/updates main" >> /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y --force-yes apache2 bash && \
    apt-get clean

# Enable CGI module
RUN a2enmod cgi

# Create CGI script
RUN mkdir -p /usr/lib/cgi-bin && \
    echo '#!/bin/bash' > /usr/lib/cgi-bin/test.cgi && \
    echo 'echo "Content-type: text/plain"' >> /usr/lib/cgi-bin/test.cgi && \
    echo 'echo ""' >> /usr/lib/cgi-bin/test.cgi && \
    echo 'echo "CGI Test - Vulnerable to Shellshock (CVE-2014-6271)"' >> /usr/lib/cgi-bin/test.cgi && \
    echo 'echo "Bash version: $BASH_VERSION"' >> /usr/lib/cgi-bin/test.cgi && \
    echo 'echo "User-Agent: $HTTP_USER_AGENT"' >> /usr/lib/cgi-bin/test.cgi && \
    chmod +x /usr/lib/cgi-bin/test.cgi

# Create index page
RUN echo '<html><body><h1>Shellshock Test Server (CVE-2014-6271)</h1><p><a href="/cgi-bin/test.cgi">Test CGI</a></p></body></html>' > /var/www/html/index.html

EXPOSE 80

CMD ["/usr/sbin/apache2ctl", "-D", "FOREGROUND"]

#!/bin/bash
rm -rf /var/run/xrdp/xrdp-sesman.pid
rm -rf /var/run/xrdp/xrdp.pid

/usr/sbin/xrdp-sesman
/usr/sbin/xrdp --nodaemon
EOF > test-environment/rdp-server/start.sh
#!/bin/bash
rm -rf /var/run/xrdp/xrdp-sesman.pid
rm -rf /var/run/xrdp/xrdp.pid

/usr/sbin/xrdp-sesman
/usr/sbin/xrdp --nodaemon

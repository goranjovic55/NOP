#!/bin/bash
rm -rf /var/run/xrdp/xrdp-sesman.pid
rm -rf /var/run/xrdp/xrdp.pid

/usr/sbin/xrdp-sesman
exec /usr/sbin/xrdp --nodaemon

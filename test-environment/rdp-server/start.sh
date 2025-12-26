#!/bin/bash
echo "[RDP-SERVER] Starting XRDP Server..."
rm -rf /var/run/xrdp/xrdp-sesman.pid
rm -rf /var/run/xrdp/xrdp.pid

echo "[RDP-SERVER] Starting xrdp-sesman..."
/usr/sbin/xrdp-sesman

echo "[RDP-SERVER] Starting xrdp..."
exec /usr/sbin/xrdp --nodaemon

#!/bin/bash
# Start all services for vulnerability testing

# Start SSH daemon in background
/usr/sbin/sshd

# Start vulnerability simulation services
exec python3 /opt/vuln-sim/vuln-sim.py

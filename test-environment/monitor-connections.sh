#!/bin/bash
# Connection monitor for Metasploitable2 vulnerable target
# Logs all connection attempts and successful connections

TARGET="metasploitable2"
LOG_FILE="/tmp/metasploitable2-connections.log"

echo "====================================" | tee -a $LOG_FILE
echo "Connection Monitor Started: $(date)" | tee -a $LOG_FILE
echo "Target: $TARGET (172.21.0.25)" | tee -a $LOG_FILE
echo "====================================" | tee -a $LOG_FILE
echo ""

# Monitor auth logs and network connections
docker exec $TARGET bash -c '
echo "Starting connection monitoring..."
echo "Monitoring /var/log/auth.log for SSH/login attempts..."
echo "Monitoring network connections..."
echo ""

# Clear old auth log entries for cleaner output
tail -0f /var/log/auth.log 2>/dev/null &
AUTH_PID=$!

# Monitor network connections
while true; do
    # Check for new connections
    NEW_CONNS=$(netstat -tnpa 2>/dev/null | grep ESTABLISHED | grep -v "127.0.0.1")
    if [ ! -z "$NEW_CONNS" ]; then
        echo "[$(date "+%H:%M:%S")] ESTABLISHED CONNECTIONS:"
        echo "$NEW_CONNS"
        echo "---"
    fi
    sleep 2
done
' | tee -a $LOG_FILE

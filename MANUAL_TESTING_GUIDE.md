#!/usr/bin/env python3
"""
Manual Testing Guide for RDP and VNC Connections
This guide helps you test RDP and VNC connections through the Access Hub
"""

import sys

def print_header(text):
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)


def main():
    print_header("RDP AND VNC CONNECTION MANUAL TESTING GUIDE")
    
    print("""
This guide will help you manually test RDP and VNC connections through the Access Hub.

## Prerequisites

Before starting, ensure you have:

1. ✅ Docker and Docker Compose installed
2. ✅ Test environment containers running
3. ✅ Main NOP application containers running
4. ✅ A web browser (Chrome, Firefox, or Edge recommended)

## Test Environment Setup

### Step 1: Create the Docker network
```bash
docker network create --subnet=172.21.0.0/24 nop_test-network
```

### Step 2: Start the test environment (if not already running)

Due to network restrictions in this environment, you may need to build containers
on a machine with proper internet access. The test environment includes:

- **RDP Server** (172.21.0.50:3389)
  - Username: rdpuser
  - Password: rdp123
  - Desktop: XFCE4

- **VNC Server** (172.21.0.51:5900)
  - Password: vnc123
  - Desktop: Openbox

### Step 3: Start main application containers
```bash
cd /home/runner/work/NOP/NOP
docker compose up -d
```

## Manual Testing Instructions

### Test 1: Verify guacd is Running

1. Check container status:
   ```bash
   docker ps | grep guacd
   ```
   
2. Check guacd logs:
   ```bash
   docker logs $(docker ps -q -f name=guacd)
   ```

### Test 2: Verify Test Servers are Reachable

1. Test RDP server connectivity:
   ```bash
   nc -zv 172.21.0.50 3389
   # OR
   telnet 172.21.0.50 3389
   ```

2. Test VNC server connectivity:
   ```bash
   nc -zv 172.21.0.51 5900
   # OR
   telnet 172.21.0.51 5900
   ```

### Test 3: Test RDP Connection via Access Hub

1. **Open browser** to http://localhost:12000

2. **Login** with credentials:
   - Username: admin
   - Password: admin123

3. **Navigate to Access Hub** (from left sidebar)

4. **Click "New Connection"** button

5. **Enter RDP host details**:
   - IP Address: 172.21.0.50
   - Protocol: Select "RDP"
   - Click Connect

6. **Enter RDP credentials** in the connection form:
   - Username: rdpuser
   - Password: rdp123
   - Check "Remember Credentials" (optional)
   - Click "Connect" button

7. **Monitor browser console** (F12 → Console tab):
   - Look for [GUACAMOLE-CLIENT] log messages
   - Look for [ACCESS-TUNNEL] log messages
   - Check for any error messages

8. **Expected Result**:
   - Connection status should change to "CONNECTED"
   - You should see the XFCE4 desktop environment
   - You should be able to move the mouse and interact with the desktop

9. **Take Screenshot** when desktop appears (use browser screenshot or Ctrl+Shift+S)

### Test 4: Test VNC Connection via Access Hub

1. **In Access Hub**, click "New Connection" again

2. **Enter VNC host details**:
   - IP Address: 172.21.0.51
   - Protocol: Select "VNC"
   - Click Connect

3. **Enter VNC credentials** in the connection form:
   - Username: (can be any value or empty)
   - Password: vnc123
   - Click "Connect" button

4. **Monitor browser console** (F12 → Console tab):
   - Look for [GUACAMOLE-CLIENT] log messages
   - Check connection state changes
   - Check for any errors

5. **Expected Result**:
   - Connection status should change to "CONNECTED"
   - You should see the Openbox desktop environment
   - You should be able to move the mouse and interact

6. **Take Screenshot** when desktop appears

### Test 5: Check Backend Logs

1. **Check backend application logs**:
   ```bash
   docker logs $(docker ps -q -f name=backend) | grep -E "GUACAMOLE|ACCESS-TUNNEL"
   ```

2. **Look for**:
   - [GUACAMOLE] Starting connection messages
   - [GUACAMOLE] ✓ Connection established successfully
   - [ACCESS-TUNNEL] WebSocket connection request
   - Any error messages

## Troubleshooting

### Issue: Cannot connect to guacd

**Solution**:
1. Verify guacd container is running: `docker ps | grep guacd`
2. Check guacd logs: `docker logs $(docker ps -q -f name=guacd)`
3. Restart guacd: `docker restart $(docker ps -q -f name=guacd)`

### Issue: RDP/VNC server not reachable

**Solution**:
1. Verify test containers are running
2. Check network connectivity
3. Verify containers are on the same network:
   ```bash
   docker network inspect nop_test-network
   ```

### Issue: Connection fails with authentication error

**Solution**:
1. Verify credentials are correct:
   - RDP: rdpuser / rdp123
   - VNC: vnc123 (any username)
2. Check test server logs for authentication errors
3. Try resetting the test containers

### Issue: Black screen or no display

**Solution**:
1. Check browser console for WebSocket errors
2. Verify screen dimensions are being sent correctly
3. Try refreshing the page
4. Check if X server is running in the container

### Issue: Connection hangs on "CONNECTING"

**Solution**:
1. Check backend logs for detailed error messages
2. Verify guacd can reach the target hosts
3. Check firewall rules between containers
4. Restart the connection

## Success Criteria

✅ **RDP Connection Successful** when:
- Connection status shows "CONNECTED"
- XFCE4 desktop is visible in browser
- Mouse and keyboard input works
- Screenshot shows working desktop

✅ **VNC Connection Successful** when:
- Connection status shows "CONNECTED"
- Openbox desktop is visible in browser
- Mouse and keyboard input works
- Screenshot shows working desktop

## Log Collection

### Collect logs for issue reporting:

```bash
# Backend logs
docker logs $(docker ps -q -f name=backend) > backend.log 2>&1

# guacd logs
docker logs $(docker ps -q -f name=guacd) > guacd.log 2>&1

# RDP server logs
docker logs nop-custom-rdp > rdp-server.log 2>&1

# VNC server logs
docker logs nop-custom-vnc > vnc-server.log 2>&1
```

## Additional Debugging

### Enable verbose logging in browser:

In browser console, enable verbose logging:
```javascript
localStorage.setItem('debug', 'true');
location.reload();
```

### Test guacd directly with Python:

```python
import socket

# Connect to guacd
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(('localhost', 4822))

# Send select instruction
sock.sendall(b'6.select,3.rdp;')

# Read response
data = sock.recv(1024)
print("Response:", data.decode('utf-8', errors='ignore'))

sock.close()
```

## Reporting Results

When reporting test results, include:

1. ✅ Screenshots of successful RDP connection
2. ✅ Screenshots of successful VNC connection
3. ✅ Browser console logs
4. ✅ Backend logs with [GUACAMOLE] and [ACCESS-TUNNEL] messages
5. ✅ Any error messages encountered
6. ✅ Container status (`docker ps`)

---

This guide provides comprehensive instructions for testing RDP and VNC connections.
Follow each step carefully and document your results.
""")


if __name__ == "__main__":
    main()

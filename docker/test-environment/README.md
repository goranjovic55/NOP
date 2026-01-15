# NOP E2E Test Environment

End-to-end test environment for verifying all 10 automation workflow scenarios.

## Quick Start

```bash
# 1. Make sure NOP main stack is running
docker compose -f docker/docker-compose.dev.yml up -d

# 2. Start E2E test environment
docker compose -f docker/test-environment/docker-compose.e2e.yml up -d --build

# 3. Verify containers are running
docker ps | grep nop-e2e
```

## Test Hosts

| Host | IP Address | Services | Credentials | Scenarios |
|------|------------|----------|-------------|-----------|
| `ssh-target` | 172.29.0.100 | SSH (22) | root:toor, testuser:test123 | 3, 4, 9 |
| `web-target` | 172.29.0.101 | HTTP (80) | - | 1, 5, 8 |
| `traffic-client-1` | 172.29.0.102 | Traffic generator | - | 5, 10 |
| `traffic-client-2` | 172.29.0.103 | Traffic generator | - | 5, 10 |
| `ftp-target` | 172.29.0.105 | FTP (21) | ftpuser:ftp123 | 7 |
| `vuln-target` | 172.29.0.106 | SSH (22), HTTP (8080), MySQL (3306) | root:vuln123 | 2, 6 |
| `extra-host-1` | 172.29.0.107 | Ping only | - | 1, 8 |
| `extra-host-2` | 172.29.0.108 | Ping only | - | 1, 8 |

## 10 Automation Scenarios

### Scenario 1: Asset Discovery & Inventory
**Test hosts:** All hosts in 172.29.0.0/24  
**Workflow:** `E2E #1: Asset Discovery & Inventory`  
**Expected:** Discover 6+ hosts via ARP/Ping sweep

### Scenario 2: Vulnerability Assessment Chain  
**Test hosts:** vuln-target (172.29.0.106)  
**Workflow:** `E2E #2: Vulnerability Assessment Chain`  
**Expected:** Detect Apache 2.4.49, find CVE-2021-41773, map exploits

### Scenario 3: Credential Validation Sweep
**Test hosts:** ssh-target, ftp-target, vuln-target  
**Workflow:** `E2E #3: Credential Validation Sweep`  
**Expected:** Validate SSH (root:toor) and FTP (ftpuser:ftp123) credentials

### Scenario 4: SSH Command Execution Campaign
**Test hosts:** ssh-target (172.29.0.100), vuln-target (172.29.0.106)  
**Workflow:** `E2E #4: SSH Command Execution Campaign`  
**Expected:** Execute commands on all SSH-accessible hosts

### Scenario 5: Network Traffic Analysis
**Test hosts:** traffic-client-1, traffic-client-2  
**Workflow:** `E2E #5: Network Traffic Analysis`  
**Expected:** Capture traffic, analyze packet patterns

### Scenario 6: Exploit Discovery & Mapping
**Test hosts:** vuln-target (172.29.0.106)  
**Workflow:** `E2E #6: Exploit Discovery & Mapping`  
**Expected:** Detect vulnerable services, find CVEs, discover exploits

### Scenario 7: FTP File Operations
**Test hosts:** ftp-target (172.29.0.105)  
**Workflow:** `E2E #7: FTP File Operations`  
**Expected:** Connect, list, download, upload files via FTP

### Scenario 8: Multi-Host Ping Health Check
**Test hosts:** All hosts  
**Workflow:** `E2E #8: Multi-Host Ping Health Check`  
**Expected:** Ping all assets, update online status

### Scenario 9: Agent Deployment Chain
**Test hosts:** ssh-target (172.29.0.100)  
**Workflow:** `E2E #9: Agent Deployment Chain`  
**Expected:** Generate agent, deploy via SSH, verify running

### Scenario 10: Traffic Storm Testing
**Test hosts:** NOP backend (eth0)  
**Workflow:** `E2E #10: Traffic Storm Testing`  
**Expected:** Generate broadcast storm, capture traffic, analyze impact

## Running Tests via UI

1. Navigate to **Flow** page in NOP UI
2. Click **Templates** in the sidebar
3. Select an `E2E #N` template
4. Click to insert the template
5. Click **Run Workflow** to execute
6. Monitor execution in the console

## Cleanup

```bash
# Stop and remove E2E containers
docker compose -f docker/test-environment/docker-compose.e2e.yml down -v

# Remove images (if needed)
docker rmi $(docker images | grep nop-e2e | awk '{print $3}')
```

## Troubleshooting

### SSH Connection Fails
```bash
# Verify SSH server is running
docker exec nop-e2e-ssh ps aux | grep sshd

# Test manually
docker exec -it nop-backend ssh root@172.29.0.100
# Password: toor
```

### FTP Connection Fails
```bash
# Verify FTP server is running
docker exec nop-e2e-ftp ps aux | grep vsftpd

# Check logs
docker logs nop-e2e-ftp
```

### Traffic Capture Empty
```bash
# Check if traffic generators are running
docker logs nop-e2e-traffic1
docker logs nop-e2e-traffic2
```

### Network Not Found
```bash
# Create the NOP network if missing
docker network create docker_nop-internal --subnet=172.29.0.0/16
```

## File Structure

```
docker/test-environment/
├── docker-compose.e2e.yml    # Main E2E test compose file
├── ssh-server/
│   └── Dockerfile            # SSH server (Alpine + OpenSSH)
├── ftp-server/
│   └── Dockerfile            # FTP server (Alpine + vsftpd)
├── vuln-server/
│   ├── Dockerfile            # Vulnerable services simulator
│   ├── vuln-sim.py           # Python service simulator
│   └── start.sh              # Startup script
└── README.md                 # This file
```

# Quick Test Reference Guide

## 🚀 Quick Start (5 Minutes)

### 1. Start Everything
```bash
# From NOP root directory
./run-comprehensive-tests.sh
```

This single command will:
- ✅ Start NOP platform (frontend, backend, database)
- ✅ Start all test hosts (SSH, VNC, RDP, FTP, Web, DB, SMB)
- ✅ Verify connectivity
- ✅ Run complete test suite
- ✅ Generate HTML report

### 2. View Results
```bash
cd e2e && npx playwright show-report
```

## 📋 Manual Testing (Step-by-Step)

### Step 1: Validate Test Environment
```bash
./validate-test-hosts.sh
```

Expected output: ✓ All 7+ test hosts accessible

### Step 2: Start NOP Platform
```bash
docker compose up -d
```

Wait 30 seconds for services to initialize.

### Step 3: Verify Backend Health
```bash
curl http://localhost:12001/api/v1/health
```

Expected: `{"status":"ok"}`

### Step 4: Run Tests
```bash
# All tests
npm test

# Specific suite
npm run test:comprehensive

# With UI for debugging
npm run test:ui
```

## 🎯 Test Scenarios

### Scenario 1: SSH Connection
1. Open browser: http://localhost:12000
2. Login: admin / admin123
3. Navigate to Access Hub
4. Add SSH connection:
   - Host: 172.21.0.10
   - Port: 22
   - Username: testuser
   - Password: testpass123
5. Click Connect
6. Verify terminal opens

### Scenario 2: Asset Discovery
1. Navigate to Assets
2. Click Discover
3. Enter range: 172.21.0.0/24
4. Wait for scan
5. Verify 7+ hosts discovered

### Scenario 3: Workflow Execution
1. Navigate to Flows
2. Click Templates
3. Select "SSH Command Execution"
4. Configure target: 172.21.0.10
5. Run workflow
6. Verify command executes

## 🔍 Available Test Hosts

| Service | IP | Port | Credentials |
|---------|-----|------|-------------|
| SSH | 172.21.0.10 | 22 | testuser:testpass123 |
| Web | 172.21.0.20 | 80 | - |
| FTP | 172.21.0.30 | 21 | ftpuser:ftp123 |
| MySQL | 172.21.0.40 | 3306 | dbuser:dbpass123 |
| VNC | 172.21.0.50 | 5900 | password |
| RDP | 172.21.0.60 | 3389 | rdpuser:rdp123 |
| SMB | 172.21.0.70 | 445 | smbuser:smbpass123 |

## 📊 Test Coverage

### Automated Tests (34 total)
- ✅ 17 comprehensive feature tests
- ✅ 16 live connection tests
- ✅ 1 environment validation

### Manual Tests
- ✅ SSH terminal interaction
- ✅ VNC screen sharing
- ✅ RDP desktop access
- ✅ FTP file transfer
- ✅ Workflow execution
- ✅ Vulnerability scanning

## 🛠️ Useful Commands

### Test Commands
```bash
npm test                    # Run all tests
npm run test:comprehensive  # Comprehensive suite only
npm run test:connections    # Connection tests only
npm run test:ui             # Interactive UI mode
npm run test:headed         # Show browser
npm run test:report         # View last report
npm run validate-hosts      # Check test hosts
npm run test:full           # Complete orchestration
```

### Service Commands
```bash
# Start services
docker compose up -d
cd test-environment && docker compose up -d

# Check status
docker compose ps
curl http://localhost:12001/api/v1/health

# View logs
docker compose logs -f backend
docker compose logs -f frontend
cd test-environment && docker compose logs ssh-server

# Stop everything
docker compose down
cd test-environment && docker compose down
```

### Debugging
```bash
# Run single test with debug
cd e2e
npx playwright test tests/comprehensive-live-hosts.spec.ts:17 --debug

# Show trace for failed test
npx playwright show-trace test-results/.../trace.zip

# Check network connectivity
docker exec nop-backend ping 172.21.0.10
nc -zv 172.21.0.10 22
```

## 🎨 Visual Verification

All tests generate screenshots in `e2e/test-results/`:
- ✅ Authentication state
- ✅ Asset discovery
- ✅ Credential vault
- ✅ Connection interfaces (SSH, VNC, RDP, FTP)
- ✅ Network scanning
- ✅ Workflow execution
- ✅ Dashboard overview
- ✅ And 20+ more...

## 🚨 Troubleshooting

### Tests Fail
```bash
# Check services are running
docker compose ps
cd test-environment && docker compose ps

# Restart everything
docker compose restart
cd test-environment && docker compose restart

# Check logs
docker compose logs backend
```

### Can't Connect to Test Hosts
```bash
# Validate hosts
./validate-test-hosts.sh

# Check Docker networks
docker network ls
docker network inspect test-network

# Restart test environment
cd test-environment
docker compose down && docker compose up -d
```

### Frontend Not Loading
```bash
# Check frontend logs
docker compose logs frontend

# Rebuild frontend
docker compose build frontend
docker compose up -d frontend
```

## 📈 Expected Results

### Successful Test Run
```
✓ Authentication - Login and Session Management
✓ Asset Discovery - Discover Live Test Hosts
✓ Credential Vault - Add and Manage Credentials
✓ SSH Access - Connect to Live SSH Server
✓ VNC Access - Connect to Live VNC Server
✓ RDP Access - Connect to Live RDP Server
✓ FTP Access - Connect to Live FTP Server
✓ Web Access - Verify Web Server Connectivity
✓ Database Access - Verify MySQL Server
✓ Network Scanning - Scan Test Network
✓ Vulnerability Scanning - Check for Vulnerabilities
✓ Traffic Analysis - Monitor Network Traffic
✓ Workflows - Execute Workflow Against Live Hosts
✓ Agents - Agent Deployment and Monitoring
✓ Dashboard - System Overview and Health
✓ API Health - Backend API Endpoints
✓ Full Integration - End-to-End Workflow

17 passed (2.5m)
```

### Successful Validation
```
✓ SSH Server (172.21.0.10:22)
✓ Web Server (172.21.0.20:80)
✓ FTP Server (172.21.0.30:21)
✓ MySQL Server (172.21.0.40:3306)
✓ VNC Server (172.21.0.50:5900)
✓ RDP Server (172.21.0.60:3389)
✓ SMB Server (172.21.0.70:445)
✓ Web Server HTTP - HTTP OK

Tests Passed: 8/8
✓ All test hosts are healthy and accessible
```

## 🎯 Next Steps

After successful test run:
1. ✅ Review HTML report in browser
2. ✅ Check screenshots for visual verification
3. ✅ Test manual workflows in UI
4. ✅ Try different test scenarios
5. ✅ Customize tests for your needs

## 📚 Documentation

- [Complete Test Suite Documentation](e2e/TEST_SUITE_README.md)
- [Test Environment Details](test-environment/README.md)
- [Main NOP README](README.md)

## 💡 Tips

1. **First Time Setup**: Run `npm install` before tests
2. **Browser Install**: Run `npx playwright install chromium`
3. **Network Issues**: Docker Desktop must be running
4. **Port Conflicts**: Ensure ports 12000, 12001 are free
5. **Performance**: Tests run faster on SSD with Docker BuildKit

## ⚡ Performance

Expected timing on modern hardware:
- Environment startup: ~30 seconds
- Test suite execution: ~2-3 minutes
- Total end-to-end: ~4 minutes

## 🔒 Security Note

⚠️ **Test Environment Only**
- Intentionally vulnerable hosts
- Weak credentials by design
- Never expose to internet
- Use only in isolated networks

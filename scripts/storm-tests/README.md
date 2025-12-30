# STORM Testing Environment

Comprehensive testing suite for validating STORM detection and mitigation functionality.

## Quick Start

```bash
# Setup test environment (starts all test containers)
./setup_storm_test_env.sh

# Run all test scenarios
./run_all_tests.sh

# Run individual scenario
./scenarios/scenario_01_low_rate.sh

# Monitor a specific host for storms
../storm_monitor.sh 1000 nop-custom-web 80
```

## Test Scenarios

### Scenario 1: Low-Rate Storm (< 1k PPS)
- **File**: `scenarios/scenario_01_low_rate.sh`
- **Target**: Web server (172.21.0.42:80)
- **Storm Type**: TCP SYN flood
- **PPS**: 500
- **Duration**: 30s
- **Expected**: Host stays online, detection triggers

### Scenario 2: Medium-Rate Storm (1k-10k PPS)
- **File**: `scenarios/scenario_02_medium_rate.sh`
- **Target**: Database server (172.21.0.123:3306)
- **Storm Type**: TCP flood
- **PPS**: 5000
- **Duration**: 20s
- **Expected**: Host shuts down when threshold exceeded

### Scenario 3: High-Rate Storm (10k-50k PPS)
- **File**: `scenarios/scenario_03_high_rate.sh`
- **Target**: SSH server (172.21.0.69:22)
- **Storm Type**: UDP flood
- **PPS**: 25000
- **Duration**: 10s
- **Expected**: Immediate shutdown, detection logged

### Scenario 4: Broadcast Storm
- **File**: `scenarios/scenario_04_broadcast.sh`
- **Storm Type**: Broadcast packets
- **PPS**: 2000
- **Duration**: 15s
- **Expected**: All hosts detect, network impact visible

### Scenario 5: Multicast Storm
- **File**: `scenarios/scenario_05_multicast.sh`
- **Storm Type**: Multicast UDP
- **Target**: 224.0.0.1
- **PPS**: 3000
- **Duration**: 20s
- **Expected**: Multiple hosts affected

### Scenario 6: Ramp-Up Test
- **File**: `scenarios/scenario_06_ramp_up.sh`
- **Target**: RDP server (172.21.0.50:3389)
- **Storm Type**: TCP
- **PPS**: 100 → 500 → 1000 → 5000 (escalating)
- **Expected**: Shutdown triggers at configured threshold

### Scenario 7: Multiple Targets
- **File**: `scenarios/scenario_07_multi_target.sh`
- **Targets**: Web + DB + SSH servers
- **Storm Type**: TCP SYN flood
- **PPS**: 1000 per target
- **Expected**: Parallel storms, all monitored

### Scenario 8: Port Scan Storm
- **File**: `scenarios/scenario_08_port_scan.sh`
- **Target**: FTP server (172.21.0.52)
- **Storm Type**: TCP SYN across ports 1-1024
- **PPS**: 10000
- **Expected**: Detection of scan pattern

## Architecture

```
storm-tests/
├── README.md                    # This file
├── setup_storm_test_env.sh      # Initialize test environment
├── run_all_tests.sh             # Master orchestrator
├── teardown_storm_test_env.sh   # Cleanup
├── scenarios/                    # Individual test scenarios
│   ├── scenario_01_low_rate.sh
│   ├── scenario_02_medium_rate.sh
│   ├── scenario_03_high_rate.sh
│   ├── scenario_04_broadcast.sh
│   ├── scenario_05_multicast.sh
│   ├── scenario_06_ramp_up.sh
│   ├── scenario_07_multi_target.sh
│   └── scenario_08_port_scan.sh
├── monitors/                     # Monitoring scripts per host
│   ├── monitor_web.sh
│   ├── monitor_db.sh
│   ├── monitor_ssh.sh
│   └── ...
└── results/                      # Test output logs
    └── .gitkeep
```

## Configuration

Each test scenario follows this structure:

```bash
#!/bin/bash
# Scenario: <Name>
# Target: <IP:Port>
# PPS: <value>
# Expected: <outcome>

source ../test_common.sh

test_name="Scenario Name"
target_ip="172.21.0.X"
target_port=80
pps=1000
duration=30

# Start monitoring in background
start_monitor "$target_ip" "$pps"

# Execute storm
execute_storm "$target_ip" "$target_port" "$pps" "$duration"

# Validate results
validate_results

# Cleanup
cleanup
```

## Monitoring

Monitors run in parallel with storms and:
- Track PPS in real-time
- Shutdown host when threshold exceeded
- Log detection timestamps
- Record final metrics

## Test Results

Results are stored in `results/` with format:
```
results/
├── scenario_01_YYYY-MM-DD_HHMMSS.log
├── scenario_02_YYYY-MM-DD_HHMMSS.log
└── summary_YYYY-MM-DD.md
```

## Requirements

- Docker & docker-compose
- Test environment containers running
- Backend container with NET_RAW capability
- Python 3 with scapy

## Safety

⚠️ **IMPORTANT**: These tests generate high network traffic
- Use only in isolated test environment
- Monitor system resources
- Use `teardown_storm_test_env.sh` to cleanup
- Review logs for unexpected behavior

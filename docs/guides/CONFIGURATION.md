# Network Observatory Platform - Configuration Reference
## Complete Configuration Guide v1.0

---

## 1. Environment Variables

### 1.1 Application Settings

```bash
# Application Environment
ENVIRONMENT=production
# Values: development, staging, production
# Default: production
# Description: Sets the application environment mode

LOG_LEVEL=INFO
# Values: DEBUG, INFO, WARNING, ERROR, CRITICAL
# Default: INFO
# Description: Logging verbosity level

SECRET_KEY=your-secret-key-min-32-characters
# Required: Yes
# Description: Secret key for JWT and session encryption
# Generate: openssl rand -hex 32

API_VERSION=v1
# Default: v1
# Description: API version prefix

CORS_ORIGINS=http://localhost:3000,https://nop.local
# Default: * (all origins in development)
# Description: Comma-separated list of allowed CORS origins

MAX_REQUEST_SIZE=50MB
# Default: 50MB
# Description: Maximum size of uploaded files

WORKERS=4
# Default: (CPU count * 2) + 1
# Description: Number of Uvicorn worker processes
```

### 1.2 Database Configuration

```bash
POSTGRES_HOST=postgres
# Default: postgres
# Description: PostgreSQL host address

POSTGRES_PORT=5432
# Default: 5432
# Description: PostgreSQL port

POSTGRES_DB=nop
# Default: nop
# Description: Database name

POSTGRES_USER=nop_user
# Required: Yes
# Description: Database username

POSTGRES_PASSWORD=secure-password-here
# Required: Yes
# Description: Database password
# Generate: openssl rand -base64 32

DATABASE_POOL_SIZE=20
# Default: 20
# Description: Maximum number of database connections

DATABASE_MAX_OVERFLOW=10
# Default: 10
# Description: Maximum overflow connections beyond pool size

DATABASE_POOL_TIMEOUT=30
# Default: 30 seconds
# Description: Connection pool timeout
```

### 1.3 Redis Configuration

```bash
REDIS_HOST=redis
# Default: redis
# Description: Redis host address

REDIS_PORT=6379
# Default: 6379
# Description: Redis port

REDIS_PASSWORD=
# Optional: Yes
# Description: Redis password (leave empty if no password)

REDIS_DB=0
# Default: 0
# Description: Redis database number

REDIS_MAX_CONNECTIONS=50
# Default: 50
# Description: Maximum Redis connections

REDIS_SOCKET_TIMEOUT=5
# Default: 5 seconds
# Description: Redis socket timeout

REDIS_SOCKET_CONNECT_TIMEOUT=5
# Default: 5 seconds
# Description: Redis connection timeout
```

### 1.4 Authentication & Security

```bash
ADMIN_USERNAME=admin
# Default: admin
# Description: Initial admin username

ADMIN_PASSWORD=changeme
# Required: Yes (MUST CHANGE)
# Description: Initial admin password

ADMIN_EMAIL=admin@example.com
# Required: Yes
# Description: Admin email address

JWT_ALGORITHM=HS256
# Default: HS256
# Values: HS256, HS384, HS512, RS256, RS384, RS512
# Description: JWT signing algorithm

JWT_EXPIRY=3600
# Default: 3600 (1 hour)
# Description: Access token expiry in seconds

REFRESH_TOKEN_EXPIRY=604800
# Default: 604800 (7 days)
# Description: Refresh token expiry in seconds

PASSWORD_MIN_LENGTH=12
# Default: 12
# Description: Minimum password length

PASSWORD_REQUIRE_UPPERCASE=true
# Default: true
# Description: Require uppercase letters in passwords

PASSWORD_REQUIRE_LOWERCASE=true
# Default: true
# Description: Require lowercase letters in passwords

PASSWORD_REQUIRE_DIGITS=true
# Default: true
# Description: Require digits in passwords

PASSWORD_REQUIRE_SPECIAL=true
# Default: true
# Description: Require special characters in passwords

SESSION_TIMEOUT=1800
# Default: 1800 (30 minutes)
# Description: Inactivity timeout for sessions

MAX_LOGIN_ATTEMPTS=5
# Default: 5
# Description: Max failed login attempts before lockout

LOGIN_LOCKOUT_DURATION=900
# Default: 900 (15 minutes)
# Description: Account lockout duration in seconds
```

### 1.5 Encryption

```bash
MASTER_KEY=your-32-byte-master-encryption-key
# Required: Yes
# Length: Exactly 32 bytes (64 hex chars)
# Description: Master key for credential encryption
# Generate: openssl rand -hex 32

KEY_DERIVATION_ITERATIONS=100000
# Default: 100000
# Description: PBKDF2 iterations for key derivation

ENCRYPTION_ALGORITHM=AES-256-GCM
# Default: AES-256-GCM
# Description: Encryption algorithm for credentials
```

### 1.6 Network Settings

```bash
PRIMARY_INTERFACE=eth0
# Required: Yes
# Description: Primary network interface to monitor

MONITOR_SUBNETS=192.168.1.0/24,10.0.0.0/16
# Required: Yes
# Description: Comma-separated list of subnets to monitor

EXCLUDED_IPS=192.168.1.1,192.168.1.254
# Optional: Yes
# Description: Comma-separated list of IPs to exclude from discovery

ENABLE_IPV6=false
# Default: false
# Description: Enable IPv6 support

PROMISCUOUS_MODE=true
# Default: true
# Description: Enable promiscuous mode on interface
```

---

## 2. Discovery Configuration

### 2.1 Discovery Settings

```yaml
discovery:
  mode: active_passive
  # Values: passive_only, active_passive, aggressive
  # Default: active_passive
  # Description: Discovery mode
  #   - passive_only: Only ARP/DHCP observation
  #   - active_passive: Add ping sweeps
  #   - aggressive: Full port scanning

  scan_interval: 300
  # Default: 300 (5 minutes)
  # Range: 60-3600 seconds (0 = manual only)
  # Description: Automatic scan interval

  target_subnets:
    - 192.168.1.0/24
    - 10.0.0.0/16
  # Required: Yes
  # Description: List of subnets to scan

  excluded_ips:
    - 192.168.1.1
    - 192.168.1.254
  # Optional: Yes
  # Description: IPs to skip during discovery

  max_concurrent_scans: 3
  # Default: 3
  # Range: 1-10
  # Description: Maximum parallel scan operations

  timeout_per_host: 30
  # Default: 30 seconds
  # Range: 5-120 seconds
  # Description: Timeout for each host scan
```

### 2.2 Scanning Profiles

```yaml
scanning:
  os_detection: light
  # Values: none, light, intense
  # Default: light
  # Description: OS detection aggressiveness
  #   - none: Skip OS detection
  #   - light: Standard OS detection
  #   - intense: Aggressive with guessing

  service_detection: true
  # Default: true
  # Description: Enable service version detection

  default_scripts: true
  # Default: true
  # Description: Run Nmap default scripts

  custom_scripts: []
  # Default: []
  # Example: [smb-os-discovery, http-title]
  # Description: Additional NSE scripts to run

  port_scan_technique: SYN
  # Values: SYN, CONNECT, ACK, WINDOW, MAIMON, NULL, FIN, XMAS
  # Default: SYN
  # Description: Port scanning technique

  timing_template: T3
  # Values: T0 (paranoid), T1 (sneaky), T2 (polite), T3 (normal), T4 (aggressive), T5 (insane)
  # Default: T3
  # Description: Nmap timing template

  top_ports: 1000
  # Default: 1000
  # Range: 100-65535
  # Description: Number of top ports to scan

  udp_scan: false
  # Default: false
  # Description: Include UDP port scanning
```

---

## 3. Traffic Analysis Configuration

### 3.1 ntopng Settings

```yaml
traffic:
  enable_dpi: true
  # Default: true
  # Description: Enable deep packet inspection (CPU intensive)

  enable_credential_detection: false
  # Default: false
  # Description: Detect cleartext credentials in traffic

  monitored_protocols:
    - HTTP
    - HTTPS
    - FTP
    - SSH
    - RDP
    - SMB
    - DNS
    - SMTP
    - POP3
    - IMAP
  # Default: All common protocols
  # Description: Protocols to analyze

  data_retention_days: 30
  # Default: 30
  # Range: 1-365
  # Description: How long to keep flow data

  flow_export_interval: 5
  # Default: 5 seconds
  # Range: 1-60
  # Description: How often to export flows to database

  alert_sensitivity: medium
  # Values: low, medium, high
  # Default: medium
  # Description: Alert generation sensitivity

  bandwidth_threshold_mbps: 100
  # Default: 100
  # Description: Bandwidth threshold for alerts
```

### 3.2 Traffic Alerts

```yaml
alerts:
  enable_high_bandwidth_alert: true
  high_bandwidth_threshold_mbps: 100

  enable_port_scan_detection: true
  port_scan_threshold: 50  # ports per minute

  enable_dns_amplification_detection: true
  dns_query_threshold: 100  # queries per minute

  enable_external_ip_alert: true
  # Alert on communication with non-whitelisted external IPs

  enable_unencrypted_protocol_alert: true
  # Alert on HTTP, FTP, Telnet usage

  enable_new_service_alert: true
  # Alert when a new service appears on known host
```

---

## 4. Credential Vault Configuration

### 4.1 Credential Settings

```yaml
credentials:
  auto_test_interval: 86400
  # Default: 86400 (24 hours)
  # Range: 3600-604800 seconds
  # Description: How often to test stored credentials

  test_timeout: 10
  # Default: 10 seconds
  # Range: 5-30 seconds
  # Description: Timeout for credential testing

  max_test_retries: 3
  # Default: 3
  # Range: 1-5
  # Description: Max retries for failed tests

  encryption_version: 1
  # Default: 1
  # Description: Credential encryption version (for migrations)
```

### 4.2 Protocol-Specific Settings

```yaml
protocols:
  ssh:
    default_port: 22
    connection_timeout: 10
    auth_timeout: 5
    key_types: [rsa, ed25519, ecdsa]

  rdp:
    default_port: 3389
    connection_timeout: 15
    screen_width: 1920
    screen_height: 1080
    color_depth: 24
    compression: true

  vnc:
    default_port: 5900
    connection_timeout: 10
    compression: tight

  ftp:
    default_port: 21
    connection_timeout: 10
    passive_mode: true
    binary_mode: true
```

---

## 5. Access Hub Configuration

### 5.1 Remote Access Settings

```yaml
access:
  enable_browser_terminals: true
  # Default: true
  # Description: Enable in-browser SSH/RDP/VNC

  max_concurrent_sessions_per_user: 5
  # Default: 5
  # Range: 1-20
  # Description: Max simultaneous connections per user

  session_idle_timeout: 1800
  # Default: 1800 (30 minutes)
  # Range: 300-7200 seconds
  # Description: Disconnect idle sessions

  session_max_duration: 14400
  # Default: 14400 (4 hours)
  # Range: 1800-86400 seconds
  # Description: Maximum session duration

  enable_session_recording: true
  # Default: true
  # Description: Record all sessions for audit

  recording_compression: true
  # Default: true
  # Description: Compress session recordings
```

### 5.2 Guacamole Settings

```yaml
guacamole:
  enable_clipboard: true
  # Default: true
  # Description: Allow clipboard sync

  enable_file_transfer: true
  # Default: true
  # Description: Allow file uploads/downloads

  max_file_size_mb: 100
  # Default: 100
  # Range: 1-1000
  # Description: Maximum file transfer size

  recording_path: /volumes/recordings/
  # Default: /volumes/recordings/
  # Description: Path to store session recordings
```

---

## 6. Operator Toolkit Configuration

### 6.1 Main Toolkit Settings

```yaml
offensive:
  enabled: false
  # Default: false (MUST BE EXPLICITLY ENABLED)
  # Description: Master switch for offensive capabilities

  require_confirmation: true
  # Default: true
  # Description: Require explicit confirmation before actions

  log_all_actions: true
  # Default: true
  # Description: Log all toolkit actions to audit trail
```

### 6.2 Vulnerability Scanning

```yaml
vulnerability_scanning:
  enabled: false
  # Default: false
  # Description: Enable vulnerability scanning

  auto_scan_new_assets: false
  # Default: false
  # Description: Automatically scan newly discovered assets

  scan_severity_filter: high
  # Values: critical, high, medium, low, info
  # Default: high
  # Description: Minimum severity to scan for

  max_concurrent_scans: 2
  # Default: 2
  # Range: 1-5
  # Description: Maximum parallel vulnerability scans

  scan_timeout: 600
  # Default: 600 (10 minutes)
  # Range: 300-3600 seconds
  # Description: Timeout for each scan
```

### 6.3 Exploitation Framework

```yaml
exploitation:
  metasploit_enabled: false
  # Default: false
  # Description: Enable Metasploit framework

  auto_exploit: false
  # Default: false (STRONGLY DISCOURAGED)
  # Description: Automatically exploit found vulnerabilities

  exploit_reliability_threshold: excellent
  # Values: great, excellent, good, normal, average
  # Default: excellent
  # Description: Minimum reliability for auto-exploitation

  max_concurrent_exploits: 1
  # Default: 1
  # Range: 1-3
  # Description: Maximum parallel exploitation attempts
```

### 6.4 C2 Configuration

```yaml
c2:
  enabled: false
  # Default: false
  # Description: Enable C2 server (Mythic)

  mythic_port: 7443
  # Default: 7443
  # Description: Mythic server port

  default_listener: http_beacon
  # Values: http_beacon, https_beacon, dns_txt
  # Default: http_beacon
  # Description: Default listener type

  agent_jitter: 20
  # Default: 20%
  # Range: 0-50%
  # Description: Random delay percentage for callbacks

  agent_sleep: 60
  # Default: 60 seconds
  # Range: 10-3600 seconds
  # Description: Base callback interval

  agent_kill_date: null
  # Default: null (no kill date)
  # Format: YYYY-MM-DD
  # Description: Date when agents stop functioning
```

### 6.5 MITM Settings

```yaml
mitm:
  enabled: false
  # Default: false
  # Description: Enable MITM attacks

  ssl_stripping: false
  # Default: false
  # Description: Enable SSL stripping

  dns_spoofing: false
  # Default: false
  # Description: Enable DNS spoofing

  dns_spoof_rules: {}
  # Default: {}
  # Example:
  #   bank.com: 192.168.1.100
  #   google.com: 192.168.1.100
  # Description: DNS redirect rules

  arp_poisoning: false
  # Default: false
  # Description: Enable ARP poisoning

  javascript_injection: false
  # Default: false
  # Description: Enable JS injection

  injection_payload: ""
  # Default: ""
  # Description: JavaScript code to inject
```

---

## 7. Reporting Configuration

### 7.1 Report Settings

```yaml
reporting:
  default_format: pdf
  # Values: pdf, html, both
  # Default: pdf
  # Description: Default report format

  company_name: Your Organization
  # Default: Your Organization
  # Description: Company name on reports

  company_logo: /volumes/config/logo.png
  # Default: /volumes/config/logo.png
  # Description: Path to company logo

  report_retention_days: 90
  # Default: 90
  # Range: 7-365
  # Description: How long to keep generated reports

  scheduled_reports: []
  # Default: []
  # Example:
  #   - type: executive
  #     schedule: "0 9 * * MON"  # Every Monday 9 AM
  #     recipients: [admin@example.com]
  # Description: Scheduled report definitions
```

---

## 8. System Configuration

### 8.1 Performance Tuning

```yaml
performance:
  worker_processes: 4
  # Default: (CPU count * 2) + 1
  # Description: Number of worker processes

  worker_connections: 1000
  # Default: 1000
  # Range: 100-10000
  # Description: Max connections per worker

  cache_ttl: 60
  # Default: 60 seconds
  # Range: 10-3600 seconds
  # Description: Cache time-to-live

  max_query_time: 30
  # Default: 30 seconds
  # Range: 5-120 seconds
  # Description: Database query timeout

  rate_limit_requests: 100
  # Default: 100
  # Range: 10-1000
  # Description: Max requests per minute per IP
```

### 8.2 Resource Limits

```yaml
limits:
  max_assets: 10000
  # Default: 10000
  # Description: Maximum tracked assets

  max_flows_per_day: 10000000
  # Default: 10000000
  # Description: Maximum flows to store per day

  max_scan_queue: 100
  # Default: 100
  # Description: Maximum queued scans

  max_evidence_size_gb: 50
  # Default: 50
  # Range: 10-500
  # Description: Maximum evidence storage
```

---

## 9. Notification Configuration

### 9.1 Email Settings

```yaml
email:
  enabled: false
  # Default: false
  # Description: Enable email notifications

  smtp_host: smtp.gmail.com
  smtp_port: 587
  smtp_user: alerts@example.com
  smtp_password: your-password
  smtp_use_tls: true

  from_address: nop@example.com
  from_name: Network Observatory Platform

  alert_recipients:
    - admin@example.com
    - security@example.com
```

### 9.2 Webhook Settings

```yaml
webhooks:
  enabled: false
  # Default: false
  # Description: Enable webhook notifications

  endpoints:
    - url: https://hooks.slack.com/your-webhook
      events: [discovery.asset_discovered, alert.high_severity]
      method: POST
      headers:
        Content-Type: application/json
```

---

## 10. Example Complete Configuration

### production.yaml

```yaml
# Complete production configuration example
application:
  environment: production
  log_level: INFO
  secret_key: ${SECRET_KEY}

database:
  host: postgres
  port: 5432
  name: nop
  user: nop_user
  password: ${POSTGRES_PASSWORD}
  pool_size: 20

redis:
  host: redis
  port: 6379
  db: 0

network:
  primary_interface: eth0
  monitor_subnets:
    - 192.168.1.0/24
  excluded_ips:
    - 192.168.1.1

discovery:
  mode: active_passive
  scan_interval: 300
  os_detection: light
  service_detection: true

traffic:
  enable_dpi: true
  data_retention_days: 30
  alert_sensitivity: medium

credentials:
  auto_test_interval: 86400

access:
  enable_browser_terminals: true
  max_concurrent_sessions_per_user: 5
  session_idle_timeout: 1800

offensive:
  enabled: false  # MUST BE EXPLICITLY ENABLED

reporting:
  default_format: pdf
  company_name: ACME Corp

notifications:
  email:
    enabled: true
    smtp_host: smtp.gmail.com
    smtp_user: alerts@example.com
```

---

**Document Version:** 1.1  
**Last Updated:** 2026-01-05  
**Status:** Production Ready
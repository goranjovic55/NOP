# Block Catalog: NOP Workflow Automation

> **Version**: 1.0  
> **Status**: Draft for Review  
> **Created**: 2026-01-10  

## Block Categories Overview

| Category | Color | Icon | Description |
|----------|-------|------|-------------|
| Connection | `#3B82F6` (Blue) | 🔌 | Test connectivity (SSH, RDP, VNC, FTP, TCP) |
| Command | `#10B981` (Green) | ⚡ | Execute commands and operations |
| Traffic | `#8B5CF6` (Purple) | 📡 | Network traffic capture and analysis |
| Scanning | `#F59E0B` (Amber) | 🔍 | Port scanning and version detection |
| Agent | `#EF4444` (Red) | 🤖 | Agent generation and management |
| Control | `#6B7280` (Gray) | ⚙️ | Flow control (delay, condition, loop) |

---

## Connection Blocks

### SSH Test

Tests SSH connectivity to a remote host.

| Property | Value |
|----------|-------|
| **Type** | `connection.ssh_test` |
| **Category** | Connection |
| **Color** | `#3B82F6` |
| **Icon** | 🔐 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `success` | Output | On successful connection |
| `failure` | Output | On connection failure |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `host` | string | ✅ | - | Target hostname or IP |
| `port` | number | ❌ | `22` | SSH port |
| `username` | string | ✅ | - | SSH username |
| `password` | string | ❌ | - | SSH password |
| `key_file` | string | ❌ | - | Path to private key |
| `credential_id` | uuid | ❌ | - | Reference to stored credential |

**API Mapping:**
```
POST /api/v1/access/test/ssh
{
  "host": "{{host}}",
  "port": {{port}},
  "username": "{{username}}",
  "password": "{{password}}",
  "key_file": "{{key_file}}"
}
```

**Output Variables:**
```typescript
{
  success: boolean;
  host: string;
  port: number;
  username: string;
  message: string;
  response_time_ms: number;
}
```

**Example Use Case:**
```
[Start] → [SSH Test: 192.168.1.100] → [success] → [Execute Command]
                                    → [failure] → [Log Error]
```

---

### RDP Test

Tests RDP connectivity to a Windows host.

| Property | Value |
|----------|-------|
| **Type** | `connection.rdp_test` |
| **Category** | Connection |
| **Color** | `#3B82F6` |
| **Icon** | 🖥️ |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `success` | Output | On port reachable |
| `failure` | Output | On connection failure |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `host` | string | ✅ | - | Target hostname or IP |
| `port` | number | ❌ | `3389` | RDP port |
| `username` | string | ❌ | - | RDP username (for future auth) |
| `password` | string | ❌ | - | RDP password |
| `domain` | string | ❌ | - | Windows domain |

**API Mapping:**
```
POST /api/v1/access/test/rdp
{
  "host": "{{host}}",
  "port": {{port}},
  "username": "{{username}}",
  "password": "{{password}}",
  "domain": "{{domain}}"
}
```

**Output Variables:**
```typescript
{
  success: boolean;
  host: string;
  port: number;
  message: string;
}
```

---

### VNC Test

Tests VNC connectivity.

| Property | Value |
|----------|-------|
| **Type** | `connection.vnc_test` |
| **Category** | Connection |
| **Color** | `#3B82F6` |
| **Icon** | 🖼️ |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `success` | Output | On port reachable |
| `failure` | Output | On connection failure |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `host` | string | ✅ | - | Target hostname or IP |
| `port` | number | ❌ | `5900` | VNC port |

**API Mapping:**
```
POST /api/v1/access/test/tcp
{
  "host": "{{host}}",
  "port": {{port}},
  "timeout": 5
}
```

---

### FTP Test

Tests FTP connectivity and authentication.

| Property | Value |
|----------|-------|
| **Type** | `connection.ftp_test` |
| **Category** | Connection |
| **Color** | `#3B82F6` |
| **Icon** | 📂 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `success` | Output | On successful auth |
| `failure` | Output | On connection/auth failure |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `host` | string | ✅ | - | Target hostname or IP |
| `port` | number | ❌ | `21` | FTP port |
| `username` | string | ✅ | - | FTP username |
| `password` | string | ❌ | - | FTP password |

**API Mapping:**
```
POST /api/v1/access/ftp/list
{
  "host": "{{host}}",
  "port": {{port}},
  "username": "{{username}}",
  "password": "{{password}}",
  "path": "/"
}
```

---

### TCP Test

Tests raw TCP connectivity to any port.

| Property | Value |
|----------|-------|
| **Type** | `connection.tcp_test` |
| **Category** | Connection |
| **Color** | `#3B82F6` |
| **Icon** | 🔗 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `success` | Output | On port open |
| `failure` | Output | On port closed/timeout |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `host` | string | ✅ | - | Target hostname or IP |
| `port` | number | ✅ | - | Target port |
| `timeout` | number | ❌ | `5` | Timeout in seconds |

**API Mapping:**
```
POST /api/v1/access/test/tcp
{
  "host": "{{host}}",
  "port": {{port}},
  "timeout": {{timeout}}
}
```

**Output Variables:**
```typescript
{
  success: boolean;
  host: string;
  port: number;
  response_time_ms: number;
  message: string;
}
```

---

## Command Blocks

### SSH Execute

Executes a command on a remote host via SSH.

| Property | Value |
|----------|-------|
| **Type** | `command.ssh_execute` |
| **Category** | Command |
| **Color** | `#10B981` |
| **Icon** | ⚡ |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After execution |
| `error` | Output | On execution error |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `host` | string | ✅ | - | Target hostname or IP |
| `port` | number | ❌ | `22` | SSH port |
| `username` | string | ✅ | - | SSH username |
| `password` | string | ❌ | - | SSH password |
| `key_file` | string | ❌ | - | Path to private key |
| `command` | string | ✅ | - | Command to execute |
| `credential_id` | uuid | ❌ | - | Reference to stored credential |

**API Mapping:**
```
POST /api/v1/access/execute/ssh
{
  "host": "{{host}}",
  "port": {{port}},
  "username": "{{username}}",
  "password": "{{password}}",
  "key_file": "{{key_file}}",
  "command": "{{command}}"
}
```

**Output Variables:**
```typescript
{
  success: boolean;
  stdout: string;
  stderr: string;
  exit_code: number;
  execution_time_ms: number;
}
```

**Example Use Case:**
```
[SSH Test] → [SSH Execute: "uname -a"] → [Parse Output] → [Store Variable]
```

---

### System Info

Retrieves system information via SSH.

| Property | Value |
|----------|-------|
| **Type** | `command.system_info` |
| **Category** | Command |
| **Color** | `#10B981` |
| **Icon** | 📊 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After retrieval |
| `error` | Output | On error |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `host` | string | ✅ | - | Target hostname or IP |
| `port` | number | ❌ | `22` | SSH port |
| `username` | string | ✅ | - | SSH username |
| `password` | string | ❌ | - | SSH password |
| `credential_id` | uuid | ❌ | - | Reference to stored credential |

**API Mapping:**
```
POST /api/v1/access/info/system
{
  "host": "{{host}}",
  "port": {{port}},
  "username": "{{username}}",
  "password": "{{password}}"
}
```

**Output Variables:**
```typescript
{
  success: boolean;
  os: string;
  kernel: string;
  hostname: string;
  cpu: string;
  memory: string;
  uptime: string;
}
```

---

### FTP List

Lists files in an FTP directory.

| Property | Value |
|----------|-------|
| **Type** | `command.ftp_list` |
| **Category** | Command |
| **Color** | `#10B981` |
| **Icon** | 📋 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After listing |
| `error` | Output | On error |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `host` | string | ✅ | - | Target hostname or IP |
| `port` | number | ❌ | `21` | FTP port |
| `username` | string | ✅ | - | FTP username |
| `password` | string | ❌ | - | FTP password |
| `path` | string | ❌ | `/` | Directory path |

**API Mapping:**
```
POST /api/v1/access/ftp/list
{
  "host": "{{host}}",
  "port": {{port}},
  "username": "{{username}}",
  "password": "{{password}}",
  "path": "{{path}}"
}
```

**Output Variables:**
```typescript
{
  success: boolean;
  files: Array<{
    name: string;
    size: number;
    type: 'file' | 'directory';
    modified: string;
  }>;
  count: number;
}
```

---

### FTP Download

Downloads a file from FTP server.

| Property | Value |
|----------|-------|
| **Type** | `command.ftp_download` |
| **Category** | Command |
| **Color** | `#10B981` |
| **Icon** | ⬇️ |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After download |
| `error` | Output | On error |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `host` | string | ✅ | - | Target hostname or IP |
| `port` | number | ❌ | `21` | FTP port |
| `username` | string | ✅ | - | FTP username |
| `password` | string | ❌ | - | FTP password |
| `path` | string | ✅ | - | File path to download |

**API Mapping:**
```
POST /api/v1/access/ftp/download
{
  "host": "{{host}}",
  "port": {{port}},
  "username": "{{username}}",
  "password": "{{password}}",
  "path": "{{path}}"
}
```

**Output Variables:**
```typescript
{
  success: boolean;
  content: string;  // Base64 if binary
  size: number;
  filename: string;
}
```

---

### FTP Upload

Uploads a file to FTP server.

| Property | Value |
|----------|-------|
| **Type** | `command.ftp_upload` |
| **Category** | Command |
| **Color** | `#10B981` |
| **Icon** | ⬆️ |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After upload |
| `error` | Output | On error |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `host` | string | ✅ | - | Target hostname or IP |
| `port` | number | ❌ | `21` | FTP port |
| `username` | string | ✅ | - | FTP username |
| `password` | string | ❌ | - | FTP password |
| `path` | string | ✅ | - | Destination path |
| `content` | string | ✅ | - | File content |
| `is_binary` | boolean | ❌ | `false` | Is content base64 encoded |

**API Mapping:**
```
POST /api/v1/access/ftp/upload
{
  "host": "{{host}}",
  "port": {{port}},
  "username": "{{username}}",
  "password": "{{password}}",
  "path": "{{path}}",
  "content": "{{content}}",
  "is_binary": {{is_binary}}
}
```

---

## Traffic Blocks

### Start Capture

Starts persistent packet capture.

| Property | Value |
|----------|-------|
| **Type** | `traffic.start_capture` |
| **Category** | Traffic |
| **Color** | `#8B5CF6` |
| **Icon** | ▶️ |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After capture started |
| `error` | Output | On error |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `interface` | string | ❌ | `eth0` | Network interface |
| `filter` | string | ❌ | - | BPF filter expression |

**API Mapping:**
```
POST /api/v1/traffic/start-capture
{
  "interface": "{{interface}}",
  "filter": "{{filter}}"
}
```

---

### Stop Capture

Stops packet capture.

| Property | Value |
|----------|-------|
| **Type** | `traffic.stop_capture` |
| **Category** | Traffic |
| **Color** | `#8B5CF6` |
| **Icon** | ⏹️ |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After capture stopped |

**API Mapping:**
```
POST /api/v1/traffic/stop-capture
```

---

### Burst Capture

Performs a short burst capture (1-10 seconds).

| Property | Value |
|----------|-------|
| **Type** | `traffic.burst_capture` |
| **Category** | Traffic |
| **Color** | `#8B5CF6` |
| **Icon** | 📸 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After capture complete |
| `error` | Output | On error |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `duration_seconds` | number | ❌ | `1` | Capture duration (1-10) |

**API Mapping:**
```
POST /api/v1/traffic/burst-capture
{
  "duration_seconds": {{duration_seconds}}
}
```

**Output Variables:**
```typescript
{
  success: boolean;
  duration: number;
  connections: Array<{
    source: string;
    target: string;
    protocol: string;
    bytes: number;
  }>;
  connection_count: number;
}
```

---

### Get Traffic Stats

Retrieves current traffic statistics.

| Property | Value |
|----------|-------|
| **Type** | `traffic.get_stats` |
| **Category** | Traffic |
| **Color** | `#8B5CF6` |
| **Icon** | 📊 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After stats retrieved |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `history_hours` | number | ❌ | `24` | Hours of history |

**API Mapping:**
```
GET /api/v1/traffic/stats?history_hours={{history_hours}}
```

**Output Variables:**
```typescript
{
  total_packets: number;
  total_bytes: number;
  packets_per_second: number;
  bytes_per_second: number;
  protocols: Record<string, number>;
  connections: Array<Connection>;
}
```

---

### Ping

Pings a host to check reachability.

| Property | Value |
|----------|-------|
| **Type** | `traffic.ping` |
| **Category** | Traffic |
| **Color** | `#8B5CF6` |
| **Icon** | 📶 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `reachable` | Output | Host is reachable |
| `unreachable` | Output | Host is not reachable |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `host` | string | ✅ | - | Target host |

**API Mapping:**
```
POST /api/v1/traffic/ping
{
  "host": "{{host}}"
}
```

**Output Variables:**
```typescript
{
  host: string;
  reachable: boolean;
  latency: number | null;  // ms
  last_check: string;
}
```

---

### Advanced Ping

Advanced ping with multiple protocols.

| Property | Value |
|----------|-------|
| **Type** | `traffic.advanced_ping` |
| **Category** | Traffic |
| **Color** | `#8B5CF6` |
| **Icon** | 🎯 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `success` | Output | Ping successful |
| `failure` | Output | Ping failed |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `target` | string | ✅ | - | Target host |
| `protocol` | enum | ❌ | `icmp` | `icmp`, `tcp`, `udp`, `http`, `dns` |
| `port` | number | ❌ | - | Port for TCP/UDP |
| `count` | number | ❌ | `4` | Number of pings |
| `timeout` | number | ❌ | `5` | Timeout in seconds |
| `packet_size` | number | ❌ | `64` | Packet size in bytes |
| `include_route` | boolean | ❌ | `false` | Include traceroute |
| `use_https` | boolean | ❌ | `false` | Use HTTPS for HTTP ping |

**API Mapping:**
```
POST /api/v1/traffic/ping/advanced
{
  "target": "{{target}}",
  "protocol": "{{protocol}}",
  "port": {{port}},
  "count": {{count}},
  "timeout": {{timeout}},
  "packet_size": {{packet_size}},
  "include_route": {{include_route}},
  "use_https": {{use_https}}
}
```

---

### Packet Storm

Starts a packet storm (stress test).

| Property | Value |
|----------|-------|
| **Type** | `traffic.storm` |
| **Category** | Traffic |
| **Color** | `#8B5CF6` |
| **Icon** | ⚡ |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After storm started |
| `error` | Output | On error |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `target_ip` | string | ✅ | - | Target IP |
| `packet_type` | enum | ❌ | `icmp` | `icmp`, `udp`, `tcp`, `syn` |
| `rate` | number | ❌ | `1000` | Packets per second |
| `duration` | number | ❌ | `10` | Duration in seconds |
| `port` | number | ❌ | `80` | Target port |

**API Mapping:**
```
POST /api/v1/traffic/storm/start
{
  "target_ip": "{{target_ip}}",
  "packet_type": "{{packet_type}}",
  "rate": {{rate}},
  "duration": {{duration}},
  "port": {{port}}
}
```

---

## Scanning Blocks

### Version Detection

Detects service versions using nmap.

| Property | Value |
|----------|-------|
| **Type** | `scanning.version_detect` |
| **Category** | Scanning |
| **Color** | `#F59E0B` |
| **Icon** | 🔍 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After scan complete |
| `error` | Output | On error |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `host` | string | ✅ | - | Target host |
| `ports` | number[] | ❌ | - | Specific ports (null = top 1000) |

**API Mapping:**
```
POST /api/v1/scans/{scan_id}/version-detection
{
  "host": "{{host}}",
  "ports": {{ports}}
}
```

**Output Variables:**
```typescript
{
  host: string;
  services: Array<{
    port: number;
    protocol: string;
    service: string;
    version: string;
    product: string;
    extrainfo: string;
  }>;
  scanned_ports: number;
}
```

**Example Use Case:**
```
[Ping Host] → [reachable] → [Version Detection] → [Parse Services] → [Report]
```

---

### Port Scan

Scans common services on a host.

| Property | Value |
|----------|-------|
| **Type** | `scanning.port_scan` |
| **Category** | Scanning |
| **Color** | `#F59E0B` |
| **Icon** | 🎯 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After scan complete |
| `error` | Output | On error |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `host` | string | ✅ | - | Target host |

**API Mapping:**
```
GET /api/v1/access/scan/services/{host}
```

**Output Variables:**
```typescript
{
  host: string;
  services: Array<{
    port: number;
    name: string;
    status: 'open' | 'closed' | 'filtered';
  }>;
}
```

---

## Agent Blocks

### Generate Agent

Generates agent code/binary.

| Property | Value |
|----------|-------|
| **Type** | `agent.generate` |
| **Category** | Agent |
| **Color** | `#EF4444` |
| **Icon** | 🏭 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After generation |
| `error` | Output | On error |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `agent_id` | uuid | ✅ | - | Agent template ID |
| `platform` | enum | ❌ | - | `linux-amd64`, `windows-amd64`, etc. |

**API Mapping:**
```
POST /api/v1/agents/{agent_id}/generate?platform={{platform}}
```

**Output Variables:**
```typescript
{
  agent_id: string;
  agent_type: 'python' | 'go';
  content: string;  // Base64 if binary
  filename: string;
  is_binary: boolean;
  platform: string | null;
}
```

---

### Deploy Agent

Deploys agent to a target host (via SSH).

| Property | Value |
|----------|-------|
| **Type** | `agent.deploy` |
| **Category** | Agent |
| **Color** | `#EF4444` |
| **Icon** | 🚀 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After deployment |
| `error` | Output | On deployment failure |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `agent_id` | uuid | ✅ | - | Agent ID to deploy |
| `host` | string | ✅ | - | Target host |
| `port` | number | ❌ | `22` | SSH port |
| `username` | string | ✅ | - | SSH username |
| `password` | string | ❌ | - | SSH password |
| `deploy_path` | string | ❌ | `/tmp` | Deployment directory |
| `auto_start` | boolean | ❌ | `true` | Start after deployment |

**API Mapping (Composite):**
1. Generate agent: `POST /api/v1/agents/{agent_id}/generate`
2. Upload via SSH: `POST /api/v1/access/execute/ssh` (scp equivalent)
3. Execute: `POST /api/v1/access/execute/ssh` (run agent)

---

### Terminate Agent

Terminates a running agent.

| Property | Value |
|----------|-------|
| **Type** | `agent.terminate` |
| **Category** | Agent |
| **Color** | `#EF4444` |
| **Icon** | ⛔ |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After termination |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `agent_id` | uuid | ✅ | - | Agent ID to terminate |

**API Mapping:**
```
POST /api/v1/agents/{agent_id}/terminate
```

---

## Control Blocks

### Delay

Pauses execution for specified duration.

| Property | Value |
|----------|-------|
| **Type** | `control.delay` |
| **Category** | Control |
| **Color** | `#6B7280` |
| **Icon** | ⏱️ |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After delay |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `seconds` | number | ✅ | - | Delay in seconds |

**Execution:** Client-side wait, no API call.

---

### Condition

Branches execution based on condition.

| Property | Value |
|----------|-------|
| **Type** | `control.condition` |
| **Category** | Control |
| **Color** | `#6B7280` |
| **Icon** | ❓ |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `true` | Output | Condition is true |
| `false` | Output | Condition is false |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `expression` | string | ✅ | - | JavaScript expression |
| `variable` | string | ❌ | - | Variable to check |
| `operator` | enum | ❌ | `equals` | `equals`, `not_equals`, `contains`, `gt`, `lt` |
| `value` | any | ❌ | - | Value to compare |

**Expression Examples:**
```javascript
// Simple comparison
{{ $prev.success }} === true

// Variable check
{{ $vars.counter }} > 5

// String contains
{{ $prev.stdout }}.includes('error')
```

---

### Loop

Iterates over an array or count.

| Property | Value |
|----------|-------|
| **Type** | `control.loop` |
| **Category** | Control |
| **Color** | `#6B7280` |
| **Icon** | 🔄 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `iteration` | Output | Each iteration |
| `complete` | Output | After all iterations |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `mode` | enum | ✅ | - | `count` or `array` |
| `count` | number | ❌ | - | Number of iterations (count mode) |
| `array` | string | ❌ | - | Expression returning array |
| `variable_name` | string | ❌ | `item` | Variable name for current item |

**Loop Variables:**
```typescript
{
  $loop: {
    index: number;      // 0-based index
    iteration: number;  // 1-based iteration
    first: boolean;
    last: boolean;
    item: any;          // Current item (array mode)
  }
}
```

---

### Parallel

Executes multiple branches in parallel.

| Property | Value |
|----------|-------|
| **Type** | `control.parallel` |
| **Category** | Control |
| **Color** | `#6B7280` |
| **Icon** | ⚡ |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `branch_1` | Output | First parallel branch |
| `branch_2` | Output | Second parallel branch |
| `branch_3` | Output | Third parallel branch |
| `join` | Input | All branches complete |
| `out` | Output | After join |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `wait_for_all` | boolean | ❌ | `true` | Wait for all branches |
| `timeout` | number | ❌ | `300` | Timeout in seconds |

---

### Variable Set

Sets a workflow variable.

| Property | Value |
|----------|-------|
| **Type** | `control.variable_set` |
| **Category** | Control |
| **Color** | `#6B7280` |
| **Icon** | 📝 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | After variable set |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | string | ✅ | - | Variable name |
| `value` | string | ✅ | - | Value (supports expressions) |
| `scope` | enum | ❌ | `workflow` | `workflow`, `global` |

**Example:**
```
name: "target_ip"
value: "{{ $prev.host }}"
```

---

### Variable Get

Gets a workflow variable.

| Property | Value |
|----------|-------|
| **Type** | `control.variable_get` |
| **Category** | Control |
| **Color** | `#6B7280` |
| **Icon** | 📖 |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |
| `out` | Output | Variable value in output |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | string | ✅ | - | Variable name |

---

## Start/End Blocks

### Start

Entry point for workflow execution.

| Property | Value |
|----------|-------|
| **Type** | `control.start` |
| **Category** | Control |
| **Color** | `#22C55E` |
| **Icon** | ▶️ |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `out` | Output | Workflow begins |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `inputs` | object | ❌ | `{}` | Initial workflow variables |

---

### End

Marks workflow completion.

| Property | Value |
|----------|-------|
| **Type** | `control.end` |
| **Category** | Control |
| **Color** | `#EF4444` |
| **Icon** | ⏹️ |

**Handles:**
| Handle | Type | Description |
|--------|------|-------------|
| `in` | Input | Trigger input |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | enum | ❌ | `success` | `success`, `failure`, `cancelled` |
| `message` | string | ❌ | - | Completion message |

---

## Expression Syntax

All parameters support Mustache-style expressions:

| Expression | Description | Example |
|------------|-------------|---------|
| `{{ $prev }}` | Previous node output | `{{ $prev.stdout }}` |
| `{{ $prev.N }}` | Specific previous node | `{{ $prev.2.success }}` |
| `{{ $vars.name }}` | Workflow variable | `{{ $vars.target_ip }}` |
| `{{ $env.name }}` | Environment variable | `{{ $env.API_KEY }}` |
| `{{ $creds.id }}` | Credential reference | `{{ $creds.ssh_root.password }}` |
| `{{ $loop }}` | Loop context | `{{ $loop.index }}` |
| `{{ $input.name }}` | Workflow input | `{{ $input.hosts }}` |

**Expression Functions:**
```javascript
{{ $prev.stdout | trim }}           // Trim whitespace
{{ $prev.stdout | split('\n') }}    // Split into array
{{ $vars.items | length }}          // Array length
{{ $vars.ip | default('0.0.0.0') }} // Default value
```

---

## Block Summary Table

| Block | Type | Category | API Endpoint |
|-------|------|----------|--------------|
| SSH Test | `connection.ssh_test` | Connection | `POST /access/test/ssh` |
| RDP Test | `connection.rdp_test` | Connection | `POST /access/test/rdp` |
| VNC Test | `connection.vnc_test` | Connection | `POST /access/test/tcp` |
| FTP Test | `connection.ftp_test` | Connection | `POST /access/ftp/list` |
| TCP Test | `connection.tcp_test` | Connection | `POST /access/test/tcp` |
| SSH Execute | `command.ssh_execute` | Command | `POST /access/execute/ssh` |
| System Info | `command.system_info` | Command | `POST /access/info/system` |
| FTP List | `command.ftp_list` | Command | `POST /access/ftp/list` |
| FTP Download | `command.ftp_download` | Command | `POST /access/ftp/download` |
| FTP Upload | `command.ftp_upload` | Command | `POST /access/ftp/upload` |
| Start Capture | `traffic.start_capture` | Traffic | `POST /traffic/start-capture` |
| Stop Capture | `traffic.stop_capture` | Traffic | `POST /traffic/stop-capture` |
| Burst Capture | `traffic.burst_capture` | Traffic | `POST /traffic/burst-capture` |
| Get Stats | `traffic.get_stats` | Traffic | `GET /traffic/stats` |
| Ping | `traffic.ping` | Traffic | `POST /traffic/ping` |
| Advanced Ping | `traffic.advanced_ping` | Traffic | `POST /traffic/ping/advanced` |
| Packet Storm | `traffic.storm` | Traffic | `POST /traffic/storm/start` |
| Version Detect | `scanning.version_detect` | Scanning | `POST /scans/{id}/version-detection` |
| Port Scan | `scanning.port_scan` | Scanning | `GET /access/scan/services/{host}` |
| Generate Agent | `agent.generate` | Agent | `POST /agents/{id}/generate` |
| Deploy Agent | `agent.deploy` | Agent | Composite |
| Terminate Agent | `agent.terminate` | Agent | `POST /agents/{id}/terminate` |
| Delay | `control.delay` | Control | N/A (client-side) |
| Condition | `control.condition` | Control | N/A (client-side) |
| Loop | `control.loop` | Control | N/A (client-side) |
| Parallel | `control.parallel` | Control | N/A (client-side) |
| Variable Set | `control.variable_set` | Control | N/A (client-side) |
| Variable Get | `control.variable_get` | Control | N/A (client-side) |
| Start | `control.start` | Control | N/A |
| End | `control.end` | Control | N/A |

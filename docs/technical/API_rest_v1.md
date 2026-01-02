# Network Observatory Platform - API Specification
## REST API Documentation v1.0

**Base URL:** `https://nop.local/api/v1`  
**Authentication:** Bearer JWT Token  
**Content-Type:** `application/json`

---

## 1. Authentication

### 1.1 Register User

```http
POST /auth/register
```

**Request Body:**
```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "SecureP@ssw0rd!",
  "full_name": "System Administrator"
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "admin",
  "email": "admin@example.com",
  "role": "admin",
  "created_at": "2025-12-24T10:00:00Z"
}
```

### 1.2 Login

```http
POST /auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "SecureP@ssw0rd!"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### 1.3 Refresh Token

```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600
}
```

### 1.4 Get Current User

```http
GET /auth/me
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "admin",
  "email": "admin@example.com",
  "role": "admin",
  "last_login": "2025-12-24T10:00:00Z"
}
```

---

## 2. Assets

### 2.1 List Assets

```http
GET /assets
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (optional): `online`, `offline`, `all`
- `type` (optional): `workstation`, `server`, `network`, `iot`
- `search` (optional): Search term
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `sort` (optional): Sort field (default: `last_seen`)
- `order` (optional): `asc`, `desc` (default: `desc`)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "asset-uuid-1",
      "ip": "192.168.1.10",
      "mac": "00:1A:2B:3C:4D:5E",
      "hostname": "Desktop-01",
      "vendor": "Dell Inc.",
      "os_family": "Windows",
      "os_version": "Windows 11 Pro",
      "device_type": "workstation",
      "confidence": 0.95,
      "first_seen": "2025-12-21T14:30:00Z",
      "last_seen": "2025-12-24T10:00:00Z",
      "is_active": true,
      "tags": ["finance", "critical"],
      "open_ports": [22, 80, 443, 3389]
    }
  ],
  "total": 42,
  "page": 1,
  "pages": 1,
  "limit": 50
}
```

### 2.2 Get Asset Details

```http
GET /assets/{asset_id}
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "id": "asset-uuid-1",
  "ip": "192.168.1.10",
  "mac": "00:1A:2B:3C:4D:5E",
  "hostname": "Desktop-01",
  "vendor": "Dell Inc.",
  "os_family": "Windows",
  "os_version": "Windows 11 Pro 22H2",
  "device_type": "workstation",
  "confidence": 0.95,
  "first_seen": "2025-12-21T14:30:00Z",
  "last_seen": "2025-12-24T10:00:00Z",
  "is_active": true,
  "tags": ["finance", "critical"],
  "notes": "CEO laptop - handle with care",
  "ports": [
    {
      "port": 22,
      "protocol": "tcp",
      "service": "ssh",
      "version": "OpenSSH 8.9",
      "state": "open"
    },
    {
      "port": 3389,
      "protocol": "tcp",
      "service": "ms-wbt-server",
      "version": "Microsoft Terminal Services",
      "state": "open"
    }
  ],
  "vulnerabilities": [
    {
      "id": "vuln-uuid-1",
      "cve_id": "CVE-2024-1234",
      "severity": "high",
      "title": "OpenSSH Authentication Bypass",
      "status": "open"
    }
  ],
  "connections": [
    {
      "target_ip": "192.168.1.20",
      "target_hostname": "NAS-01",
      "confidence": 0.92
    }
  ]
}
```

### 2.3 Update Asset

```http
PUT /assets/{asset_id}
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "hostname": "CEO-Laptop",
  "device_type": "workstation",
  "tags": ["finance", "critical", "executive"],
  "notes": "CEO laptop - requires immediate security updates"
}
```

**Response:** `200 OK` (Updated asset object)

### 2.4 Delete Asset

```http
DELETE /assets/{asset_id}
Authorization: Bearer {access_token}
```

**Response:** `204 No Content`

### 2.5 Add Tags

```http
POST /assets/{asset_id}/tags
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "tags": ["new-tag", "another-tag"]
}
```

**Response:** `200 OK` (Updated asset object)

---

## 3. Discovery

### 3.1 Start Discovery Scan

```http
POST /discovery/scan
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "targets": ["192.168.1.0/24"],
  "scan_type": "light",  // light, service, deep
  "save_results": true
}
```

**Response:** `202 Accepted`
```json
{
  "scan_id": "scan-uuid-1",
  "status": "pending",
  "created_at": "2025-12-24T10:00:00Z"
}
```

### 3.2 Get Scan Status

```http
GET /discovery/scan/{scan_id}
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "scan_id": "scan-uuid-1",
  "status": "running",  // pending, running, completed, failed
  "progress": 45,
  "started_at": "2025-12-24T10:00:00Z",
  "estimated_completion": "2025-12-24T10:15:00Z",
  "assets_found": 12,
  "assets_updated": 8
}
```

### 3.3 List Scan History

```http
GET /discovery/scans
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (optional): Filter by status
- `limit` (optional): Number of results

**Response:** `200 OK`
```json
{
  "items": [
    {
      "scan_id": "scan-uuid-1",
      "scan_type": "light",
      "status": "completed",
      "started_at": "2025-12-24T10:00:00Z",
      "completed_at": "2025-12-24T10:12:00Z",
      "assets_found": 12,
      "duration_seconds": 720
    }
  ],
  "total": 45
}
```

---

## 4. Topology

### 4.1 Get Network Topology

```http
GET /topology
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `confidence_threshold` (optional): Minimum confidence (0.0-1.0)
- `include_offline` (optional): Include offline nodes (boolean)

**Response:** `200 OK`
```json
{
  "nodes": [
    {
      "id": "asset-uuid-1",
      "ip": "192.168.1.10",
      "hostname": "Desktop-01",
      "type": "workstation",
      "status": "online",
      "x": 100,
      "y": 150
    },
    {
      "id": "asset-uuid-2",
      "ip": "192.168.1.1",
      "hostname": "Router-01",
      "type": "network",
      "status": "online",
      "x": 200,
      "y": 100
    }
  ],
  "edges": [
    {
      "source": "asset-uuid-1",
      "target": "asset-uuid-2",
      "confidence": 0.92,
      "evidence": ["arp", "flow"],
      "bandwidth": 1250000,  // bytes/sec
      "last_seen": "2025-12-24T10:00:00Z"
    }
  ],
  "clusters": [
    {
      "id": "cluster-1",
      "name": "Office Network",
      "subnet": "192.168.1.0/24",
      "node_ids": ["asset-uuid-1", "asset-uuid-2"]
    }
  ]
}
```

### 4.2 Force Topology Recalculation

```http
POST /topology/recalculate
Authorization: Bearer {access_token}
```

**Response:** `202 Accepted`
```json
{
  "job_id": "job-uuid-1",
  "status": "pending"
}
```

---

## 5. Traffic

### 5.1 Get Traffic Summary

```http
GET /traffic/summary
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `time_range` (optional): `1h`, `24h`, `7d`, `30d` (default: `24h`)

**Response:** `200 OK`
```json
{
  "time_range": "24h",
  "total_bytes": 125000000000,
  "total_packets": 85000000,
  "bandwidth": {
    "avg": 1150000,  // bytes/sec
    "peak": 2500000,
    "current": 1200000
  },
  "protocols": [
    {
      "name": "HTTPS",
      "bytes": 56250000000,
      "percentage": 45
    },
    {
      "name": "HTTP",
      "bytes": 37500000000,
      "percentage": 30
    }
  ],
  "top_talkers": [
    {
      "asset_id": "asset-uuid-1",
      "hostname": "Desktop-01",
      "bytes": 12500000000,
      "percentage": 10
    }
  ]
}
```

### 5.2 Get Traffic Timeline

```http
GET /traffic/timeline
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `time_range` (required): `1h`, `24h`, `7d`, `30d`
- `interval` (optional): `1m`, `5m`, `1h` (auto-selected based on range)

**Response:** `200 OK`
```json
{
  "datapoints": [
    {
      "timestamp": "2025-12-24T09:00:00Z",
      "bytes_in": 125000000,
      "bytes_out": 85000000,
      "packets": 150000
    },
    {
      "timestamp": "2025-12-24T09:05:00Z",
      "bytes_in": 130000000,
      "bytes_out": 90000000,
      "packets": 155000
    }
  ]
}
```

### 5.3 Get Asset Traffic

```http
GET /traffic/asset/{asset_id}
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `time_range` (optional): `1h`, `24h`, `7d`, `30d` (default: `24h`)

**Response:** `200 OK`
```json
{
  "asset_id": "asset-uuid-1",
  "total_bytes": 12500000000,
  "flows": [
    {
      "src_ip": "192.168.1.10",
      "dst_ip": "8.8.8.8",
      "dst_port": 443,
      "protocol": "HTTPS",
      "application": "Google DNS",
      "bytes": 2300000,
      "packets": 1500,
      "first_seen": "2025-12-24T09:00:00Z",
      "last_seen": "2025-12-24T09:30:00Z"
    }
  ],
  "top_destinations": [
    {
      "ip": "8.8.8.8",
      "hostname": "dns.google",
      "bytes": 2300000
    }
  ]
}
```

---

## 6. Credentials

### 6.1 List Credentials

```http
GET /credentials
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `asset_id` (optional): Filter by asset

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "cred-uuid-1",
      "asset_id": "asset-uuid-1",
      "protocol": "ssh",
      "username": "admin",
      "port": 22,
      "is_valid": true,
      "last_validated": "2025-12-24T09:00:00Z",
      "created_at": "2025-12-21T14:30:00Z"
    }
  ]
}
```

### 6.2 Add Credential

```http
POST /credentials
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "asset_id": "asset-uuid-1",
  "protocol": "ssh",
  "username": "admin",
  "password": "SecureP@ssw0rd!",
  "port": 22
}
```

**Response:** `201 Created`
```json
{
  "id": "cred-uuid-1",
  "asset_id": "asset-uuid-1",
  "protocol": "ssh",
  "username": "admin",
  "port": 22,
  "is_valid": null,
  "created_at": "2025-12-24T10:00:00Z"
}
```

### 6.3 Test Credential

```http
POST /credentials/{credential_id}/test
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "is_valid": true,
  "tested_at": "2025-12-24T10:00:00Z",
  "message": "Authentication successful"
}
```

### 6.4 Delete Credential

```http
DELETE /credentials/{credential_id}
Authorization: Bearer {access_token}
```

**Response:** `204 No Content`

---

## 7. Access (Remote Connections)

### 7.1 Initiate SSH Connection

```http
POST /access/ssh
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "asset_id": "asset-uuid-1",
  "credential_id": "cred-uuid-1"
}
```

**Response:** `200 OK`
```json
{
  "session_id": "session-uuid-1",
  "websocket_url": "wss://nop.local/ws/terminal/session-uuid-1",
  "status": "connected"
}
```

### 7.2 Initiate RDP Connection

```http
POST /access/rdp
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "asset_id": "asset-uuid-1",
  "credential_id": "cred-uuid-1",
  "screen_width": 1920,
  "screen_height": 1080
}
```

**Response:** `200 OK`
```json
{
  "session_id": "session-uuid-1",
  "connection_url": "https://nop.local/guacamole/#/client/session-uuid-1",
  "status": "connected"
}
```

### 7.3 List Active Sessions

```http
GET /access/sessions
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "items": [
    {
      "session_id": "session-uuid-1",
      "asset_id": "asset-uuid-1",
      "protocol": "ssh",
      "user_id": "user-uuid-1",
      "started_at": "2025-12-24T09:00:00Z",
      "duration_seconds": 3600,
      "bytes_transferred": 1250000
    }
  ]
}
```

### 7.4 Terminate Session

```http
DELETE /access/sessions/{session_id}
Authorization: Bearer {access_token}
```

**Response:** `204 No Content`

---

## 8. Scans (Operator Toolkit)

### 8.1 Start Vulnerability Scan

```http
POST /scans/vulnerability
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "asset_id": "asset-uuid-1",
  "severity_filter": "high",  // critical, high, medium, low, info
  "scan_type": "nuclei"
}
```

**Response:** `202 Accepted`
```json
{
  "scan_id": "scan-uuid-1",
  "status": "pending",
  "estimated_duration": 600
}
```

### 8.2 Get Scan Results

```http
GET /scans/{scan_id}/results
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "scan_id": "scan-uuid-1",
  "status": "completed",
  "started_at": "2025-12-24T10:00:00Z",
  "completed_at": "2025-12-24T10:10:00Z",
  "vulnerabilities_found": 5,
  "results": [
    {
      "id": "vuln-uuid-1",
      "cve_id": "CVE-2024-1234",
      "title": "OpenSSH Authentication Bypass",
      "description": "...",
      "severity": "high",
      "cvss_score": 7.5,
      "affected_service": "ssh",
      "affected_port": 22,
      "remediation": "Upgrade to OpenSSH 9.0 or later"
    }
  ]
}
```

---

## 9. Reports

### 9.1 Generate Report

```http
POST /reports/generate
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "report_type": "executive",  // executive, technical, traffic
  "date_range": {
    "start": "2025-12-17T00:00:00Z",
    "end": "2025-12-24T23:59:59Z"
  },
  "format": "pdf",  // pdf, html, both
  "include": {
    "assets": true,
    "traffic": true,
    "vulnerabilities": true,
    "scans": false
  }
}
```

**Response:** `202 Accepted`
```json
{
  "report_id": "report-uuid-1",
  "status": "generating",
  "estimated_completion": "2025-12-24T10:05:00Z"
}
```

### 9.2 Get Report Status

```http
GET /reports/{report_id}
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "report_id": "report-uuid-1",
  "status": "completed",  // generating, completed, failed
  "report_type": "executive",
  "format": "pdf",
  "file_size": 2400000,
  "download_url": "/api/v1/reports/report-uuid-1/download",
  "generated_at": "2025-12-24T10:05:00Z"
}
```

### 9.3 Download Report

```http
GET /reports/{report_id}/download
Authorization: Bearer {access_token}
```

**Response:** `200 OK` (Binary file download)

---

## 10. Settings

### 10.1 Get All Settings

```http
GET /settings
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "discovery": {
    "mode": "active_passive",
    "scan_interval": 300,
    "target_subnets": ["192.168.1.0/24"],
    "excluded_ips": []
  },
  "traffic": {
    "enable_dpi": true,
    "data_retention_days": 30,
    "alert_sensitivity": "medium"
  },
  "offensive": {
    "enabled": false
  }
}
```

### 10.2 Update Settings

```http
PUT /settings/{category}
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "mode": "passive_only",
  "scan_interval": 600,
  "target_subnets": ["192.168.1.0/24", "10.0.0.0/16"]
}
```

**Response:** `200 OK` (Updated settings object)

---

## 11. WebSocket Endpoints

### 11.1 Realtime Updates

```
wss://nop.local/ws/realtime
Authorization: Bearer {access_token}
```

**Subscribe to Events:**
```json
{
  "action": "subscribe",
  "channels": ["discovery", "traffic", "alerts"]
}
```

**Event Example:**
```json
{
  "channel": "discovery",
  "event": "asset.discovered",
  "data": {
    "asset_id": "asset-uuid-1",
    "ip": "192.168.1.10",
    "hostname": "New-Device"
  },
  "timestamp": "2025-12-24T10:00:00Z"
}
```

### 11.2 Terminal Session

```
wss://nop.local/ws/terminal/{session_id}
Authorization: Bearer {access_token}
```

**Send Input:**
```json
{
  "type": "input",
  "data": "ls -la\n"
}
```

**Receive Output:**
```json
{
  "type": "output",
  "data": "total 48\ndrwxr-xr-x..."
}
```

---

## 12. Error Responses

**Standard Error Format:**
```json
{
  "error": {
    "code": "ASSET_NOT_FOUND",
    "message": "Asset with ID 'asset-uuid-1' not found",
    "details": null
  }
}
```

**HTTP Status Codes:**
- `200 OK`: Success
- `201 Created`: Resource created
- `202 Accepted`: Async operation started
- `204 No Content`: Success, no body
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

**API Version:** 1.0  
**Last Updated:** 2025-12-24  
**Status:** Production Ready
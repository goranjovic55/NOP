# Network Observatory Platform (NOP)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/react-18-61dafb.svg)](https://reactjs.org/)

> A comprehensive network monitoring and assessment platform with a cyberpunk aesthetic, designed for deployment as a network monitoring appliance.

![NOP Screenshot](/.project/assets/screenshot.png)

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/goranjovic55/NOP.git
cd NOP

# Configure environment
cp .env.example .env
# Edit .env with your settings (IMPORTANT: Change SECRET_KEY and ADMIN_PASSWORD)

# Start services
docker-compose up -d

# Access the web interface
open http://localhost:12000
```

**Default credentials:** `admin` / `admin123` (change immediately!)

## ✨ Features

### 🔍 Network Discovery
- **Passive Discovery**: ARP table monitoring, DHCP lease parsing
- **Active Discovery**: Nmap-based network scanning with configurable profiles
- **MAC Vendor Lookup**: Automatic device identification
- **OS Fingerprinting**: Operating system detection

### 🗺️ Topology Visualization
- **Interactive Graph**: Force-directed network topology
- **Multiple Layouts**: Force, circular, and hierarchical views
- **Real-time Updates**: Live traffic flow visualization
- **Asset Details**: Click-through to device information

### 📊 Traffic Analysis
- **Bandwidth Monitoring**: Real-time traffic graphs
- **Protocol Distribution**: Protocol breakdown charts
- **Top Talkers**: Identify bandwidth-heavy devices
- **Flow Tracking**: Connection-level visibility

### 🔐 Remote Access Hub
- **Browser-based SSH**: Terminal access via xterm.js
- **RDP/VNC Support**: Remote desktop via Apache Guacamole
- **Credential Vault**: AES-256-GCM encrypted storage
- **Session Logging**: Audit trail for all connections

### 🎨 Cyberpunk UI
- **Neon Theme**: Dark mode with vibrant neon accents
- **Terminal Aesthetic**: Monospace fonts and terminal-style elements
- **Responsive Design**: Works on desktop and tablet

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                       │
│  React 18 + TypeScript + Tailwind CSS + Recharts        │
└────────────────────────┬────────────────────────────────┘
                         │ REST API / WebSocket
┌────────────────────────▼────────────────────────────────┐
│              Backend (FastAPI + Python)                  │
│  Auth │ Config │ Jobs │ Docker Control │ Crypto         │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    Data Layer                            │
│  PostgreSQL (State) │ Redis (Cache) │ Volumes (Files)   │
└─────────────────────────────────────────────────────────┘
```

## 📋 Requirements

### Hardware
- **Minimum**: 4 cores, 4GB RAM, 50GB storage
- **Recommended**: 8 cores, 8GB RAM, 100GB NVMe
- **Target Platform**: Radxa-E54C SBC (ARM64)

### Software
- Docker 24.0+
- Docker Compose 2.20+
- Git 2.34+

## 🛠️ Development Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Main Blueprint](/.project/nop_main_blueprint.md) | Project overview and requirements |
| [Architecture](/.project/nop_architecture.md) | Technical architecture details |
| [API Specification](/.project/nop_api_spec.md) | REST API documentation |
| [Deployment Guide](/.project/nop_deployment_guide.md) | Installation instructions |
| [Configuration](/.project/nop_config_reference.md) | All configuration options |
| [UI Mockups](/.project/nop_ui_mockups.md) | Design system and mockups |
| [Roadmap](/.project/nop_roadmap.md) | Development phases |
| [Optimization Analysis](./OPTIMIZATION_ANALYSIS.md) | Improvement recommendations |

## 🔧 Configuration

Key environment variables (see `.env.example` for full list):

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | JWT signing key (32+ chars) | ✅ |
| `MASTER_ENCRYPTION_KEY` | Credential encryption key | Recommended |
| `ADMIN_PASSWORD` | Initial admin password | ✅ |
| `NETWORK_INTERFACE` | Interface to monitor | ✅ |
| `MONITOR_SUBNETS` | Subnets to scan | ✅ |

## 🐳 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 12000 | React web interface |
| Backend | 12001 | FastAPI REST API |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache and queues |
| Guacamole | - | Remote desktop gateway |

## 🔒 Security

### Key Features
- AES-256-GCM credential encryption
- JWT authentication with refresh tokens
- Rate limiting on authentication endpoints
- CORS configuration
- Audit logging

### Security Recommendations
1. **Change default credentials immediately**
2. Set a strong `SECRET_KEY` (generate with `openssl rand -hex 32`)
3. Set `MASTER_ENCRYPTION_KEY` for credential encryption
4. Configure `CORS_ORIGINS` for your environment
5. Enable SSL/TLS in production

## 🗺️ Roadmap

- [x] Phase 1: Foundation & Core Discovery
- [x] Phase 2: Network Topology Visualization
- [ ] Phase 3: Traffic Analysis (ntopng integration)
- [x] Phase 4: Remote Access Hub (partial)
- [ ] Phase 5: Reporting & Intelligence
- [ ] Phase 6: Operator Toolkit (optional)

See [Development Roadmap](/.project/nop_roadmap.md) for details.

## 🤝 Contributing

Contributions are welcome! Please read the documentation first:
1. Review the [Architecture](/.project/nop_architecture.md)
2. Check the [Optimization Analysis](./OPTIMIZATION_ANALYSIS.md) for improvement ideas
3. Follow the existing code style
4. Add tests for new features

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://reactjs.org/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Apache Guacamole](https://guacamole.apache.org/) - Remote desktop gateway
- [ntopng](https://www.ntop.org/products/traffic-analysis/ntopng/) - Network traffic analysis
- [Nmap](https://nmap.org/) - Network discovery and security auditing

---

**Network Observatory Platform** - Comprehensive network visibility and control.

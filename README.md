# Network Observatory Platform (NOP)

A comprehensive network monitoring, discovery, and security assessment platform.

## 🚀 Quick Start

NOP offers two deployment methods:

### Option 1: Portable Executable (Recommended for Quick Start)

**Perfect for:** Personal use, testing, small networks (<50 devices)

```bash
# Download the latest release
wget https://github.com/goranjovic55/NOP/releases/latest/download/nop-portable

# Make executable
chmod +x nop-portable

# Initialize
./nop-portable --init

# Run
./nop-portable
```

Open http://localhost:8080 in your browser.

📖 **[Full Portable Guide →](PORTABLE_README.md)**

### Option 2: Docker Deployment (Recommended for Production)

**Perfect for:** Teams, production environments, large networks (>50 devices)

```bash
# Clone repository
git clone https://github.com/goranjovic55/NOP.git
cd NOP

# Configure
cp .env.example .env
nano .env  # Set your passwords and configuration

# Start
docker-compose up -d
```

Open http://localhost:12000 in your browser.

📖 **[Full Docker Guide →](.project/nop_deployment_guide.md)**

### Not Sure Which to Choose?

📊 **[Compare Deployment Options →](DEPLOYMENT_COMPARISON.md)**

## ✨ Features

- 🔍 **Network Discovery** - Automatic device detection and mapping
- 📊 **Traffic Analysis** - Real-time network traffic monitoring
- 🎯 **Asset Management** - Track and organize network assets
- 🔐 **Security Scanning** - Vulnerability detection and assessment
- 📈 **Visualization** - Interactive network topology maps
- 🌐 **Web Interface** - Modern, responsive dashboard
- 🔌 **Remote Access** - Built-in SSH/RDP/VNC connections (Docker only)

## 📚 Documentation

### Getting Started
- [Portable Deployment Guide](PORTABLE_README.md) - Quick, single-file deployment
- [Docker Deployment Guide](.project/nop_deployment_guide.md) - Full-featured deployment
- [Deployment Comparison](DEPLOYMENT_COMPARISON.md) - Choose the right option

### Building
- [Building Portable Executable](PORTABLE_BUILD.md) - Build your own portable version
- [Portable Implementation Details](PORTABLE_IMPLEMENTATION.md) - Technical architecture

### Advanced
- [Architecture Documentation](.project/nop_architecture.md)
- [API Specification](.project/nop_api_spec.md)
- [Configuration Reference](.project/nop_config_reference.md)

## 🛠️ Building from Source

### Build Portable Executable

```bash
# Install dependencies
cd frontend && npm install && npm run build && cd ..
cd backend && pip install -r requirements.txt -r requirements-portable.txt

# Build with Nuitka
./backend/build_nuitka.sh

# Output: backend/dist/nop-portable-*
```

### Build Docker Images

```bash
docker-compose build
```

## 💡 Use Cases

- **Penetration Testing** - Network reconnaissance and assessment
- **Network Administration** - Monitor and manage infrastructure
- **Security Operations** - Detect and track security events
- **IT Asset Management** - Inventory and track network devices
- **Compliance Auditing** - Document network configuration

## 🔒 Security

- Default credentials: `admin` / (set during initialization)
- **⚠️ Change default passwords immediately**
- Use HTTPS in production environments
- Restrict network access to trusted users
- Review [Security Best Practices](.project/nop_deployment_guide.md#security-hardening)

## 📋 Requirements

### Portable Executable
- **OS:** Linux (glibc 2.27+), Windows 10+, or macOS 10.15+
- **RAM:** 2 GB minimum, 4 GB recommended
- **Disk:** 1 GB free space
- **Network:** Ethernet adapter with promiscuous mode support

### Docker Deployment
- **OS:** Linux, Windows (with Docker Desktop), macOS (with Docker Desktop)
- **Docker:** 24.0.0+
- **Docker Compose:** 2.20.0+
- **RAM:** 4 GB minimum, 8 GB recommended
- **Disk:** 10 GB free space

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

[Add your license here]

## 🆘 Support

- **Documentation:** See docs above
- **Issues:** [GitHub Issues](https://github.com/goranjovic55/NOP/issues)
- **Discussions:** [GitHub Discussions](https://github.com/goranjovic55/NOP/discussions)

## 🙏 Acknowledgments

Built with:
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://react.dev/) - Frontend framework
- [Nuitka](https://nuitka.net/) - Python compiler for portable builds
- [PostgreSQL](https://www.postgresql.org/) - Database (Docker)
- [SQLite](https://www.sqlite.org/) - Database (Portable)
- And many other open-source projects

---

**Current Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** 2025-12-25

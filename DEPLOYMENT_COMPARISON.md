# NOP Deployment Options: Docker vs Portable

This guide helps you choose the right deployment method for your use case.

## Quick Comparison

| Aspect | Docker Deployment | Portable Executable |
|--------|------------------|---------------------|
| **Setup Time** | 10-30 minutes | 2-5 minutes |
| **File Size** | ~2-3 GB (all images) | ~80-100 MB |
| **Prerequisites** | Docker, Docker Compose | None |
| **Performance** | Good | Better (native code) |
| **Database** | PostgreSQL | SQLite |
| **Scaling** | Horizontal | Single instance |
| **Remote Access** | Built-in (Guacamole) | Not available |
| **Updates** | `docker-compose pull` | Download new file |
| **Resource Usage** | Higher | Lower |
| **Platform Support** | Linux, Windows*, macOS* | Linux, Windows, macOS |

*Docker Desktop required for Windows/macOS

## When to Use Docker

### ✅ Choose Docker if:

1. **Production Deployment**
   - Need high availability
   - Require load balancing
   - Multiple concurrent users (>50)

2. **Feature Requirements**
   - Remote access to target systems (Guacamole)
   - High-volume network traffic analysis
   - Long-term data retention

3. **Infrastructure**
   - Already using Docker
   - Have Docker expertise
   - Automated deployment pipelines

4. **Scaling Needs**
   - Need to scale horizontally
   - Distributed architecture
   - Microservices approach

### Example Use Cases

- **Corporate Network**: 500+ devices, multiple analysts
- **Security Operations Center**: 24/7 monitoring
- **Cloud Deployment**: AWS, Azure, GCP
- **Team Environment**: Shared platform for security team

### Setup

```bash
git clone https://github.com/your-org/nop.git
cd nop
cp .env.example .env
# Edit .env with your settings
docker-compose up -d
```

## When to Use Portable

### ✅ Choose Portable if:

1. **Quick Deployment**
   - Need to get started fast
   - Testing/evaluation
   - Proof of concept

2. **Resource Constraints**
   - Limited RAM/CPU
   - No Docker available
   - Embedded systems (ARM SBC)

3. **Portability**
   - Need to run from USB drive
   - Frequently changing systems
   - Offline environments

4. **Simplicity**
   - Single user
   - Personal projects
   - Learning/training

### Example Use Cases

- **Penetration Testing**: Quick network assessment
- **Home Network**: Personal network monitoring
- **Training**: Learning network security
- **Field Work**: Laptop-based assessments
- **Small Business**: <50 devices, single user

### Setup

```bash
# Download
wget https://github.com/your-org/nop/releases/latest/download/nop-portable

# Make executable (Linux/macOS)
chmod +x nop-portable

# Initialize
./nop-portable --init

# Run
./nop-portable
```

## Feature Comparison

### Available in Both

✅ Network discovery and mapping  
✅ Traffic analysis and monitoring  
✅ Asset inventory management  
✅ Vulnerability scanning  
✅ Web-based interface  
✅ Real-time dashboards  
✅ Event logging  
✅ Export/reporting  

### Docker Only

✅ Remote desktop via Guacamole (SSH, RDP, VNC)  
✅ PostgreSQL database (better concurrency)  
✅ Redis caching (persistent, faster queries)  
✅ Celery background tasks (distributed)  
✅ Horizontal scaling  
✅ Container orchestration  
✅ Docker container management

### Portable Only

✅ No installation required  
✅ Run from removable media  
✅ Native code performance (2-5x faster)  
✅ Smaller footprint (80-100MB vs 2-3GB)  
✅ Faster startup time (5-10s vs 30-60s)  
✅ No Docker daemon required  

## Performance Comparison

### Docker Deployment

```
Startup Time:     ~30-60 seconds
Memory Usage:     2-4 GB (all containers)
CPU Usage:        Low-Medium
Disk I/O:         Medium (container layers)
Network Latency:  Very Low
Max Concurrent:   500+ users
Database Speed:   Excellent (PostgreSQL)
```

### Portable Executable

```
Startup Time:     ~5-10 seconds
Memory Usage:     500 MB - 1.5 GB
CPU Usage:        Very Low
Disk I/O:         Low (single process)
Network Latency:  Very Low
Max Concurrent:   50-100 users
Database Speed:   Good (SQLite)
```

## Migration Path

### Docker → Portable

Not recommended for production data. Better for:
- Development to testing
- Large deployment to single-user demo

### Portable → Docker

Recommended upgrade path:

1. **Export data** from portable:
   ```bash
   ./nop-portable --export backup.tar.gz
   ```

2. **Setup Docker** deployment

3. **Import configuration** (manual process)

4. **Migrate database**:
   ```bash
   # Export from SQLite
   sqlite3 ~/.nop/nop.db .dump > data.sql
   
   # Import to PostgreSQL (after converting schema)
   psql -U nop -d nop < data.sql
   ```

## Cost Comparison

### Infrastructure Costs

**Docker Deployment (Cloud)**
```
Small:  $20-50/month  (2 vCPU, 4GB RAM)
Medium: $50-100/month (4 vCPU, 8GB RAM)
Large:  $100-200/month (8 vCPU, 16GB RAM)
```

**Portable (Local)**
```
Initial: Free (use existing hardware)
Ongoing: $0 (no cloud costs)
```

### Time Costs

**Docker Deployment**
```
Setup:       2-4 hours
Maintenance: 2-4 hours/month
Updates:     30 minutes/update
```

**Portable**
```
Setup:       15-30 minutes
Maintenance: 1 hour/month
Updates:     5 minutes/update
```

## Recommendations by Organization Size

### Startup / Solo (1-5 people)
**Recommended: Portable**
- Quick to deploy
- Low cost
- Easy to manage

### Small Business (5-20 people)
**Recommended: Portable or Docker**
- Portable for <50 devices
- Docker for >50 devices or remote access needs

### Medium Business (20-100 people)
**Recommended: Docker**
- Better scalability
- Team collaboration
- Professional features

### Enterprise (100+ people)
**Recommended: Docker**
- High availability required
- Integration with existing systems
- Advanced features needed

## Security Considerations

### Docker Deployment

**Pros:**
- Container isolation
- Network segmentation
- Secrets management
- Regular security updates via images

**Cons:**
- Larger attack surface
- Docker daemon privileges
- Container escape risks

### Portable Executable

**Pros:**
- Smaller attack surface
- No container complexity
- Direct system integration

**Cons:**
- Runs with user privileges (may need root)
- No container isolation
- Manual security updates

## Support & Updates

### Docker

- **Updates**: `docker-compose pull && docker-compose up -d`
- **Rollback**: `docker-compose down && git checkout v1.0 && docker-compose up -d`
- **Backup**: Database dumps + volume backups
- **Support**: Community + Enterprise options

### Portable

- **Updates**: Download new executable, replace old one
- **Rollback**: Keep previous executable version
- **Backup**: Copy `~/.nop/` directory
- **Support**: Community only

## Final Recommendations

### Use Docker for:
- 🏢 Production deployments
- 👥 Multi-user environments
- 📈 Scaling requirements
- 🔐 Advanced security features
- ☁️ Cloud deployments

### Use Portable for:
- 🚀 Quick starts
- 👤 Single-user setups
- 💻 Personal projects
- 🎓 Learning/training
- 🔌 Offline environments
- 💾 Resource-constrained systems

---

**Still not sure?** Start with Portable for evaluation, migrate to Docker when you need more features or scale.

**Need both?** Use Portable for field work and Docker for central infrastructure.

**Questions?** Check the documentation or ask in [Discussions](https://github.com/your-org/nop/discussions).

# Docker Storage Options Comparison

Quick comparison of Docker storage options for NutriVault.

## TL;DR

- **Development/Testing**: Use Docker volumes (default)
- **Production**: Use external storage
- **Quick Deployment**: Use Docker volumes
- **Need Backups/Control**: Use external storage

## Comparison Table

| Feature | Docker Volumes | External Storage |
|---------|---------------|------------------|
| **Setup Complexity** | ✅ Simple (automatic) | ⚠️ Moderate (manual setup) |
| **Deployment Speed** | ✅ Fast | ⚠️ Slightly slower |
| **Backup Method** | Docker commands | ✅ Simple file copy |
| **Direct File Access** | ❌ No | ✅ Yes |
| **Database Access** | Via docker cp | ✅ Direct SQLite access |
| **Network Storage** | ❌ Complex | ✅ Easy (NFS, SMB) |
| **Performance** | ✅ Better | ✅ Good |
| **Migration** | Docker-specific | ✅ Universal |
| **Permissions** | Auto-managed | Needs configuration |
| **Security** | ✅ Isolated | Host-dependent |
| **Troubleshooting** | Docker commands | ✅ Standard tools |
| **Space Management** | Docker volumes | ✅ Host filesystem |
| **Production Ready** | ✅ Yes | ✅✅ Yes (better) |

## When to Use Each

### Use Docker Volumes When:
- Quick development/testing
- Simple deployment needs
- Don't need direct file access
- Docker-native environment
- Minimal backup requirements
- Learning/experimenting

### Use External Storage When:
- Production deployment
- Need simple backups (file copy)
- Want direct database access
- Using network storage (NFS, SMB, cloud)
- Need to monitor disk usage easily
- Multiple environments (dev/staging/prod)
- Complex backup strategies
- Compliance requirements for data location

## Deployment Commands

### Docker Volumes (Default)

```bash
# One command deployment
./docker-start.sh

# Or manually
docker-compose up -d
docker-compose exec nutrivault npm run db:migrate
docker-compose exec nutrivault npm run db:seed
```

### External Storage

```bash
# Setup structure
./setup-external-storage.sh

# Configure environment
nano external/.env
cp external/.env .env

# Deploy
docker-compose -f docker-compose.external-storage.yml up -d
docker-compose -f docker-compose.external-storage.yml exec nutrivault npm run db:migrate
docker-compose -f docker-compose.external-storage.yml exec nutrivault npm run db:seed
```

## Backup Commands

### Docker Volumes

```bash
# Backup database
docker cp nutrivault:/app/backend/data/nutrivault_prod.db ./backup.db

# Backup all data
docker run --rm \
  -v nutrivault-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/nutrivault-data.tar.gz /data

# Restore
docker cp ./backup.db nutrivault:/app/backend/data/nutrivault_prod.db
docker-compose restart
```

### External Storage

```bash
# Backup database (simple file copy!)
cp external/data/nutrivault_prod.db external/backups/backup-$(date +%Y%m%d).db

# Backup everything
tar czf nutrivault-backup.tar.gz external/

# Restore
cp external/backups/backup-YYYYMMDD.db external/data/nutrivault_prod.db
docker-compose -f docker-compose.external-storage.yml restart
```

## Switching Between Options

### From Docker Volumes → External Storage

```bash
# 1. Setup external storage
./setup-external-storage.sh

# 2. Copy data from volumes
docker cp nutrivault:/app/backend/data/. external/data/
docker cp nutrivault:/app/backend/uploads/. external/uploads/

# 3. Stop old deployment
docker-compose down

# 4. Start with external storage
docker-compose -f docker-compose.external-storage.yml up -d
```

### From External Storage → Docker Volumes

```bash
# 1. Stop external storage deployment
docker-compose -f docker-compose.external-storage.yml down

# 2. Start with volumes
docker-compose up -d

# 3. Copy data to volumes
docker cp external/data/. nutrivault:/app/backend/data/
docker cp external/uploads/. nutrivault:/app/backend/uploads/

# 4. Restart
docker-compose restart
```

## Performance Considerations

### Docker Volumes
- **Pros**: Optimized for container I/O, better performance on some systems
- **Cons**: Overhead for volume management

### External Storage
- **Pros**: Direct filesystem access, predictable performance
- **Cons**: Depends on host filesystem performance

**Verdict**: Performance difference is minimal for NutriVault's use case.

## Storage Space Management

### Docker Volumes

```bash
# Check volume sizes
docker system df -v

# Clean unused volumes
docker volume prune

# Inspect specific volume
docker volume inspect nutrivault-data
```

### External Storage

```bash
# Check disk usage (standard tools)
du -sh external/*

# Monitor in real-time
watch -n 5 'du -sh external/*'

# Check specific directory
df -h external/
```

## Recommendations by Use Case

### Small Business / Solo Practitioner
**Recommended**: Docker Volumes
- Simple setup
- Low maintenance
- Sufficient for small deployments

### Clinic / Multi-User
**Recommended**: External Storage
- Better backup control
- Direct database access for reporting
- Network storage support

### Enterprise / Compliance
**Recommended**: External Storage + PostgreSQL
- Full control over data location
- External PostgreSQL database
- Comprehensive backup strategies
- Audit trail capabilities

### Development / Testing
**Recommended**: Docker Volumes
- Fast setup/teardown
- Isolated environments
- Easy cleanup

## Security Considerations

### Docker Volumes
- ✅ Isolated from host filesystem
- ✅ Container-managed permissions
- ⚠️ Harder to encrypt at rest

### External Storage
- ⚠️ Exposed to host filesystem
- ✅ Easy to encrypt (host encryption)
- ✅ Standard filesystem permissions
- ✅ Can use encrypted network storage

## Support & Documentation

- **Docker Volumes**: See [DOCKER.md](DOCKER.md)
- **External Storage**: See [DOCKER_EXTERNAL_STORAGE.md](DOCKER_EXTERNAL_STORAGE.md)
- **General Info**: See [README.md](README.md)

## Quick Decision Matrix

Answer these questions:

1. **Need simple file copy backups?** → External Storage
2. **Using network storage (NFS/SMB)?** → External Storage
3. **Want quickest deployment?** → Docker Volumes
4. **Need to access DB with SQLite tools?** → External Storage
5. **Production deployment?** → External Storage (recommended)
6. **Development/Testing?** → Docker Volumes
7. **Compliance requirements?** → External Storage

## Final Recommendation

**For most production deployments**: Use **External Storage**

Why?
- Simple backups (file copy)
- Better control
- Easier troubleshooting
- Network storage support
- Minimal complexity overhead

**Exception**: Use Docker Volumes if you're already familiar with Docker volume management and don't need direct file access.

---

**Last Updated**: January 20, 2026

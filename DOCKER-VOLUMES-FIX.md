# Docker Volume Fix - Document Upload Issue

## Problem

When uploading documents in production, the following error occurred:

```
EXDEV: cross-device link not permitted, rename '/app/temp_uploads/...' -> '/app/uploads/...'
```

## Root Cause

The error occurred because:
1. `/app/temp_uploads/` was mounted on a Docker volume (`nutrivault-uploads`)
2. `/app/uploads/` was on the container's filesystem (different device)
3. Node.js `fs.rename()` cannot move files across different filesystems/devices

## Solution

### 1. Code Changes

**File:** `backend/src/services/document.service.js`

Changed from:
```javascript
await fs.rename(file.path, fullFilePath);
```

To:
```javascript
// Use copy + unlink instead of rename to handle cross-device (Docker volume) moves
try {
  await fs.copyFile(file.path, fullFilePath);
  await fs.unlink(file.path);
} catch (renameError) {
  // If copy fails, try to clean up and throw
  try {
    await fs.unlink(file.path);
  } catch (unlinkError) {
    // Ignore cleanup errors
  }
  throw renameError;
}
```

This approach:
- Copies the file from temp location to final location
- Deletes the temporary file after successful copy
- Works across different filesystems/volumes
- Includes proper error handling and cleanup

### 2. Docker Configuration Changes

**File:** `backend/Dockerfile`

Added `/app/uploads` directory creation:
```dockerfile
RUN mkdir -p /app/data /app/temp_uploads /app/uploads /app/logs && \
    chmod 777 /app/data /app/temp_uploads /app/uploads /app/logs
```

**File:** `docker-compose.yml`

Separated temp and final upload volumes:
```yaml
volumes:
  # Temporary uploads (staging area)
  - nutrivault-temp-uploads:/app/temp_uploads
  # Final uploaded documents (persistent)
  - nutrivault-uploads:/app/uploads
```

### 3. Benefits

- ✅ Document uploads now work across Docker volumes
- ✅ Uploaded files are persisted in a dedicated volume
- ✅ Temporary files are isolated from final uploads
- ✅ Better separation of concerns
- ✅ No data loss on container restart

## Deployment

### For Existing Installations

If you have existing uploaded files, you may need to migrate them:

```bash
# Stop the application
docker-compose down

# Create backup of existing uploads (if any)
docker run --rm -v nutrivault_nutrivault-uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/uploads-backup-$(date +%Y%m%d).tar.gz -C /data .

# Pull latest code
git pull origin main

# Rebuild with new configuration
docker-compose build --no-cache

# Start application
docker-compose up -d

# Verify uploads work
docker-compose logs -f backend
```

### For New Installations

Just pull and deploy:

```bash
git pull origin main
docker-compose build
docker-compose up -d
```

## Technical Details

### Why `fs.rename()` Fails Across Volumes

The `rename()` system call (used by Node.js `fs.rename()`) is designed to be atomic and fast by simply updating directory entries. However, it can only work within the same filesystem. When source and destination are on different filesystems (like different Docker volumes), the operation fails with `EXDEV` (cross-device link).

### Why `copyFile()` + `unlink()` Works

This approach:
1. Uses `copyFile()` which reads from source and writes to destination (works across filesystems)
2. Deletes the temporary file with `unlink()` after successful copy
3. While not atomic, it's reliable and handles the cross-filesystem scenario

### Performance Impact

- **Minimal** - Modern SSDs make file copying very fast
- The extra copy operation is negligible compared to network upload time
- Trade-off: slightly slower but works reliably across volumes

## Related Issues

- Docker cross-device link errors
- File upload failures in containerized environments
- Volume mounting best practices

## References

- Node.js fs.promises documentation
- Docker volumes documentation
- POSIX rename() behavior
